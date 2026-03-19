// ============================================
// pages/refund-policy.js - Refund Policy Page
// ============================================

import Link from 'next/link';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';

export default function RefundPolicy() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[rgba(10,10,30,0.85)] backdrop-blur-xl border-b border-[rgba(99,102,241,0.15)] px-5 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <Link href="/" className="text-gray-400 hover:text-white text-sm">←</Link>
          <div className="font-bold text-sm text-gray-200">Refund Policy</div>
          <LanguageSwitcher />
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-5 pt-8">
        <div className="card p-8 space-y-6">
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black gradient-text mb-2">QRCodeKey Refund Policy</h1>
            <p className="text-sm text-gray-500">Last Updated: March 2026</p>
          </div>

          {/* Overview */}
          <section className="space-y-3 bg-green-500/5 p-5 rounded-xl border border-green-500/20">
            <h2 className="text-xl font-bold text-gray-100">7-Day Money-Back Guarantee</h2>
            <p className="text-gray-400 text-sm">
              We're confident in the quality of QRCodeKey. If you're not satisfied with your purchase within the first 7 days, we'll refund your money in full, no questions asked.
            </p>
          </section>

          {/* Refund Eligibility */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-gray-100">Refund Eligibility</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-200 mb-2 text-green-400">✓ Eligible for Refund:</h3>
                <ul className="space-y-2 text-sm text-gray-400 ml-4">
                  <li>• Initial subscription purchases (first-time payment)</li>
                  <li>• Subscription renewal payments made within 7 days of previous period</li>
                  <li>• Requests made within 7 calendar days of payment</li>
                  <li>• Any paid plan (Pro or Business)</li>
                  <li>• Subscriptions canceled within the 7-day window</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-gray-200 mb-2 text-red-400">✗ Not Eligible for Refund:</h3>
                <ul className="space-y-2 text-sm text-gray-400 ml-4">
                  <li>• Free plan accounts</li>
                  <li>• Refund requests made after 7 days</li>
                  <li>• Recurring charges after the initial 7-day period</li>
                  <li>• Payments made through unauthorized third parties</li>
                  <li>• Subscriptions that were modified or upgraded during the 7-day period</li>
                  <li>• Chargeback disputes (account will be terminated)</li>
                  <li>• Payments that violate our Terms of Service</li>
                </ul>
              </div>
            </div>
          </section>

          {/* How to Request a Refund */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-gray-100">How to Request a Refund</h2>
            <div className="space-y-3">
              <p className="text-gray-400 text-sm">
                To request a refund, please follow these steps:
              </p>
              <ol className="space-y-3 text-sm text-gray-400 ml-4">
                <li>
                  <span className="font-semibold text-gray-300">Step 1:</span> Go to your Profile settings
                </li>
                <li>
                  <span className="font-semibold text-gray-300">Step 2:</span> Click on "Subscription" or "Billing"
                </li>
                <li>
                  <span className="font-semibold text-gray-300">Step 3:</span> Select "Request Refund" and provide a reason (optional but helpful)
                </li>
                <li>
                  <span className="font-semibold text-gray-300">Step 4:</span> Confirm your refund request
                </li>
                <li>
                  <span className="font-semibold text-gray-300">Step 5:</span> You will receive a confirmation email within 24 hours
                </li>
              </ol>
              <p className="text-gray-400 text-sm mt-4">
                <strong>Alternatively,</strong> you can email us directly at <a href="mailto:info.qrcodekey@gmail.com" className="text-indigo-400 hover:text-indigo-300">info.qrcodekey@gmail.com</a> with:
              </p>
              <ul className="space-y-2 text-sm text-gray-400 ml-4 mt-3">
                <li>• Your account email</li>
                <li>• Order ID (found in your payment confirmation)</li>
                <li>• Reason for refund (optional)</li>
              </ul>
            </div>
          </section>

          {/* Refund Processing */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-gray-100">Refund Processing</h2>
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold text-gray-200 mb-2">Timeline:</h3>
                <ul className="space-y-2 text-sm text-gray-400 ml-4">
                  <li>• <strong>Request Review:</strong> 24-48 hours</li>
                  <li>• <strong>Approval Decision:</strong> 2-3 business days</li>
                  <li>• <strong>Refund Initiation:</strong> 1-2 business days after approval</li>
                  <li>• <strong>Refund Appears in Account:</strong> 5-7 business days (depending on your bank)</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-gray-200 mb-2">Refund Method:</h3>
                <p className="text-sm text-gray-400">
                  Refunds will be credited back to your original payment method (credit card, debit card, or digital wallet). Processing times depend on your financial institution. International transactions may take longer.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-200 mb-2">Account Status:</h3>
                <p className="text-sm text-gray-400">
                  Once a refund is approved, your subscription will be immediately downgraded to the Free plan. You will not be charged again unless you manually re-subscribe.
                </p>
              </div>
            </div>
          </section>

          {/* Important Notes */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-gray-100">Important Notes</h2>
            <div className="space-y-2 text-sm text-gray-400 ml-4">
              <p>
                <strong>• No Refunds for Recurring Charges:</strong> The 7-day guarantee applies only to the initial payment. Subscription renewals are non-refundable, but you can cancel your subscription anytime to prevent future charges.
              </p>
              <p>
                <strong>• Refund Does Not Include Taxes/Fees:</strong> Refunds cover the subscription amount only. Taxes, transaction fees, or payment processing fees are non-refundable.
              </p>
              <p>
                <strong>• Data Retention:</strong> After a refund, your account will be downgraded to Free plan. Your QR codes and data will be retained, but you'll have limited features (5 QR codes max).
              </p>
              <p>
                <strong>• Chargebacks:</strong> Filing a chargeback instead of requesting a refund will result in permanent account termination and forfeiture of all data.
              </p>
            </div>
          </section>

          {/* Multiple Refund Requests */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-gray-100">Repeated Refund Requests</h2>
            <p className="text-gray-400 text-sm">
              If you make multiple refund requests within a short period, we may:
            </p>
            <ul className="space-y-2 text-sm text-gray-400 ml-4 mt-3">
              <li>• Decline the refund request and suggest a free trial period instead</li>
              <li>• Restrict your ability to purchase premium plans in the future</li>
              <li>• Ask you to provide feedback on service improvements</li>
              <li>• Offer an alternative plan or discount</li>
            </ul>
          </section>

          {/* Special Circumstances */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-gray-100">Special Circumstances</h2>
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold text-gray-200 mb-2">Service Issues:</h3>
                <p className="text-sm text-gray-400">
                  If you experienced technical issues preventing you from using the service, we may extend the refund window beyond 7 days. Please contact support with details.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-200 mb-2">Billing Errors:</h3>
                <p className="text-sm text-gray-400">
                  If you were charged incorrectly (duplicate charges, unauthorized charges), we will refund immediately and investigate the cause.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-200 mb-2">Free Trial to Paid Conversion:</h3>
                <p className="text-sm text-gray-400">
                  If you used a free trial and were automatically charged after it ended, you have 7 days from the charge date to request a refund.
                </p>
              </div>
            </div>
          </section>

          {/* Complaints & Appeals */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-gray-100">Appeals Process</h2>
            <p className="text-gray-400 text-sm">
              If your refund request is denied, you can appeal within 14 days of the denial. Please email us at <a href="mailto:info.qrcodekey@gmail.com" className="text-indigo-400 hover:text-indigo-300">info.qrcodekey@gmail.com</a> with:
            </p>
            <ul className="space-y-2 text-sm text-gray-400 ml-4 mt-3">
              <li>• Your original refund request date</li>
              <li>• Order ID</li>
              <li>• Reason for appeal</li>
              <li>• Any supporting evidence or documentation</li>
            </ul>
          </section>

          {/* Contact Support */}
          <section className="space-y-3 bg-indigo-500/5 p-5 rounded-xl border border-indigo-500/20">
            <h2 className="text-xl font-bold text-gray-100">Contact Support</h2>
            <p className="text-gray-400 text-sm mb-3">
              Questions about our refund policy? Get in touch:
            </p>
            <div className="space-y-2 text-sm">
              <p className="text-gray-300"><strong>Email:</strong> <a href="mailto:info.qrcodekey@gmail.com" className="text-indigo-400 hover:text-indigo-300">info.qrcodekey@gmail.com</a></p>
              <p className="text-gray-300"><strong>Response Time:</strong> Within 24 hours</p>
              <p className="text-gray-300"><strong>Available:</strong> Monday - Friday, 9 AM - 6 PM IST</p>
            </div>
          </section>

          {/* Footer Links */}
          <div className="flex gap-4 justify-center text-sm mt-8 pt-6 border-t border-white/10">
            <Link href="/privacy-policy" className="text-indigo-400 hover:text-indigo-300">Privacy Policy</Link>
            <Link href="/terms" className="text-indigo-400 hover:text-indigo-300">Terms of Service</Link>
            <Link href="/" className="text-indigo-400 hover:text-indigo-300">Home</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
