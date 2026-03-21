# QRCodeKey - Notification Setup Guide

## 1. Firebase Push Notifications Setup (5 min)

### Step 1: Create Firebase Project
1. Go to https://console.firebase.google.com/
2. Sign in with **info.qrcodekey@gmail.com**
3. Click **"Create a project"**
4. Project name: **qrcodekey**
5. Disable Google Analytics (not needed) → Click **Create Project**

### Step 2: Get Service Account Key
1. In Firebase Console → Click ⚙️ **Settings** (gear icon) → **Project Settings**
2. Go to **"Service accounts"** tab
3. Click **"Generate new private key"** → Click **Generate Key**
4. A JSON file will download - open it and note these 3 values:
   - `project_id` → This is **FIREBASE_PROJECT_ID**
   - `client_email` → This is **FIREBASE_CLIENT_EMAIL**
   - `private_key` → This is **FIREBASE_PRIVATE_KEY**

### Step 3: Enable Cloud Messaging
1. In Firebase Console → Go to **Cloud Messaging** section
2. It should be enabled by default

### Step 4: Add to Render
Go to Render → qrcodekey-backend → Environment → Edit, and add:
```
FIREBASE_PROJECT_ID = qrcodekey (or whatever your project ID is)
FIREBASE_CLIENT_EMAIL = firebase-adminsdk-xxxxx@qrcodekey.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY = -----BEGIN PRIVATE KEY-----\nMIIEvQ...(full key)...\n-----END PRIVATE KEY-----\n
```

---

## 2. Twilio SMS Setup (5 min)

### Step 1: Create Twilio Account
1. Go to https://www.twilio.com/try-twilio
2. Sign up with **info.qrcodekey@gmail.com**
3. Verify your phone number
4. You'll get $15 free trial credit

### Step 2: Get a Phone Number
1. In Twilio Console → **Phone Numbers** → **Buy a Number**
2. Choose a US number (or any country)
3. Note the number: e.g., **+1234567890**

### Step 3: Get API Credentials
1. In Twilio Console Dashboard, note:
   - **Account SID** → This is **TWILIO_SID**
   - **Auth Token** → This is **TWILIO_AUTH_TOKEN**

### Step 4: Add to Render
Go to Render → qrcodekey-backend → Environment → Edit, and add:
```
TWILIO_SID = ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN = your_auth_token_here
TWILIO_PHONE = +1234567890
```

---

## 3. After Adding Env Vars

1. Save changes on Render → Backend will auto-redeploy
2. Test by scanning a QR code that belongs to a premium user
3. Check Render logs to verify:
   - `📧 Email sent to ...` (email working)
   - `📱 SMS sent to ...` (SMS working)
   - `🔔 Push notification sent to ...` (push working)

---

## Current Pricing & Notification Limits

| Plan | Price | Notification QRs | Channels |
|------|-------|-------------------|----------|
| Free | $0 | 0 (no alerts) | In-app only |
| Starter | $0.99/mo | 1 QR | Email + Push |
| Pro | $4.99/mo | 5 QR | Email + SMS + Push |
| Unlimited | $14.99/mo | Unlimited | Email + SMS + Push + API |

---

## Important Notes
- **Free trial SMS**: Twilio free trial can only send to verified numbers. Upgrade ($20) for full SMS.
- **Push notifications**: Users need to allow notifications in their browser/app for push to work.
- **Email**: Already working! SMTP configured with info.qrcodekey@gmail.com.
