import os
import base64
import re
import time
from bs4 import BeautifulSoup
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from openai import OpenAI
import speech_recognition as sr
import pyttsx3

SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']
LAST_ID_FILE = "last_email_id.txt"
CHECK_INTERVAL = 0  # seconds

def is_public_email(sender, headers):
    public_keywords = [
        "noreply", "no-reply", "newsletter", "promotions", "notification",
        "support", "donotreply", "mailer-daemon", "updates", "info", "offers"
    ]
    sender = sender.lower()
    for keyword in public_keywords:
        if keyword in sender:
            return True
    for h in headers:
        if h['name'].lower() == "list-unsubscribe":
            return True
    return False

def get_gmail_service():
    creds = None
    if os.path.exists('token.json'):
        creds = Credentials.from_authorized_user_file('token.json', SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(
                'credentials.json', SCOPES)
            creds = flow.run_local_server(port=0)
        with open('token.json', 'w') as token:
            token.write(creds.to_json())
    return build('gmail', 'v1', credentials=creds)

def extract_email_text(parts):
    for part in parts:
        if part['mimeType'] == 'text/plain':
            data = part['body'].get('data')
            if data:
                return base64.urlsafe_b64decode(data).decode()
        if part['mimeType'] == 'text/html':
            data = part['body'].get('data')
            if data:
                html = base64.urlsafe_b64decode(data).decode()
                soup = BeautifulSoup(html, "html.parser")
                return soup.get_text(separator="\n")
        if 'parts' in part:
            text = extract_email_text(part['parts'])
            if text:
                return text
    return "No readable content found."

def save_attachments(parts, folder, service, msg_id):
    os.makedirs(folder, exist_ok=True)
    for part in parts:
        filename = part.get('filename')
        if filename and part['body'].get('attachmentId'):
            att_id = part['body']['attachmentId']
            att = service.users().messages().attachments().get(userId='me', messageId=msg_id, id=att_id).execute()
            file_data = base64.urlsafe_b64decode(att['data'])
            filepath = os.path.join(folder, filename)
            with open(filepath, 'wb') as f:
                f.write(file_data)
            print(f"Attachment saved: {filepath}")
        if 'parts' in part:
            save_attachments(part['parts'], folder, service, msg_id)

def explain_email_simple(email_text, openai_api_key):
    client = OpenAI(api_key=openai_api_key)
    prompt = (
        "Read the following email and explain it in simple terms for a non-technical user:\n\n"
        f"{email_text}\n\nExplanation:"
    )
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=200,
        temperature=0.5,
    )
    return response.choices[0].message.content.strip()

def save_email_to_txt(email_text, filename):
    with open(filename, "w", encoding="utf-8") as f:
        f.write(email_text)
    print(f"Email content saved to {filename}")

def get_last_email_id():
    if os.path.exists(LAST_ID_FILE):
        with open(LAST_ID_FILE, "r") as f:
            return f.read().strip()
    return None

def set_last_email_id(email_id):
    with open(LAST_ID_FILE, "w") as f:
        f.write(email_id)

def speak(text):
    engine = pyttsx3.init()
    engine.say(text)
    engine.runAndWait()

def listen_for_yes():
    recognizer = sr.Recognizer()
    mic = sr.Microphone()
    print("Say 'Okay' if you want to hear the summary...")
    with mic as source:
        recognizer.adjust_for_ambient_noise(source)
        try:
            # Wait up to 60 seconds for a phrase to start, then listen for up to 10 seconds
            audio = recognizer.listen(source, timeout=60, phrase_time_limit=10)
            response = recognizer.recognize_google(audio, language="en-IN")
            print(f"You said: {response}")
            if response.strip().lower() in ["okay", "ok"]:
                return True
            else:
                # Print what you said, but remain silent if not "okay"
                return False
        except sr.UnknownValueError:
            print("Sorry, I could not understand your voice.")
            return False
        except sr.WaitTimeoutError:
            print("No response detected within 1 minute.")
            return False
        except sr.RequestError as e:
            print(f"Could not request results; {e}")
            return False

if __name__ == "__main__":
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    if not OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY environment variable is required.")

    service = get_gmail_service()
    print("Mail agent is running. Press Ctrl+C to stop.")

    if get_last_email_id() is None:
        # Get the latest email and set its ID as the last processed
        results = service.users().messages().list(userId='me', maxResults=1, q="from:@gmail.com").execute()
        messages = results.get('messages', [])
        if messages:
            set_last_email_id(messages[0]['id'])
        print("Initialized last_email_id.txt with the latest email. Waiting for new emails...")
        time.sleep(CHECK_INTERVAL)

    while True:
        try:
            last_id = get_last_email_id()
            # To use Gmail's importance, add labelIds=['IMPORTANT'] below:
            results = service.users().messages().list(
                userId='me',
                maxResults=50,
                q="",
                # labelIds=['IMPORTANT'],  # Uncomment to use Gmail's importance
            ).execute()
            messages = results.get('messages', [])
            new_messages = []
            for msg in messages:
                if msg['id'] == last_id:
                    break
                new_messages.append(msg)
            if not new_messages:
                time.sleep(CHECK_INTERVAL)
                continue

            new_messages = new_messages[::-1]  # Process oldest first

            for idx, msg in enumerate(new_messages, 1):
                msg_id = msg['id']
                msg_data = service.users().messages().get(userId='me', id=msg_id, format='full').execute()
                headers = msg_data['payload']['headers']
                subject = next((h['value'] for h in headers if h['name'] == 'Subject'), f'email_{idx}')
                sender = next((h['value'] for h in headers if h['name'] == 'From'), '(No Sender)')
                # Skip replies and forwards
                if re.match(r"^\s*(re:|fwd?:)", subject, re.IGNORECASE):
                    continue
                if is_public_email(sender, headers):
                    continue
                # Ensure mails directory exists
                os.makedirs("mails", exist_ok=True)
                # Clean sender and subject for filename
                safe_sender = re.sub(r'[\\/*?:"<>|@.\s]', "_", sender)
                safe_subject = re.sub(r'[\\/*?:"<>|]', "_", subject)
                filename = f"mails/{safe_sender}_{msg_id}_{safe_subject[:30]}.txt"
                folder = f"mails/{safe_sender}_{msg_id}_{safe_subject[:30]}_attachments"
                email_text = extract_email_text([msg_data['payload']])
                save_attachments([msg_data['payload']], folder, service, msg_id)
                print(f"\nSubject: {subject}\nFrom: {sender}\n")
                summary = explain_email_simple(email_text, OPENAI_API_KEY)
                print("\nSummary:\n")
                print(summary)
                # Save summary + email content
                with open(filename, "w", encoding="utf-8") as f:
                    f.write("Summary:\n" + summary + "\n\n---\n\n")
                    f.write(email_text)
                print(f"Email content with summary saved to {filename}")

                # Voice interaction
                speak("Would you like me to read the summary aloud? Please say Okay after the beep.")
                if listen_for_yes():
                    speak("Okay")
                    speak(summary)
                # If not yes, do nothing (silent)
                set_last_email_id(msg_id)

            time.sleep(CHECK_INTERVAL)
        except KeyboardInterrupt:
            print("\nMail agent stopped by user.")
            break
        except Exception as e:
            print(f"Error: {e}")
            time.sleep(CHECK_INTERVAL)