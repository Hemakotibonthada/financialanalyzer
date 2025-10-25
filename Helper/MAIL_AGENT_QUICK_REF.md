# Mail Agent - Quick Reference Card

## 🚀 Quick Start

```bash
# 1. Install dependencies
pip install google-api-python-client google-auth-httplib2 google-auth-oauthlib beautifulsoup4 openai python-dotenv

# 2. Set API key
$env:OPENAI_API_KEY = "your-key-here"

# 3. Run agent
cd Helper
python mail_agent.py
```

## 📁 Required Files

| File | Location | Purpose | How to Get |
|------|----------|---------|------------|
| `credentials.json` | `Helper/` | Gmail OAuth | [Google Cloud Console](https://console.cloud.google.com/) |
| `.env` or ENV var | `Helper/` | OpenAI API Key | Set `OPENAI_API_KEY` |
| `token.json` | `Helper/` | Gmail Auth Token | Auto-generated on first run |

## 🔧 Configuration

### Change Max Emails
```python
# Line 408 in mail_agent.py
stats = process_financial_emails(service, OPENAI_API_KEY, max_emails=50)
```

### Add Keywords
```python
# Lines 19-29 in mail_agent.py
FINANCIAL_KEYWORDS = [
    'salary', 'payslip', 'invoice', 'statement',
    'your-keyword'  # Add here
]
```

## 📂 Output Locations

```
backend/uploads/
├── financial/              # Attachments
│   └── sender_timestamp_subject/
│       └── attachment.pdf
└── email_summaries/        # Email + AI summary
    └── sender_timestamp_subject.txt
```

## 📊 Console Output Indicators

| Icon | Meaning |
|------|---------|
| 📭 | Found unread emails |
| 📬 | Processing emails |
| 💰 | Financial email detected |
| 📎 | Downloading attachments |
| 🤖 | Generating AI summary |
| ✓ | Success |
| ✗ | Error |
| ⏭️ | Skipped (non-financial/promotional) |
| ℹ️ | Information |

## 🔍 Statistics Report

```
📊 PROCESSING SUMMARY:
   Total emails checked: 15
   Financial emails processed: 8
   Attachments downloaded: 12
   Summaries generated: 8
   Errors encountered: 0
```

## 🐛 Common Issues

| Issue | Solution |
|-------|----------|
| "credentials.json not found" | Download from Google Cloud Console |
| "OPENAI_API_KEY not found" | Set environment variable or `.env` file |
| "Token expired" | Delete `token.json` and re-run |
| "No financial emails" | Check keywords match your emails |
| "Permission denied" | Enable Gmail API in Google Cloud |

## 📝 Logs

View recent logs:
```bash
Get-Content Helper/mail_agent.log -Tail 50
```

View errors only:
```bash
Get-Content Helper/mail_agent.log | Select-String "ERROR"
```

## 🔒 Security Checklist

- [ ] Add to `.gitignore`: `credentials.json`, `token.json`, `.env`, `mail_agent.log`
- [ ] Use environment variables for API keys
- [ ] Don't commit sensitive files
- [ ] Rotate API keys periodically

## 🎯 Testing Steps

1. ✅ Run script: `python mail_agent.py`
2. ✅ Authenticate in browser
3. ✅ Check console for financial emails found
4. ✅ Verify attachments in `backend/uploads/financial/`
5. ✅ Review summaries in `backend/uploads/email_summaries/`
6. ✅ Check logs: `Helper/mail_agent.log`

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| `MAIL_AGENT_ENHANCEMENTS.md` | Complete implementation details |
| `MAIL_AGENT_SETUP.md` | Setup guide & troubleshooting |
| `MAIL_AGENT_QUICK_REF.md` | This quick reference card |
| `mail_agent.log` | Runtime activity log |

## ⚡ Key Features

- ✅ Smart financial email detection (15 keywords)
- ✅ Automatic attachment downloading
- ✅ AI-powered email summaries (GPT-4o-mini)
- ✅ Public/promotional email filtering
- ✅ Reply/forward email skipping
- ✅ Comprehensive logging
- ✅ Statistics tracking
- ✅ Error handling & recovery
- ✅ User-friendly console output

## 📞 Support

**For issues:**
1. Check `mail_agent.log` for errors
2. Review console output
3. Verify prerequisites installed
4. Check Gmail API quotas

**For enhancements:**
- Modify `FINANCIAL_KEYWORDS` list
- Adjust `max_emails` parameter
- Customize filtering logic in `is_financial_email()`
- Update AI prompt in `explain_email_simple()`

---

**Status:** ✅ Implementation Complete  
**Version:** 1.0 (Enhanced with JARVIS patterns)  
**Last Updated:** 2024
