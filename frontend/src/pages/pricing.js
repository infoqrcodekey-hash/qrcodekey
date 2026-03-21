// ============================================
// pages/pricing.js - Notification Subscription Plans
// ============================================

import { useState } from 'react';
import Head from 'next/head';
import Script from 'next/script';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useRouter } from 'next/router';
import Link from 'next/link';
import toast from 'react-hot-toast';
import LanguageSwitcher from '../components/LanguageSwitcher';
import api from '../lib/api';

const plans = [
  {
    id: 'free',
    name: 'Free',
    icon: '🆓',
    color: 'gray',
    monthlyPrice: 0,
    yearlyPrice: 0,
    yearlyDiscount: 0,
    qrCount: 'Unlimited',
    features: [
      'Unlimited QR Code Generation',
      'QR Code Search & Track on Map',
      'Manual Location Check',
      'Basic Dashboard',
    ],
    notFeatures: [
      'Instant Email Notifications',
      'Instant SMS Notifications',
      'Push Notifications',
      'Priority Support',
    ],
  },
  {
    id: 'starter',
    name: 'Starter',
    icon: '🔔',
    color: 'indigo',
    monthlyPrice: 0.99,
    yearlyPrice: 9.50,
    yearlyDiscount: 20,
    qrCount: '1',
    features: [
      'Everything in Free',
      '1 QR Code with Notifications',
      'Instant Email Alerts on Scan',
      'Push Notification on Scan',
      'GPS Location in Alert',
    ],
    notFeatures: [
      'SMS Notifications',
      'Priority Support',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    icon: '💎',
    color: 'purple',
    popular: true,
    monthlyPrice: 4.99,
    yearlyPrice: 41.90,
    yearlyDiscount: 30,
    qrCount: '5',
    features: [
      'Everything in Starter',
      '5 QR Codes with Notifications',
      'Instant Email + SMS Alerts',
      'Push Notifications',
      'GPS + Map Link in Alert',
      'Priority Support',
    ],
    notFeatures: [],
  },
  {
    id: 'unlimited',
    name: 'Unlimited',
    icon: '👑',
    color: 'yellow',
    monthlyPrice: 14.99,
    yearlyPrice: 89.99,
    yearlyDiscount: 50,
    qrCount: 'Unlimited',
    features: [
      'Everything in Pro',
      'Unlimited QR Codes with Notifications',
      'Instant Email + SMS + Push Alerts',
      'Real-time GPS Location in Alert',
      'Map Link in Every Notification',
      'Organization Attendance Alerts',
      'API Access for Notifications',
      'Dedicated Priority Support',
      'Export Notification History',
    ],
    notFeatures: [],
  },
];

export default function Pricing() {
  const { user, isLoggedIn, refreshUser } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [loading, setLoading] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' or 'yearly'

  const handlePayment = async (planId) => {
    if (!isLoggedIn) {
      toast.error('Please login first');
      router.push('/login');
      return;
    }

    if (planId === 'free') {
      toast('This is the free plan — no payment needed!');
      return;
    }

    if (user?.plan === planId) {
      toast('You are already on this plan!');
      return;
    }

    setLoading(planId);

    try {
      if (!window.Razorpay) {
        toast.error('Payment system loading, please try again');
        setLoading(null);
        return;
      }

      const { data } = await api.post('/payment/create-order', { planId, billingCycle });
      const order = data.data;

      const options = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'QRCodeKey',
        description: `${order.planName} - ${billingCycle === 'yearly' ? 'Annual' : 'Monthly'} Notification Subscription`,
        order_id: order.orderId,
        prefill: {
          name: order.user.name,
          email: order.user.email,
          contact: order.user.phone
        },
        theme: { color: '#6366f1' },
        handler: async function (response) {
          try {
            const verifyRes = await api.post('/payment/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              planId,
              billingCycle
            });

            if (verifyRes.data.success) {
              toast.success('Subscription activated! You will now receive notifications.');
              await refreshUser();
              router.push('/dashboard');
            }
          } catch (err) {
            toast.error(err.response?.data?.message || 'Payment verification failed');
          }
        },
        modal: {
          ondismiss: () => { setLoading(null); }
        }
      };

      try {
        const rzp = new window.Razorpay(options);
        rzp.open();
      } catch (err) {
        toast.error('Failed to open payment checkout');
        setLoading(null);
      }

    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment failed');
      setLoading(null);
    }
  };

  return (
    <>
      <Head>
        <title>Pricing | QRCodeKey - Notification Subscriptions</title>
        <meta name="description" content="Get instant notifications when your QR codes are scanned" />
      </Head>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
      />
      <div className="min-h-screen pb-24">
        <header className="sticky top-0 z-50 bg-[rgba(10,10,30,0.85)] backdrop-blur-xl border-b border-[rgba(99,102,241,0.15)] px-5 py-3">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="text-gray-400 hover:text-white text-sm">←</Link>
              <div className="font-bold text-sm text-gray-200">{t('pricing')}</div>
            </div>
            <LanguageSwitcher />
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-5 pt-6">
          {/* Hero */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <span className="text-3xl">🔔</span>
            </div>
            <h1 className="text-2xl font-black gradient-text mb-2">Notification Subscriptions</h1>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              Get instant Email, SMS & Push notifications when someone scans your QR code. Know exactly where your item is — in real time!
            </p>
          </div>

          {/* Free vs Paid Explanation */}
          <div className="card p-4 mb-6 border-indigo-500/15">
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3 bg-white/5 rounded-xl">
                <div className="text-lg mb-1">🆓</div>
                <div className="text-xs font-bold text-gray-200">Free (Default)</div>
                <div className="text-[10px] text-gray-500 mt-1">Generate QR + Search location manually on website</div>
              </div>
              <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                <div className="text-lg mb-1">🔔</div>
                <div className="text-xs font-bold text-indigo-400">Paid Subscription</div>
                <div className="text-[10px] text-gray-500 mt-1">Instant SMS/Email/Push alert when QR is scanned</div>
              </div>
            </div>
          </div>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all relative ${
                billingCycle === 'yearly'
                  ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              Yearly
              <span className="absolute -top-2 -right-2 px-1.5 py-0.5 bg-green-500 text-white text-[8px] font-bold rounded-full">SAVE</span>
            </button>
          </div>

          {/* Plans */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {plans.map((plan) => {
              const isCurrent = user?.plan === plan.id;
              const price = billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
              const period = billingCycle === 'yearly' ? '/yr' : '/mo';
              const discount = plan.yearlyDiscount;

              return (
                <div key={plan.id} className={`card p-5 transition-all relative ${
                  plan.popular ? 'border-indigo-500/40 ring-1 ring-indigo-500/20' : ''
                } ${isCurrent ? 'border-green-500/40' : ''}`}>
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-indigo-500 to-pink-500 text-white text-[10px] font-bold rounded-full shadow-lg">
                      ⭐ MOST POPULAR
                    </div>
                  )}
                  {isCurrent && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-green-500 text-white text-[10px] font-bold rounded-full">
                      ✅ CURRENT PLAN
                    </div>
                  )}

                  <div className="text-center mb-4 pt-2">
                    <span className="text-4xl block mb-2">{plan.icon}</span>
                    <div className="font-bold text-lg text-gray-200">{plan.name}</div>
                    <div className="text-xs text-gray-500 mb-2">{plan.qrCount} QR {plan.id === 'free' ? 'Codes' : 'Notification' + (plan.qrCount !== '1' ? 's' : '')}</div>

                    {plan.monthlyPrice === 0 ? (
                      <div className="text-2xl font-black gradient-text">FREE</div>
                    ) : (
                      <div>
                        <div className="text-2xl font-black gradient-text">
                          ${price.toFixed(2)}
                          <span className="text-xs text-gray-500 font-normal">{period}</span>
                        </div>
                        {billingCycle === 'yearly' && discount > 0 && (
                          <div className="text-[10px] text-green-400 font-bold mt-1">
                            🎉 Save {discount}% — ${(plan.monthlyPrice * 12 - plan.yearlyPrice).toFixed(2)} off!
                          </div>
                        )}
                        {billingCycle === 'monthly' && discount > 0 && (
                          <div className="text-[10px] text-gray-500 mt-1">
                            Switch to yearly & save {discount}%
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Features */}
                  <div className="space-y-2 mb-4">
                    {plan.features.map((f, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-gray-300">
                        <span className="text-green-400 mt-0.5 shrink-0">✓</span>
                        <span>{f}</span>
                      </div>
                    ))}
                    {plan.notFeatures.map((f, i) => (
                      <div key={`no-${i}`} className="flex items-start gap-2 text-xs text-gray-600">
                        <span className="text-red-400/50 mt-0.5 shrink-0">✕</span>
                        <span className="line-through">{f}</span>
                      </div>
                    ))}
                  </div>

                  {/* CTA */}
                  {plan.id === 'free' ? (
                    <div className="text-center text-xs text-gray-500 py-2 bg-white/3 rounded-xl">
                      ✅ Always Free — No Card Needed
                    </div>
                  ) : (
                    <button
                      onClick={() => handlePayment(plan.id)}
                      disabled={isCurrent || loading === plan.id}
                      className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
                        isCurrent
                          ? 'bg-green-500/10 text-green-400 border border-green-500/20 cursor-default'
                          : plan.popular
                            ? 'bg-gradient-to-r from-indigo-500 to-pink-500 text-white shadow-lg shadow-indigo-500/30 hover:opacity-90'
                            : 'btn-primary'
                      }`}
                    >
                      {loading === plan.id ? '⏳ Processing...' : isCurrent ? '✅ Current Plan' : `Subscribe to ${plan.name}`}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* How Notifications Work */}
          <div className="card p-5 mt-6">
            <h3 className="font-bold text-sm text-gray-200 mb-4">📱 How Notifications Work</h3>
            <div className="space-y-3">
              {[
                { step: '1', icon: '📲', text: 'Generate QR code and attach to your item (bag, keys, pet, etc.)' },
                { step: '2', icon: '📷', text: 'Someone finds your item and scans the QR code' },
                { step: '3', icon: '🔔', text: 'You instantly receive Email/SMS/Push notification with GPS location' },
                { step: '4', icon: '🗺️', text: 'Click the map link in notification to see exact location' },
              ].map((s, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-[10px] font-bold text-indigo-400 shrink-0 mt-0.5">{s.step}</div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{s.icon}</span>
                    <span className="text-xs text-gray-400">{s.text}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* FAQ */}
          <div className="card p-5 mt-4">
            <h3 className="font-bold text-sm text-gray-200 mb-4">❓ Frequently Asked Questions</h3>
            <div className="space-y-4">
              {[
                { q: 'Can I generate QR codes for free?', a: 'Yes! QR code generation and manual location search is always free. You only pay for instant notifications.' },
                { q: 'What happens when someone scans my QR?', a: 'Free users: Scanner fills a form and you can search the QR on our website to see their location. Paid users: You instantly get Email/SMS/Push notification with GPS map link.' },
                { q: 'Can I upgrade or downgrade anytime?', a: 'Yes! You can change your plan at any time. Upgrades are instant, downgrades take effect at the end of your billing cycle.' },
                { q: 'Is there a refund policy?', a: 'Yes, we offer a 7-day money-back guarantee on all paid plans.' },
              ].map((faq, i) => (
                <div key={i}>
                  <div className="text-xs font-bold text-gray-200 mb-1">{faq.q}</div>
                  <div className="text-[11px] text-gray-500">{faq.a}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Security */}
          <div className="card p-4 mt-4 text-center">
            <div className="text-xs text-gray-500 mb-1">🔒 Secure Payment via Razorpay</div>
            <div className="text-[10px] text-gray-600">UPI • Cards • Net Banking • Wallets</div>
          </div>

          {/* Contact */}
          <div className="text-center text-xs text-gray-600 mt-4 pt-4">
            <p>Questions? Contact us at <a href="mailto:ashvinc1984@gmail.com" className="text-indigo-400">ashvinc1984@gmail.com</a></p>
            <p className="mt-1">Ashvinkumar Chaudhari | 647 Rose Ln, Bartlett, IL 60103, USA</p>
          </div>
        </main>
      </div>
    </>
  );
}
