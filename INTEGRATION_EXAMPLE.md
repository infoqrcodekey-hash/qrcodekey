# Email Notification Integration - Code Example

## How to Use the Email Service

### 1. Basic Integration (Already Implemented)

The integration is automatically handled in `trackController.js` when a QR code is scanned.

**No additional code needed** - it's already implemented!

### 2. Manual Email Sending (Optional)

If you need to send emails from other parts of your application:

```javascript
const emailService = require('./services/emailService');

// Send a scan notification email
const ownerEmail = 'user@example.com';
const qrId = 'QR-ABC123XYZ';
const scanData = {
  city: 'San Francisco',
  country: 'United States',
  device: {
    userAgent: 'Mozilla/5.0...',
    browser: 'Chrome 120',
    os: 'Windows 10',
    deviceType: 'desktop',
    brand: 'Unknown'
  },
  deviceType: 'desktop',
  time: new Date(),
  locationSource: 'gps',
  latitude: 37.7749,
  longitude: -122.4194,
  category: 'car',
  totalScans: 5
};

// Send email asynchronously (non-blocking)
emailService.sendScanNotification(ownerEmail, qrId, scanData)
  .then(success => {
    if (success) {
      console.log('Email sent successfully');
    } else {
      console.log('Email could not be sent');
    }
  })
  .catch(err => {
    console.error('Email error:', err);
  });
```

### 3. Test Email Service

```javascript
const emailService = require('./services/emailService');

// Send a test email
const result = await emailService.sendTestEmail('your-email@example.com');
console.log(result);
// Output: { success: true, message: 'Test email sent successfully!' }
```

### 4. Check Configuration Status

```javascript
const emailService = require('./services/emailService');

const isConfigured = emailService.isEmailConfigured();
console.log('Email service ready:', isConfigured);
// Output: Email service ready: true
```

## Environment Variables Required

Add these to your `.env` file:

```env
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_SECURE=false

# Optional - Sender information
FROM_EMAIL=notifications@yourdomain.com
FROM_NAME=QR Tracker
```

### For Gmail:

1. Enable 2-Factor Authentication
2. Generate an App Password: https://myaccount.google.com/apppasswords
3. Use the 16-character password as `SMTP_PASS`

### For Other Providers:

Check your email provider's SMTP settings:
- Host: Usually `smtp.yourdomain.com`
- Port: Usually `587` (TLS) or `465` (SSL)
- Username: Your email or custom username
- Password: Your password or app-specific password

## Implementation Details

### Where Email is Triggered

In `trackController.js`, the `handleScan()` function:

```javascript
// Step 11: Send Email Notification
// Fire and forget - async in background, doesn't delay response
if (qr.notifyEmail && qr.notifyOnScan) {
  try {
    const owner = await User.findById(qr.owner);
    if (owner && owner.email) {
      // Send email asynchronously without awaiting
      emailService.sendScanNotification(
        owner.email,
        qr.qrId,
        {
          city: address.city,
          country: address.country,
          device: device,
          deviceType: device.deviceType,
          time: new Date(),
          locationSource: locationSource,
          latitude: finalLat,
          longitude: finalLng,
          category: qr.category,
          totalScans: qr.totalScans
        }
      ).catch(err => {
        console.error('Email Notification Error:', err.message);
      });
    }
  } catch (error) {
    console.error('Error sending email notification:', error.message);
  }
}
```

### Key Design Decisions

1. **Non-blocking:** Email is sent with `.catch()` handler, not `await`
2. **Conditional:** Only sends if both `qr.notifyEmail` AND `qr.notifyOnScan` are true
3. **Safe:** Try-catch prevents email errors from breaking scan processing
4. **Silent Failure:** Missing credentials are handled gracefully
5. **Async:** Uses promise-based approach for fire-and-forget pattern

## Email Content Structure

### HTML Email Parts:

```
┌─ Header (Gradient Banner)
│  └─ "🔔 QR Code Scan Alert"
│
├─ Content Section
│  ├─ QR Code Details
│  │  ├─ QR ID
│  │  ├─ Category with Emoji
│  │  └─ Scanned At (formatted date/time)
│  │
│  ├─ Location Information
│  │  ├─ Location (City, Country)
│  │  ├─ Device Type
│  │  ├─ Coordinates
│  │  └─ Accuracy Indicator (GPS/IP/Fallback)
│  │
│  ├─ Scan Statistics
│  │  └─ Total Scans Counter
│  │
│  └─ Action Button
│     └─ "View Location on Map" (Google Maps link)
│
└─ Footer
   └─ Copyright & Disclaimer
```

## Response Times

- **Scan Response:** Immediate (email sent in background)
- **Email Delivery:** 1-5 seconds typically (depends on SMTP provider)
- **No Impact:** Email delays do not affect scan API response time

## Error Scenarios

### Scenario 1: Email Not Configured
```
⚠️ Email credentials not configured. Email notifications will be skipped.
→ Email is not sent, scan continues normally
```

### Scenario 2: SMTP Connection Failed
```
❌ Email notification error: SMTP connection failed
→ Error is logged, scan continues normally
```

### Scenario 3: Invalid Owner Email
```
(No error) - Owner lookup fails, email is silently skipped
→ Scan continues normally
```

### Scenario 4: Email Disabled on QR Code
```
(No error) - qr.notifyEmail is false, email is skipped
→ Scan continues normally
```

## Testing the Integration

### Test 1: Verify Configuration

```bash
# Check if service loaded successfully
grep "Email service" your-app.log
# Expected: "✅ Email service configured and ready"
```

### Test 2: Trigger Test Email

```javascript
// In your route or admin panel
app.post('/api/test-email', async (req, res) => {
  const emailService = require('./services/emailService');
  const result = await emailService.sendTestEmail('your-email@example.com');
  res.json(result);
});
```

### Test 3: Simulate QR Scan

Make a scan request:

```bash
curl -X POST http://localhost:5000/api/track/scan/QR-TEST123 \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 37.7749,
    "longitude": -122.4194,
    "accuracy": 10,
    "altitude": 50
  }'
```

Check logs for:
```
📧 Email sent to user@example.com for QR scan: QR-TEST123
```

## Performance Considerations

### Email Throughput
- Current implementation: 1 email per scan
- If high volume: Consider implementing batch/queue system
- Provider limits: Gmail ~300 emails/hour, others vary

### Optimization Options
1. **Queue System:** Use Bull/Redis for email queue
2. **Batching:** Collect scans and send digest emails
3. **Caching:** Cache owner data to reduce DB queries
4. **Rate Limiting:** Skip emails if same location scanned multiple times

## Debugging

### Enable Detailed Logging

Add to emailService.js initialization:

```javascript
// After creating transporter
if (emailTransporter) {
  emailTransporter.verify((error, success) => {
    if (error) {
      console.error('SMTP Error:', error);
    } else {
      console.log('SMTP Connection OK');
    }
  });
}
```

### Common Debug Checks

```javascript
// 1. Check configuration
const emailService = require('./services/emailService');
console.log('Configured:', emailService.isEmailConfigured());

// 2. Check environment variables
console.log('SMTP_USER:', process.env.SMTP_USER ? 'SET' : 'MISSING');
console.log('SMTP_PASS:', process.env.SMTP_PASS ? 'SET' : 'MISSING');

// 3. Test sending
const result = await emailService.sendTestEmail('test@example.com');
console.log('Test result:', result);
```

## API Integration Points

### QRCode Model Required Fields
- `owner` (ObjectId) - Reference to User
- `notifyEmail` (Boolean) - Email notification enabled
- `notifyOnScan` (Boolean) - Notifications enabled
- `category` (String) - Item category
- `qrId` (String) - QR Code identifier
- `totalScans` (Number) - Scan counter

### User Model Required Fields
- `_id` (ObjectId) - User identifier
- `email` (String) - Email address

### Both fields are already in the models!

## Rate Limiting Recommendations

If you want to avoid email spam:

```javascript
// Add to trackController.js Step 11

// Rate limiting: Only send email if last email was > 5 minutes ago
const lastEmailTime = qr.lastEmailNotificationTime || new Date(0);
const timeSinceLastEmail = new Date() - lastEmailTime;
const minIntervalMs = 5 * 60 * 1000; // 5 minutes

if (qr.notifyEmail && qr.notifyOnScan && timeSinceLastEmail > minIntervalMs) {
  // Send email...
  qr.lastEmailNotificationTime = new Date();
  await qr.save();
}
```

## Summary

The email notification system is:
- ✅ Already integrated into scan handler
- ✅ Non-blocking (fire-and-forget)
- ✅ Error-safe (won't break scan functionality)
- ✅ Configurable via environment variables
- ✅ Gracefully handles missing configuration
- ✅ Provides detailed console logging
- ✅ Uses professional dark-themed HTML template
- ✅ Includes location maps and device information

**No additional setup required** - just configure your SMTP credentials in `.env` and emails will start sending!
