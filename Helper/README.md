# Mail Agent Helper

This folder contains the Gmail mail agent that monitors your inbox for important financial emails and processes them automatically.

## Features

- **Smart Email Filtering**: Automatically filters out newsletters, promotional emails, and public notifications
- **AI-Powered Summaries**: Uses OpenAI to generate simple explanations of complex financial emails
- **Attachment Management**: Downloads and organizes email attachments
- **Voice Interaction**: Optionally reads email summaries aloud
- **Intelligent Storage**: Saves files to the backend uploads folder for integration with the main application

## File Storage Locations

All downloaded files are stored in the `backend/uploads` folder:

- **Email Summaries**: `backend/uploads/email_summaries/`
  - Contains text files with AI-generated summaries and full email content
  - Format: `{sender}_{messageId}_{subject}.txt`

- **Attachments/PDFs**: `backend/uploads/financial/`
  - Contains all email attachments (PDFs, images, documents)
  - Format: `{sender}_{messageId}_{subject}_attachments/`

## Setup Requirements

1. **Google Gmail API Credentials**:
   - Place `credentials.json` in the Helper folder
   - Run the script once to authorize and generate `token.json`

2. **OpenAI API Key**:
   - Set environment variable: `OPENAI_API_KEY=your-key-here`
   - Required for AI-powered email summaries

3. **Python Dependencies**:
   ```bash
   pip install google-auth-oauthlib google-api-python-client
   pip install openai beautifulsoup4 SpeechRecognition pyttsx3
   ```

## Running the Mail Agent

```bash
cd Helper
python mail_agent.py
```

The agent will:
1. Monitor your Gmail inbox continuously
2. Process only new, personal emails (skips public/promotional emails)
3. Generate AI summaries for each email
4. Download and organize attachments
5. Optionally read summaries aloud via voice

## Configuration

Edit the following constants in `mail_agent.py`:

- `CHECK_INTERVAL`: Time in seconds between inbox checks (default: 60)
- `SCOPES`: Gmail API permissions (default: readonly)
- File paths are automatically configured relative to the project structure

## Email Filtering

The agent automatically skips:
- Replies (Re:) and forwards (Fwd:)
- Newsletters and promotional emails
- Automated notifications (noreply, donotreply, etc.)
- Emails with unsubscribe links

## Integration with Main App

Files saved to `backend/uploads/financial/` are automatically accessible to the main Financial Analyzer application for:
- Document analysis
- Transaction extraction
- Financial report generation
- Receipt management
