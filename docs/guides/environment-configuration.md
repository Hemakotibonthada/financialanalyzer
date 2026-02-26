# Environment Files Configuration Guide

This document explains the environment variables used in the Financial Analyzer application.

---

## 📁 Environment Files

The application uses three `.env` files:
- `backend/.env` - Backend server configuration
- `frontend/.env` - Frontend web app configuration  
- `mobile/.env` - Mobile app configuration

---

## 🔧 Backend Environment Variables

### Server Configuration
- **PORT** - Server port (default: 5001)
- **NODE_ENV** - Environment mode (development/production)

### Database
- **MONGODB_URI** - MongoDB connection string
  - Local: `mongodb://localhost:27017/financial_analyzer`
  - Atlas: `mongodb+srv://username:password@cluster.mongodb.net/dbname`

### Authentication
- **JWT_SECRET** - Secret key for JWT tokens (change in production!)
- **JWT_EXPIRE** - Token expiration time (e.g., 24h, 7d)
- **JWT_REFRESH_SECRET** - Refresh token secret
- **JWT_REFRESH_EXPIRE** - Refresh token expiration

### Email (Optional)
- **EMAIL_HOST** - SMTP server (e.g., smtp.gmail.com)
- **EMAIL_PORT** - SMTP port (587 for TLS, 465 for SSL)
- **EMAIL_USER** - Email account
- **EMAIL_PASSWORD** - App-specific password
- **EMAIL_FROM** - Sender email address

### AI Configuration (Optional)
- **AI_PROVIDER** - ollama or openai
- **OLLAMA_BASE_URL** - Ollama server URL (local)
- **OLLAMA_MODEL** - Model name (e.g., llama2)
- **OPENAI_API_KEY** - OpenAI API key (cloud)
- **OPENAI_MODEL** - Model name (e.g., gpt-3.5-turbo)

### Google OAuth (Optional)
- **GOOGLE_CLIENT_ID** - From Google Cloud Console
- **GOOGLE_CLIENT_SECRET** - From Google Cloud Console
- **GOOGLE_REDIRECT_URI** - OAuth callback URL

### Security
- **ENCRYPTION_KEY** - 32-character key for data encryption
- **SESSION_SECRET** - Session secret key
- **BCRYPT_ROUNDS** - Password hashing rounds (default: 10)

---

## 🌐 Frontend Environment Variables

### API Configuration
- **VITE_API_URL** - Backend API URL
  - Development: `http://localhost:5001/api`
  - Production: `https://api.yourapp.com/api`

### WebSocket
- **VITE_WS_URL** - WebSocket server URL
  - Development: `http://localhost:5001`
  - Production: `https://api.yourapp.com`

### Feature Flags
- **VITE_ENABLE_BILL_REMINDERS** - Enable bill reminders feature
- **VITE_ENABLE_INVESTMENTS** - Enable investments feature
- **VITE_ENABLE_GOALS** - Enable goals feature
- **VITE_ENABLE_EMI_TRACKER** - Enable EMI tracker
- **VITE_ENABLE_NET_WORTH** - Enable net worth tracker
- **VITE_ENABLE_LENDER_DASHBOARD** - Enable lender dashboard

### Analytics (Optional)
- **VITE_ANALYTICS_ID** - Google Analytics ID
- **VITE_ENABLE_ANALYTICS** - Enable analytics

---

## 📱 Mobile Environment Variables

### API Configuration
- **API_URL** - Backend API URL
  - Android Emulator: `http://10.0.2.2:5001/api`
  - iOS Simulator: `http://localhost:5001/api`
  - Physical Device: `http://YOUR_COMPUTER_IP:5001/api`

### Features
- **ENABLE_BIOMETRIC_AUTH** - Enable fingerprint/face ID
- **ENABLE_PUSH_NOTIFICATIONS** - Enable push notifications
- **ENABLE_OFFLINE_MODE** - Enable offline functionality

---

## 🔐 Security Best Practices

### For Development
1. Keep `.env` files in `.gitignore`
2. Use default values for testing
3. Never commit real credentials

### For Production
1. **Change all secrets** - JWT_SECRET, ENCRYPTION_KEY, etc.
2. **Use strong passwords** - Minimum 32 characters
3. **Enable HTTPS** - Always use SSL/TLS
4. **Rotate keys regularly** - Change secrets periodically
5. **Use environment-specific configs** - Different values per environment
6. **Enable 2FA** - For admin accounts
7. **Monitor logs** - Track suspicious activity

---

## 🚀 Setup Instructions

### 1. Backend Setup

```bash
cd backend
cp .env.example .env  # If example exists
# Or use the provided .env file
```

**Required Changes:**
- Change `JWT_SECRET` to a random 64-character string
- Change `JWT_REFRESH_SECRET` to a different random string
- Change `ENCRYPTION_KEY` to a random 32-character string
- Update `MONGODB_URI` if using remote database
- Update email settings if using email notifications

### 2. Frontend Setup

```bash
cd frontend
cp .env.example .env  # If example exists
# Or use the provided .env file
```

**Required Changes:**
- Update `VITE_API_URL` if backend is on different host
- Enable/disable features as needed

### 3. Mobile Setup

```bash
cd mobile
cp .env.example .env  # If example exists
# Or use the provided .env file
```

**Required Changes:**
- Update `API_URL` based on your device type:
  - For Android Emulator: `http://10.0.2.2:5001/api`
  - For iOS Simulator: `http://localhost:5001/api`
  - For Physical Device: `http://YOUR_IP:5001/api`

**Find Your IP:**
- Windows: `ipconfig`
- macOS/Linux: `ifconfig`

---

## 🔑 Generating Secure Keys

### JWT Secret (64 characters)
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Encryption Key (32 characters)
```bash
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

### Session Secret
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 🌍 Environment-Specific Configuration

### Development
- Use localhost URLs
- Enable debug mode
- Use local databases
- Less restrictive CORS

### Staging
- Use staging server URLs
- Enable some debugging
- Use staging database
- Moderate security

### Production
- Use production URLs
- Disable debug mode
- Use production database
- Maximum security
- Enable error tracking
- Enable monitoring

---

## 📧 Email Configuration (Gmail)

1. Enable 2-Step Verification in Gmail
2. Generate App Password:
   - Google Account → Security → App Passwords
   - Select "Mail" and "Other"
   - Copy generated password
3. Update `.env`:
   ```
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=generated-app-password
   ```

---

## 🤖 AI Configuration

### Using Ollama (Local)
1. Install Ollama: https://ollama.ai/
2. Pull model: `ollama pull llama2`
3. Start Ollama server
4. Update `.env`:
   ```
   AI_PROVIDER=ollama
   OLLAMA_BASE_URL=http://localhost:11434
   OLLAMA_MODEL=llama2
   ```

### Using OpenAI (Cloud)
1. Get API key from https://platform.openai.com/
2. Update `.env`:
   ```
   AI_PROVIDER=openai
   OPENAI_API_KEY=your-api-key
   OPENAI_MODEL=gpt-3.5-turbo
   ```

---

## 🔍 Troubleshooting

### "Cannot connect to API"
- Check `API_URL` is correct
- Ensure backend is running
- Check firewall settings
- Verify network connectivity

### "JWT token invalid"
- Check `JWT_SECRET` matches between environments
- Ensure token hasn't expired
- Check `JWT_EXPIRE` setting

### "Database connection failed"
- Verify `MONGODB_URI` is correct
- Check MongoDB is running
- Verify network access to database

### "Email not sending"
- Check email credentials
- Verify app-specific password is used (Gmail)
- Check firewall allows SMTP connections
- Verify `EMAIL_PORT` and `EMAIL_HOST`

---

## ✅ Verification Checklist

Before deploying:

- [ ] All secrets changed from defaults
- [ ] JWT_SECRET is unique and secure
- [ ] ENCRYPTION_KEY is 32 characters
- [ ] Database credentials are correct
- [ ] API URLs point to correct servers
- [ ] Email configuration is tested
- [ ] CORS_ORIGIN is properly set
- [ ] Feature flags configured
- [ ] SSL/HTTPS enabled in production
- [ ] Error tracking enabled
- [ ] Monitoring configured
- [ ] Backup strategy in place

---

## 📞 Support

For more information:
- Backend: Check `backend/README.md`
- Frontend: Check `frontend/README.md`
- Mobile: Check `mobile/README.md`

---

*Last Updated: November 11, 2025*
