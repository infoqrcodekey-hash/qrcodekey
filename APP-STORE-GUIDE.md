# QRCodeKey - App Store Submission Guide

## OPTION 1: PWABuilder (Easiest - Recommended)

PWABuilder by Microsoft automatically wraps your PWA into native apps.

### Steps:
1. Go to https://www.pwabuilder.com
2. Enter URL: `https://qrcodekey.vercel.app`
3. Click "Start" — it will analyze your PWA
4. Click "Package for stores"

### For Google Play Store:
- Select "Android" → Download TWA package
- You'll get a ready-to-upload APK/AAB file
- Upload to Google Play Console

### For Apple App Store:
- Select "iOS" → Download Xcode project
- Open in Xcode on a Mac
- Build and upload to App Store Connect

---

## OPTION 2: Capacitor (More Control)

### Prerequisites:
- Node.js 18+
- For iOS: Mac with Xcode 15+
- For Android: Android Studio

### Setup Steps:

```bash
cd frontend

# Install Capacitor
npm install @capacitor/core @capacitor/cli
npm install @capacitor/ios @capacitor/android
npm install @capacitor/splash-screen @capacitor/status-bar
npm install @capacitor/keyboard @capacitor/push-notifications

# Initialize (config already created)
npx cap init QRCodeKey com.qrcodekey.app

# Build Next.js for export
npx next build
npx next export

# Add platforms
npx cap add android
npx cap add ios

# Sync web code to native
npx cap sync
```

### Build Android APK:
```bash
npx cap open android
# In Android Studio: Build → Generate Signed Bundle/APK
```

### Build iOS:
```bash
npx cap open ios
# In Xcode: Product → Archive → Distribute
```

---

## STORE ACCOUNTS REQUIRED

### Google Play Console:
- URL: https://play.google.com/console
- Cost: $25 one-time fee
- Review time: 1-3 days

### Apple Developer Program:
- URL: https://developer.apple.com/programs
- Cost: $99/year (₹8,700/year)
- Review time: 1-7 days

---

## STORE LISTING DETAILS

### App Name:
QRCodeKey - Smart Attendance & QR Tracking

### Short Description (80 chars):
Smart QR attendance, GPS tracking & workforce management for organizations.

### Full Description:
QRCodeKey is the ultimate QR-based attendance and workforce management app for modern organizations.

Features:
• QR Code Attendance - GPS-verified clock-in/out with QR scanning
• Real-time Location Tracking - Track scan locations on interactive maps
• Organization Management - Create organizations, departments, and teams
• Visitor Management - Register and track visitor check-in/check-out
• Shift & Leave Management - Manage shifts, overtime, and leave requests
• Holiday Calendar - Maintain company-wide holiday calendar
• Detailed Reports - Export attendance reports in PDF/Excel
• Emergency Broadcasts - Send instant alerts to all team members
• Face Verification - Anti-proxy attendance with face recognition
• Multi-language Support - Available in 10+ languages including Hindi
• Real-time Notifications - Get instant scan alerts
• Audit Logs - Complete activity trail for compliance

Why Choose QRCodeKey?
✓ No expensive hardware needed - just your phone
✓ Works on any device with a camera
✓ Secure with end-to-end encryption
✓ Free plan available with premium upgrades
✓ GPS verification prevents proxy attendance
✓ Set up your organization in minutes

Perfect for:
- Small businesses & startups
- Schools & colleges
- Factories & warehouses
- IT companies
- Event management
- Any organization needing attendance tracking

### Category:
Business / Productivity

### Keywords:
qr code, attendance, tracking, gps, employee, workforce, clock in, check in, organization, team management

### Privacy Policy URL:
https://qrcodekey.vercel.app/privacy-policy

### Content Rating:
Everyone / 4+

### Contact Email:
info.qrcodekey@gmail.com

---

## APP ICON
Located at: `frontend/public/icons/icon-1024x1024.png`

## SCREENSHOTS NEEDED
Take screenshots of these screens at 1290x2796 (iPhone 15 Pro Max):
1. Home screen (logged in)
2. QR Code Scanner
3. Attendance Dashboard
4. Organization Management
5. Reports page
6. Profile/Settings
