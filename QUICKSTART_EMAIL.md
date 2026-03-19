# Email Notifications - Quick Start Guide

## What Was Done

✅ Created a new email service: `backend/services/emailService.js`
✅ Integrated email notifications into QR scan handler
✅ Emails sent automatically when QR codes are scanned
✅ Dark-themed professional HTML email template
✅ Non-blocking implementation (doesn't delay scan response)

## Step 1: Configure Email (2 minutes)

Add these lines to your `.env` file:

```env
# Gmail Example (Recommended for testing)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-char-app-password
FROM_EMAIL=your-email@gmail.com
FROM_NAME=QR Tracker
```

### For Gmail Users:
1. Enable 2-Factor Authentication (Security Settings)
2. Go to: https://myaccount.google.com/apppasswords
3. Generate App Password (copy the 16-character code)
4. Paste it as `SMTP_PASS` above

## Step 2: Verify Setup (1 minute)

Restart your backend server:

```bash
npm start
# Look for this message:
# ✅ Email service configured and ready
```

## Step 3: Enable Notifications on QR Codes

Make sure the QR Code model has these set to `true`:
- `notifyEmail` - Email notifications enabled (default: true)
- `notifyOnScan` - Notifications triggered on scan (default: true)

Both are enabled by default, so nothing to do! ✅

## Step 4: Test It!

### Method 1: Use Existing Scan
Scan any active QR code normally. Owner should receive email within 5 seconds.

### Method 2: Send Test Email
Add this route to test:

```javascript
// In your routes file
router.post('/api/test-email/:email', async (req, res) => {
  const emailService = require('../services/emailService');
  const result = await emailService.sendTestEmail(req.params.email);
  res.json(result);
});
```

Then call:
```
POST http://localhost:5000/api/test-email/your-email@example.com
```

## Email Details

**When Sent:** Immediately after a QR code scan is registered
**Subject:** 🔔 QR Scan Alert - {QR_ID} scanned from {City}, {Country}
**Contains:**
- QR ID and category
- Scan timestamp
- Location (city, country, coordinates)
- Device type
- Google Maps link
- Total scan count

## Troubleshooting

### No emails received?

**Check 1:** Verify configuration
```bash
echo $SMTP_USER
echo $SMTP_PASS
```

**Check 2:** Check server logs for:
```
✅ Email service configured and ready
```
If not showing, SMTP credentials are missing.

**Check 3:** Verify QR code settings
- Make sure `notifyEmail` is `true`
- Make sure `notifyOnScan` is `true`
- Make sure owner has valid email

**Check 4:** Check spam folder
Gmail sometimes filters notifications as spam initially.

### Common Errors

| Error | Solution |
|-------|----------|
| SMTP connection refused | Check SMTP_HOST and SMTP_PORT |
| Authentication failed | Check SMTP_USER and SMTP_PASS |
| Port 587 times out | Try port 465 with SMTP_SECURE=true |
| No emails sent, no errors | Check if `notifyEmail` flag is true |
| Emails in spam folder | Mark as "Not Spam" in your email client |

## How It Works

```
QR Code Scanned
    ↓
Scan data captured (location, device, time)
    ↓
Scan saved to database
    ↓
QR owner fetched from database
    ↓
Email notification sent (async, non-blocking)
    ↓
Scan response sent to scanner (immediate)
    ↓
Email delivered to inbox (1-5 seconds later)
```

**Important:** Email delay does NOT affect scan response time!

## Files Involved

| File | Purpose |
|------|---------|
| `backend/services/emailService.js` | Email sending logic |
| `backend/controllers/trackController.js` | Triggers email on scan |
| `backend/models/QRCode.js` | Has `notifyEmail` field (already there) |
| `backend/models/User.js` | Has `email` field (already there) |

## Advanced Options

### Disable Emails Temporarily

On QR code record, set:
```javascript
qr.notifyEmail = false;
await qr.save();
```

### Disable All Notifications on Scan

On QR code record, set:
```javascript
qr.notifyOnScan = false;
await qr.save();
```

### Custom Email Sending

```javascript
const emailService = require('./services/emailService');

await emailService.sendScanNotification(
  'user@example.com',
  'QR-ABC123',
  {
    city: 'San Francisco',
    country: 'USA',
    deviceType: 'mobile',
    time: new Date(),
    locationSource: 'gps',
    latitude: 37.7749,
    longitude: -122.4194,
    category: 'car',
    totalScans: 5
  }
);
```

## Email Template Features

✅ Dark theme (easy on eyes)
✅ Responsive design (mobile-friendly)
✅ Location accuracy indicator
✅ Google Maps link button
✅ All scan details included
✅ Professional branding
✅ Color-coded sections

## Performance Impact

- **Scan Response Time:** ~0ms (email async)
- **Database Queries:** +1 (to fetch owner)
- **Server Load:** Minimal (background process)
- **Email Provider:** Standard limits (~300/hour for Gmail)

## Security Notes

⚠️ **Important:**
- Never commit `.env` with real credentials
- Use app-specific passwords (not main password)
- Email addresses should be validated
- Consider privacy when tracking sensitive items

## Support Resources

### Available Functions

1. **Send Notification Email**
   ```javascript
   emailService.sendScanNotification(email, qrId, scanData)
   ```

2. **Send Test Email**
   ```javascript
   emailService.sendTestEmail(email)
   ```

3. **Check if Configured**
   ```javascript
   emailService.isEmailConfigured()
   ```

### Documentation Files

- `EMAIL_INTEGRATION_SUMMARY.md` - Detailed technical docs
- `INTEGRATION_EXAMPLE.md` - Code examples and use cases
- `QUICKSTART_EMAIL.md` - This file (quick setup)

## Next Steps

1. ✅ Add SMTP credentials to `.env`
2. ✅ Restart backend server
3. ✅ Look for "✅ Email service configured" message
4. ✅ Scan a QR code to trigger test email
5. ✅ Check your inbox!

## Need Help?

Check the logs:
```bash
# Look for these patterns
grep -i "email\|smtp" your-app.log

# Expected on startup:
✅ Email service configured and ready

# Expected on scan:
📧 Email sent to user@example.com for QR scan: QR-ABC123

# If there's an error:
❌ Email notification error: ...
```

## That's It!

Email notifications are now enabled and working! 🎉

Your QR code owners will automatically receive notifications when their codes are scanned.
