import os
import base64
import re
import time
import json
import logging
from datetime import datetime
from bs4 import BeautifulSoup
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from openai import OpenAI
import speech_recognition as sr
import pyttsx3

# Configure logging
logging.basicConfig(
    filename='mail_agent.log',
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s'
)

SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']
LAST_ID_FILE = "last_email_id.txt"
CHECK_INTERVAL = 60  # seconds between checks

# Get the path to the backend uploads folder
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
UPLOADS_DIR = os.path.join(PROJECT_ROOT, "backend", "uploads")
FINANCIAL_UPLOADS_DIR = os.path.join(UPLOADS_DIR, "financial")
EMAIL_SUMMARIES_DIR = os.path.join(UPLOADS_DIR, "email_summaries")

# Financial email patterns
FINANCIAL_KEYWORDS = [
    'bank', 'credit card', 'debit card', 'statement', 'transaction',
    'payment', 'invoice', 'receipt', 'bill', 'salary', 'payslip',
    'investment', 'mutual fund', 'stock', 'trading', 'insurance',
    'loan', 'emi', 'upi', 'neft', 'imps', 'rtgs'
]

def is_public_email(sender, headers):
    """Filter out promotional/newsletter emails"""
    public_keywords = [
        "noreply", "no-reply", "newsletter", "promotions", "notification",
        "support", "donotreply", "mailer-daemon", "updates", "info", "offers",
        "marketing", "unsubscribe"
    ]
    sender = sender.lower()
    for keyword in public_keywords:
        if keyword in sender:
            logging.info(f"Filtered public email from: {sender}")
            return True
    for h in headers:
        if h['name'].lower() == "list-unsubscribe":
            logging.info(f"Filtered mailing list from: {sender}")
            return True
    return False

def is_financial_email(sender, subject, headers):
    """Check if email is financial-related"""
    text = f"{sender} {subject}".lower()
    
    # Check for financial keywords
    for keyword in FINANCIAL_KEYWORDS:
        if keyword in text:
            return True
    
    # Check common financial domains
    financial_domains = [
        'sbi.co.in', 'icicibank.com', 'hdfcbank.com', 'axisbank.com',
        'kotak.com', 'yesbank.in', 'pnb.co.in', 'canarabank.com',
        'idfc.com', 'indusind.com', 'paytm.com', 'phonepe.com',
        'gpay.com', 'googlepay.com', 'amazonpay.in', 'razorpay.com'
    ]
    
    for domain in financial_domains:
        if domain in sender.lower():
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
    """Recursively save all email attachments"""
    os.makedirs(folder, exist_ok=True)
    saved_files = []
    
    for part in parts:
        filename = part.get('filename')
        if filename and part['body'].get('attachmentId'):
            try:
                att_id = part['body']['attachmentId']
                att = service.users().messages().attachments().get(
                    userId='me', 
                    messageId=msg_id, 
                    id=att_id
                ).execute()
                
                file_data = base64.urlsafe_b64decode(att['data'])
                filepath = os.path.join(folder, filename)
                
                with open(filepath, 'wb') as f:
                    f.write(file_data)
                
                file_size = len(file_data) / 1024  # KB
                saved_files.append({
                    'filename': filename,
                    'filepath': filepath,
                    'size_kb': round(file_size, 2)
                })
                
                print(f"✓ Saved: {filename} ({file_size:.2f} KB)")
                logging.info(f"Attachment saved: {filepath} ({file_size:.2f} KB)")
                
            except Exception as e:
                logging.error(f"Failed to save attachment {filename}: {e}")
                print(f"✗ Failed: {filename} - {e}")
        
        # Recursively process nested parts
        if 'parts' in part:
            nested_files = save_attachments(part['parts'], folder, service, msg_id)
            saved_files.extend(nested_files)
    
    return saved_files

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
    """Listen for user confirmation"""
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
            if response.strip().lower() in ["okay", "ok", "yes", "yeah"]:
                return True
            else:
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

def process_financial_emails(service, openai_api_key, max_emails=10):
    """
    Process unread financial emails, download attachments, and generate summaries.
    Returns statistics about processed emails.
    """
    stats = {
        'total_checked': 0,
        'financial_emails': 0,
        'attachments_downloaded': 0,
        'summaries_generated': 0,
        'errors': 0
    }
    
    try:
        # Fetch unread emails
        results = service.users().messages().list(
            userId='me',
            maxResults=max_emails,
            q="is:unread"
        ).execute()
        
        messages = results.get('messages', [])
        stats['total_checked'] = len(messages)
        
        if not messages:
            print("📭 No unread emails found.")
            logging.info("No unread emails to process")
            return stats
        
        print(f"📬 Found {len(messages)} unread emails. Processing...")
        logging.info(f"Processing {len(messages)} unread emails")
        
        # Ensure directories exist
        os.makedirs(EMAIL_SUMMARIES_DIR, exist_ok=True)
        os.makedirs(FINANCIAL_UPLOADS_DIR, exist_ok=True)
        
        for idx, msg in enumerate(messages, 1):
            try:
                msg_id = msg['id']
                msg_data = service.users().messages().get(
                    userId='me',
                    id=msg_id,
                    format='full'
                ).execute()
                
                headers = msg_data['payload']['headers']
                subject = next((h['value'] for h in headers if h['name'] == 'Subject'), f'email_{idx}')
                sender = next((h['value'] for h in headers if h['name'] == 'From'), '(No Sender)')
                date_header = next((h['value'] for h in headers if h['name'] == 'Date'), '')
                
                # Skip replies and forwards
                if re.match(r"^\s*(re:|fwd?:)", subject, re.IGNORECASE):
                    print(f"⏭️  Skipping reply/forward: {subject}")
                    logging.info(f"Skipped reply/forward: {subject}")
                    continue
                
                # Skip public/promotional emails
                if is_public_email(sender, headers):
                    print(f"⏭️  Skipping promotional email from: {sender}")
                    logging.info(f"Skipped promotional email: {sender}")
                    continue
                
                # Check if it's a financial email
                if not is_financial_email(sender, subject, headers):
                    print(f"⏭️  Skipping non-financial email: {subject}")
                    logging.info(f"Skipped non-financial email: {subject}")
                    continue
                
                # Process financial email
                stats['financial_emails'] += 1
                print(f"\n💰 Processing financial email #{stats['financial_emails']}:")
                print(f"   From: {sender}")
                print(f"   Subject: {subject}")
                print(f"   Date: {date_header}")
                
                # Create safe filenames
                safe_sender = re.sub(r'[\\/*?:"<>|@.\s]', "_", sender)
                safe_subject = re.sub(r'[\\/*?:"<>|]', "_", subject)
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                
                # File paths
                summary_filename = os.path.join(
                    EMAIL_SUMMARIES_DIR,
                    f"{safe_sender}_{timestamp}_{safe_subject[:30]}.txt"
                )
                attachments_folder = os.path.join(
                    FINANCIAL_UPLOADS_DIR,
                    f"{safe_sender}_{timestamp}_{safe_subject[:30]}"
                )
                
                # Extract email text
                email_text = extract_email_text([msg_data['payload']])
                
                # Download attachments
                print("   📎 Downloading attachments...")
                saved_files = save_attachments(
                    [msg_data['payload']],
                    attachments_folder,
                    service,
                    msg_id
                )
                stats['attachments_downloaded'] += len(saved_files)
                
                if saved_files:
                    print(f"   ✓ Downloaded {len(saved_files)} attachment(s)")
                else:
                    print("   ℹ️  No attachments found")
                
                # Generate AI summary
                print("   🤖 Generating AI summary...")
                try:
                    summary = explain_email_simple(email_text, openai_api_key)
                    stats['summaries_generated'] += 1
                    print("   ✓ Summary generated")
                except Exception as e:
                    summary = f"Error generating summary: {e}"
                    print(f"   ✗ Summary failed: {e}")
                    logging.error(f"Summary generation failed for {msg_id}: {e}")
                
                # Save summary and email content
                with open(summary_filename, "w", encoding="utf-8") as f:
                    f.write(f"From: {sender}\n")
                    f.write(f"Subject: {subject}\n")
                    f.write(f"Date: {date_header}\n")
                    f.write(f"\n{'='*60}\n")
                    f.write(f"AI SUMMARY:\n")
                    f.write(f"{'='*60}\n\n")
                    f.write(summary)
                    f.write(f"\n\n{'='*60}\n")
                    f.write(f"FULL EMAIL CONTENT:\n")
                    f.write(f"{'='*60}\n\n")
                    f.write(email_text)
                    
                    if saved_files:
                        f.write(f"\n\n{'='*60}\n")
                        f.write(f"ATTACHMENTS ({len(saved_files)}):\n")
                        f.write(f"{'='*60}\n\n")
                        for file_info in saved_files:
                            f.write(f"- {file_info['filename']} ({file_info['size_kb']} KB)\n")
                            f.write(f"  Path: {file_info['filepath']}\n\n")
                
                print(f"   ✓ Saved to: {summary_filename}")
                logging.info(f"Processed financial email: {subject} from {sender}")
                
            except Exception as e:
                stats['errors'] += 1
                print(f"   ✗ Error processing email: {e}")
                logging.error(f"Error processing email {msg_id}: {e}")
                continue
        
        # Print summary
        print(f"\n{'='*60}")
        print(f"📊 PROCESSING SUMMARY:")
        print(f"{'='*60}")
        print(f"   Total emails checked: {stats['total_checked']}")
        print(f"   Financial emails processed: {stats['financial_emails']}")
        print(f"   Attachments downloaded: {stats['attachments_downloaded']}")
        print(f"   Summaries generated: {stats['summaries_generated']}")
        print(f"   Errors encountered: {stats['errors']}")
        print(f"{'='*60}\n")
        
        logging.info(f"Processing complete: {stats}")
        return stats
        
    except Exception as e:
        print(f"✗ Fatal error in email processing: {e}")
        logging.error(f"Fatal error in process_financial_emails: {e}")
        stats['errors'] += 1
        return stats

if __name__ == "__main__":
    print("="*60)
    print("Financial Email Agent - Starting")
    print("="*60)
    
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    if not OPENAI_API_KEY:
        print("⚠️  Warning: OPENAI_API_KEY not found. AI summaries will be disabled.")
        logging.warning("OPENAI_API_KEY not set")
    
    try:
        print("🔐 Authenticating with Gmail...")
        service = get_gmail_service()
        print("✓ Gmail authentication successful\n")
        logging.info("Gmail service initialized")
        
        # Process financial emails once
        print("🔍 Checking for financial emails...\n")
        stats = process_financial_emails(service, OPENAI_API_KEY, max_emails=20)
        
        print("✅ Email processing complete!")
        print(f"\n📁 Files saved to:")
        print(f"   Summaries: {EMAIL_SUMMARIES_DIR}")
        print(f"   Attachments: {FINANCIAL_UPLOADS_DIR}")
        
    except KeyboardInterrupt:
        print("\n\n⚠️  Mail agent stopped by user.")
        logging.info("Mail agent stopped by user")
    except Exception as e:
        print(f"\n✗ Fatal error: {e}")
        logging.error(f"Fatal error in main: {e}")
    finally:
        print("\n👋 Mail agent shutting down...")
        logging.info("Mail agent shutdown")