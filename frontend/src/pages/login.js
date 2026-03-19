// ============================================
// pages/login.js - Login Page
// ============================================

import { useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import Link from 'next/link';
import toast from 'react-hot-toast';
import LanguageSwitcher from '../components/LanguageSwitcher';
import PasswordInput from '../components/PasswordInput';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error(t('emptyFieldsError'));
      return;
    }

    setLoading(true);
    try {
      await login({ email, password });
      toast.success(t('loginSuccess'));
      router.push('/');
    } catch (err) {
      toast.error(err.response?.data?.message || t('loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-5">
      <div className="absolute top-5 right-5">
        <LanguageSwitcher />
      </div>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <span className="text-3xl">📍</span>
          </div>
          <h1 className="text-2xl font-black gradient-text">{t('loginTitle')}</h1>
          <p className="text-xs text-gray-500 mt-1">{t('loginSubtitle')}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <div>
            <label className="label">{t('email')}</label>
            <input
              type="email"
              className="input-field"
              placeholder={t('emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <PasswordInput
            label={t('password')}
            value={password}
            onChange={setPassword}
            placeholder="••••••••"
            showStrength={false}
            showRequirements={false}
          />

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="animate-spin">⏳</span>
            ) : (
              <>🔓 {t('loginBtn')}</>
            )}
          </button>
        </form>

        {/* Links */}
        <div className="text-center mt-5">
          <p className="text-sm text-gray-500">
            {t('noAccount')}{' '}
            <Link href="/register" className="text-indigo-400 font-bold hover:text-indigo-300">
              {t('registerHere')} →
            </Link>
          </p>
          <Link href="/" className="text-xs text-gray-600 mt-3 block hover:text-gray-400">
            ← {t('backToHome')}
          </Link>
          <Link href="/forgot-password" className="text-xs text-pink-400 mt-2 block hover:text-pink-300 font-semibold">
            🔐 {t('forgotPassword')}
          </Link>
        </div>

        {/* Legal Links */}
        <div className="mt-6 pt-6 border-t border-white/10 flex justify-center gap-4 text-xs">
          <Link href="/privacy-policy" className="text-gray-500 hover:text-indigo-400 transition">
            Privacy Policy
          </Link>
          <span className="text-gray-700">•</span>
          <Link href="/terms" className="text-gray-500 hover:text-indigo-400 transition">
            Terms of Service
          </Link>
          <span className="text-gray-700">•</span>
          <Link href="/refund-policy" className="text-gray-500 hover:text-indigo-400 transition">
            Refund Policy
          </Link>
        </div>

        {/* Test Credentials - Only show in development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-6 p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10 text-center">
            <div className="text-[10px] text-gray-500 mb-1">🧪 {t('testCredentials')}</div>
            <div className="text-[11px] text-gray-400 font-mono">
              Dev mode only
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
