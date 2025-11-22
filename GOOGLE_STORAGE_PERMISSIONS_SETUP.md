# Google Cloud Storage Permissions Setup

## Overview
This guide will help you configure the proper permissions for your Firebase/Google Cloud Storage bucket to enable file uploads for the Company Expenses feature.

---

## 🔐 Issue Description
The "Form upload interrupted" error can occur when Firebase Functions don't have the necessary permissions to write to Cloud Storage. This happens because:

1. **Default permissions may be insufficient** - The default service account may not have full Storage Object Creator/Admin rights
2. **CORS not configured** - Browser uploads require CORS headers to be set on the bucket
3. **Firebase Rules too strict** - Storage security rules may block uploads

---

## ✅ Solution Steps

### Step 1: Verify Your Project ID
```bash
firebase projects:list
```

Your project: **finserveassist**

---

### Step 2: Open Google Cloud Console

1. Visit: https://console.cloud.google.com
2. Select project: **finserveassist**
3. Open left menu → **Cloud Storage** → **Buckets**

---

### Step 3: Configure Bucket Permissions

#### Option A: Using Google Cloud Console (Recommended for beginners)

1. **Navigate to your bucket:**
   - Click on `finserveassist.appspot.com` (or your bucket name)

2. **Configure Permissions:**
   - Click the **"PERMISSIONS"** tab
   - Click **"GRANT ACCESS"**
   - In "New principals" field, enter:
     ```
     finserveassist@appspot.gserviceaccount.com
     ```
   - In "Select a role" dropdown, add these roles:
     - **Storage Object Admin** (or at minimum):
       - Storage Object Creator
       - Storage Object Viewer
       - Storage Object Deleter
   - Click **"SAVE"**

3. **Configure CORS:**
   - Go to bucket overview
   - Click **"CONFIGURATION"** tab
   - Scroll to **"CORS configuration"**
   - Click **"EDIT CORS"**
   - Add this configuration:
     ```json
     [
       {
         "origin": ["https://finserveassist.web.app", "http://localhost:5173"],
         "method": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
         "responseHeader": ["Content-Type", "Authorization"],
         "maxAgeSeconds": 3600
       }
     ]
     ```
   - Click **"SAVE"**

---

#### Option B: Using gcloud CLI (Advanced)

**Prerequisites:**
- Install Google Cloud SDK: https://cloud.google.com/sdk/docs/install
- Authenticate: `gcloud auth login`
- Set project: `gcloud config set project finserveassist`

**1. Grant IAM Permissions:**
```powershell
# Storage Object Admin (full control)
gcloud projects add-iam-policy-binding finserveassist `
  --member="serviceAccount:finserveassist@appspot.gserviceaccount.com" `
  --role="roles/storage.objectAdmin"

# Or grant individual roles:
gcloud projects add-iam-policy-binding finserveassist `
  --member="serviceAccount:finserveassist@appspot.gserviceaccount.com" `
  --role="roles/storage.objectCreator"

gcloud projects add-iam-policy-binding finserveassist `
  --member="serviceAccount:finserveassist@appspot.gserviceaccount.com" `
  --role="roles/storage.objectViewer"
```

**2. Configure CORS:**

Create a file `cors.json`:
```json
[
  {
    "origin": ["https://finserveassist.web.app", "http://localhost:5173"],
    "method": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    "responseHeader": ["Content-Type", "Authorization"],
    "maxAgeSeconds": 3600
  }
]
```

Apply CORS configuration:
```powershell
gsutil cors set cors.json gs://finserveassist.appspot.com
```

**3. Verify CORS:**
```powershell
gsutil cors get gs://finserveassist.appspot.com
```

---

### Step 4: Update Firebase Storage Security Rules

Go to Firebase Console → Storage → Rules:

```javascript
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    // Allow authenticated users to upload company expense attachments
    match /company-expenses/{userId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null 
                   && request.resource.size <= 10 * 1024 * 1024 // Max 10MB
                   && request.resource.contentType.matches('image/.*|application/pdf|application/msword|application/vnd.openxmlformats-officedocument.*|text/plain');
    }
    
    // Documents folder
    match /documents/{userId}/{allPaths=**} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && request.auth.uid == userId
                   && request.resource.size <= 10 * 1024 * 1024;
    }
    
    // Profile pictures
    match /profile-pictures/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId
                   && request.resource.size <= 5 * 1024 * 1024
                   && request.resource.contentType.matches('image/.*');
    }
  }
}
```

**Publish the rules** in the Firebase Console.

---

### Step 5: Verify Function Service Account

Check which service account your Cloud Functions are using:

**Option 1: Firebase Console**
1. Go to: https://console.firebase.google.com/project/finserveassist/functions
2. Click on a function (e.g., `api`)
3. Look for "Service account" field
4. Should show: `finserveassist@appspot.gserviceaccount.com`

**Option 2: gcloud CLI**
```powershell
gcloud functions describe api --region=asia-south1 --format="value(serviceAccount)"
```

---

### Step 6: Test Upload

1. **Clear browser cache** and reload: https://finserveassist.web.app
2. **Log in** to your account
3. Navigate to **Company Expenses**
4. Try uploading a small file (< 1MB) first
5. Check browser console (F12) for detailed logs

---

## 🔍 Verification Checklist

Before testing, ensure:

- [ ] Service account has Storage Object Creator/Admin role
- [ ] CORS is configured on the bucket
- [ ] Firebase Storage rules allow uploads
- [ ] Function is deployed with latest code
- [ ] Frontend is deployed with latest code
- [ ] User is authenticated
- [ ] File is under 10MB
- [ ] File type is supported (image, PDF, DOC, XLS, TXT)

---

## 🐛 Debugging

### Check Function Logs

**Firebase Console:**
1. Go to: https://console.firebase.google.com/project/finserveassist/functions
2. Click on `api` function
3. Click "LOGS" tab
4. Look for company expense upload logs

**gcloud CLI:**
```powershell
gcloud functions logs read api --region=asia-south1 --limit=50
```

Look for these log messages:
```
=== Company Expense Upload Started ===
Content-Type: multipart/form-data; boundary=...
Content-Length: ...
Multer parsing successful
Files received: 1
Body fields: 17
```

### Test CORS Manually

Open browser console on https://finserveassist.web.app and run:
```javascript
fetch('https://storage.googleapis.com/finserveassist.appspot.com/', {
  method: 'OPTIONS',
  headers: {
    'Origin': 'https://finserveassist.web.app',
    'Access-Control-Request-Method': 'POST'
  }
})
.then(r => console.log('CORS OK:', r.headers.get('access-control-allow-origin')))
.catch(e => console.error('CORS ERROR:', e));
```

### Test Storage Permissions

Using gcloud:
```powershell
# Try to upload a test file
echo "test" > test.txt
gsutil cp test.txt gs://finserveassist.appspot.com/test/test.txt

# Check if file exists
gsutil ls gs://finserveassist.appspot.com/test/

# Delete test file
gsutil rm gs://finserveassist.appspot.com/test/test.txt
```

---

## 📊 Current Deployment Status

✅ **Backend Functions Deployed:**
- File size limit: 10MB per file
- Max files: 5 files per upload
- Supported types: JPEG, PNG, GIF, PDF, DOC, DOCX, XLS, XLSX, TXT
- Timeout: 5 minutes
- Enhanced error handling with detailed messages

✅ **Frontend Deployed:**
- Client-side file validation (size, type, count)
- Better error messages
- Success notifications

🔄 **Pending:**
- Google Storage bucket permissions configuration

---

## 🚀 What's Changed

### Backend (companyExpenses.js):
- **Reduced limits** for stability: 50MB → 10MB, 10 → 5 files
- **Enhanced file filter**: Explicit MIME type array instead of regex
- **Added timeout**: 5-minute protection
- **Better error messages**: Specific errors for each Multer error code
- **Comprehensive logging**: Headers, file count, body fields

### Frontend (ExpenseFormModal.jsx):
- **File count validation**: Max 5 files enforced
- **File type validation**: Only supported types allowed
- **Better UX**: Success messages when files added
- **Detailed error messages**: Shows file name and reason

---

## 🆘 Common Errors and Solutions

### Error: "Form upload interrupted"
**Cause:** Multer can't complete parsing
**Solutions:**
1. Check Storage permissions (this guide)
2. Reduce file size (try < 1MB first)
3. Check CORS configuration
4. Verify Firebase Functions logs

### Error: "File too large"
**Cause:** File exceeds 10MB limit
**Solution:** Compress image or split into multiple uploads

### Error: "File type not supported"
**Cause:** File MIME type not in allowed list
**Solution:** Convert to supported format (JPEG, PNG, PDF, DOC, XLS, TXT)

### Error: "Too many files"
**Cause:** More than 5 files uploaded
**Solution:** Upload in batches of 5 or fewer

### Error: "Permission denied"
**Cause:** Service account lacks Storage permissions
**Solution:** Follow Step 3 to grant permissions

---

## 📞 Support

If issues persist after following this guide:

1. **Check Firebase Console logs** for detailed error messages
2. **Verify all checklist items** above are completed
3. **Test with a very small file** (e.g., 100KB PNG) first
4. **Check browser console** (F12) for client-side errors
5. **Review Storage bucket IAM roles** in Cloud Console

---

## 📝 Notes

- **Service Account:** `finserveassist@appspot.gserviceaccount.com`
- **Bucket Name:** `finserveassist.appspot.com`
- **Region:** `asia-south1`
- **Function URL:** https://asia-south1-finserveassist.cloudfunctions.net/api
- **Frontend URL:** https://finserveassist.web.app

---

## ✨ Next Steps

After configuring permissions:

1. **Test upload** with a small file
2. **Monitor Function logs** during upload
3. **Verify file appears** in Cloud Storage bucket
4. **Test with different file types** (image, PDF, DOC)
5. **Test with multiple files** (2-3 files at once)
6. **Test with larger files** (gradually increase size to 10MB)

---

**Last Updated:** Deployment complete - Backend and Frontend both deployed with enhanced file handling and validation.
