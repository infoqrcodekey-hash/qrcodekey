// ============================================
// pages/terms.js - Terms of Service Page
// ============================================

import Link from 'next/link';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';

export default function Terms() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[rgba(10,10,30,0.85)] backdrop-blur-xl border-b border-[rgba(99,102,241,0.15)] px-5 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <Link href="/" className="text-gray-400 hover:text-white text-sm">←</Link>
          <div className="font-bold text-sm text-gray-200">Terms of Service</div>
          <LanguageSwitcher />
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-5 pt-8">
        <div className="card p-8 space-y-6">
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black gradient-text mb-2">QRCodeKey Terms of Service</h1>
            <p className="text-sm text-gray-500">Last Updated: March 2026</p>
          </div>

          {/* 1. Agreement to Terms */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-gray-100">1. Agreement to Terms</h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              By accessing and using QRCodeKey, you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, you may not use our service. We reserve the right to modify these terms at any time, and your continued use constitutes acceptance of the modified terms.
            </p>
          </section>

          {/* 2. Use License */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-gray-100">2. Use License</h2>
            <div className="space-y-3">
              <p className="text-gray-400 text-sm">
                We grant you a limited, non-exclusive, non-transferable license to use QRCodeKey for your personal or business use in accordance with these terms.
              </p>
              <p className="text-gray-400 text-sm">You may NOT:</p>
              <ul className="space-y-2 text-sm text-gray-400 ml-4">
                <li>• Reproduce, modify, or distribute our service without permission</li>
                <li>• Attempt to gain unauthorized access to our systems</li>
                <li>• Use our service for illegal or fraudulent purposes</li>
                <li>• Reverse engineer or decompile our application</li>
                <li>• Scrape or collect data without authorization</li>
                <li>• Interfere with the operation of our service</li>
                <li>• Use the service to harass, threaten, or defame others</li>
              </ul>
            </div>
          </section>

          {/* 3. User Accounts */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-gray-100">3. User Accounts</h2>
            <p className="text-gray-400 text-sm">
              You are responsible for maintaining the confidentiality of your account credentials and password. You agree to:
            </p>
            <ul className="space-y-2 text-sm text-gray-400 ml-4 mt-3">
              <li>• Provide accurate, complete, and truthful information</li>
              <li>• Notify us immediately of any unauthorized access</li>
              <li>• Accept responsibility for all activities under your account</li>
              <li>• Maintain the security of your password</li>
              <li>• Not share your account with others</li>
            </ul>
          </section>

          {/* 4. Subscription Plans */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-gray-100">4. Subscription Plans & Pricing</h2>
            <div className="space-y-4">
              <div className="bg-white/5 p-4 rounded-lg space-y-2">
                <h3 className="font-semibold text-gray-200">Free Plan</h3>
                <p className="text-sm text-gray-400">Price: $0/month</p>
                <p className="text-sm text-gray-400">Features: 5 QR codes, manual tracking only</p>
              </div>

              <div className="bg-white/5 p-4 rounded-lg space-y-2">
                <h3 className="font-semibold text-gray-200">Pro Plan</h3>
                <p className="text-sm text-gray-400">Price: $4.99/month (billed monthly) or discounted annually</p>
                <p className="text-sm text-gray-400">Features: 50 QR codes, push notifications, email alerts</p>
              </div>

              <div className="bg-white/5 p-4 rounded-lg space-y-2">
                <h3 className="font-semibold text-gray-200">Business Plan</h3>
                <p className="text-sm text-gray-400">Price: $11.99/month (billed monthly) or discounted annually</p>
                <p className="text-sm text-gray-400">Features: Unlimited QR codes, SMS alerts, API access, team management</p>
              </div>

              <p className="text-gray-400 text-sm mt-4">
                <strong>Payment Terms:</strong> Subscription fees are billed at the beginning of each billing period. If you upgrade, your new plan takes effect immediately and you will be charged a prorated amount for the remainder of the current billing period.
              </p>
            </div>
          </section>

          {/* 5. Billing & Renewal */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-gray-100">5. Billing & Auto-Renewal</h2>
            <p className="text-gray-400 text-sm">
              Your subscription will automatically renew at the end of each billing period unless you cancel it. We will notify you at least 7 days before renewal. You can cancel your subscription at any time from your account settings, and your access will continue until the end of the current billing period.
            </p>
          </section>

          {/* 6. Refund Policy */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-gray-100">6. Refund Policy</h2>
            <div className="space-y-3">
              <p className="text-gray-400 text-sm">
                We offer a 7-day refund guarantee for paid subscriptions. This means:
              </p>
              <ul className="space-y-2 text-sm text-gray-400 ml-4">
                <li>• You can request a full refund within 7 days of your initial purchase</li>
                <li>• Refunds are processed within 5-7 business days to your original payment method</li>
                <li>• After 7 days, subscriptions are non-refundable but can be canceled to stop future charges</li>
                <li>• Renewal payments within 7 days of the previous period can be refunded</li>
              </ul>
              <p className="text-gray-400 text-sm mt-3">
                <strong>Non-Refundable Cases:</strong> Refunds are not available for: promotional or free trial periods, canceled subscriptions used beyond 7 days, or chargebacks.
              </p>
            </div>
          </section>

          {/* 7. Intellectual Property */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-gray-100">7. Intellectual Property Rights</h2>
            <p className="text-gray-400 text-sm">
              All content, features, and functionality of QRCodeKey (including but not limited to software, design, and documentation) are the exclusive property of QRCodeKey and are protected by copyright, trademark, and other intellectual property laws. Your use of the service grants you no ownership or intellectual property rights.
            </p>
          </section>

          {/* 8. User Content */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-gray-100">8. User Content</h2>
            <p className="text-gray-400 text-sm">
              You retain ownership of any content you upload to QRCodeKey (QR codes, descriptions, etc.). By uploading content, you grant us a worldwide, royalty-free license to use, copy, reproduce, process, and distribute your content as necessary to provide the service.
            </p>
          </section>

          {/* 9. Account Termination */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-gray-100">9. Account Termination</h2>
            <p className="text-gray-400 text-sm">
              You can delete your account at any time from your Profile settings. Upon deletion, we will permanently remove all your data within 30 days. We may terminate or suspend your account if you violate these terms or for any reason at our sole discretion.
            </p>
          </section>

          {/* 10. Limitation of Liability */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-gray-100">10. Limitation of Liability</h2>
            <p className="text-gray-400 text-sm">
              TO THE FULLEST EXTENT PERMITTED BY LAW, QRCODEKEY SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR USE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT PAID BY YOU FOR THE SERVICE IN THE PRECEDING 12 MONTHS.
            </p>
          </section>

          {/* 11. Disclaimer */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-gray-100">11. Disclaimer of Warranties</h2>
            <p className="text-gray-400 text-sm">
              QRCODEKEY IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE.
            </p>
          </section>

          {/* 12. Governing Law & Jurisdiction */}
          <section className="space-y-3 bg-indigo-500/5 p-5 rounded-xl border border-indigo-500/20">
            <h2 className="text-xl font-bold text-gray-100">12. Governing Law & Jurisdiction</h2>
            <p className="text-gray-400 text-sm">
              These Terms of Service are governed by and construed in accordance with the laws of India, without regard to its conflict of law provisions. You agree to submit to the exclusive jurisdiction of the courts located in India for any disputes arising from or relating to these terms or your use of QRCodeKey.
            </p>
          </section>

          {/* 13. Contact */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-gray-100">13. Contact Information</h2>
            <p className="text-gray-400 text-sm">
              For questions about these Terms of Service, please contact us at:
            </p>
            <div className="space-y-2 text-sm mt-3">
              <p className="text-gray-300"><strong>Name:</strong> Ashvinkumar Chaudhari</p>
              <p className="text-gray-300"><strong>Address:</strong> 647 Rose Ln, Bartlett, IL 60103, USA</p>
              <p className="text-gray-300"><strong>Email:</strong> <a href="mailto:ashvinc1984@gmail.com" className="text-indigo-400 hover:text-indigo-300">ashvinc1984@gmail.com</a></p>
              <p className="text-gray-300"><strong>Phone:</strong> <a href="tel:+17083005490" className="text-indigo-400 hover:text-indigo-300">(708) 300-5490</a></p>
              <p className="text-gray-400">Response time: Within 7 business days</p>
            </div>
          </section>

          {/* Footer Links */}
          <div className="flex gap-4 justify-center text-sm mt-8 pt-6 border-t border-white/10">
            <Link href="/privacy-policy" className="text-indigo-400 hover:text-indigo-300">Privacy Policy</Link>
            <Link href="/refund-policy" className="text-indigo-400 hover:text-indigo-300">Refund Policy</Link>
            <Link href="/" className="text-indigo-400 hover:text-indigo-300">Home</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
