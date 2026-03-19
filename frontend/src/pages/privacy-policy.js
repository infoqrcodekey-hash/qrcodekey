// ============================================
// pages/privacy-policy.js - Privacy Policy Page
// ============================================

import Link from 'next/link';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';

export default function PrivacyPolicy() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[rgba(10,10,30,0.85)] backdrop-blur-xl border-b border-[rgba(99,102,241,0.15)] px-5 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <Link href="/" className="text-gray-400 hover:text-white text-sm">←</Link>
          <div className="font-bold text-sm text-gray-200">Privacy Policy</div>
          <LanguageSwitcher />
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-5 pt-8">
        <div className="card p-8 space-y-6">
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black gradient-text mb-2">QRCodeKey Privacy Policy</h1>
            <p className="text-sm text-gray-500">Last Updated: March 2026</p>
          </div>

          {/* Introduction */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-gray-100">Introduction</h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              QRCodeKey ("we," "us," "our," or the "Company") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our service.
            </p>
          </section>

          {/* Information We Collect */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-gray-100">Information We Collect</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-200 mb-2">1. Personal Information</h3>
                <ul className="space-y-2 text-sm text-gray-400 ml-4">
                  <li>• <strong>Name:</strong> Your full name</li>
                  <li>• <strong>Email:</strong> Your email address for account creation and communication</li>
                  <li>• <strong>Phone:</strong> Your phone number (optional)</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-gray-200 mb-2">2. Location Information</h3>
                <ul className="space-y-2 text-sm text-gray-400 ml-4">
                  <li>• <strong>GPS Data:</strong> Your precise location when scanning QR codes (with your consent)</li>
                  <li>• <strong>IP Address:</strong> Automatically collected to determine approximate location</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-gray-200 mb-2">3. Device Information</h3>
                <ul className="space-y-2 text-sm text-gray-400 ml-4">
                  <li>• Device type, OS version, browser type</li>
                  <li>• Device ID and unique identifiers</li>
                  <li>• App version and usage statistics</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-gray-200 mb-2">4. QR Code Data</h3>
                <ul className="space-y-2 text-sm text-gray-400 ml-4">
                  <li>• QR codes you create</li>
                  <li>• Scan history, timestamp, and frequency</li>
                  <li>• Scanned device information</li>
                </ul>
              </div>
            </div>
          </section>

          {/* How We Use Your Information */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-gray-100">How We Use Your Information</h2>
            <p className="text-gray-400 text-sm">We collect and process your information for the following purposes:</p>
            <ul className="space-y-2 text-sm text-gray-400 ml-4">
              <li>✓ <strong>QR Code Tracking:</strong> To create, manage, and track QR codes and their scans</li>
              <li>✓ <strong>Attendance Management:</strong> To record attendance and generate attendance reports</li>
              <li>✓ <strong>Notifications:</strong> To send you push notifications, emails, and SMS about QR activities</li>
              <li>✓ <strong>Account Management:</strong> To maintain your account and provide customer support</li>
              <li>✓ <strong>Analytics:</strong> To understand usage patterns and improve our service</li>
              <li>✓ <strong>Payments:</strong> To process payments through Razorpay</li>
              <li>✓ <strong>Legal Compliance:</strong> To comply with laws and regulations</li>
            </ul>
          </section>

          {/* Third-Party Services */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-gray-100">Third-Party Service Providers</h2>
            <p className="text-gray-400 text-sm mb-3">We share your information with trusted third-party services:</p>
            <div className="space-y-3 ml-4">
              <div>
                <h4 className="font-semibold text-gray-200">MongoDB Atlas</h4>
                <p className="text-sm text-gray-400">Cloud database service for storing user data, QR codes, and scan logs. Data is encrypted at rest and in transit.</p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-200">Razorpay</h4>
                <p className="text-sm text-gray-400">Payment processor for subscription payments. We do not store payment card information. Razorpay handles all payment processing securely.</p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-200">Google Maps</h4>
                <p className="text-sm text-gray-400">Used to display location data on maps. Your location is processed according to Google's privacy policy.</p>
              </div>
            </div>
          </section>

          {/* Data Retention */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-gray-100">Data Retention</h2>
            <p className="text-gray-400 text-sm">
              We retain your personal data as long as your account is active. When you delete your account, we will permanently delete all associated data within 30 days, including:
            </p>
            <ul className="space-y-2 text-sm text-gray-400 ml-4 mt-3">
              <li>• Your profile information</li>
              <li>• All QR codes you created</li>
              <li>• All scan logs and attendance records</li>
              <li>• Team and organization data</li>
              <li>• Payment history</li>
            </ul>
          </section>

          {/* Your Rights */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-gray-100">Your Privacy Rights</h2>
            <p className="text-gray-400 text-sm mb-3">You have the following rights regarding your data:</p>
            <div className="space-y-3 ml-4">
              <div>
                <h4 className="font-semibold text-gray-200">Right to Access</h4>
                <p className="text-sm text-gray-400">You can request a complete export of all your data in JSON format at any time.</p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-200">Right to Delete</h4>
                <p className="text-sm text-gray-400">You can delete your account and all associated data at any time from your Profile settings.</p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-200">Right to Data Portability</h4>
                <p className="text-sm text-gray-400">You can export your data in a machine-readable format for use with other services.</p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-200">Right to Withdraw Consent</h4>
                <p className="text-sm text-gray-400">You can withdraw consent for location tracking at any time in your account settings.</p>
              </div>
            </div>
          </section>

          {/* Security */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-gray-100">Data Security</h2>
            <p className="text-gray-400 text-sm">
              We implement industry-standard security measures to protect your data:
            </p>
            <ul className="space-y-2 text-sm text-gray-400 ml-4 mt-3">
              <li>• Data encryption in transit (TLS/SSL)</li>
              <li>• Data encryption at rest in MongoDB Atlas</li>
              <li>• Password hashing with bcrypt (12-round salting)</li>
              <li>• JWT token authentication</li>
              <li>• Rate limiting to prevent unauthorized access</li>
              <li>• Regular security audits</li>
            </ul>
          </section>

          {/* Children's Privacy */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-gray-100">Children's Privacy</h2>
            <p className="text-gray-400 text-sm">
              QRCodeKey is not intended for users under 13 years old. We do not knowingly collect personal information from children under 13. If we become aware of such collection, we will delete the data immediately.
            </p>
          </section>

          {/* Changes to This Policy */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-gray-100">Changes to This Policy</h2>
            <p className="text-gray-400 text-sm">
              We may update this Privacy Policy from time to time. We will notify you of significant changes by email or by posting the new policy on our website with an updated "Last Updated" date.
            </p>
          </section>

          {/* Contact Us */}
          <section className="space-y-3 bg-indigo-500/5 p-5 rounded-xl border border-indigo-500/20">
            <h2 className="text-xl font-bold text-gray-100">Contact Us</h2>
            <p className="text-gray-400 text-sm">
              If you have questions about this Privacy Policy or our privacy practices, please contact us at:
            </p>
            <div className="space-y-2 text-sm mt-3">
              <p className="text-gray-300"><strong>Email:</strong> <a href="mailto:info.qrcodekey@gmail.com" className="text-indigo-400 hover:text-indigo-300">info.qrcodekey@gmail.com</a></p>
              <p className="text-gray-400">We will respond to your inquiry within 7 business days.</p>
            </div>
          </section>

          {/* Footer Links */}
          <div className="flex gap-4 justify-center text-sm mt-8 pt-6 border-t border-white/10">
            <Link href="/terms" className="text-indigo-400 hover:text-indigo-300">Terms of Service</Link>
            <Link href="/refund-policy" className="text-indigo-400 hover:text-indigo-300">Refund Policy</Link>
            <Link href="/" className="text-indigo-400 hover:text-indigo-300">Home</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
