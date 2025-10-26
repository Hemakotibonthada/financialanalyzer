# Admin Panel - Quick Test Guide

## 🚀 Quick Start

### Prerequisites:
1. ✅ Backend running on port 5001
2. ✅ Frontend running on port 3000
3. ✅ MongoDB connected and running
4. ✅ Admin account created (admin@circuvent.com / Hemakoti@003)

## 🔐 Step 1: Login as Admin

1. Open browser: `http://localhost:3000/login`
2. Enter credentials:
   - **Email**: admin@circuvent.com
   - **Password**: Hemakoti@003
3. Click "Login"
4. You should be redirected to dashboard

## 🎯 Step 2: Test Role Management

### Quick Role Change:
1. Navigate to **Admin Dashboard** (if not there, go to `/admin-dashboard`)
2. Click on **"Users"** tab
3. Find any user in the table
4. Look at the **"Role"** column (3rd column)
5. Click the dropdown (shows current role)
6. Select a different role:
   - User → Lender
   - User → Admin
   - Lender → User
7. **✅ Expected**: Green success message appears
8. **✅ Expected**: Role badge color changes:
   - Purple = Admin
   - Orange = Lender
   - Blue = User

### Verify Role Persistence:
1. Refresh the page (F5)
2. Go back to Users tab
3. **✅ Expected**: Role change should still be there

## 📊 Step 3: Test Reports Generation

### Generate Users Report:
1. Click **"Reports"** tab in admin dashboard
2. Find the **"Users Report"** card (blue icon)
3. Click **"Generate CSV"** button
4. **✅ Expected**: File downloads automatically
5. **✅ Expected**: Filename format: `users_report_2025-10-25.csv`
6. Open the file in Excel/text editor
7. **✅ Expected**: Contains columns:
   - Name, Email, Role, Status, Joined Date, Last Login

### Generate Other Reports:
Repeat for each report type:

**Transactions Report** (Green):
- Should show all transactions
- Includes user info, amounts, categories

**Documents Report** (Purple):
- Should show uploaded documents
- Includes filenames, types, status

**Financial Summary** (Orange):
- Should show income/expense totals per user
- Includes balance calculations

**Lender Report** (Red):
- Should show all lenders
- Includes loan statistics

**Activity Report** (Indigo):
- Should show login history
- Includes activity timestamps

## 🔧 Step 4: Test Bulk Operations

### Bulk Activate Users:
1. Go to **Users** tab
2. Note: Currently bulk UI is backend-ready but needs frontend selection UI
3. Test via API directly:

```javascript
// In browser console:
const token = localStorage.getItem('token');
fetch('http://localhost:5001/api/admin/users/bulk-action', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    action: 'activate',
    userIds: ['user_id_1', 'user_id_2']
  })
})
.then(r => r.json())
.then(console.log);
```

**✅ Expected**: Success response with updated count

## ⚙️ Step 5: Test Settings Panel

1. Click **"Settings"** tab
2. Test each toggle:

### System Configuration:
- **Maintenance Mode**: Click toggle
  - **✅ Expected**: UI reflects change (visual only for now)
- **User Registration**: Click toggle
  - **✅ Expected**: Toggle animates smoothly
- **Email Notifications**: Click toggle
  - **✅ Expected**: Toggle responds to clicks

### Security Settings:
- **Session Timeout**: 
  - Change value to 60
  - **✅ Expected**: Input accepts numbers
- **Max Login Attempts**:
  - Change value to 3
  - **✅ Expected**: Input accepts numbers
- **2FA Toggle**:
  - Click to enable
  - **✅ Expected**: Toggle animates

### Email Templates:
- Click each template button:
  - Welcome Email
  - Password Reset
  - EMI Reminder
- **✅ Expected**: Buttons respond to hover (Note: Editor UI to be added)

## 🎨 Step 6: Visual Verification

### Check Responsive Design:

**Desktop View** (>1024px):
1. Open DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Set to Desktop/Laptop size
4. **✅ Expected**: 
   - 3-column report grid
   - Full width tables
   - All tabs visible

**Tablet View** (768-1024px):
1. Resize to tablet
2. **✅ Expected**:
   - 2-column report grid
   - Compact tables
   - Horizontal scroll if needed

**Mobile View** (<768px):
1. Resize to phone size (375px)
2. **✅ Expected**:
   - Single column reports
   - Responsive tables
   - Touch-friendly buttons

### Color Verification:
- Admin badges: **Purple** (#9333EA)
- Lender badges: **Orange** (#EA580C)
- User badges: **Blue** (#2563EB)
- Success messages: **Green** (#16A34A)
- Error messages: **Red** (#DC2626)

## 🐛 Troubleshooting

### Issue 1: "Failed to create loan" error
**Status**: ✅ FIXED
**Solution**: Grid component error resolved, loan creation now works

### Issue 2: CSS import errors
**Status**: ✅ FIXED
**Solution**: Moved @import before @tailwind directives

### Issue 3: Grid component warnings
**Status**: ✅ FIXED
**Solution**: Replaced Grid2 with Grid item syntax

### Issue 4: Reports not downloading
**Possible Causes**:
1. Backend not running → Start backend
2. Not logged in as admin → Check JWT token
3. Popup blocked → Allow downloads
4. No data in database → Add test data

**Fix**:
```bash
# Check backend is running
curl http://localhost:5001/api/admin/dashboard/stats

# If 401, token expired - re-login
# If 403, user is not admin - change role
# If 404, route not found - check backend routes
```

### Issue 5: Role change not working
**Possible Causes**:
1. Not admin user
2. Token expired
3. Backend error

**Fix**:
1. Check browser console for errors
2. Verify backend logs
3. Re-login if token expired
4. Check MongoDB is connected

## 📱 Mobile Testing (Optional)

If you set up mobile access:
1. Find your network IP: `ipconfig` (look for IPv4)
2. Access from phone: `http://{YOUR_IP}:3000`
3. Login as admin
4. Test all features on mobile device
5. **✅ Expected**: Everything works on touch screen

## ✅ Success Checklist

Go through this checklist:

- [ ] Logged in as admin successfully
- [ ] Saw admin dashboard overview
- [ ] Changed a user's role from dropdown
- [ ] Role change persisted after refresh
- [ ] Generated users report CSV
- [ ] Generated transactions report CSV
- [ ] Generated at least one more report
- [ ] Opened CSV file and verified data
- [ ] Toggled maintenance mode switch
- [ ] Toggled user registration switch
- [ ] Changed session timeout value
- [ ] Clicked email template buttons
- [ ] Verified responsive design on different sizes
- [ ] Checked color coding matches documentation
- [ ] No console errors (except MongoDB warning if not running)

## 🎉 If All Tests Pass:

**Congratulations! All admin enhancements are working perfectly!**

You now have:
- ✅ Complete role management system
- ✅ 6 types of comprehensive reports
- ✅ Bulk operation capabilities
- ✅ Advanced settings panel
- ✅ Beautiful responsive UI
- ✅ Secure admin-only access

## 📞 Next Steps

### For Production:
1. Connect real MongoDB instance
2. Set up Redis for caching
3. Configure email service (SMTP)
4. Add 2FA implementation
5. Set up automated backups
6. Configure monitoring/alerts

### For Development:
1. Add frontend UI for bulk selection
2. Implement email template editor
3. Add custom report builder functionality
4. Create settings persistence
5. Add real-time notifications
6. Implement audit log viewer

---

**Quick Test Time**: ~10 minutes  
**Full Test Time**: ~30 minutes  
**Last Updated**: October 25, 2025  

Need help? Check `ADMIN_ENHANCEMENTS_COMPLETE.md` for detailed documentation.
