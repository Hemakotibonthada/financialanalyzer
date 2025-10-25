# Financial Analyzer - Standalone Application

A comprehensive financial analysis tool with AI-powered insights, document processing, and visualization.

## Features

### 10 Core Features
1. **📊 Financial Document Upload & Analysis** - Upload PDFs, CSVs, JSON files for automated analysis
2. **🤖 AI-Powered Insights** - Get intelligent recommendations using Ollama/OpenAI models
3. **📈 Interactive Charts & Visualizations** - View spending patterns with dynamic charts
4. **💰 Budget Tracking & Alerts** - Set budgets and receive notifications when exceeded
5. **🔄 Recurring Expense Detection** - Automatically identify subscriptions and recurring payments
6. **📧 Gmail Integration** - Auto-fetch financial documents from Gmail
7. **🎯 Financial Health Score** - Get a comprehensive health score with improvement tips
8. **📅 Date Range Filtering** - Analyze specific time periods
9. **🏷️ Smart Categorization** - ML-powered transaction categorization
10. **💾 Export Reports** - Export analysis to PDF, CSV, or JSON

## Technology Stack

### Backend
- **Node.js & Express** - REST API server
- **MongoDB with Mongoose** - Database and ODM
- **JWT Authentication** - Secure user sessions
- **Multer** - File upload handling
- **PDF-Parse** - PDF document processing
- **CSV-Parser** - CSV file processing
- **Ollama/OpenAI** - AI analysis
- **Nodemailer** - Email notifications
- **Winston** - Logging

### Frontend
- **React 18** - UI framework
- **Tailwind CSS** - Styling
- **Recharts** - Data visualization
- **Axios** - HTTP client
- **React-Dropzone** - File uploads
- **Lucide React** - Icons
- **React-Toastify** - Notifications

## Project Structure

```
FinancialAnalyzer/
├── backend/
│   ├── config/
│   │   └── database.js
│   ├── models/
│   │   ├── User.js
│   │   ├── FinancialProfile.js
│   │   ├── FinancialAnalysis.js
│   │   └── Transaction.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── financialRoutes.js
│   │   └── profileRoutes.js
│   ├── services/
│   │   ├── financialAIService.js
│   │   ├── documentProcessor.js
│   │   ├── gmailService.js
│   │   └── notificationService.js
│   ├── middleware/
│   │   ├── auth.js
│   │   └── uploadMiddleware.js
│   ├── utils/
│   │   ├── logger.js
│   │   └── helpers.js
│   ├── .env
│   ├── server.js
│   └── package.json
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Auth/
│   │   │   ├── Dashboard/
│   │   │   ├── FinancialAnalyzer/
│   │   │   ├── Charts/
│   │   │   └── Profile/
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── hooks/
│   │   ├── utils/
│   │   ├── App.js
│   │   └── index.js
│   ├── package.json
│   └── tailwind.config.js
└── README.md
```

## Installation

### Prerequisites
- Node.js >= 18.0.0
- MongoDB installed and running
- Ollama installed (optional, for local AI) or OpenAI API key

### Backend Setup

```bash
cd backend
npm install
```

Create `.env` file:
```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/financial_analyzer

# JWT
JWT_SECRET=your_secure_jwt_secret_here
JWT_EXPIRES_IN=7d

# AI Provider (choose one)
AI_PROVIDER=ollama  # or 'openai'
OLLAMA_BASE_URL=http://localhost:11434
OPENAI_API_KEY=your_openai_key_here

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Gmail API (optional)
GMAIL_CLIENT_ID=your_gmail_client_id
GMAIL_CLIENT_SECRET=your_gmail_client_secret
```

Start backend:
```bash
npm run dev
```

### Frontend Setup

```bash
cd frontend
npm install
npm start
```

Frontend runs on `http://localhost:3000`
Backend API runs on `http://localhost:5000`

## Usage

1. **Sign Up/Login** - Create an account
2. **Setup Profile** - Add your financial profile details
3. **Upload Documents** - Upload bank statements, credit card bills
4. **View Analysis** - Get AI-powered insights
5. **Track Budget** - Set budgets and track spending
6. **Export Reports** - Download analysis results

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Financial Profile
- `GET /api/profile` - Get user profile
- `POST /api/profile` - Create/update profile

### Financial Analysis
- `POST /api/financial/analyze` - Upload & analyze documents
- `GET /api/financial/reports` - Get analysis history
- `GET /api/financial/reports/:id` - Get specific report
- `DELETE /api/financial/reports/:id` - Delete report

### Charts & Insights
- `GET /api/financial/charts/:reportId` - Get chart data
- `GET /api/financial/insights/:reportId` - Get AI insights

## Contributing

This is a standalone version extracted from the main AI project.

## License

ISC

## Author

Hema Koteswar Naidu
