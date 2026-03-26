import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';

const plans = [
  {
    id: 'starter',
    name: 'Starter',
    price: '$1.99',
    period: '/month',
    notifications: 175,
    features: [
      '175 scan notifications/month',
      'Email notifications',
      'GPS location tracking',
      'Scan history & analytics',
      'Up to 50 QR codes'
    ],
    color: '#4CAF50',
    popular: false
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$4.99',
    period: '/month',
    notifications: 400,
    features: [
      '400 scan notifications/month',
      'Email + SMS notifications',
      'GPS location tracking',
      'Advanced analytics',
      'Up to 200 QR codes',
      'Priority support'
    ],
    color: '#2196F3',
    popular: true
  },
  {
    id: 'unlimited',
    name: 'Unlimited',
    price: '$9.99',
    period: '/month',
    notifications: 999999,
    features: [
      'Unlimited notifications',
      'Email + SMS notifications',
      'GPS location tracking',
      'Advanced analytics',
      'Unlimited QR codes',
      'Priority support',
      'API access'
    ],
    color: '#9C27B0',
    popular: false
  }
];

export default function SubscriptionPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user) fetchSubscription();
  }, [user, authLoading]);

  // Handle Stripe redirect
  useEffect(() => {
    const { success, canceled } = router.query;
    if (success === 'true') {
      toast.success('Subscription activated! Welcome aboard!');
      fetchSubscription();
    }
    if (canceled === 'true') {
      toast('Checkout canceled', { icon: 'info' });
    }
  }, [router.query]);

  const fetchSubscription = async () => {
    try {
      const res = await api.get('/subscription/status');
      setSubscription(res.data.subscription);
    } catch (err) {
      // No subscription yet
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planId) => {
    try {
      setSubscribing(planId);
      const res = await api.post('/subscription/create-checkout', { plan: planId });
      // Redirect to Stripe Checkout
      window.location.href = res.data.url;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start checkout');
      setSubscribing(null);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel? You will keep access until the end of your billing period.')) return;
    try {
      await api.post('/subscription/cancel');
      toast.success('Subscription will be canceled at end of billing period');
      fetchSubscription();
    } catch (err) {
      toast.error('Failed to cancel subscription');
    }
  };

  if (authLoading || loading) {
    return (
      <>
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div className="spinner" />
          <p>Loading...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Subscription Plans - QRCodeKey</title>
      </Head>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '30px 20px' }}>
        <h1 style={{ textAlign: 'center', fontSize: 28, marginBottom: 8, color: '#1a1a2e' }}>
          Choose Your Plan
        </h1>
        <p style={{ textAlign: 'center', color: '#666', marginBottom: 40, fontSize: 16 }}>
          Get notified every time your QR codes are scanned
        </p>

        {/* Current Subscription Status */}
        {subscription && (
          <div style={{
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            borderRadius: 12,
            padding: 24,
            marginBottom: 40,
            color: 'white'
          }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 18 }}>Current Plan: {subscription.plan?.toUpperCase()}</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
              <div>
                <span style={{ color: '#aaa', fontSize: 13 }}>Status</span>
                <p style={{ margin: '4px 0', fontWeight: 600, color: subscription.status === 'active' ? '#4CAF50' : '#FF9800' }}>
                  {subscription.status?.toUpperCase()}
                </p>
              </div>
              <div>
                <span style={{ color: '#aaa', fontSize: 13 }}>Notifications Used</span>
                <p style={{ margin: '4px 0', fontWeight: 600 }}>
                  {subscription.notificationsUsed || 0} / {subscription.notificationLimit === 999999 ? 'Unlimited' : subscription.notificationLimit}
                </p>
              </div>
              <div>
                <span style={{ color: '#aaa', fontSize: 13 }}>Renews On</span>
                <p style={{ margin: '4px 0', fontWeight: 600 }}>
                  {subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
            {/* Usage Bar */}
            {subscription.notificationLimit < 999999 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 8, height: 8 }}>
                  <div style={{
                    background: subscription.usagePercentage > 80 ? '#FF5252' : '#4CAF50',
                    borderRadius: 8,
                    height: 8,
                    width: Math.min(subscription.usagePercentage || 0, 100) + '%',
                    transition: 'width 0.3s'
                  }} />
                </div>
                <p style={{ color: '#aaa', fontSize: 12, marginTop: 4 }}>
                  {(subscription.usagePercentage || 0).toFixed(0)}% used
                </p>
              </div>
            )}
            {subscription.status === 'active' && (
              <button onClick={handleCancel} style={{
                marginTop: 12,
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.3)',
                color: '#ccc',
                padding: '6px 16px',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 13
              }}>
                Cancel Subscription
              </button>
            )}
          </div>
        )}

        {/* Plan Cards */}
        <div style={{ display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
          {plans.map(plan => {
            const isCurrentPlan = subscription?.plan === plan.id && subscription?.status === 'active';
            return (
              <div key={plan.id} style={{
                background: 'white',
                borderRadius: 16,
                padding: 28,
                width: 320,
                boxShadow: plan.popular ? '0 8px 32px rgba(33,150,243,0.3)' : '0 2px 12px rgba(0,0,0,0.08)',
                border: plan.popular ? '2px solid #2196F3' : '1px solid #eee',
                position: 'relative',
                transform: plan.popular ? 'scale(1.05)' : 'none'
              }}>
                {plan.popular && (
                  <div style={{
                    position: 'absolute',
                    top: -12,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: '#2196F3',
                    color: 'white',
                    padding: '4px 16px',
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 600
                  }}>
                    MOST POPULAR
                  </div>
                )}
                <h3 style={{ color: plan.color, fontSize: 22, margin: '8px 0' }}>{plan.name}</h3>
                <div style={{ margin: '16px 0' }}>
                  <span style={{ fontSize: 36, fontWeight: 700, color: '#1a1a2e' }}>{plan.price}</span>
                  <span style={{ color: '#888', fontSize: 14 }}>{plan.period}</span>
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: '20px 0' }}>
                  {plan.features.map((f, i) => (
                    <li key={i} style={{ padding: '6px 0', color: '#555', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: plan.color }}>&#10003;</span> {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => !isCurrentPlan && handleSubscribe(plan.id)}
                  disabled={isCurrentPlan || subscribing === plan.id}
                  style={{
                    width: '100%',
                    padding: '12px 0',
                    borderRadius: 8,
                    border: 'none',
                    background: isCurrentPlan ? '#e0e0e0' : plan.color,
                    color: isCurrentPlan ? '#888' : 'white',
                    fontSize: 16,
                    fontWeight: 600,
                    cursor: isCurrentPlan ? 'default' : 'pointer',
                    opacity: subscribing === plan.id ? 0.7 : 1
                  }}
                >
                  {isCurrentPlan ? 'Current Plan' : subscribing === plan.id ? 'Redirecting...' : 'Subscribe Now'}
                </button>
              </div>
            );
          })}
        </div>

        {/* Free Plan Info */}
        <div style={{
          textAlign: 'center',
          marginTop: 40,
          padding: 20,
          background: '#f5f5f5',
          borderRadius: 12
        }}>
          <h4 style={{ margin: '0 0 8px', color: '#1a1a2e' }}>Free Plan</h4>
          <p style={{ color: '#666', margin: 0, fontSize: 14 }}>
            Generate up to 5 QR codes with GPS tracking. Upgrade to get scan notifications.
          </p>
        </div>
      </div>

      <style jsx>{`
        .spinner {
          width: 40px; height: 40px; margin: 20px auto;
          border: 4px solid #f3f3f3; border-top: 4px solid #1a1a2e;
          border-radius: 50%; animation: spin 1s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
    }
