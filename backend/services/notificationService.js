// ============================================
// services/notificationService.js
// ============================================
// System for sending Email, SMS, Push Notifications
// Sends scan alerts to premium users

const nodemailer = require('nodemailer');
const User = require('../models/User');

// ====== Email Transporter Setup ======
let emailTransporter;
try {
  emailTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
} catch (err) {
  console.warn('⚠️ Email service not configured:', err.message);
}

// ====== MAIN: Send Scan Notification ======
exports.sendScanNotification = async (qrCode, scanLog) => {
  try {
    // Find the QR Code owner
    const owner = await User.findById(qrCode.owner);
    if (!owner) return;

    // Free users don't get notifications (can only view in app)
    if (!owner.isPremium()) {
      console.log(`ℹ️ Skipping notification for free user: ${owner.email}`);
      return;
    }

    const locationText = scanLog.address?.city !== 'Unknown' 
      ? `${scanLog.address.city}, ${scanLog.address.country}`
      : `Lat: ${scanLog.latitude.toFixed(4)}, Lng: ${scanLog.longitude.toFixed(4)}`;

    // ----- Email Notification -----
    if (qrCode.notifyEmail) {
      await sendEmail(owner, qrCode, scanLog, locationText);
    }

    // ----- SMS Notification -----
    if (qrCode.notifySMS && owner.phone) {
      await sendSMS(owner, qrCode, locationText);
    }

    // ----- Push Notification -----
    if (qrCode.notifyPush && owner.fcmToken) {
      await sendPushNotification(owner, qrCode, locationText);
    }

  } catch (error) {
    console.error('Notification Service Error:', error.message);
  }
};

// ====== Send Email ======
async function sendEmail(owner, qrCode, scanLog, locationText) {
  if (!emailTransporter || !process.env.SMTP_USER) {
    console.warn('⚠️ Email not configured. Skipping email notification.');
    return;
  }

  try {
    const categoryEmoji = {
      child: '👶', car: '🚗', bag: '👜', pet: '🐕',
      key: '🔑', luggage: '🧳', other: '📦'
    };

    const emoji = categoryEmoji[qrCode.category] || '📦';
    const mapLink = `https://maps.google.com/?q=${scanLog.latitude},${scanLog.longitude}`;

    const html = `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 500px; margin: 0 auto; background: #f8f9fa; border-radius: 16px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #6366f1, #a855f7); padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 22px;">🔔 QR Scan Alert!</h1>
        </div>
        <div style="padding: 24px;">
          <p style="font-size: 16px; color: #333;">Hello <strong>${owner.name}</strong>,</p>
          <p style="font-size: 14px; color: #555;">Your QR Code <strong>${qrCode.qrId}</strong> was just scanned!</p>
          
          <div style="background: white; border-radius: 12px; padding: 16px; margin: 16px 0; border-left: 4px solid #6366f1;">
            <p style="margin: 4px 0;"><strong>${emoji} Category:</strong> ${qrCode.category}</p>
            <p style="margin: 4px 0;"><strong>📍 Location:</strong> ${locationText}</p>
            <p style="margin: 4px 0;"><strong>📱 Device:</strong> ${scanLog.device?.deviceType || 'Unknown'}</p>
            <p style="margin: 4px 0;"><strong>🕐 Time:</strong> ${new Date().toLocaleString('en-US')}</p>
            <p style="margin: 4px 0;"><strong>📊 Total Scans:</strong> ${qrCode.totalScans}</p>
          </div>

          <a href="${mapLink}" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            📍 View on Map
          </a>
        </div>
        <div style="background: #f1f5f9; padding: 12px; text-align: center;">
          <p style="font-size: 11px; color: #888; margin: 0;">QR Tracker - Real-time Location Tracking System</p>
        </div>
      </div>
    `;

    await emailTransporter.sendMail({
      from: `"${process.env.FROM_NAME || 'QR Tracker'}" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
      to: owner.email,
      subject: `🔔 QR Scan Alert - ${qrCode.qrId} scanned from ${locationText}`,
      html
    });

    console.log(`📧 Email sent to ${owner.email}`);
    
    // Update scan log
    scanLog.notificationSent.email = true;
    await scanLog.save({ validateBeforeSave: false });

  } catch (error) {
    console.error('Email Error:', error.message);
  }
}

// ====== Send SMS (Twilio) ======
async function sendSMS(owner, qrCode, locationText) {
  if (!process.env.TWILIO_SID || !process.env.TWILIO_AUTH_TOKEN) {
    console.warn('⚠️ Twilio not configured. Skipping SMS.');
    return;
  }

  try {
    // Twilio lazy load (optional dependency)
    const twilio = require('twilio');
    const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

    await client.messages.create({
      body: `🔔 QR Alert! ${qrCode.qrId} (${qrCode.category}) scanned from ${locationText}. Total: ${qrCode.totalScans} scans. - QR Tracker`,
      from: process.env.TWILIO_PHONE,
      to: owner.phone
    });

    console.log(`📱 SMS sent to ${owner.phone}`);

  } catch (error) {
    console.error('SMS Error:', error.message);
  }
}

// ====== Send Push Notification (Firebase) ======
async function sendPushNotification(owner, qrCode, locationText) {
  if (!process.env.FIREBASE_PROJECT_ID) {
    console.warn('⚠️ Firebase not configured. Skipping push notification.');
    return;
  }

  try {
    const admin = require('firebase-admin');
    
    // Initialize firebase (only once)
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
        })
      });
    }

    await admin.messaging().send({
      token: owner.fcmToken,
      notification: {
        title: `🔔 QR Scanned - ${qrCode.qrId}`,
        body: `${qrCode.category} scanned from ${locationText}`
      },
      data: {
        qrId: qrCode.qrId,
        type: 'scan_alert'
      }
    });

    console.log(`🔔 Push notification sent to ${owner.name}`);

  } catch (error) {
    console.error('Push Notification Error:', error.message);
  }
}

// ====== Test Email (Admin Use) ======
exports.sendTestEmail = async (email) => {
  if (!emailTransporter) return { success: false, message: 'Email not configured' };
  
  try {
    await emailTransporter.sendMail({
      from: `"QR Tracker" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
      to: email,
      subject: '✅ QR Tracker - Test Email',
      html: '<h2>Email service working! ✅</h2><p>Your notification system is working correctly.</p>'
    });
    return { success: true, message: 'Test email sent!' };
  } catch (error) {
    return { success: false, message: error.message };
  }
};
