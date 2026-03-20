// ============================================
// pages/index.js - Home Page
// ============================================

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import Link from 'next/link';
import { onScanAlert } from '../lib/socket';
import LanguageSwitcher from '../components/LanguageSwitcher';

export default function Home() {
  const { user, isLoggedIn, loading, logout } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [alerts, setAlerts] = useState([]);

  // Real-time scan alerts
  useEffect(() => {
    if (!isLoggedIn) return;
    const cleanup = onScanAlert((data) => {
      setAlerts(prev => [data, ...prev].slice(0, 5));
    });
    return cleanup;
  }, [isLoggedIn]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse-glow w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-pink-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[rgba(10,10,30,0.85)] backdrop-blur-xl border-b border-[rgba(99,102,241,0.15)] px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center text-white text-sm shrink-0">📍</div>
            <div className="min-w-0">
              <div className="font-extrabold text-sm gradient-text">QRCodeKey</div>
              <div className="text-[10px] text-gray-500 -mt-0.5 truncate">{t('realtimeTracking')}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isLoggedIn ? (
              <>
                <span className="text-[10px] text-gray-400 truncate max-w-[60px] hidden sm:inline">👤 {user?.name}</span>
                <button onClick={logout} className="text-[10px] text-red-400 hover:text-red-300 font-semibold">{t('logout')}</button>
              </>
            ) : (
              <Link href="/login" className="text-xs text-indigo-400 font-bold hover:text-indigo-300">{t('login')} →</Link>
            )}
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-5 pt-8">
        {/* Hero */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/30 animate-float">
            <span className="text-4xl">📍</span>
          </div>
          <h1 className="text-3xl font-black gradient-text mb-2">{t('heroTitle')}</h1>
          <p className="text-sm text-gray-400 max-w-xs mx-auto leading-relaxed">
            {t('heroDesc')}
          </p>
        </div>

        {/* Quick Actions */}
        {isLoggedIn ? (
          <>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {[
                { label: t('generateQR'), desc: t('generateQRDesc'), icon: '➕', color: 'indigo', href: '/generate' },
                { label: t('trackQR'), desc: t('trackQRDesc'), icon: '📍', color: 'pink', href: '/scanner' },
                { label: 'Attendance', desc: 'QR Clock-In/Out', icon: '📷', color: 'cyan', href: '/attendance-scanner' },
                { label: t('dashboard'), desc: t('dashboardDesc'), icon: '📋', color: 'purple', href: '/attendance-dashboard' },
                { label: 'Organizations', desc: 'Manage Groups', icon: '🏢', color: 'blue', href: '/organizations' },
                { label: t('profile'), desc: t('settings'), icon: '⚙️', color: 'green', href: '/profile' },
              ].map((item, i) => (
                <Link key={i} href={item.href} className={`card p-5 hover:border-${item.color}-500/30 transition-all group`}>
                  <span className="text-2xl block mb-2 group-hover:scale-110 transition-transform">{item.icon}</span>
                  <div className="font-bold text-sm text-gray-200">{item.label}</div>
                  <div className="text-[11px] text-gray-500 mt-0.5">{item.desc}</div>
                </Link>
              ))}
            </div>

            {/* Real-time Alerts */}
            {alerts.length > 0 && (
              <div className="card p-4 mb-6 border-red-500/20">
                <div className="text-xs font-bold text-red-400 mb-3">🔴 {t('liveAlerts')}</div>
                {alerts.map((a, i) => (
                  <div key={i} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                    <span className="text-lg">📍</span>
                    <div className="flex-1">
                      <div className="text-xs font-bold text-gray-200">{a.qrId}</div>
                      <div className="text-[10px] text-gray-500">{a.location} • {a.category}</div>
                    </div>
                    <span className="text-[10px] text-red-400 font-semibold">{t('live')}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          /* Not Logged In - CTA */
          <div className="space-y-4">
            <div className="card p-6 text-center">
              <h2 className="font-bold text-lg text-gray-200 mb-2">{t('getStarted')}</h2>
              <p className="text-xs text-gray-400 mb-5">{t('getStartedDesc')}</p>
              <div className="flex gap-3">
                <Link href="/register" className="btn-primary flex-1 text-center block">{t('register')}</Link>
                <Link href="/login" className="btn-secondary flex-1 text-center block">{t('login')}</Link>
              </div>
            </div>

            {/* Quick Access (no login) */}
            <div className="grid grid-cols-2 gap-3 mt-4 mb-4">
              <Link href="/attendance-scanner" className="card p-4 text-center hover:border-indigo-500/30 transition-all">
                <span className="text-2xl block mb-1">📷</span>
                <div className="font-bold text-xs text-gray-200">Attendance Scan</div>
              </Link>
              <Link href="/viewer-login" className="card p-4 text-center hover:border-indigo-500/30 transition-all">
                <span className="text-2xl block mb-1">👁</span>
                <div className="font-bold text-xs text-gray-200">View Attendance</div>
              </Link>
            </div>

            {/* Features */}
            <div className="space-y-3">
              {[
                { icon: '📷', title: 'QR Attendance', desc: 'GPS-validated clock-in/out with QR codes' },
                { icon: '📱', title: t('feature1Title'), desc: t('feature1Desc') },
                { icon: '🗺️', title: t('feature2Title'), desc: t('feature2Desc') },
                { icon: '🔔', title: t('feature3Title'), desc: t('feature3Desc') },
                { icon: '🔒', title: t('feature4Title'), desc: t('feature4Desc') },
              ].map((f, i) => (
                <div key={i} className="card p-4 flex items-start gap-4 animate-slideUp" style={{ animationDelay: `${i * 0.1}s` }}>
                  <span className="text-2xl">{f.icon}</span>
                  <div>
                    <div className="font-bold text-sm text-gray-200">{f.title}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pricing */}
        <div className="mt-8 card p-5">
          <h3 className="font-bold text-sm text-indigo-400 mb-4">💎 {t('pricing')}</h3>
          <div className="grid grid-cols-3 gap-2">
            {[
              { plan: t('free'), price: '$0', features: t('freeFeatures'), key: 'free' },
              { plan: t('pro'), price: '$3.99/mo', features: t('proFeatures'), popular: true, key: 'pro' },
              { plan: t('enterprise'), price: '$11.99/mo', features: t('enterpriseFeatures'), key: 'enterprise' },
            ].map((p, i) => (
              <div key={i} className={`p-3 rounded-xl text-center ${p.popular ? 'bg-indigo-500/15 border border-indigo-500/30' : 'bg-white/3 border border-white/5'}`}>
                <div className={`text-[10px] font-bold ${p.popular ? 'text-indigo-400' : 'text-gray-500'}`}>{p.plan}</div>
                <div className="text-base font-black text-gray-200 my-1">{p.price}</div>
                <div className="text-[9px] text-gray-500 leading-tight">{p.features}</div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Bottom Nav */}
      {isLoggedIn && (
        <nav className="fixed bottom-0 inset-x-0 z-50 bg-[rgba(10,10,30,0.92)] backdrop-blur-xl border-t border-[rgba(99,102,241,0.12)] py-2 px-4">
          <div className="max-w-lg mx-auto flex justify-around">
            {[
              { icon: '🏠', label: t('home'), href: '/' },
              { icon: '📷', label: 'Scan', href: '/attendance-scanner' },
              { icon: '📋', label: 'Dashboard', href: '/attendance-dashboard' },
              { icon: '🏢', label: 'Orgs', href: '/organizations' },
              { icon: '👁', label: 'Viewer', href: '/viewer-login' },
            ].map((item, i) => (
              <Link key={i} href={item.href} className={`nav-item ${router.pathname === item.href ? 'text-indigo-400 bg-indigo-500/10' : 'text-gray-500'}`}>
                <span className="text-lg">{item.icon}</span>
                <span className="text-[10px] font-semibold">{item.label}</span>
              </Link>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}
