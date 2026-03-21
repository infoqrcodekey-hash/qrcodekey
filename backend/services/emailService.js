// ============================================
// services/emailService.js - Email Service
// ============================================
// Handles email notifications for QR scan events
// Uses nodemailer with SMTP configuration from environment

const nodemailer = require('nodemailer');

// ====== Email Transporter Setup ======
let emailTransporter;
try {
  // Try to configure email transporter from environment variables
  const smtpConfig = {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true' || false,
    auth: {
      user: process.env.SMTP_USER || process.env.EMAIL_USER,
      pass: process.env.SMTP_PASS || process.env.EMAIL_PASS
    }
  };

  // Only create transporter if we have credentials
  if (smtpConfig.auth.user && smtpConfig.auth.pass) {
    emailTransporter = nodemailer.createTransport(smtpConfig);
    console.log('✅ Email service configured and ready');
  } else {
    console.warn('⚠️ Email credentials not configured (SMTP_USER/SMTP_PASS or EMAIL_USER/EMAIL_PASS). Email notifications will be skipped.');
  }
} catch (err) {
  console.warn('⚠️ Email service initialization error:', err.message);
}

// ====== Category Emoji Map ======
const categoryEmoji = {
  child: '👶',
  car: '🚗',
  bag: '👜',
  pet: '🐕',
  key: '🔑',
  luggage: '🧳',
  other: '📦'
};

// ====== MAIN: Send Scan Notification Email ======
/**
 * Send email notification when a QR code is scanned
 * @param {String} ownerEmail - Email address of QR code owner
 * @param {String} qrId - QR Code ID (e.g., "QR-ABC123")
 * @param {Object} scanData - Scan location and device data
 *   - city: String (location city)
 *   - country: String (location country)
 *   - device: Object (device information)
 *   - deviceType: String (mobile/tablet/desktop)
 *   - time: Date (scan timestamp)
 *   - locationSource: String (gps/ip/fallback)
 *   - latitude: Number
 *   - longitude: Number
 *   - category: String (child/car/bag/pet/key/luggage/other)
 *   - totalScans: Number (total scans for this QR)
 */
exports.sendScanNotification = async (ownerEmail, qrId, scanData) => {
  // Validate required parameters
  if (!ownerEmail || !qrId || !scanData) {
    console.warn('⚠️ Missing required parameters for email notification');
    return false;
  }

  // Check if email service is configured
  if (!emailTransporter) {
    console.warn('⚠️ Email service not configured. Skipping notification.');
    return false;
  }

  try {
    const {
      city = 'Unknown',
      country = 'Unknown',
      device = {},
      deviceType = 'Unknown',
      time = new Date(),
      locationSource = 'unknown',
      latitude = 0,
      longitude = 0,
      category = 'other',
      totalScans = 0
    } = scanData;

    // Format location text
    const locationText = city !== 'Unknown' && country !== 'Unknown'
      ? `${city}, ${country}`
      : `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`;

    // Generate map link
    const mapLink = `https://maps.google.com/?q=${latitude},${longitude}`;

    // Get emoji for category
    const emoji = categoryEmoji[category] || '📦';

    // Format scan time
    const scanTime = new Date(time).toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    });

    // Determine location accuracy indicator
    const locationAccuracy = locationSource === 'gps'
      ? '✓ Precise GPS Location'
      : locationSource === 'ip'
      ? '📡 IP-Based Location'
      : '📍 Fallback Location';

    // Build HTML email template with dark theme
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #0f172a;
            margin: 0;
            padding: 0;
            color: #e2e8f0;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #1e293b;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
          }
          .header {
            background: linear-gradient(135deg, #6366f1, #a855f7);
            padding: 32px 24px;
            text-align: center;
            color: white;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 700;
          }
          .content {
            padding: 32px 24px;
          }
          .content p {
            margin: 12px 0;
            line-height: 1.6;
          }
          .greeting {
            font-size: 16px;
            color: #e2e8f0;
            margin-bottom: 20px;
          }
          .qr-info {
            background-color: #0f172a;
            border-left: 4px solid #6366f1;
            border-radius: 8px;
            padding: 20px;
            margin: 24px 0;
          }
          .qr-info-title {
            font-size: 14px;
            font-weight: 600;
            color: #6366f1;
            margin-bottom: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #334155;
          }
          .info-row:last-child {
            border-bottom: none;
          }
          .info-label {
            font-weight: 600;
            color: #94a3b8;
            min-width: 140px;
          }
          .info-value {
            color: #e2e8f0;
            text-align: right;
            word-break: break-word;
          }
          .location-section {
            background-color: #1a237e;
            border-left: 4px solid #a855f7;
            border-radius: 8px;
            padding: 20px;
            margin: 24px 0;
          }
          .location-accuracy {
            font-size: 12px;
            color: #a78bfa;
            margin-bottom: 8px;
          }
          .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #6366f1, #a855f7);
            color: white;
            padding: 14px 32px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            margin: 24px 0;
            text-align: center;
          }
          .cta-button:hover {
            opacity: 0.9;
          }
          .footer {
            background-color: #0f172a;
            padding: 20px 24px;
            text-align: center;
            border-top: 1px solid #334155;
          }
          .footer p {
            font-size: 12px;
            color: #64748b;
            margin: 0;
          }
          .scan-count {
            background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.1));
            border-radius: 8px;
            padding: 16px;
            margin: 20px 0;
            text-align: center;
          }
          .scan-count-number {
            font-size: 28px;
            font-weight: 700;
            color: #a855f7;
            margin: 0;
          }
          .scan-count-label {
            font-size: 12px;
            color: #94a3b8;
            margin: 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <!-- Header -->
          <div class="header">
            <h1>🔔 QR Code Scan Alert</h1>
          </div>

          <!-- Content -->
          <div class="content">
            <p class="greeting">Your QR Code has been scanned!</p>

            <!-- QR Details -->
            <div class="qr-info">
              <div class="qr-info-title">QR Code Details</div>
              <div class="info-row">
                <span class="info-label">QR ID:</span>
                <span class="info-value"><strong>${qrId}</strong></span>
              </div>
              <div class="info-row">
                <span class="info-label">Category:</span>
                <span class="info-value">${emoji} ${category.charAt(0).toUpperCase() + category.slice(1)}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Scanned At:</span>
                <span class="info-value">${scanTime}</span>
              </div>
            </div>

            <!-- Location Information -->
            <div class="location-section">
              <div class="location-accuracy">${locationAccuracy}</div>
              <div class="info-row">
                <span class="info-label">Location:</span>
                <span class="info-value">${locationText}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Device:</span>
                <span class="info-value">${deviceType.charAt(0).toUpperCase() + deviceType.slice(1)}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Coordinates:</span>
                <span class="info-value">${latitude.toFixed(4)}, ${longitude.toFixed(4)}</span>
              </div>
            </div>

            <!-- Scan Count -->
            <div class="scan-count">
              <p class="scan-count-number">${totalScans}</p>
              <p class="scan-count-label">Total Scans</p>
            </div>

            <!-- Map Button -->
            <a href="${mapLink}" class="cta-button">📍 View Location on Map</a>
          </div>

          <!-- Footer -->
          <div class="footer">
            <p>QR Tracker - Real-time Location Tracking System</p>
            <p>This is an automated notification. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email
    const mailOptions = {
      from: `"QR Tracker" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
      to: ownerEmail,
      subject: `🔔 QR Scan Alert - ${qrId} scanned from ${locationText}`,
      html
    };

    await emailTransporter.sendMail(mailOptions);
    console.log(`📧 Email sent to ${ownerEmail} for QR scan: ${qrId}`);
    return true;

  } catch (error) {
    console.error('❌ Email notification error:', error.message);
    // Don't throw - fail silently so email issues don't affect scan process
    return false;
  }
};

// ====== Send Finder Registration Notification ======
/**
 * Notify QR owner that someone found their item and submitted contact info
 */
exports.sendFinderNotification = async (ownerEmail, qrId, finderData) => {
  if (!emailTransporter || !ownerEmail) return false;

  try {
    const { finderName, finderPhone, finderEmail, finderMessage, category, registeredName } = finderData;
    const emoji = categoryEmoji[category] || '📦';

    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="font-family: 'Segoe UI', sans-serif; background-color: #0f172a; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #1e293b; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.3);">
          <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 32px 24px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 24px;">🎉 Someone Found Your ${emoji} ${category}!</h1>
          </div>
          <div style="padding: 32px 24px; color: #e2e8f0;">
            <p style="font-size: 16px;">Good news! Someone scanned your QR Code <strong>${qrId}</strong> and submitted their contact information.</p>

            <div style="background-color: #0f172a; border-left: 4px solid #10b981; border-radius: 8px; padding: 20px; margin: 24px 0;">
              <div style="font-size: 14px; font-weight: 600; color: #10b981; margin-bottom: 12px; text-transform: uppercase;">Finder Details</div>
              <p style="margin: 8px 0; color: #e2e8f0;"><strong>👤 Name:</strong> ${finderName}</p>
              <p style="margin: 8px 0; color: #e2e8f0;"><strong>📱 Phone:</strong> <a href="tel:${finderPhone}" style="color: #6366f1; text-decoration: none;">${finderPhone}</a></p>
              <p style="margin: 8px 0; color: #e2e8f0;"><strong>📧 Email:</strong> ${finderEmail}</p>
              <p style="margin: 8px 0; color: #e2e8f0;"><strong>💬 Message:</strong> ${finderMessage}</p>
            </div>

            <div style="background-color: #0f172a; border-left: 4px solid #6366f1; border-radius: 8px; padding: 20px; margin: 24px 0;">
              <div style="font-size: 14px; font-weight: 600; color: #6366f1; margin-bottom: 12px; text-transform: uppercase;">Your QR Code</div>
              <p style="margin: 8px 0; color: #e2e8f0;"><strong>🏷️ QR ID:</strong> ${qrId}</p>
              <p style="margin: 8px 0; color: #e2e8f0;"><strong>${emoji} Category:</strong> ${category}</p>
              <p style="margin: 8px 0; color: #e2e8f0;"><strong>👤 Registered:</strong> ${registeredName || 'N/A'}</p>
            </div>

            <a href="tel:${finderPhone}" style="display: inline-block; background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 16px 0;">📞 Call Finder Now</a>
          </div>
          <div style="background-color: #0f172a; padding: 20px 24px; text-align: center; border-top: 1px solid #334155;">
            <p style="font-size: 12px; color: #64748b; margin: 0;">QRCodeKey - Real-time Location Tracking System</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await emailTransporter.sendMail({
      from: `"QRCodeKey" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
      to: ownerEmail,
      subject: `🎉 Someone found your ${emoji} ${category}! - ${qrId} | Contact: ${finderName}`,
      html
    });

    console.log(`📧 Finder notification sent to ${ownerEmail} for QR: ${qrId}`);
    return true;
  } catch (error) {
    console.error('❌ Finder email error:', error.message);
    return false;
  }
};

// ====== Send Test Email ======
/**
 * Send a test email to verify email service is configured correctly
 * @param {String} email - Email address to send test to
 * @returns {Object} Result with success status and message
 */
exports.sendTestEmail = async (email) => {
  if (!emailTransporter) {
    return {
      success: false,
      message: 'Email service not configured. Please check SMTP_USER and SMTP_PASS environment variables.'
    };
  }

  try {
    await emailTransporter.sendMail({
      from: `"QR Tracker" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
      to: email,
      subject: '✅ QR Tracker - Test Email',
      html: `
        <div style="font-family: Arial, sans-serif; background-color: #1e293b; color: #e2e8f0; padding: 20px; border-radius: 8px;">
          <h2 style="color: #6366f1;">✅ Email Service Working!</h2>
          <p>Your QR Tracker email notification system is configured correctly.</p>
          <p>You will now receive email notifications when your QR codes are scanned.</p>
        </div>
      `
    });
    return {
      success: true,
      message: 'Test email sent successfully!'
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to send test email: ${error.message}`
    };
  }
};

// ====== Check Email Service Status ======
/**
 * Check if email service is properly configured
 * @returns {Boolean} true if email service is ready
 */
exports.isEmailConfigured = () => {
  return !!emailTransporter && !!(process.env.SMTP_USER || process.env.EMAIL_USER);
};
