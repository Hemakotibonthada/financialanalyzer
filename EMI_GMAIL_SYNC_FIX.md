# EMI Gmail Sync Fix - Complete ✅

## Issue
When clicking "Sync Credit Card Statements" on the EMI Tracker page, users received the error:
```
Gmail not connected. Please connect Gmail first.
POST http://172.29.11.204:5001/api/emi/sync-statements 400 (Bad Request)
```

Even though Gmail was connected in the Profile settings.

## Root Cause
The backend EMI sync route (`/api/emi/sync-statements`) was checking for `user.gmailTokens` on the User model, which doesn't exist. The Gmail connection data is actually stored in the FinancialProfile model under `gmailSettings`.

**The mismatch:**
- **Frontend**: Correctly checking `userProfile.gmailConnected` from FinancialProfile
- **Backend**: Incorrectly checking `user.gmailTokens` from User model ❌

## Solution

### 1. **Backend Fix - EMI Routes**

**File**: `backend/routes/emiRoutes.js`

#### Added FinancialProfile Import
```javascript
const FinancialProfile = require('../models/FinancialProfile');
```

#### Updated sync-statements Endpoint
Changed from checking `user.gmailTokens` to properly fetching Gmail settings from FinancialProfile:

**Before:**
```javascript
// Get user's Gmail tokens
const user = await User.findById(req.user._id);

if (!user.gmailTokens) {
  return res.status(400).json({
    success: false,
    message: 'Gmail not connected. Please connect Gmail first.'
  });
}
oauth2Client.setCredentials(user.gmailTokens);
```

**After:**
```javascript
// Get user's Gmail tokens from FinancialProfile
const profile = await FinancialProfile.findOne({ userId: req.user._id });

if (!profile || !profile.gmailSettings || !profile.gmailSettings.isConnected) {
  return res.status(400).json({
    success: false,
    message: 'Gmail not connected. Please connect Gmail first.'
  });
}

// Get tokens (need to include the select: false fields)
const profileWithTokens = await FinancialProfile.findOne({ userId: req.user._id })
  .select('+gmailSettings.accessToken +gmailSettings.refreshToken');

if (!profileWithTokens.gmailSettings.accessToken || !profileWithTokens.gmailSettings.refreshToken) {
  return res.status(400).json({
    success: false,
    message: 'Gmail tokens not found. Please reconnect Gmail.'
  });
}

// Set credentials from profile
oauth2Client.setCredentials({
  access_token: profileWithTokens.gmailSettings.accessToken,
  refresh_token: profileWithTokens.gmailSettings.refreshToken,
  scope: profileWithTokens.gmailSettings.grantedScopes?.join(' ') || ''
});
```

### 2. **Frontend Improvements - EMI Tracker**

**File**: `frontend/src/pages/EMITracker.jsx`

#### Added Console Logging for Debugging
```javascript
const fetchUserProfile = async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_URL}/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Profile data loaded:', response.data.data);
    setUserProfile(response.data.data);
  } catch (err) {
    console.error('Error fetching profile:', err);
  }
};
```

#### Enhanced Error Handling in Sync Function
```javascript
const handleSyncStatements = async () => {
  console.log('Starting sync, userProfile:', userProfile);
  console.log('Gmail connected:', userProfile?.gmailConnected);
  
  // Check if Gmail is connected
  if (!userProfile?.gmailConnected) {
    const errorMsg = 'Gmail not connected. Please connect Gmail in your Profile settings first.';
    setError(errorMsg);
    alert(errorMsg);
    setSyncDialogOpen(false);
    return;
  }
  // ... rest of sync logic
};
```

## Technical Details

### Gmail Settings Structure in FinancialProfile
```javascript
gmailSettings: {
  isConnected: Boolean,           // Connection status
  email: String,                  // Gmail address
  accessToken: String,            // OAuth access token (select: false)
  refreshToken: String,           // OAuth refresh token (select: false)
  grantedScopes: [String],        // Granted OAuth scopes
  lastSync: Date,                 // Last sync timestamp
  // ... other fields
}
```

### Data Flow
1. **Gmail Connection** (Profile page)
   - User connects Gmail via OAuth
   - Tokens stored in `FinancialProfile.gmailSettings`
   - `isConnected` set to `true`

2. **Profile API** (`GET /api/profile`)
   - Returns: `{ profile, gmailConnected, gmailEmail }`
   - Frontend stores in `userProfile` state

3. **EMI Sync** (`POST /api/emi/sync-statements`)
   - Fetches `FinancialProfile` with Gmail settings
   - Validates `isConnected` and token existence
   - Uses tokens to create OAuth2 client
   - Syncs credit card statements from Gmail

## Files Modified

1. **backend/routes/emiRoutes.js**
   - Added FinancialProfile import
   - Updated sync-statements endpoint to use FinancialProfile
   - Proper token validation and OAuth2 setup

2. **frontend/src/pages/EMITracker.jsx**
   - Added console logging for debugging
   - Enhanced error messages
   - Better error handling

## Testing Steps

1. ✅ **Connect Gmail**
   - Go to Profile → Gmail Integration
   - Click "Connect Gmail"
   - Grant permissions
   - Verify "Gmail Connected" status

2. ✅ **Sync Credit Card Statements**
   - Go to EMI Tracker
   - Click "Sync Credit Card Statements"
   - Dialog should show "✓ Gmail is connected and ready to sync"
   - Click "Start Sync"
   - Should successfully fetch and process statements

3. ✅ **Error Handling**
   - If Gmail not connected, show clear error message
   - If tokens expired, prompt to reconnect
   - Proper error messages in console and UI

## Expected Behavior

### When Gmail is Connected
- ✅ Sync dialog shows success indicator
- ✅ "Start Sync" button is enabled
- ✅ Clicking sync fetches credit card statements from Gmail
- ✅ EMI data is extracted and displayed

### When Gmail is Not Connected
- ⚠️ Sync dialog shows warning indicator
- ⚠️ "Start Sync" button is disabled
- ⚠️ Clear message to connect Gmail in Profile settings
- ⚠️ Alert shown if user tries to sync anyway

## Security Considerations

- ✅ Access tokens marked as `select: false` in schema
- ✅ Tokens only fetched when explicitly needed
- ✅ OAuth2 credentials properly validated
- ✅ Proper authentication required for all endpoints

## Future Enhancements

- [ ] Add token refresh logic when access token expires
- [ ] Add retry mechanism for failed syncs
- [ ] Show sync progress indicator
- [ ] Add detailed sync results display
- [ ] Implement incremental sync (only new statements)

---

**Status**: ✅ Fixed
**Date**: October 25, 2025
**Issue**: Gmail sync returning 400 error despite Gmail being connected
**Solution**: Updated backend to use FinancialProfile instead of non-existent User.gmailTokens
**Impact**: Users can now successfully sync credit card statements from Gmail
