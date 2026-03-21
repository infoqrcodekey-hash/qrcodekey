// ============================================
// pages/index.js - Home Page (Redesigned)
// ============================================

import { useState, useEffect, useRef } from 'react';
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchPassword, setSearchPassword] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [searching, setSearching] = useState(false);
  const menuRef = useRef(null);

  // Real-time scan alerts
  useEffect(() => {
    if (!isLoggedIn) return;
    const cleanup = onScanAlert((data) => {
      setAlerts(prev => [data, ...prev].slice(0, 5));
    });
    return cleanup;
  }, [isLoggedIn]);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // QR Search handler
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchResult(null);
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || '';
      const res = await fetch(`${API}/api/qr/search?qrId=${encodeURIComponent(searchQuery)}&password=${encodeURIComponent(searchPassword)}`);
      const data = await res.json();
      if (res.ok && data) {
        setSearchResult(data);
      } else {
        setSearchResult({ error: 'QR Code not found or wrong password' });
      }
    } catch (err) {
      setSearchResult({ error: 'Search failed. Try again.' });
    }
    setSearching(false);
  };

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
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-indigo-500/20 hover:scale-105 transition-transform"
                >
                  ☰
                </button>

                {/* Dropdown Menu */}
                {menuOpen && (
                  <div className="absolute right-0 top-12 w-64 bg-[rgba(15,12,40,0.98)] backdrop-blur-xl rounded-2xl border border-[rgba(99,102,241,0.25)] shadow-2xl shadow-black/50 overflow-hidden z-50 animate-slideUp">
                    {/* User info */}
                    <div className="p-4 border-b border-white/5">
                      <div className="text-sm font-bold text-gray-200">👤 {user?.name}</div>
                      <div className="text-[10px] text-gray-500 mt-0.5">{user?.email}</div>
                    </div>

                    {/* Menu items */}
                    <div className="p-2 max-h-[60vh] overflow-y-auto">
                      {[
                        { label: t('generateQR'), icon: '➕', href: '/generate', color: 'indigo' },
                        { label: t('trackQR'), icon: '📍', href: '/scanner', color: 'pink' },
                        { label: 'Attendance Scan', icon: '📷', href: '/attendance-scanner', color: 'cyan' },
                        { label: t('dashboard'), icon: '📋', href: '/attendance-dashboard', color: 'purple' },
                        { label: 'Organizations', icon: '🏢', href: '/organizations', color: 'blue' },
                        { label: 'Leave Management', icon: '📋', href: '/leave-management', color: 'green' },
                        { label: 'Holiday Calendar', icon: '🎉', href: '/holiday-calendar', color: 'yellow' },
                        { label: 'Visitor Management', icon: '👤', href: '/visitor-management', color: 'orange' },
                        { label: 'Shift Management', icon: '🕐', href: '/shift-management', color: 'indigo' },
                        { label: 'Reports', icon: '📊', href: '/reports', color: 'teal' },
                        { label: 'Audit Log', icon: '📜', href: '/audit-log', color: 'gray' },
                        { label: 'Notifications', icon: '🔔', href: '/notifications', color: 'red' },
                        { label: 'Emergency Broadcast', icon: '🚨', href: '/emergency-broadcast', color: 'red' },
                        { label: 'Face Verification', icon: '🤳', href: '/face-verification', color: 'cyan' },
                        { label: t('profile'), icon: '⚙️', href: '/profile', color: 'green' },
                      ].map((item, i) => (
                        <Link
                          key={i}
                          href={item.href}
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-all"
                        >
                          <span className="text-lg">{item.icon}</span>
                          <span className="text-sm text-gray-300 font-medium">{item.label}</span>
                        </Link>
                      ))}
                    </div>

                    {/* Logout */}
                    <div className="p-2 border-t border-white/5">
                      <button
                        onClick={() => { logout(); setMenuOpen(false); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-500/10 transition-all text-red-400"
                      >
                        <span className="text-lg">🚪</span>
                        <span className="text-sm font-medium">{t('logout')}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/login" className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-pink-500 text-white text-xs font-bold hover:opacity-90 transition-all shadow-lg shadow-indigo-500/20">
                {t('login')} →
              </Link>
            )}
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-5 pt-8">
        {/* Hero - Clean QR Focus */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 mx-auto mb-5 rounded-3xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-2xl shadow-indigo-500/40 animate-float">
            <span className="text-5xl">📍</span>
          </div>
          <h1 className="text-3xl font-black gradient-text mb-2">{t('heroTitle')}</h1>
          <p className="text-sm text-gray-400 max-w-xs mx-auto leading-relaxed">
            {t('heroDesc')}
          </p>
        </div>

        {/* Main Actions - Scan & Download */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Link href="/scanner" className="card p-5 text-center hover:border-indigo-500/30 transition-all group border-indigo-500/15">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-indigo-500/15 flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="text-3xl">📷</span>
            </div>
            <div className="font-bold text-sm text-gray-200">{t('trackQR')}</div>
            <div className="text-[10px] text-gray-500 mt-1">Scan any QR code</div>
          </Link>
          <Link href="/generate" className="card p-5 text-center hover:border-pink-500/30 transition-all group border-pink-500/15">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-pink-500/15 flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="text-3xl">⬇️</span>
            </div>
            <div className="font-bold text-sm text-gray-200">{t('generateQR')}</div>
            <div className="text-[10px] text-gray-500 mt-1">Download QR code</div>
          </Link>
        </div>

        {/* Search Bar - QR Code Search */}
        {isLoggedIn && (
          <div className="card p-5 mb-6 border-indigo-500/15">
            <h3 className="font-bold text-sm text-gray-200 mb-3">🔍 Search QR Code</h3>
            <form onSubmit={handleSearch} className="space-y-3">
              <input
                type="text"
                className="input-field"
                placeholder="Enter QR Code ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <input
                type="password"
                className="input-field"
                placeholder="Password (if protected)"
                value={searchPassword}
                onChange={(e) => setSearchPassword(e.target.value)}
              />
              <button
                type="submit"
                disabled={searching || !searchQuery.trim()}
                className="btn-primary w-full text-sm"
              >
                {searching ? '🔄 Searching...' : '🔍 Search & Track on Map'}
              </button>
            </form>

            {/* Search Result */}
            {searchResult && (
              <div className="mt-4">
                {searchResult.error ? (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
                    ❌ {searchResult.error}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
                      <div className="text-sm font-bold text-green-400">✅ QR Code Found!</div>
                      <div className="text-xs text-gray-400 mt-1">
                        {searchResult.category && <span>Category: {searchResult.category}</span>}
                      </div>
                    </div>
                    {searchResult.locations && searchResult.locations.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs font-bold text-gray-300">📍 Scan Locations:</div>
                        {searchResult.locations.map((loc, i) => (
                          <a
                            key={i}
                            href={`https://www.google.com/maps?q=${loc.lat},${loc.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-all"
                          >
                            <div className="text-xs text-indigo-400">🗺️ Location {i + 1}</div>
                            <div className="text-[10px] text-gray-500">{loc.address || `${loc.lat}, ${loc.lng}`}</div>
                          </a>
                        ))}
                      </div>
                    )}
                    <Link href={`/map/${searchResult.qrId || searchQuery}`} className="btn-primary w-full text-center block text-sm">
                      🗺️ View on Full Map
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Quick Access for visitors */}
        {!isLoggedIn && (
          <div className="grid grid-cols-2 gap-3 mb-6">
            <Link href="/attendance-scanner" className="card p-4 text-center hover:border-indigo-500/30 transition-all">
              <span className="text-2xl block mb-1">📷</span>
              <div className="font-bold text-xs text-gray-200">Attendance Scan</div>
            </Link>
            <Link href="/viewer-login" className="card p-4 text-center hover:border-indigo-500/30 transition-all">
              <span className="text-2xl block mb-1">👁</span>
              <div className="font-bold text-xs text-gray-200">View Attendance</div>
            </Link>
          </div>
        )}

        {/* Register CTA for non-logged in */}
        {!isLoggedIn && (
          <div className="card p-6 text-center mb-6 border-indigo-500/15">
            <h2 className="font-bold text-lg text-gray-200 mb-2">{t('getStarted')}</h2>
            <p className="text-xs text-gray-400 mb-5">{t('getStartedDesc')}</p>
            <div className="flex gap-3">
              <Link href="/register" className="btn-primary flex-1 text-center block">{t('register')}</Link>
              <Link href="/login" className="btn-secondary flex-1 text-center block">{t('login')}</Link>
            </div>
          </div>
        )}

        {/* Real-time Alerts for logged-in */}
        {isLoggedIn && alerts.length > 0 && (
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

        {/* How it Works - for visitors */}
        {!isLoggedIn && (
          <div className="space-y-3 mb-6">
            <h3 className="font-bold text-sm text-gray-300 text-center">{t('howItWorks')}</h3>
            <div className="card p-4 border-indigo-500/20">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">📱</span>
                <div>
                  <div className="font-bold text-sm text-indigo-400">{t('mode1Title')}</div>
                  <div className="text-[10px] text-gray-500">{t('mode1Tag')}</div>
                </div>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">{t('mode1Note')}</p>
            </div>
            <div className="card p-4 border-pink-500/20">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">🏢</span>
                <div>
                  <div className="font-bold text-sm text-pink-400">{t('mode2Title')}</div>
                  <div className="text-[10px] text-gray-500">{t('mode2Tag')}</div>
                </div>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">{t('mode2Note')}</p>
            </div>
          </div>
        )}

        {/* Pricing */}
        <div className="card p-5 mb-6">
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

        {/* Footer Links */}
        <div className="card p-5">
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              { icon: '📖', label: t('aboutUs'), href: '/about' },
              { icon: '✉️', label: t('contactUs'), href: '/contact' },
              { icon: '❓', label: t('helpCenter'), href: '/help' },
              { icon: '🤖', label: t('chatWithBot'), href: '/chatbot' },
            ].map((item, i) => (
              <Link key={i} href={item.href} className="p-3 rounded-xl hover:bg-white/5 transition-all group">
                <span className="text-xl block mb-1 group-hover:scale-110 transition-transform">{item.icon}</span>
                <div className="text-[10px] text-gray-400 font-semibold">{item.label}</div>
              </Link>
            ))}
          </div>
          <div className="text-center mt-4 pt-3 border-t border-white/5">
            <div className="text-[10px] text-gray-600">© 2026 QRCodeKey by Ashvinkumar Chaudhari. All rights reserved.</div>
            <div className="text-[9px] text-gray-600 mt-0.5">647 Rose Ln, Bartlett, IL 60103, USA</div>
            <div className="flex justify-center gap-3 mt-2">
              <Link href="/terms" className="text-[10px] text-gray-500 hover:text-indigo-400">{t('termsOfService')}</Link>
              <Link href="/privacy-policy" className="text-[10px] text-gray-500 hover:text-indigo-400">{t('privacyPolicy')}</Link>
              <Link href="/refund-policy" className="text-[10px] text-gray-500 hover:text-indigo-400">Refund Policy</Link>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Nav - Only for logged in */}
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
