// ============================================
// utils/seed.js - Database Seeder
// ============================================
// Creates admin user and test data
// Command: node utils/seed.js

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const QRCode = require('../models/QRCode');
const connectDB = require('../config/db');

const seedData = async () => {
  await connectDB();
  
  console.log('🌱 Seeding database...\n');

  // Create Admin User
  const adminExists = await User.findOne({ email: 'admin@qrtracker.com' });
  if (!adminExists) {
    const admin = await User.create({
      name: 'Admin',
      email: 'admin@qrtracker.com',
      password: 'admin123456',
      phone: '+919999999999',
      role: 'admin',
      plan: 'business',
      isActive: true
    });
    console.log('✅ Admin user created:');
    console.log('   Email: admin@qrtracker.com');
    console.log('   Password: admin123456');
    console.log('   Role: admin\n');
  } else {
    console.log('ℹ️ Admin user already exists\n');
  }

  // Create Test User
  const testExists = await User.findOne({ email: 'test@qrtracker.com' });
  if (!testExists) {
    const testUser = await User.create({
      name: 'Test User',
      email: 'test@qrtracker.com',
      password: 'test123456',
      phone: '+919876543210',
      role: 'user',
      plan: 'pro',
      planExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      isActive: true
    });

    // Create Test QR Code
    const qrId = 'QR-TEST-001';
    await QRCode.create({
      qrId,
      owner: testUser._id,
      registeredName: 'Test Child',
      registeredEmail: 'test@qrtracker.com',
      registeredPhone: '+919876543210',
      category: 'child',
      message: 'This is a test QR code',
      qrPassword: 'test1234',
      isActive: true,
      activatedAt: new Date(),
      totalScans: 0
    });

    console.log('✅ Test user created:');
    console.log('   Email: test@qrtracker.com');
    console.log('   Password: test123456');
    console.log('   Plan: pro\n');
    console.log('✅ Test QR Code created:');
    console.log('   QR ID: QR-TEST-001');
    console.log('   QR Password: test1234\n');
  } else {
    console.log('ℹ️ Test user already exists\n');
  }

  console.log('🌱 Seeding complete!\n');
  process.exit(0);
};

seedData().catch(err => {
  console.error('❌ Seed Error:', err);
  process.exit(1);
});
