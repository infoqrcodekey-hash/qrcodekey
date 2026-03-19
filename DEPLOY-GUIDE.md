# QRCodeKey - Deployment Guide (Simple Steps)

## Step 1: Push to GitHub
```powershell
cd C:\Users\ashvi\Downloads\qrcodekey
git add -A
git commit -m "Production ready v1.0"
git push
```

## Step 2: MongoDB Atlas - Allow All IPs
1. Go to https://cloud.mongodb.com (login: ashvinc1984@gmail.com)
2. Click "Network Access" in left sidebar
3. Click "Add IP Address"
4. Enter: `0.0.0.0/0`
5. Comment: "Allow All"
6. Click Confirm

## Step 3: Railway - Deploy Backend
1. Go to https://railway.app → Login with GitHub
2. Click "New Project" → "Deploy from GitHub Repo"
3. Select `qrcodekey` repo
4. **IMPORTANT:** Set Root Directory to `backend`
5. Add these Environment Variables:

| Variable | Value |
|----------|-------|
| NODE_ENV | production |
| PORT | 5000 |
| MONGO_URI | mongodb+srv://ashvinc1984_db_user:EO30QuIUtJ7nZZtE@cluster0.slbpu9h.mongodb.net/qr-tracking?retryWrites=true&w=majority |
| JWT_SECRET | myQRTrackerSuperSecretKey12345678901234567890 |
| FRONTEND_URL | https://qrcodekey.vercel.app |
| SMTP_HOST | smtp.gmail.com |
| SMTP_PORT | 587 |
| SMTP_USER | info.qrcodekey@gmail.com |
| SMTP_PASS | wzgkhapprzmcifqr |
| RAZORPAY_KEY_ID | rzp_test_us_SSNupvGhgKSXp |
| RAZORPAY_KEY_SECRET | GMtVvhp55ldVL6OjNjAGn4ih |

6. Deploy → Note your Railway URL (like: qrcodekey-backend.up.railway.app)

## Step 4: Vercel - Deploy Frontend
1. Go to https://vercel.com → Login with GitHub
2. Click "Add New" → "Project"
3. Import `qrcodekey` repo
4. **IMPORTANT:** Set Root Directory to `frontend`
5. Add these Environment Variables:

| Variable | Value |
|----------|-------|
| NEXT_PUBLIC_API_URL | https://YOUR-RAILWAY-URL/api |
| NEXT_PUBLIC_SOCKET_URL | https://YOUR-RAILWAY-URL |
| NEXT_PUBLIC_GOOGLE_MAPS_KEY | AIzaSyDlXevRiuCOGAglqNNL8H_dLcW1Rc6Qm4g |

6. Deploy!

## Step 5: Update Railway FRONTEND_URL
After Vercel gives you a URL:
1. Go back to Railway
2. Update FRONTEND_URL to your Vercel URL (e.g., https://qrcodekey.vercel.app)
3. Redeploy

## Done! Your app is live!
