// ============================================
// pages/delete-account.js - Account Deletion Page
// ============================================
// Required by Google Play Store & Apple App Store
// Provides a standalone URL for data deletion requests

import { useState } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import toast from 'react-hot-toast';
import api from '../lib/api';

export default function DeleteAccount() {
  const { t } = useLanguage();
  const { user, isLoggedIn, logout } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [step, setStep] = useState(1);

  const handleDelete = async () => {
    if (confirmText !== 'DELETE MY ACCOUNT') {
      toast.error('Please type "DELETE MY ACCOUNT" to confirm');
      return;
    }
    if (!password) {
      toast.error('Password is required');
      return;
    }

    setDeleting(true);
    try {
      await api.delete('/auth/me', { data: { password } });
      toast.success('Account deleted successfully. All your data will be removed within 30 days.');
      setTimeout(() => {
        logout();
      }, 2000);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete account');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen pb-24">
      <Head>
        <title>Delete Account - QRCodeKey</title>
        <meta name="description" content="Delete your QRCodeKey account and all associated data" />
      </Head>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-[rgba(10,10,30,0.85)] backdrop-blur-xl border-b border-[rgba(99,102,241,0.15)] px-5 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between gap-3">
          <Link href="/" className="text-gray-400 hover:text-white text-sm">←</Link>
          <div className="font-bold text-sm text-gray-200">Delete Account</div>
          <LanguageSwitcher />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-5 pt-8 space-y-6">
        {/* Warning Banner */}
        <div className="card p-6 border-red-500/20 bg-red-500/5 text-center animate-fadeIn">
          <span className="text-4xl block mb-3">⚠️</span>
          <h1 className="text-xl font-black text-red-400 mb-2">Delete Your Account</h1>
          <p className="text-sm text-gray-400">
            This action is permanent and cannot be undone.
          </p>
        </div>

        {!isLoggedIn ? (
          /* Not Logged In */
          <div className="card p-6 space-y-4 animate-fadeIn">
            <h2 className="font-bold text-sm text-gray-200">How to Delete Your Account</h2>
            <div className="space-y-3 text-sm text-gray-400">
              <div className="flex items-start gap-3">
                <span className="text-indigo-400 font-bold">1.</span>
                <span>Log in to your QRCodeKey account</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-indigo-400 font-bold">2.</span>
                <span>Go to Profile → Danger Zone → Delete Account</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-indigo-400 font-bold">3.</span>
                <span>Enter your password and confirm deletion</span>
              </div>
            </div>
            <div className="pt-4 border-t border-white/5">
              <p className="text-xs text-gray-500 mb-3">
                Alternatively, email us at <a href="mailto:info.qrcodekey@gmail.com" className="text-indigo-400">info.qrcodekey@gmail.com</a> from your registered email to request account deletion.
              </p>
              <Link href="/login" className="btn-primary w-full text-center block text-sm">
                Login to Delete Account
              </Link>
            </div>
          </div>
        ) : (
          /* Logged In - Deletion Flow */
          <div className="animate-fadeIn">
            {/* What Gets Deleted */}
            <div className="card p-5 mb-4">
              <h2 className="font-bold text-sm text-gray-200 mb-3">What will be deleted:</h2>
              <div className="space-y-2">
                {[
                  'Your profile and account information',
                  'All QR codes you have generated',
                  'All scan history and location data',
                  'Organization memberships and data',
                  'Attendance records',
                  'Leave and shift records',
                  'All notifications and audit logs',
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-gray-400">
                    <span className="text-red-400 text-xs">✕</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                <p className="text-xs text-yellow-400">
                  All data will be permanently deleted within 30 days of your request. This cannot be undone.
                </p>
              </div>
            </div>

            {/* Logged in as */}
            <div className="card p-4 mb-4">
              <div className="text-xs text-gray-500">Logged in as:</div>
              <div className="text-sm font-bold text-gray-200">{user?.name}</div>
              <div className="text-xs text-gray-400">{user?.email}</div>
            </div>

            {step === 1 && (
              <div className="card p-5">
                <p className="text-sm text-gray-400 mb-4">Are you sure you want to delete your account? This is permanent.</p>
                <div className="flex gap-3">
                  <Link href="/" className="btn-secondary flex-1 text-center text-sm">Cancel</Link>
                  <button onClick={() => setStep(2)} className="flex-1 py-2.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 font-bold text-sm hover:bg-red-500/30 transition-all">
                    Yes, Delete
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="card p-5 space-y-4">
                <div>
                  <label className="label">Enter your password</label>
                  <input
                    type="password"
                    className="input-field"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your account password"
                  />
                </div>
                <div>
                  <label className="label">Type "DELETE MY ACCOUNT" to confirm</label>
                  <input
                    type="text"
                    className="input-field"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder='Type "DELETE MY ACCOUNT"'
                  />
                  {confirmText === 'DELETE MY ACCOUNT' && (
                    <p className="text-xs text-green-400 mt-1">✓ Ready to delete</p>
                  )}
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setStep(1)} className="btn-secondary flex-1 text-sm">Back</button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting || confirmText !== 'DELETE MY ACCOUNT' || !password}
                    className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deleting ? '⏳ Deleting...' : '🗑️ Delete Forever'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Data Retention Info */}
        <div className="card p-5 animate-fadeIn">
          <h3 className="font-bold text-sm text-gray-200 mb-3">Data Retention Policy</h3>
          <div className="space-y-2 text-xs text-gray-400">
            <p>When you delete your account, we permanently remove all your personal data within 30 days.</p>
            <p>Some anonymized, aggregated data may be retained for analytics purposes but cannot be linked back to you.</p>
            <p>For questions about data deletion, contact: <a href="mailto:info.qrcodekey@gmail.com" className="text-indigo-400">info.qrcodekey@gmail.com</a></p>
          </div>
        </div>

        {/* Links */}
        <div className="text-center text-xs text-gray-600 space-x-4 pt-2">
          <Link href="/privacy-policy" className="hover:text-indigo-400 transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-indigo-400 transition-colors">Terms of Service</Link>
          <Link href="/contact" className="hover:text-indigo-400 transition-colors">Contact Us</Link>
        </div>
      </main>
    </div>
  );
}
