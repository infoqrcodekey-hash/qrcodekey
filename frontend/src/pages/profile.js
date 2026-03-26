// ============================================
// pages/profile.js - User Profile & Settings
// ============================================

import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { authAPI } from '../lib/api';
import Link from 'next/link';
import toast from 'react-hot-toast';
import LanguageSwitcher from '../components/LanguageSwitcher';

export default function Profile() {
  const { user, isLoggedIn, logout, refreshUser } = useAuth();
  const { t } = useLanguage();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [saving, setSaving] = useState(false);

  // Password change
  const [showPwdForm, setShowPwdForm] = useState(false);
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [changingPwd, setChangingPwd] = useState(false);

  // Delete account
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-5">
        <div className="card p-8 text-center max-w-sm">
          <span className="text-5xl block mb-4">🔒</span>
          <Link href="/login" className="btn-primary inline-block">{t('login')} →</Link>
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      await authAPI.updateProfile({ name, phone });
      await refreshUser();
      setEditing(false);
      toast.success(t('updateSuccess'));
    } catch (err) {
      toast.error(err.response?.data?.message || t('updateFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (newPwd.length < 6) { toast.error(t('passwordMinLength')); return; }
    setChangingPwd(true);
    try {
      await authAPI.changePassword({ currentPassword: currentPwd, newPassword: newPwd });
      toast.success(t('passwordChangeSuccess'));
      setShowPwdForm(false);
      setCurrentPwd('');
      setNewPwd('');
    } catch (err) {
      toast.error(err.response?.data?.message || t('passwordChangeFailed'));
    } finally {
      setChangingPwd(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETE MY ACCOUNT') {
      toast.error('Please type "DELETE MY ACCOUNT" to confirm');
      return;
    }
    if (!deletePassword) {
      toast.error('Password is required');
      return;
    }

    setDeleting(true);
    try {
      await authAPI.deleteAccount({ password: deletePassword });
      toast.success('Account deleted successfully');
      setTimeout(() => {
        logout();
        window.location.href = '/login';
      }, 1500);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error deleting account');
    } finally {
      setDeleting(false);
    }
  };

  const handleExportData = async () => {
    try {
      const response = await authAPI.exportMyData();
      // Create a download link
      const element = document.createElement('a');
      element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(JSON.stringify(response.data, null, 2)));
      element.setAttribute('download', `qrcodekey-data-export-${Date.now()}.json`);
      element.style.display = 'none';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      toast.success('Data exported successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error exporting data');
    }
  };

  const planColors = { free: 'text-gray-400', pro: 'text-indigo-400', business: 'text-yellow-400' };
  const planIcons = { free: '🆓', pro: '💎', business: '👑' };

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-50 bg-[rgba(10,10,30,0.85)] backdrop-blur-xl border-b border-[rgba(99,102,241,0.15)] px-5 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between gap-3">
          <Link href="/" className="text-gray-400 hover:text-white text-sm">←</Link>
          <div className="font-bold text-sm text-gray-200">{t('profile')}</div>
          <LanguageSwitcher />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-5 pt-6 space-y-4">
        {/* Profile Card */}
        <div className="card p-6 text-center">
          <div className="w-20 h-20 mx-auto mb-3 rounded-full bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center text-3xl font-black text-white">
            {user.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <h2 className="text-lg font-bold text-gray-200">{user.name}</h2>
          <p className="text-xs text-gray-500">{user.email}</p>
          <div className="mt-2">
            <span className={`text-sm font-bold ${planColors[user.plan]}`}>
              {planIcons[user.plan]} {user.plan?.toUpperCase()} Plan
            </span>
          </div>
        </div>

        {/* Edit Profile */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-gray-400">👤 {t('profileInfo')}</span>
            <button onClick={() => setEditing(!editing)} className="text-xs text-indigo-400 font-bold">
              {editing ? t('cancel') : '✏️ ' + t('edit')}
            </button>
          </div>

          {editing ? (
            <div className="space-y-3">
              <div>
                <label className="label">{t('name')}</label>
                <input className="input-field" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div>
                <label className="label">{t('phone')}</label>
                <input className="input-field" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 XXXXXXXXXX" />
              </div>
              <button onClick={handleSave} disabled={saving} className="btn-primary w-full">
                {saving ? '⏳ ' + t('saving') : '💾 ' + t('saveChanges')}
              </button>
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-gray-500">{t('name')}</span>
                <span className="text-gray-200 font-semibold">{user.name}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-gray-500">{t('email')}</span>
                <span className="text-gray-200 font-semibold">{user.email}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-gray-500">{t('phone')}</span>
                <span className="text-gray-200 font-semibold">{user.phone || t('notSet')}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-gray-500">{t('role')}</span>
                <span className={`font-semibold ${user.role === 'admin' ? 'text-yellow-400' : 'text-gray-200'}`}>
                  {user.role === 'admin' ? '👑 ' + t('admin') : '👤 ' + t('user')}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-gray-500">{t('qrLimit')}</span>
                <span className="text-gray-200 font-semibold">{user.qrLimit || 5}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-500">{t('memberSince')}</span>
                <span className="text-gray-200 font-semibold">
                  {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US') : '-'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Change Password */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-gray-400">🔐 {t('password')}</span>
            <button onClick={() => setShowPwdForm(!showPwdForm)} className="text-xs text-indigo-400 font-bold">
              {showPwdForm ? t('cancel') : t('changePassword')}
            </button>
          </div>

          {showPwdForm && (
            <div className="space-y-3">
              <div>
                <label className="label">{t('currentPassword')}</label>
                <input type="password" className="input-field" value={currentPwd} onChange={e => setCurrentPwd(e.target.value)} />
              </div>
              <div>
                <label className="label">{t('newPassword')}</label>
                <input type="password" className="input-field" value={newPwd} onChange={e => setNewPwd(e.target.value)} />
              </div>
              <button onClick={handlePasswordChange} disabled={changingPwd} className="btn-primary w-full">
                {changingPwd ? '⏳ ' + t('changing') : '🔐 ' + t('changePassword')}
              </button>
            </div>
          )}
        </div>

        {/* Subscription */}
        <div className="card p-5">
          <div className="text-xs font-bold text-gray-400 mb-4">💎 {t('subscription')}</div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { plan: 'free', price: '$0', features: 'Unlimited QR\nNo Alerts' },
              { plan: 'starter', price: '$1.99/mo', features: '175 Alerts\nEmail + Push' },
              { plan: 'pro', price: '$4.99/mo', features: '500 Alerts\nEmail+SMS+Push', popular: true },
              { plan: 'unlimited', price: '$9.99/mo', features: 'Unlimited Alerts\nAll + API' },
            ].map((p, i) => (
              <div key={i} className={`p-3 rounded-xl text-center transition-all ${
                user.plan === p.plan
                  ? 'bg-indigo-500/15 border-2 border-indigo-500/40 ring-1 ring-indigo-500/20'
                  : p.popular ? 'bg-indigo-500/5 border border-indigo-500/15' : 'bg-white/2 border border-white/5'
              }`}>
                {user.plan === p.plan && <div className="text-[8px] text-indigo-400 font-bold mb-1">{t('current')}</div>}
                <div className={`text-[10px] font-bold ${user.plan === p.plan ? 'text-indigo-400' : 'text-gray-500'}`}>
                  {t(p.plan.toLowerCase())}
                </div>
                <div className="text-base font-black text-gray-200 my-1">{p.price}</div>
                <div className="text-[8px] text-gray-500 whitespace-pre-line leading-tight">{p.features}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Data Export */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-gray-400">📦 {t('exportData') || 'Export My Data'}</span>
          </div>
          <p className="text-xs text-gray-500 mb-4">Download all your data in JSON format for GDPR compliance or backup purposes.</p>
          <button onClick={handleExportData} className="btn-primary w-full text-sm">
            ⬇️ {t('exportData') || 'Export My Data'}
          </button>
        </div>

        {/* Delete Account */}
        <div className="card p-5 border-red-500/20 bg-red-500/5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-red-400">⚠️ {t('dangerZone') || 'Danger Zone'}</span>
          </div>
          <p className="text-xs text-gray-500 mb-4">Once you delete your account, there is no going back. Please be certain. All your data will be permanently deleted within 30 days.</p>
          <button onClick={() => setShowDeleteModal(true)} className="w-full py-2 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 font-bold text-sm hover:bg-red-500/30 transition-all">
            🗑️ Delete Account
          </button>
        </div>

        {/* Delete Account Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="card p-6 max-w-sm w-full space-y-4">
              <div className="text-center">
                <span className="text-4xl block mb-3">⚠️</span>
                <h3 className="text-lg font-bold text-red-400 mb-2">Delete Account</h3>
                <p className="text-xs text-gray-500">This action cannot be undone.</p>
              </div>

              <div className="bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                <p className="text-xs text-red-400 leading-relaxed">
                  <strong>All your data will be deleted permanently:</strong> QR codes, scan logs, teams, organizations, and payment history. This process will take up to 30 days to complete.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="label">Password Confirmation</label>
                  <input
                    type="password"
                    className="input-field"
                    placeholder="Enter your password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                  />
                </div>

                <div>
                  <label className="label">Type to Confirm</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder='Type "DELETE MY ACCOUNT"'
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    {deleteConfirm === 'DELETE MY ACCOUNT' ? (
                      <span className="text-green-400">✓ Ready to delete</span>
                    ) : (
                      <span>Type exactly: DELETE MY ACCOUNT</span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeletePassword('');
                    setDeleteConfirm('');
                  }}
                  className="flex-1 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 font-semibold text-sm hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting || deleteConfirm !== 'DELETE MY ACCOUNT'}
                  className="flex-1 py-2 rounded-xl bg-red-500 text-white font-semibold text-sm hover:bg-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleting ? '⏳ Deleting...' : '🗑️ Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Legal Links */}
        <div className="card p-4 mt-4">
          <h3 className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider">📋 Legal & Policies</h3>
          <div className="space-y-2">
            <Link href="/privacy-policy" className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-all">
              <span className="text-xs text-gray-300">🔒 Privacy Policy</span>
              <span className="text-gray-600 text-xs">→</span>
            </Link>
            <Link href="/terms" className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-all">
              <span className="text-xs text-gray-300">📄 Terms of Service</span>
              <span className="text-gray-600 text-xs">→</span>
            </Link>
            <Link href="/refund-policy" className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-all">
              <span className="text-xs text-gray-300">💰 Refund Policy</span>
              <span className="text-gray-600 text-xs">→</span>
            </Link>
          </div>
        </div>

        {/* Logout */}
        <button onClick={() => { logout(); window.location.href = '/'; }} className="w-full py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-bold text-sm hover:bg-red-500/15 transition-all mt-4">
          🚪 {t('logout')}
        </button>

        {/* App Version */}
        <div className="text-center mt-4 mb-6">
          <p className="text-[10px] text-gray-600">QRCodeKey v1.0.0</p>
        </div>
      </main>
    </div>
  );
}
// ============================================
// pages/profile.js - User Profile & Settings
// ============================================

import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { authAPI } from '../lib/api';
import Link from 'next/link';
import toast from 'react-hot-toast';
import LanguageSwitcher from '../components/LanguageSwitcher';

export default function Profile() {
  const { user, isLoggedIn, logout, refreshUser } = useAuth();
  const { t } = useLanguage();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [saving, setSaving] = useState(false);

  // Password change
  const [showPwdForm, setShowPwdForm] = useState(false);
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [changingPwd, setChangingPwd] = useState(false);

  // Delete account
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-5">
        <div className="card p-8 text-center max-w-sm">
          <span className="text-5xl block mb-4">🔒</span>
          <Link href="/login" className="btn-primary inline-block">{t('login')} →</Link>
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      await authAPI.updateProfile({ name, phone });
      await refreshUser();
      setEditing(false);
      toast.success(t('updateSuccess'));
    } catch (err) {
      toast.error(err.response?.data?.message || t('updateFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (newPwd.length < 6) { toast.error(t('passwordMinLength')); return; }
    setChangingPwd(true);
    try {
      await authAPI.changePassword({ currentPassword: currentPwd, newPassword: newPwd });
      toast.success(t('passwordChangeSuccess'));
      setShowPwdForm(false);
      setCurrentPwd('');
      setNewPwd('');
    } catch (err) {
      toast.error(err.response?.data?.message || t('passwordChangeFailed'));
    } finally {
      setChangingPwd(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETE MY ACCOUNT') {
      toast.error('Please type "DELETE MY ACCOUNT" to confirm');
      return;
    }
    if (!deletePassword) {
      toast.error('Password is required');
      return;
    }

    setDeleting(true);
    try {
      await authAPI.deleteAccount({ password: deletePassword });
      toast.success('Account deleted successfully');
      setTimeout(() => {
        logout();
        window.location.href = '/login';
      }, 1500);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error deleting account');
    } finally {
      setDeleting(false);
    }
  };

  const handleExportData = async () => {
    try {
      const response = await authAPI.exportMyData();
      // Create a download link
      const element = document.createElement('a');
      element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(JSON.stringify(response.data, null, 2)));
      element.setAttribute('download', `qrcodekey-data-export-${Date.now()}.json`);
      element.style.display = 'none';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      toast.success('Data exported successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error exporting data');
    }
  };

  const planColors = { free: 'text-gray-400', pro: 'text-indigo-400', business: 'text-yellow-400' };
  const planIcons = { free: '🆓', pro: '💎', business: '👑' };

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-50 bg-[rgba(10,10,30,0.85)] backdrop-blur-xl border-b border-[rgba(99,102,241,0.15)] px-5 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between gap-3">
          <Link href="/" className="text-gray-400 hover:text-white text-sm">←</Link>
          <div className="font-bold text-sm text-gray-200">{t('profile')}</div>
          <LanguageSwitcher />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-5 pt-6 space-y-4">
        {/* Profile Card */}
        <div className="card p-6 text-center">
          <div className="w-20 h-20 mx-auto mb-3 rounded-full bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center text-3xl font-black text-white">
            {user.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <h2 className="text-lg font-bold text-gray-200">{user.name}</h2>
          <p className="text-xs text-gray-500">{user.email}</p>
          <div className="mt-2">
            <span className={`text-sm font-bold ${planColors[user.plan]}`}>
              {planIcons[user.plan]} {user.plan?.toUpperCase()} Plan
            </span>
          </div>
        </div>

        {/* Edit Profile */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-gray-400">👤 {t('profileInfo')}</span>
            <button onClick={() => setEditing(!editing)} className="text-xs text-indigo-400 font-bold">
              {editing ? t('cancel') : '✏️ ' + t('edit')}
            </button>
          </div>

          {editing ? (
            <div className="space-y-3">
              <div>
                <label className="label">{t('name')}</label>
                <input className="input-field" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div>
                <label className="label">{t('phone')}</label>
                <input className="input-field" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 XXXXXXXXXX" />
              </div>
              <button onClick={handleSave} disabled={saving} className="btn-primary w-full">
                {saving ? '⏳ ' + t('saving') : '💾 ' + t('saveChanges')}
              </button>
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-gray-500">{t('name')}</span>
                <span className="text-gray-200 font-semibold">{user.name}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-gray-500">{t('email')}</span>
                <span className="text-gray-200 font-semibold">{user.email}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-gray-500">{t('phone')}</span>
                <span className="text-gray-200 font-semibold">{user.phone || t('notSet')}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-gray-500">{t('role')}</span>
                <span className={`font-semibold ${user.role === 'admin' ? 'text-yellow-400' : 'text-gray-200'}`}>
                  {user.role === 'admin' ? '👑 ' + t('admin') : '👤 ' + t('user')}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-gray-500">{t('qrLimit')}</span>
                <span className="text-gray-200 font-semibold">{user.qrLimit || 5}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-500">{t('memberSince')}</span>
                <span className="text-gray-200 font-semibold">
                  {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US') : '-'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Change Password */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-gray-400">🔐 {t('password')}</span>
            <button onClick={() => setShowPwdForm(!showPwdForm)} className="text-xs text-indigo-400 font-bold">
              {showPwdForm ? t('cancel') : t('changePassword')}
            </button>
          </div>

          {showPwdForm && (
            <div className="space-y-3">
              <div>
                <label className="label">{t('currentPassword')}</label>
                <input type="password" className="input-field" value={currentPwd} onChange={e => setCurrentPwd(e.target.value)} />
              </div>
              <div>
                <label className="label">{t('newPassword')}</label>
                <input type="password" className="input-field" value={newPwd} onChange={e => setNewPwd(e.target.value)} />
              </div>
              <button onClick={handlePasswordChange} disabled={changingPwd} className="btn-primary w-full">
                {changingPwd ? '⏳ ' + t('changing') : '🔐 ' + t('changePassword')}
              </button>
            </div>
          )}
        </div>

        {/* Subscription */}
        <div className="card p-5">
          <div className="text-xs font-bold text-gray-400 mb-4">💎 {t('subscription')}</div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { plan: 'free', price: '$0', features: 'Unlimited QR\nNo Alerts' },
              { plan: 'starter', price: '$0.99/mo', features: '1 QR Alerts\nEmail + Push' },
              { plan: 'pro', price: '$4.99/mo', features: '5 QR Alerts\nEmail+SMS+Push', popular: true },
              { plan: 'unlimited', price: '$14.99/mo', features: 'Unlimited Alerts\nAll + API' },
            ].map((p, i) => (
              <div key={i} className={`p-3 rounded-xl text-center transition-all ${
                user.plan === p.plan
                  ? 'bg-indigo-500/15 border-2 border-indigo-500/40 ring-1 ring-indigo-500/20'
                  : p.popular ? 'bg-indigo-500/5 border border-indigo-500/15' : 'bg-white/2 border border-white/5'
              }`}>
                {user.plan === p.plan && <div className="text-[8px] text-indigo-400 font-bold mb-1">{t('current')}</div>}
                <div className={`text-[10px] font-bold ${user.plan === p.plan ? 'text-indigo-400' : 'text-gray-500'}`}>
                  {t(p.plan.toLowerCase())}
                </div>
                <div className="text-base font-black text-gray-200 my-1">{p.price}</div>
                <div className="text-[8px] text-gray-500 whitespace-pre-line leading-tight">{p.features}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Data Export */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-gray-400">📦 {t('exportData') || 'Export My Data'}</span>
          </div>
          <p className="text-xs text-gray-500 mb-4">Download all your data in JSON format for GDPR compliance or backup purposes.</p>
          <button onClick={handleExportData} className="btn-primary w-full text-sm">
            ⬇️ {t('exportData') || 'Export My Data'}
          </button>
        </div>

        {/* Delete Account */}
        <div className="card p-5 border-red-500/20 bg-red-500/5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-red-400">⚠️ {t('dangerZone') || 'Danger Zone'}</span>
          </div>
          <p className="text-xs text-gray-500 mb-4">Once you delete your account, there is no going back. Please be certain. All your data will be permanently deleted within 30 days.</p>
          <button onClick={() => setShowDeleteModal(true)} className="w-full py-2 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 font-bold text-sm hover:bg-red-500/30 transition-all">
            🗑️ Delete Account
          </button>
        </div>

        {/* Delete Account Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="card p-6 max-w-sm w-full space-y-4">
              <div className="text-center">
                <span className="text-4xl block mb-3">⚠️</span>
                <h3 className="text-lg font-bold text-red-400 mb-2">Delete Account</h3>
                <p className="text-xs text-gray-500">This action cannot be undone.</p>
              </div>

              <div className="bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                <p className="text-xs text-red-400 leading-relaxed">
                  <strong>All your data will be deleted permanently:</strong> QR codes, scan logs, teams, organizations, and payment history. This process will take up to 30 days to complete.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="label">Password Confirmation</label>
                  <input
                    type="password"
                    className="input-field"
                    placeholder="Enter your password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                  />
                </div>

                <div>
                  <label className="label">Type to Confirm</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder='Type "DELETE MY ACCOUNT"'
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    {deleteConfirm === 'DELETE MY ACCOUNT' ? (
                      <span className="text-green-400">✓ Ready to delete</span>
                    ) : (
                      <span>Type exactly: DELETE MY ACCOUNT</span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeletePassword('');
                    setDeleteConfirm('');
                  }}
                  className="flex-1 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 font-semibold text-sm hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting || deleteConfirm !== 'DELETE MY ACCOUNT'}
                  className="flex-1 py-2 rounded-xl bg-red-500 text-white font-semibold text-sm hover:bg-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleting ? '⏳ Deleting...' : '🗑️ Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Legal Links */}
        <div className="card p-4 mt-4">
          <h3 className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider">📋 Legal & Policies</h3>
          <div className="space-y-2">
            <Link href="/privacy-policy" className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-all">
              <span className="text-xs text-gray-300">🔒 Privacy Policy</span>
              <span className="text-gray-600 text-xs">→</span>
            </Link>
            <Link href="/terms" className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-all">
              <span className="text-xs text-gray-300">📄 Terms of Service</span>
              <span className="text-gray-600 text-xs">→</span>
            </Link>
            <Link href="/refund-policy" className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-all">
              <span className="text-xs text-gray-300">💰 Refund Policy</span>
              <span className="text-gray-600 text-xs">→</span>
            </Link>
          </div>
        </div>

        {/* Logout */}
        <button onClick={() => { logout(); window.location.href = '/'; }} className="w-full py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-bold text-sm hover:bg-red-500/15 transition-all mt-4">
          🚪 {t('logout')}
        </button>

        {/* App Version */}
        <div className="text-center mt-4 mb-6">
          <p className="text-[10px] text-gray-600">QRCodeKey v1.0.0</p>
        </div>
      </main>
    </div>
  );
}
