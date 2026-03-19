// ============================================
// pages/pricing.js - Razorpay Payment Page
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
  { id: 'free', name: 'Free', price: '₹0', monthly: 0, features: ['5 QR Codes', 'Manual Location Check', 'Basic Dashboard'], icon: '🆓', color: 'gray' },
  { id: 'pro', name: 'Pro', price: '₹299', monthly: 299, features: ['50 QR Codes', 'Email + Push Alerts', 'Real-time Tracking', 'Priority Support'], icon: '💎', color: 'indigo', popular: true },
  { id: 'business', name: 'Business', price: '₹999', monthly: 999, features: ['Unlimited QR Codes', 'Email + SMS + Push', 'API Access', 'Export Reports', 'Dedicated Support'], icon: '👑', color: 'yellow' },
];

export default function Pricing() {
  const { user, isLoggedIn, refreshUser } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [loading, setLoading] = useState(null);

  const handlePayment = async (planId) => {
    if (!isLoggedIn) {
      toast.error(t('error'));
      router.push('/login');
      return;
    }

    if (planId === 'free') {
      toast(t('currentPlan'));
      return;
    }

    if (user?.plan === planId) {
      toast(t('currentPlan'));
      return;
    }

    setLoading(planId);

    try {
      // Check if Razorpay script is loaded
      if (!window.Razorpay) {
        toast.error('Payment system loading, please try again');
        setLoading(null);
        return;
      }

      // Step 1: Create order on backend
      const { data } = await api.post('/payment/create-order', { planId });
      const order = data.data;

      // Step 2: Open Razorpay Checkout
      const options = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'QR Tracker',
        description: `${order.planName} - Monthly Subscription`,
        order_id: order.orderId,
        prefill: {
          name: order.user.name,
          email: order.user.email,
          contact: order.user.phone
        },
        theme: { color: '#6366f1' },
        handler: async function (response) {
          // Step 3: Verify payment on backend
          try {
            const verifyRes = await api.post('/payment/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              planId
            });

            if (verifyRes.data.success) {
              toast.success(t('success'));
              await refreshUser();
              router.push('/dashboard');
            }
          } catch (err) {
            toast.error(err.response?.data?.message || t('error'));
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
      toast.error(err.response?.data?.message || t('error'));
      setLoading(null);
    }
  };

  return (
    <>
      <Head>
        <title>Pricing | QRCodeKey</title>
        <meta name="description" content="Choose your QR code tracking plan" />
      </Head>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
        onLoad={() => {
          // Script loaded successfully
        }}
        onError={() => {
          console.error('Failed to load Razorpay script');
        }}
      />
      <div className="min-h-screen pb-24">
        <header className="sticky top-0 z-50 bg-[rgba(10,10,30,0.85)] backdrop-blur-xl border-b border-[rgba(99,102,241,0.15)] px-5 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-400 hover:text-white text-sm">←</Link>
            <div className="font-bold text-sm text-gray-200">{t('pricing')}</div>
          </div>
          <LanguageSwitcher />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-5 pt-6">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black gradient-text mb-2">{t('pricing')}</h1>
          <p className="text-xs text-gray-400">{t('features')}</p>
        </div>

        <div className="space-y-4">
          {plans.map((plan) => {
            const isCurrent = user?.plan === plan.id;
            const isPopular = plan.popular;

            return (
              <div key={plan.id} className={`card p-5 transition-all ${isPopular ? 'border-indigo-500/40 ring-1 ring-indigo-500/20' : ''} ${isCurrent ? 'border-green-500/40' : ''}`}>
                {isPopular && <div className="text-[10px] font-bold text-indigo-400 mb-2">⭐ {t('popular')}</div>}
                {isCurrent && <div className="text-[10px] font-bold text-green-400 mb-2">✅ {t('currentPlan')}</div>}

                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{plan.icon}</span>
                    <div>
                      <div className="font-bold text-lg text-gray-200">{plan.name}</div>
                      <div className="text-sm font-black gradient-text">{plan.price}<span className="text-xs text-gray-500 font-normal">/{t('month')}</span></div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  {plan.features.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-gray-400">
                      <span className="text-green-400">✓</span>{f}
                    </div>
                  ))}
                </div>

                {plan.id === 'free' ? (
                  <div className="text-center text-xs text-gray-500 py-2">{t('free')}</div>
                ) : (
                  <button
                    onClick={() => handlePayment(plan.id)}
                    disabled={isCurrent || loading === plan.id}
                    className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
                      isCurrent
                        ? 'bg-green-500/10 text-green-400 border border-green-500/20 cursor-default'
                        : 'btn-primary'
                    }`}
                  >
                    {loading === plan.id ? '⏳ ' + t('loading') : isCurrent ? '✅ ' + t('currentPlan') : t('upgrade') + ' ' + plan.name}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="card p-4 mt-6 text-center">
          <div className="text-xs text-gray-500 mb-1">🔒 {t('payment')}</div>
          <div className="text-[10px] text-gray-600">{t('paymentMethods')}</div>
        </div>
      </main>
      </div>
    </>
  );
}
