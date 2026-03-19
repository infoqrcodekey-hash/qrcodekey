// ============================================
// pages/dashboard.js - User Dashboard
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { qrAPI, adminAPI } from '../lib/api';
import { onScanAlert } from '../lib/socket';
import Link from 'next/link';
import toast from 'react-hot-toast';
import LanguageSwitcher from '../components/LanguageSwitcher';

export default function Dashboard() {
  const { user, isLoggedIn, isAdmin } = useAuth();
  const { t } = useLanguage();
  const [tab, setTab] = useState('my-qr'); // my-qr, admin
  const [qrCodes, setQrCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adminStats, setAdminStats] = useState(null);
  const [adminUsers, setAdminUsers] = useState([]);

  // Load QR codes
  const loadQRCodes = useCallback(async () => {
    try {
      setLoading(true);
      const res = await qrAPI.getMyQRCodes();
      setQrCodes(res.data.data);
    } catch (err) {
      toast.error(t('error'));
    } finally {
      setLoading(false);
    }
  }, []);

  // Load admin stats
  const loadAdminData = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const [statsRes, usersRes] = await Promise.all([
        adminAPI.getStats(),
        adminAPI.getUsers()
      ]);
      setAdminStats(statsRes.data.data);
      setAdminUsers(usersRes.data.data);
    } catch (err) {
      console.error('Admin data error:', err);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isLoggedIn) {
      loadQRCodes();
      if (isAdmin) loadAdminData();
    }
  }, [isLoggedIn, isAdmin, loadQRCodes, loadAdminData]);

  // Real-time scan alerts
  useEffect(() => {
    if (!isLoggedIn) return;
    const cleanup = onScanAlert((data) => {
      toast(`📍 ${data.qrId} scanned from ${data.location}`, { icon: '🔔' });
      loadQRCodes(); // Refresh
    });
    return cleanup;
  }, [isLoggedIn, loadQRCodes]);

  // Delete QR
  const handleDelete = async (qrId) => {
    if (!window.confirm(t('deleteConfirm'))) return;
    try {
      await qrAPI.delete(qrId);
      setQrCodes(prev => prev.filter(q => q.qrId !== qrId));
      toast.success(t('deleteSuccess'));
    } catch (err) {
      toast.error(t('deleteFailed'));
    }
  };

  // Toggle active/inactive
  const handleToggle = async (qr) => {
    try {
      if (qr.isActive) {
        await qrAPI.deactivate(qr.qrId);
        toast.success(t('deactivateSuccess'));
      } else {
        toast.error(t('reactivateInstructions'));
        return;
      }
      loadQRCodes();
    } catch (err) {
      toast.error(t('toggleFailed'));
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-5">
        <div className="card p-8 text-center max-w-sm">
          <span className="text-5xl block mb-4">🔒</span>
          <h2 className="font-bold text-lg text-gray-200 mb-2">{t('loginRequired')}</h2>
          <Link href="/login" className="btn-primary inline-block mt-3">{t('login')} →</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[rgba(10,10,30,0.85)] backdrop-blur-xl border-b border-[rgba(99,102,241,0.15)] px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Link href="/" className="text-gray-400 hover:text-white text-sm shrink-0">←</Link>
            <div className="min-w-0">
              <div className="font-bold text-sm text-gray-200 truncate">{t('dashboard')}</div>
              <div className="text-[10px] text-gray-500 truncate">👤 {user?.name} • {user?.plan?.toUpperCase()}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <LanguageSwitcher />
            <Link href="/generate" className="bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 text-[10px] font-bold px-2 py-1.5 rounded-lg hover:bg-indigo-500/30 whitespace-nowrap">
              ➕ {t('generateNew')}
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-5 pt-4">
        {/* Tabs (Admin only) */}
        {isAdmin && (
          <div className="flex gap-2 mb-4">
            {[
              { id: 'my-qr', label: `📋 ${t('myQRCodes')}` },
              { id: 'admin', label: `👑 ${t('adminPanel')}` },
            ].map(tab_item => (
              <button key={tab_item.id} onClick={() => setTab(tab_item.id)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                  tab === tab_item.id ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-white/3 text-gray-500 border border-white/5'
                }`}>
                {tab_item.label}
              </button>
            ))}
          </div>
        )}

        {/* ===== MY QR CODES TAB ===== */}
        {tab === 'my-qr' && (
          <div className="animate-fadeIn">
            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="stat-card bg-indigo-500/5 border-indigo-500/10">
                <div className="text-xl font-black text-indigo-400">{qrCodes.length}</div>
                <div className="text-[9px] text-gray-500">{t('totalQR')}</div>
              </div>
              <div className="stat-card bg-green-500/5 border-green-500/10">
                <div className="text-xl font-black text-green-400">{qrCodes.filter(q => q.isActive).length}</div>
                <div className="text-[9px] text-gray-500">{t('active')}</div>
              </div>
              <div className="stat-card bg-pink-500/5 border-pink-500/10">
                <div className="text-xl font-black text-pink-400">{qrCodes.reduce((a, q) => a + (q.totalScans || 0), 0)}</div>
                <div className="text-[9px] text-gray-500">{t('totalScans')}</div>
              </div>
            </div>

            {/* QR List */}
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin text-3xl mb-3">⏳</div>
                <div className="text-sm text-gray-500">{t('loading')}</div>
              </div>
            ) : qrCodes.length === 0 ? (
              <div className="card p-8 text-center">
                <span className="text-5xl block mb-3">📭</span>
                <p className="text-sm text-gray-400 mb-4">{t('noQRCodes')}</p>
                <Link href="/generate" className="btn-primary inline-block">➕ {t('generateNew')}</Link>
              </div>
            ) : (
              <div className="space-y-3">
                {qrCodes.map((qr) => (
                  <div key={qr.qrId} className="card p-4 animate-fadeIn">
                    {/* Top row */}
                    <div className="flex items-center gap-3 mb-3">
                      {qr.qrImageUrl && (
                        <div className="flex-shrink-0 bg-white rounded-lg p-1">
                          {/* eslint-disable-next-line */}
                          <img src={qr.qrImageUrl} alt="QR" className="w-12 h-12" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-mono font-extrabold text-sm text-indigo-300 truncate">{qr.qrId}</div>
                        <div className="text-[11px] text-gray-500 truncate">
                          {qr.registeredName ? `${qr.registeredName} • ${qr.category}` : 'Not registered'} • {new Date(qr.createdAt).toLocaleDateString('en-US')}
                        </div>
                      </div>
                      <span className={`badge ${qr.isActive ? 'badge-active' : 'badge-inactive'}`}>
                        {qr.isActive ? t('active').toUpperCase() : t('inactive').toUpperCase()}
                      </span>
                    </div>

                    {/* Stats row */}
                    <div className="flex gap-1.5 flex-wrap">
                      <div className="bg-indigo-500/5 rounded-lg p-2 text-center min-w-[50px]">
                        <div className="text-base font-black text-indigo-400">{qr.totalScans || 0}</div>
                        <div className="text-[8px] text-gray-500">{t('scans')}</div>
                      </div>

                      {/* Actions */}
                      <Link href={`/qr/${qr.qrId}`} className="flex-1 min-w-[48px] bg-indigo-500/5 border border-indigo-500/15 rounded-lg p-2 text-center hover:bg-indigo-500/10 transition-all">
                        <div className="text-sm">📷</div>
                        <div className="text-[8px] text-indigo-400 font-bold">{t('qrCode')}</div>
                      </Link>
                      <Link href={`/map/${qr.qrId}`} className="flex-1 min-w-[48px] bg-green-500/5 border border-green-500/15 rounded-lg p-2 text-center hover:bg-green-500/10 transition-all">
                        <div className="text-sm">🗺️</div>
                        <div className="text-[8px] text-green-400 font-bold">{t('viewMap')}</div>
                      </Link>

                      {qr.isActive && (
                        <button onClick={() => handleToggle(qr)} className="flex-1 min-w-[48px] bg-yellow-500/5 border border-yellow-500/15 rounded-lg p-2 text-center hover:bg-yellow-500/10 transition-all">
                          <div className="text-sm">⏸️</div>
                          <div className="text-[8px] text-yellow-400 font-bold">{t('deactivate')}</div>
                        </button>
                      )}

                      <button onClick={() => handleDelete(qr.qrId)} className="min-w-[40px] bg-red-500/5 border border-red-500/15 rounded-lg p-2 text-center hover:bg-red-500/10 transition-all">
                        <div className="text-sm">🗑️</div>
                        <div className="text-[8px] text-red-400 font-bold">{t('delete')}</div>
                      </button>
                    </div>

                    {/* Last scan location */}
                    {qr.lastKnownLocation?.city && (
                      <div className="mt-2 p-2 rounded-lg bg-white/2 text-[10px] text-gray-500 flex items-center gap-2">
                        <span>📍</span>
                        <span>Last: {qr.lastKnownLocation.city}, {qr.lastKnownLocation.country}</span>
                        {qr.lastKnownLocation.capturedAt && (
                          <span className="text-gray-600">• {new Date(qr.lastKnownLocation.capturedAt).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Plan info */}
            <div className="card p-4 mt-6 text-center">
              <div className="text-xs text-gray-500 mb-1">{t('currentPlan')}</div>
              <div className="text-lg font-black gradient-text">{user?.plan?.toUpperCase()}</div>
              <div className="text-[10px] text-gray-500 mt-1">
                {qrCodes.length} / {user?.qrLimit || 5} {t('qrCodesUsed')}
              </div>
              <div className="w-full h-1.5 bg-white/5 rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-indigo-500 to-pink-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (qrCodes.length / (user?.qrLimit || 5)) * 100)}%` }} />
              </div>
              {user?.plan === 'free' && (
                <p className="text-[10px] text-indigo-400 mt-3 font-semibold">💎 {t('upgradePrompt')}</p>
              )}
            </div>
          </div>
        )}

        {/* ===== ADMIN TAB ===== */}
        {tab === 'admin' && isAdmin && (
          <div className="animate-fadeIn">
            {adminStats ? (
              <>
                {/* Overview Stats */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {[
                    { labelKey: 'totalUsers', value: adminStats.overview.totalUsers, icon: '👤', color: 'indigo', bgClass: 'bg-indigo-500/5 border-indigo-500/10', textClass: 'text-indigo-400' },
                    { labelKey: 'activeQR', value: adminStats.overview.activeQRCodes, icon: '✅', color: 'green', bgClass: 'bg-green-500/5 border-green-500/10', textClass: 'text-green-400' },
                    { labelKey: 'totalScans', value: adminStats.overview.totalScans, icon: '📊', color: 'pink', bgClass: 'bg-pink-500/5 border-pink-500/10', textClass: 'text-pink-400' },
                    { labelKey: 'revenue', value: adminStats.overview.estimatedRevenue, icon: '💰', color: 'yellow', bgClass: 'bg-yellow-500/5 border-yellow-500/10', textClass: 'text-yellow-400' },
                    { labelKey: 'totalQRCodes', value: adminStats.overview.totalQRCodes, icon: '📱', color: 'purple', bgClass: 'bg-purple-500/5 border-purple-500/10', textClass: 'text-purple-400' },
                    { labelKey: 'premiumUsers', value: adminStats.overview.premiumUsers, icon: '💎', color: 'cyan', bgClass: 'bg-cyan-500/5 border-cyan-500/10', textClass: 'text-cyan-400' },
                  ].map((s, i) => (
                    <div key={i} className={`stat-card ${s.bgClass}`}>
                      <div className="text-lg mb-1">{s.icon}</div>
                      <div className={`text-xl font-black ${s.textClass}`}>{s.value}</div>
                      <div className="text-[9px] text-gray-500">{t(s.labelKey)}</div>
                    </div>
                  ))}
                </div>

                {/* Category Distribution */}
                {adminStats.charts?.categoryStats?.length > 0 && (
                  <div className="card p-4 mb-4">
                    <div className="text-xs font-bold text-gray-400 mb-3">📊 {t('categoryDistribution')}</div>
                    {adminStats.charts.categoryStats.map((cat, i) => {
                      const icons = { child: '👶', car: '🚗', bag: '👜', pet: '🐕', key: '🔑', luggage: '🧳', other: '📦' };
                      const categoryLabel = t(`category_${cat._id}`) || cat._id;
                      const total = adminStats.charts.categoryStats.reduce((a, c) => a + c.count, 0);
                      const pct = total > 0 ? (cat.count / total * 100).toFixed(0) : 0;
                      return (
                        <div key={i} className="flex items-center gap-3 py-1.5">
                          <span className="text-sm w-6">{icons[cat._id] || '📦'}</span>
                          <span className="text-xs text-gray-300 w-16 capitalize">{categoryLabel}</span>
                          <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-indigo-500 to-pink-500 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[10px] text-gray-500 w-8 text-right">{cat.count}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Recent Users */}
                <div className="card p-4 mb-4">
                  <div className="text-xs font-bold text-gray-400 mb-3">👤 {t('recentUsers')}</div>
                  {adminUsers.slice(0, 5).map((u, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                      <div>
                        <div className="text-xs font-bold text-gray-200">{u.name}</div>
                        <div className="text-[10px] text-gray-500">{u.email}</div>
                      </div>
                      <div className="text-right">
                        <span className={`badge ${u.plan !== 'free' ? 'bg-indigo-500/15 text-indigo-400' : 'bg-white/5 text-gray-500'}`}>
                          {u.plan?.toUpperCase()}
                        </span>
                        <div className="text-[9px] text-gray-600 mt-0.5">{u.qrCount || 0} {t('qrCode')} • {u.scanCount || 0} {t('scans')}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Recent Scans */}
                <div className="card p-4">
                  <div className="text-xs font-bold text-gray-400 mb-3">📍 {t('recentScans')}</div>
                  {adminStats.recent?.scans?.map((s, i) => (
                    <div key={i} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                      <span className="text-sm">📍</span>
                      <div className="flex-1">
                        <div className="text-xs font-mono text-indigo-300">{s.qrId}</div>
                        <div className="text-[10px] text-gray-500">{s.address?.city || t('unknown')} • {s.device?.deviceType || t('unknown')}</div>
                      </div>
                      <div className="text-[10px] text-gray-500">
                        {new Date(s.createdAt).toLocaleString('en-US', { timeStyle: 'short' })}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <div className="animate-spin text-3xl mb-3">⏳</div>
                <div className="text-sm text-gray-500">{t('loading')}</div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 inset-x-0 z-50 bg-[rgba(10,10,30,0.92)] backdrop-blur-xl border-t border-[rgba(99,102,241,0.12)] py-1.5 px-2">
        <div className="max-w-lg mx-auto flex justify-around">
          {[
            { icon: '🏠', labelKey: 'home', href: '/' },
            { icon: '➕', labelKey: 'generate', href: '/generate' },
            { icon: '📊', labelKey: 'analytics', href: '/analytics' },
            { icon: '🏢', labelKey: 'organizations', href: '/organizations' },
            { icon: '📋', labelKey: 'dashboard', href: '/dashboard' },
          ].map((item, i) => (
            <Link key={i} href={item.href} className={`nav-item px-1.5 ${item.href === '/dashboard' ? 'text-indigo-400 bg-indigo-500/10' : 'text-gray-500'}`}>
              <span className="text-base">{item.icon}</span>
              <span className="text-[9px] font-semibold truncate max-w-[48px]">{t(item.labelKey)}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
