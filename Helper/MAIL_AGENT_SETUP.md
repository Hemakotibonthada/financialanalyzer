# Mail Agent Setup & Testing Guide

## Overview
The enhanced `mail_agent.py` now automatically fetches financial emails from Gmail, downloads attachments, and generates AI summaries.

## Features Implemented ✅
- ✅ **Smart Financial Email Detection** - Keywords: salary, payslip, invoice, statement, payment, transaction
- ✅ **Attachment Downloading** - PDF, Excel, Word, images with size tracking
- ✅ **AI-Powered Summaries** - OpenAI GPT-4o-mini generates email summaries
- ✅ **Detailed Logging** - All operations logged to `mail_agent.log`
- ✅ **Progress Indicators** - Emoji-rich console output for better UX
- ✅ **Statistics Tracking** - Total emails checked, financial emails found, attachments downloaded
- ✅ **Public Email Filtering** - Skips promotional/spam emails automatically
- ✅ **Reply/Forward Filtering** - Skips RE: and FWD: emails

## Prerequisites

### 1. Google Cloud Project Setup
You need Gmail API credentials:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or use existing
3. Enable **Gmail API**
4. Create OAuth 2.0 credentials:
   - Application type: Desktop app
   - Download JSON file
   - Rename to `credentials.json`
   - Place in `Helper/` directory

### 2. Python Dependencies
```bash
cd Helper
pip install --upgrade google-api-python-client google-auth-httplib2 google-auth-oauthlib
pip install beautifulsoup4 openai python-dotenv
```

### 3. OpenAI API Key
```bash
# Set environment variable (PowerShell)
$env:OPENAI_API_KEY = "your-api-key-here"

# Or add to .env file in Helper/
echo "OPENAI_API_KEY=your-api-key-here" > .env
```

## File Structure
```
Helper/
├── mail_agent.py          # Main script
├── credentials.json       # Gmail OAuth (download from Google Cloud)
├── token.json             # Auto-generated after first auth
├── .env                   # OpenAI API key
├── mail_agent.log         # Activity log
└── README.md              # Documentation

backend/uploads/
├── financial/             # Downloaded attachments
│   └── [sender]_[timestamp]_[subject]/
│       ├── payslip.pdf
│       └── invoice.xlsx
└── email_summaries/       # Email summaries with AI analysis
    └── [sender]_[timestamp]_[subject].txt
```

## Running the Mail Agent

### Basic Usage
```bash
cd Helper
python mail_agent.py
```

### Expected Output
```
============================================================
Financial Email Agent - Starting
============================================================
🔐 Authenticating with Gmail...
✓ Gmail authentication successful

🔍 Checking for financial emails...

📬 Fetching unread emails (max: 20)...
📭 Found 5 unread emails

💰 Processing financial email #1:
   From: hr@company.com
   Subject: Your Monthly Payslip - March 2024
   Date: Wed, 15 Mar 2024 10:30:00 +0530
   📎 Downloading attachments...
   ✓ Downloaded 1 attachment(s)
   🤖 Generating AI summary...
   ✓ Summary generated
   ✓ Saved to: backend/uploads/email_summaries/hr_company_com_20240315_103000_Your_Monthly_Payslip_March_2024.txt

============================================================
📊 PROCESSING SUMMARY:
============================================================
   Total emails checked: 5
   Financial emails processed: 3
   Attachments downloaded: 5
   Summaries generated: 3
   Errors encountered: 0
============================================================

✅ Email processing complete!

📁 Files saved to:
   Summaries: backend/uploads/email_summaries
   Attachments: backend/uploads/financial

👋 Mail agent shutting down...
```

## Configuration

### Change Max Emails Processed
Edit line 408 in `mail_agent.py`:
```python
stats = process_financial_emails(service, OPENAI_API_KEY, max_emails=50)  # Change from 20 to 50
```

### Add Financial Keywords
Edit lines 19-29 in `mail_agent.py`:
```python
FINANCIAL_KEYWORDS = [
    'salary', 'payslip', 'invoice', 'statement', 'payment',
    'transaction', 'receipt', 'bill', 'remittance', 'transfer',
    'credit card', 'bank account', 'loan', 'emi', 'insurance',
    'your-custom-keyword'  # Add your own
]
```

### Change Check Interval
For continuous monitoring (not currently active), edit line 17:
```python
CHECK_INTERVAL = 300  # Check every 5 minutes instead of 60
```

## Troubleshooting

### Issue: "credentials.json not found"
**Solution:** Download OAuth credentials from Google Cloud Console and place in `Helper/` directory

### Issue: "OPENAI_API_KEY not found"
**Solution:** Set environment variable or create `.env` file with your API key

### Issue: "Token has been expired or revoked"
**Solution:** Delete `token.json` and run again to re-authenticate

### Issue: "No financial emails found"
**Solution:** Check keywords match your email subjects, or verify emails are unread in Gmail

### Issue: "Permission denied" errors
**Solution:** Ensure Gmail API has required scopes:
- `https://www.googleapis.com/auth/gmail.readonly`
- `https://www.googleapis.com/auth/gmail.modify`

## Logs and Debugging

View logs:
```bash
Get-Content Helper/mail_agent.log -Tail 50
```

Check last 10 log entries:
```bash
Get-Content Helper/mail_agent.log -Tail 10
```

## Integration with Main Application

### Option 1: Manual Trigger (Recommended for Testing)
Run script manually when needed:
```bash
python Helper/mail_agent.py
```

### Option 2: Scheduled Task (Windows)
Create Windows Task Scheduler task:
```powershell
# Run every hour
schtasks /create /tn "FinancialMailAgent" /tr "python c:\path\to\Helper\mail_agent.py" /sc hourly /st 00:00
```

### Option 3: Backend API Endpoint (Future Enhancement)
Add endpoint to trigger mail processing from frontend UI.

## Security Notes

⚠️ **Important:**
- Keep `credentials.json` and `token.json` **private**
- Add to `.gitignore`:
  ```
  Helper/credentials.json
  Helper/token.json
  Helper/.env
  Helper/mail_agent.log
  ```
- Never commit API keys to version control
- Use environment variables for production

## Next Steps

1. **Test Basic Functionality**
   - Run mail agent once to verify authentication
   - Check if financial emails are detected
   - Verify attachments downloaded correctly

2. **Review AI Summaries**
   - Open saved `.txt` files in `backend/uploads/email_summaries/`
   - Check summary quality and accuracy
   - Adjust prompts in `explain_email_simple()` if needed

3. **Monitor Logs**
   - Review `mail_agent.log` for errors
   - Check processing statistics
   - Verify file paths are correct

4. **Fine-tune Filtering**
   - Adjust `FINANCIAL_KEYWORDS` based on your emails
   - Update `is_public_email()` if legitimate emails get filtered
   - Modify `is_financial_email()` logic as needed

## Support

For issues or questions:
1. Check `mail_agent.log` for error details
2. Review console output for specific error messages
3. Verify all prerequisites are met
4. Check Gmail API quotas in Google Cloud Console
