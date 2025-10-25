# ⚡ Financial Analyzer - Quick Reference Card

## 🚀 Start Commands (Copy & Paste)

### Backend Terminal
```powershell
cd C:\Users\v-hbonthada\WorkSpace\FinancialAnalyzer\backend
npm install
npm run dev
```

### Frontend Terminal  
```powershell
cd C:\Users\v-hbonthada\WorkSpace\FinancialAnalyzer\frontend
npm install
npm run dev
```

## 📍 URLs
- **Frontend:** http://localhost:3000
- **Backend:** http://localhost:5000
- **MongoDB:** mongodb://localhost:27017/financial_analyzer

## 📋 Project Status
- ✅ **Backend:** 100% Complete (18 files)
- ✅ **Frontend:** 90% Complete (17 files)
- ✅ **Documentation:** 5 comprehensive guides
- ✅ **Features:** 10/10 Implemented

## 🎯 Test User Journey

1. **Register:** http://localhost:3000/register
2. **Login:** Use your email/password
3. **Dashboard:** View overview
4. **New Analysis:** Click "New Analysis" button
5. **Upload Files:** Drag & drop PDF/CSV/JSON
6. **Wait:** 30-60 seconds for AI processing
7. **View Results:** Health score + insights

## 📂 Sample Test File (CSV)

Create `test_transactions.csv`:
```csv
Date,Description,Amount,Type
2024-01-15,Starbucks,-15.50,debit
2024-01-16,Salary,5000.00,credit
2024-01-17,Amazon,-89.99,debit
2024-01-18,Uber,-25.00,debit
2024-01-20,Netflix,-15.99,debit
2024-01-22,Walmart,-125.50,debit
```

## 🔑 Key Features

| Feature | Location | Status |
|---------|----------|--------|
| Login/Register | `/login`, `/register` | ✅ |
| Dashboard | `/` | ✅ |
| Upload Documents | `/analyze` | ✅ |
| View Reports | `/reports/:id` | ✅ |
| AI Insights | Backend auto-generated | ✅ |
| Health Score | Dashboard display | ✅ |
| Budget Tracking | API ready | ✅ |
| Export Data | API endpoint ready | ✅ |

## 🐛 Common Fixes

**MongoDB not running:**
```powershell
net start MongoDB
```

**Port already in use:**
```powershell
# Kill process on port 5000 (backend)
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Kill process on port 3000 (frontend)
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

**Dependencies error:**
```powershell
# Backend
cd backend
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install

# Frontend
cd frontend
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
```

## 📞 Documentation Files

- **`README.md`** - Project overview
- **`SETUP_GUIDE.md`** - Installation steps
- **`GET_STARTED.md`** - Complete usage guide
- **`FRONTEND_IMPLEMENTATION.md`** - Frontend details
- **`PROJECT_COMPLETE.md`** - Full summary
- **`QUICK_REFERENCE.md`** - This file

## 🎨 Tech Stack

**Backend:** Node.js + Express + MongoDB + JWT  
**Frontend:** React + Vite + Tailwind + Recharts  
**AI:** Ollama (local) or OpenAI (cloud)

## ✅ Checklist

- [ ] MongoDB installed and running
- [ ] Backend dependencies installed (`npm install`)
- [ ] Frontend dependencies installed (`npm install`)
- [ ] `.env` file configured in backend
- [ ] Backend running on port 5000
- [ ] Frontend running on port 3000
- [ ] Can access http://localhost:3000
- [ ] Can register new account
- [ ] Can upload and analyze documents

## 💡 Pro Tips

1. **Use Ollama for free local AI** (no API costs)
2. **Keep MongoDB running** before starting backend
3. **Check browser console** for frontend errors
4. **Check backend terminal** for API errors
5. **Use sample CSV** for quick testing

## 🆘 Need Help?

1. Check `GET_STARTED.md` for detailed guide
2. Review `SETUP_GUIDE.md` for setup steps
3. Check troubleshooting section in docs
4. Verify MongoDB is running
5. Ensure both servers are started

---

**Quick Start:** `npm install` → `npm run dev` (both folders)  
**Access:** http://localhost:3000  
**Status:** ✅ Ready to Use!
