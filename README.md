# 🚀 QR Code Tracking System - Complete Guide

## Full Production-Ready App — Setup, Run & Deploy

---

## 📁 Project Structure

```
qr-tracking-system/
├── backend/                    (Node.js + Express + MongoDB + Socket.io)
│   ├── config/db.js            ← MongoDB connection
│   ├── controllers/            ← Auth, QR, Track, Admin logic
│   ├── middleware/             ← JWT Auth, Rate Limiting, Validation
│   ├── models/                ← User, QRCode, ScanLog schemas
│   ├── routes/                ← API route definitions
│   ├── services/              ← Notification & Location services
│   ├── utils/seed.js          ← Database seeder (test data)
│   ├── server.js              ← Main entry point
│   └── .env.example           ← Environment variables template
│
├── frontend/                   (Next.js + Tailwind CSS)
│   ├── src/pages/             ← All pages (Home, Login, Generate, Track, Dashboard, Profile, Scan)
│   ├── src/lib/               ← API client, Socket.io, GPS utility
│   ├── src/context/           ← Auth state management
│   └── src/styles/            ← Tailwind CSS + custom styles
│
└── README.md                   ← This file
```

---

## 🏗️ STEP 1: Prerequisites

### 1.1 Install Node.js (v18+)

- **Windows:** Download LTS from https://nodejs.org/
- **Mac:** `brew install node`
- **Linux:** `curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt-get install -y nodejs`

Verify: `node --version` → should show v18.x.x

### 1.2 MongoDB Setup (Free Cloud Database)

1. Go to https://cloud.mongodb.com/ → "Try Free"
2. Sign up with Google/Email
3. "Build a Database" → Select "M0 FREE"
4. Provider: AWS, Region: closest to you
5. Click "Create Deployment"
6. Create username & password (note them!)
7. "Network Access" → "Add IP Address" → "Allow Access from Anywhere" → `0.0.0.0/0`
8. "Database" → "Connect" → "Drivers" → Copy connection string

Your connection string will look like:
```
mongodb+srv://USERNAME:PASSWORD@cluster0.xxxxx.mongodb.net/qr-tracking
```

---

## 🔧 STEP 2: Backend Setup

```bash
cd qr-tracking-system/backend
npm install
cp .env.example .env
```

Edit `.env` file — minimum required changes:
```env
MONGO_URI=mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/qr-tracking?retryWrites=true&w=majority
JWT_SECRET=your_super_secret_random_string_minimum_32_characters
FRONTEND_URL=http://localhost:3000
```

Seed database (creates test users):
```bash
npm run seed
```

Output:
```
✅ Admin: admin@qrtracker.com / admin123456
✅ User:  test@qrtracker.com / test123456
✅ QR:    QR-TEST-001 / Password: test1234
```

Start server:
```bash
npm run dev     # Development (auto-restart)
npm start       # Production
```

Verify: Open http://localhost:5000/api/health

---

## 🎨 STEP 3: Frontend Setup

```bash
cd qr-tracking-system/frontend
npm install
cp .env.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

Start frontend:
```bash
npm run dev
```

Open: http://localhost:3000

---

## 🧪 STEP 4: Testing

1. **Register** → http://localhost:3000/register
2. **Generate QR** → Fill form → Activate
3. **Simulate Scan** → Open `http://localhost:3000/scan/QR-TEST-001` in incognito
4. **Track Location** → Enter QR ID: `QR-TEST-001`, Password: `test1234`
5. **Admin Dashboard** → Login as admin@qrtracker.com / admin123456

---

## 📡 API Reference

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /api/auth/register | Create account | No |
| POST | /api/auth/login | Login | No |
| GET | /api/auth/me | Get profile | Yes |
| POST | /api/qr/generate | Generate QR code | Yes |
| GET | /api/qr/my-codes | List my QR codes | Yes |
| PUT | /api/qr/:qrId/activate | Activate QR | Yes |
| GET | /api/qr/:qrId/download | Download QR image | Yes |
| DELETE | /api/qr/:qrId | Delete QR code | Yes |
| POST | /api/track/scan/:qrId | Submit scan + GPS | No |
| POST | /api/track/view | View locations | No (password) |
| GET | /api/admin/stats | Dashboard stats | Admin |
| GET | /api/admin/users | All users | Admin |

---

## 🌐 STEP 5: Deployment

### Option A: Railway + Vercel (Easiest)

**Backend → Railway.app:**
1. Push code to GitHub
2. Railway Dashboard → "New Project" → "Deploy from GitHub"
3. Set root directory to `backend`
4. Add environment variables
5. Deploy → Get URL: `https://qr-backend-xxx.railway.app`

**Frontend → Vercel:**
1. Vercel.com → "New Project" → Select repo
2. Root Directory: `frontend`
3. Add env vars: `NEXT_PUBLIC_API_URL=https://your-railway-url/api`
4. Deploy → Get URL: `https://qr-tracker.vercel.app`

### Option B: VPS (DigitalOcean/AWS)

```bash
# Install Node.js + PM2
npm install -g pm2

# Clone, install, configure
git clone https://github.com/YOU/qr-tracking.git
cd qr-tracking/backend && npm install
cp .env.example .env && nano .env

# Start with PM2
pm2 start server.js --name "qr-backend"
pm2 save && pm2 startup

# Nginx + SSL
sudo apt install nginx certbot python3-certbot-nginx
certbot --nginx -d your-domain.com
```

---

## 🔒 Built-in Security

| Feature | Implementation |
|---------|---------------|
| Password Hashing | bcrypt (12 rounds) |
| JWT Authentication | Secure tokens with expiry |
| Rate Limiting | Per-route limits |
| Input Validation | express-validator |
| MongoDB Sanitization | express-mongo-sanitize |
| HTTP Security Headers | Helmet.js |
| CORS Protection | Whitelisted origins |
| QR Password | Separate bcrypt hash |

---

## 📧 Email Notifications Setup

1. Google Account → Security → Enable "2-Step Verification"
2. Security → "App Passwords" → Generate
3. Add to `.env`:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=xxxx-xxxx-xxxx-xxxx
```

---

## ❓ Troubleshooting

| Issue | Solution |
|-------|---------|
| MongoDB Connection Failed | Check IP whitelist (allow 0.0.0.0/0) |
| CORS Error | Set correct `FRONTEND_URL` in backend .env |
| GPS Not Working | HTTPS required (localhost HTTP is OK) |
| Socket.io Not Connecting | Check `NEXT_PUBLIC_SOCKET_URL` |
| Port Already in Use | Change PORT in .env or kill process |

---

Built with ❤️ — QR Code Tracking System
