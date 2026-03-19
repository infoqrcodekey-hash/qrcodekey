# QR Code Tracking System - Email Notification Integration

## Summary

Successfully integrated email notification system for QR code scans. When a QR code is scanned, the QR code owner will receive a professional HTML email with scan details, location information, and a map link.

## Files Created

### 1. `/backend/services/emailService.js` (NEW - 388 lines)

A dedicated email service module that handles sending scan notification emails.

**Key Features:**
- Uses nodemailer with SMTP configuration
- Supports both `SMTP_*` and `EMAIL_*` environment variable naming conventions
- Gracefully skips notifications if email not configured (won't crash)
- Professional dark-themed HTML email template with:
  - Header with gradient branding
  - QR Code details (ID, category, scan time)
  - Location information (city, country, coordinates)
  - Location accuracy indicator (GPS/IP/Fallback)
  - Device information
  - Scan count tracker
  - Google Maps link button
  - Dark theme styling

**Exported Functions:**
- `sendScanNotification(ownerEmail, qrId, scanData)` - Main function to send scan notification email
- `sendTestEmail(email)` - Send test email to verify configuration
- `isEmailConfigured()` - Check if email service is properly configured

**Email Template Details:**
- Subject: `🔔 QR Scan Alert - {qrId} scanned from {city}, {country}`
- Dark theme with purple/indigo gradients
- Responsive HTML design
- Includes location accuracy indicator
- Google Maps link with exact coordinates

## Files Updated

### 2. `/backend/controllers/trackController.js` (MODIFIED)

**Changes Made:**

1. **Added imports:**
   - `const User = require('../models/User');`
   - `const emailService = require('../services/emailService');`

2. **Added Step 11 in `handleScan()` function:**
   - After QR code scan is saved and WebSocket notifications are sent
   - Checks both `qr.notifyEmail` AND `qr.notifyOnScan` flags
   - Fetches the QR code owner to get their email
   - Sends email asynchronously (fire-and-forget pattern)
   - Includes try-catch to prevent email failures from affecting scan response
   - Passes all necessary scan data: city, country, device, time, location source, coordinates, category, total scans

## How It Works

### Notification Trigger Flow:
1. QR code is scanned via `/api/track/scan/:qrId`
2. Scan location and device info are captured
3. Scan log is saved to database
4. QR code total scans counter is incremented
5. WebSocket notifications are sent to connected clients
6. **NEW**: Email notification is sent asynchronously:
   - Owner is fetched from User model
   - If `qr.notifyEmail` && `qr.notifyOnScan` are both true
   - Email is queued in background (non-blocking)
   - If email fails, it doesn't affect the scan response
7. Success response is sent to the scanner

### Email Configuration

**Required Environment Variables:**

Choose ONE of these pairs:
```env
# Option 1: Gmail SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Option 2: Generic SMTP
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587
SMTP_USER=your-username
SMTP_PASS=your-password

# Option 3: Alternative naming
EMAIL_USER=your-email@domain.com
EMAIL_PASS=your-password

# Optional
FROM_EMAIL=notifications@yourcompany.com
FROM_NAME=QR Tracker
SMTP_SECURE=false  # Set to true for SSL (port 465)
```

### Email Notification Conditions

Emails are sent when ALL of the following are true:
1. QR code is successfully scanned and activated
2. `qr.notifyEmail` = true (notification enabled on QR code)
3. `qr.notifyOnScan` = true (notifications enabled on QR code)
4. Email service is configured (SMTP credentials present)
5. Owner has a valid email address

### Email Won't Be Sent If:
- Email credentials are not configured in .env
- QR code owner cannot be found
- Owner doesn't have an email address
- `qr.notifyEmail` or `qr.notifyOnScan` are false

**No errors are thrown** - the system logs a warning and continues normally.

## Email Template Details

### Dark Theme Styling
- Background: Dark slate (#1e293b, #0f172a)
- Text: Light gray (#e2e8f0, #94a3b8)
- Accent: Purple/Indigo gradient (#6366f1, #a855f7)
- Professional and easy on the eyes

### Information Displayed
1. **QR Details:**
   - QR Code ID
   - Category with emoji (👶 child, 🚗 car, 🐕 pet, etc.)
   - Exact scan timestamp

2. **Location Information:**
   - City and Country
   - Coordinates (lat/lng)
   - Location Source (GPS, IP-based, Fallback)
   - Accuracy indicator
   - Google Maps button with live location link

3. **Device Information:**
   - Device type (mobile, tablet, desktop)
   - Browser (extracted from user agent)

4. **Statistics:**
   - Total number of scans for this QR code

## Testing

### Test Email Configuration

Use the `sendTestEmail()` function:
```javascript
const emailService = require('../services/emailService');

// Send test email
const result = await emailService.sendTestEmail('test@example.com');
console.log(result);
```

### Check Configuration Status

```javascript
const emailService = require('../services/emailService');

const isConfigured = emailService.isEmailConfigured();
console.log('Email service ready:', isConfigured);
```

## Error Handling

### Design Philosophy: "Fail Silently"

- Email sending runs in background (non-blocking)
- Email failures do NOT affect the scan response
- All errors are logged to console for debugging
- System continues to function normally even if email service is down
- No database errors from email processing

### Logging

The system provides clear console output:
```
✅ Email service configured and ready
📧 Email sent to user@example.com for QR scan: QR-ABC123
❌ Email notification error: SMTP connection failed
⚠️ Email service not configured. Skipping notification.
```

## Dependencies

The system uses `nodemailer` which is already in the project's package.json.

No additional npm packages need to be installed.

## Future Enhancements

Possible improvements:
1. Add email templates to database for customization
2. Track email delivery status in ScanLog model
3. Add email unsubscribe links
4. Support multiple recipient emails per QR
5. Add email scheduling/batching
6. Email attachments (scan map screenshot)
7. Weekly/monthly scan digest emails

## Security Considerations

1. **Email Credentials:**
   - Never commit .env files with real credentials
   - Use app-specific passwords for Gmail (not main account password)
   - Rotate SMTP credentials regularly

2. **Data Privacy:**
   - Exact coordinates are sent in Google Maps link (public link)
   - Consider privacy implications before enabling for sensitive items
   - Email addresses should be validated and private

3. **Rate Limiting:**
   - Current implementation sends email for every scan
   - Consider adding rate limiting for frequent scans from same location
   - Email providers have rate limits - consider batching if needed

## Troubleshooting

### Emails not being sent:

1. **Check environment variables:**
   ```bash
   echo $SMTP_USER
   echo $SMTP_PASS
   ```

2. **Check logs:**
   - Look for "✅ Email service configured" message on app startup
   - Look for "📧 Email sent to" or "❌ Email notification error" on scans

3. **Test configuration:**
   - Use `sendTestEmail()` function to verify SMTP works
   - Check firewall/port restrictions (port 587 for TLS, 465 for SSL)

4. **Common issues:**
   - Gmail: Might need "Less secure app access" enabled or app-specific password
   - SMTP Port: Verify correct port (587 for TLS, 465 for SSL, 25 for unencrypted)
   - Authentication: Verify username and password are correct
   - TLS/SSL: Ensure SMTP_SECURE setting matches port

## File Locations

- Email Service: `/backend/services/emailService.js`
- Track Controller: `/backend/controllers/trackController.js`
- QRCode Model: `/backend/models/QRCode.js` (has `notifyEmail` and `notifyOnScan` fields)
- User Model: `/backend/models/User.js` (has `email` field)

## Integration Checklist

- [x] Created emailService.js with nodemailer integration
- [x] Implemented sendScanNotification() function
- [x] Created professional dark-themed HTML email template
- [x] Updated trackController.js to import emailService
- [x] Added email sending logic after successful scan save
- [x] Implemented async/non-blocking email dispatch
- [x] Added try-catch error handling
- [x] Added email configuration validation
- [x] Implemented fallback behavior for missing credentials
- [x] Added test email function
- [x] Added configuration status check function
- [x] Verified owner population for email lookup
- [x] Tested integration with existing notification system
