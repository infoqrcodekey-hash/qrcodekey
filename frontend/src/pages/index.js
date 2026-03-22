// ============================================
// pages/index.js - Home Page (QR-Centric Design)
// ============================================
// Visitor: LOGIN button + Big QR Code (links to register) + Download/Scan
// Logged In: Full dashboard with all features

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
  const [qrDataUrl, setQrDataUrl] = useState('');
  const menuRef = useRef(null);

  // The URL encoded in the QR code — points to register page
  const REGISTER_URL = typeof window !== 'undefined'
    ? `${window.location.origin}/register`
    : 'https://qrcodekey.com/register';

  // Generate QR code on mount
  useEffect(() => {
    generateQRCode();
  }, []);

  const generateQRCode = async () => {
    try {
      const QRCode = (await import('qrcode')).default;
      const dataUrl = await QRCode.toDataURL(REGISTER_URL, {
        width: 300,
        margin: 2,
        color: {
          dark: '#1a1a2e',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'H',
      });
      setQrDataUrl(dataUrl);
    } catch (err) {
      console.error('QR generation error:', err);
      // Fallback: use external API
      setQrDataUrl(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(REGISTER_URL)}`);
    }
  };

  // Download QR code as PNG
  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.download = 'QRCodeKey-Register.png';
    link.href = qrDataUrl;
    link.click();
  };

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

  const showLoggedIn = !loading && isLoggedIn;

  // ════════════════════════════════════════════
  // VISITOR VIEW (Not Logged In)
  // ════════════════════════════════════════════
  if (!showLoggedIn) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        {/* Background effects */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-600/5 blur-[120px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-pink-600/5 blur-[120px]" />
          <div className="absolute top-[30%] right-[20%] w-[30%] h-[30%] rounded-full bg-purple-600/5 blur-[100px]" />
        </div>

        {/* Header */}
        <header className="relative z-50 flex items-center justify-between px-5 py-4 max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white text-lg shadow-lg shadow-indigo-500/30">
              📍
            </div>
            <div>
              <div className="font-extrabold text-lg gradient-text">QRCodeKey</div>
              <div className="text-[10px] text-gray-500 -mt-0.5">{t('realtimeTracking')}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Link
              href="/login"
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white text-sm font-bold hover:opacity-90 transition-all shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 hover:scale-105"
            >
              {t('login')} →
            </Link>
          </div>
        </header>

        {/* Main Content */}
        <main className="relative flex flex-col items-center justify-center px-5 py-8 max-w-5xl mx-auto" style={{ minHeight: 'calc(100vh - 72px)' }}>

          {/* Scan to Register Label */}
          <p className="text-sm font-bold text-gray-300 mb-6">Scan to Register</p>

          {/* QR Code */}
          <div className="relative inline-block mb-8">
            <div className="absolute -inset-3 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 rounded-2xl blur-lg" />
            <div className="relative bg-white p-4 rounded-2xl shadow-xl">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="Scan to Register on QRCodeKey"
                  className="w-56 h-56 md:w-64 md:h-64 mx-auto"
                />
              ) : (
                <div className="w-56 h-56 md:w-64 md:h-64 flex items-center justify-center">
                  <div className="w-10 h-10 border-3 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                </div>
              )}
            </div>
          </div>

          {/* Download QR Button */}
          <button
            onClick={handleDownloadQR}
            className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-bold text-sm text-white transition-all duration-300
              bg-gradient-to-r from-indigo-500 to-purple-500
              hover:from-indigo-400 hover:to-purple-400
              hover:shadow-lg hover:shadow-indigo-500/25 hover:scale-[1.02]
              active:scale-[0.98]"
          >
            <span>⬇️</span> Download QR
          </button>
        </main>
      </div>
    );
  }

  // ════════════════════════════════════════════
  // LOGGED IN VIEW (Full Dashboard)
  // ════════════════════════════════════════════
  return (
    <div className="min-h-screen pb-24">
      {/* Header - Clean, no hamburger menu */}
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
            <Link href="/profile" className="w-9 h-9 rounded-xl bg-indigo-500/15 flex items-center justify-center text-sm hover:bg-indigo-500/25 transition-all">⚙️</Link>
            <button onClick={logout} className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center text-sm hover:bg-red-500/20 transition-all">🚪</button>
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-5 pt-8">
        {/* Welcome */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-2xl shadow-indigo-500/40 animate-float">
            <span className="text-4xl">📍</span>
          </div>
          <h1 className="text-2xl font-black gradient-text mb-1">Welcome, {user?.name?.split(' ')[0]}!</h1>
          <p className="text-xs text-gray-500">{t('heroDesc')}</p>
        </div>

        {/* ═══ PERSONAL DASHBOARD ═══ */}
        <div className="card p-5 mb-6 border-indigo-500/15">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center text-lg">👤</div>
            <h2 className="font-bold text-sm text-indigo-400">Personal Dashboard</h2>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Create QR', icon: '➕', href: '/generate', color: 'indigo' },
              { label: 'Scan QR', icon: '📷', href: '/scanner', color: 'pink' },
              { label: 'Map View', icon: '🗺️', href: '/map', color: 'green' },
              { label: 'Notifications', icon: '🔔', href: '/notifications', color: 'red' },
              { label: 'Face ID', icon: '🤳', href: '/face-verification', color: 'cyan' },
              { label: 'Profile', icon: '⚙️', href: '/profile', color: 'gray' },
            ].map((item, i) => (
              <Link key={i} href={item.href}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white/3 border border-white/5 hover:border-indigo-500/30 hover:bg-white/5 transition-all group">
                <span className="text-2xl group-hover:scale-110 transition-transform">{item.icon}</span>
                <span className="text-[10px] font-bold text-gray-400 group-hover:text-gray-200">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* ═══ ORGANIZATION DASHBOARD ═══ */}
        <div className="card p-5 mb-6 border-purple-500/15">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center text-lg">🏢</div>
            <h2 className="font-bold text-sm text-purple-400">Organization Dashboard</h2>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Organizations', icon: '🏢', href: '/organizations' },
              { label: 'Attendance', icon: '📷', href: '/attendance-scanner' },
              { label: 'Dashboard', icon: '📊', href: '/attendance-dashboard' },
              { label: 'Leave Mgmt', icon: '📋', href: '/leave-management' },
              { label: 'Holidays', icon: '🎉', href: '/holiday-calendar' },
              { label: 'Visitors', icon: '👤', href: '/visitor-management' },
              { label: 'Shifts', icon: '🕐', href: '/shift-management' },
              { label: 'Reports', icon: '📊', href: '/reports' },
              { label: 'Audit Log', icon: '📜', href: '/audit-log' },
              { label: 'Broadcast', icon: '🚨', href: '/emergency-broadcast' },
              { label: 'Viewer', icon: '👁', href: '/viewer-login' },
              { label: 'Chatbot', icon: '🤖', href: '/chatbot' },
            ].map((item, i) => (
              <Link key={i} href={item.href}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white/3 border border-white/5 hover:border-purple-500/30 hover:bg-white/5 transition-all group">
                <span className="text-2xl group-hover:scale-110 transition-transform">{item.icon}</span>
                <span className="text-[10px] font-bold text-gray-400 group-hover:text-gray-200">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Search Bar */}
        <div className="card p-5 mb-6 border-indigo-500/15">
          <h3 className="font-bold text-sm text-gray-200 mb-3">🔍 Search QR Code</h3>
          <form onSubmit={handleSearch} className="space-y-3">
            <input type="text" className="input-field" placeholder="Enter QR Code ID..."
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            <input type="password" className="input-field" placeholder="Password (if protected)"
              value={searchPassword} onChange={(e) => setSearchPassword(e.target.value)} />
            <button type="submit" disabled={searching || !searchQuery.trim()} className="btn-primary w-full text-sm">
              {searching ? '🔄 Searching...' : '🔍 Search & Track on Map'}
            </button>
          </form>
          {searchResult && (
            <div className="mt-4">
              {searchResult.error ? (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">❌ {searchResult.error}</div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
                    <div className="text-sm font-bold text-green-400">✅ QR Code Found!</div>
                    <div className="text-xs text-gray-400 mt-1">{searchResult.category && <span>Category: {searchResult.category}</span>}</div>
                  </div>
                  {searchResult.locations?.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-bold text-gray-300">📍 Scan Locations:</div>
                      {searchResult.locations.map((loc, i) => (
                        <a key={i} href={`https://www.google.com/maps?q=${loc.lat},${loc.lng}`} target="_blank" rel="noopener noreferrer"
                          className="block p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-all">
                          <div className="text-xs text-indigo-400">🗺️ Location {i + 1}</div>
                          <div className="text-[10px] text-gray-500">{loc.address || `${loc.lat}, ${loc.lng}`}</div>
                        </a>
                      ))}
                    </div>
                  )}
                  <Link href={`/map/${searchResult.qrId || searchQuery}`} className="btn-primary w-full text-center block text-sm">🗺️ View on Full Map</Link>
                </div>
              )}
            </div>
          )}
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

        {/* Pricing */}
        <div className="card p-5 mb-6">
          <h3 className="font-bold text-sm text-indigo-400 mb-1">🔔 Notification Plans</h3>
          <p className="text-[10px] text-gray-500 mb-4">QR generation free — pay only for instant scan alerts</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { plan: 'Free', price: '$0', desc: 'Unlimited QR codes', sub: 'No notifications', icon: '🆓' },
              { plan: 'Starter', price: '$0.99/mo', desc: '1 QR with alerts', sub: 'Email + Push', icon: '🔔' },
              { plan: 'Pro', price: '$4.99/mo', desc: '5 QR with alerts', sub: 'Email + SMS + Push', popular: true, icon: '💎' },
              { plan: 'Unlimited', price: '$14.99/mo', desc: 'Unlimited QR alerts', sub: 'All notifications + API', icon: '👑' },
            ].map((p, i) => (
              <div key={i} className={`p-3 rounded-xl text-center relative ${p.popular ? 'bg-indigo-500/15 border border-indigo-500/30' : 'bg-white/3 border border-white/5'}`}>
                {p.popular && <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-indigo-500 rounded-full text-[8px] text-white font-bold">POPULAR</div>}
                <span className="text-lg block mb-1">{p.icon}</span>
                <div className={`text-[10px] font-bold ${p.popular ? 'text-indigo-400' : 'text-gray-500'}`}>{p.plan}</div>
                <div className="text-sm font-black text-gray-200 my-1">{p.price}</div>
                <div className="text-[9px] text-gray-400">{p.desc}</div>
                <div className="text-[8px] text-gray-600">{p.sub}</div>
              </div>
            ))}
          </div>
          <Link href="/pricing" className="block text-center mt-3 text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold">
            View all plans & yearly discounts →
          </Link>
        </div>

        {/* Footer Links */}
        <div className="card p-5 mb-6">
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
        </div>

        {/* Copyright */}
        <div className="text-center py-4">
          <div className="text-[10px] text-gray-600">&copy; 2026 QRCodeKey by Ashvinkumar Chaudhari. All rights reserved.</div>
          <div className="text-[9px] text-gray-600 mt-0.5">647 Rose Ln, Bartlett, IL 60103, USA</div>
          <div className="flex justify-center gap-3 mt-2">
            <Link href="/terms" className="text-[10px] text-gray-500 hover:text-indigo-400">{t('termsOfService')}</Link>
            <Link href="/privacy-policy" className="text-[10px] text-gray-500 hover:text-indigo-400">{t('privacyPolicy')}</Link>
            <Link href="/refund-policy" className="text-[10px] text-gray-500 hover:text-indigo-400">Refund Policy</Link>
          </div>
        </div>
      </main>

      {/* Bottom Nav */}
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
    </div>
  );
}
