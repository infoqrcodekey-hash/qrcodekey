// ============================================
// pages/register.js - Registration Page
// ============================================

import { useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import Link from 'next/link';
import toast from 'react-hot-toast';
import LanguageSwitcher from '../components/LanguageSwitcher';
import PasswordInput from '../components/PasswordInput';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const { register } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  const update = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const validatePassword = (pwd) => {
    const requirements = {
      minLength: pwd.length >= 12,
      uppercase: /[A-Z]/.test(pwd),
      lowercase: /[a-z]/.test(pwd),
    };
    return Object.values(requirements).every(v => v === true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) {
      toast.error(t('nameEmailPasswordRequired'));
      return;
    }
    if (!validatePassword(form.password)) {
      toast.error('Password must have 12+ characters, 1 uppercase, and 1 lowercase letter');
      return;
    }
    if (!agreedToTerms) {
      toast.error('You must agree to Terms of Service and Privacy Policy');
      return;
    }

    setLoading(true);
    try {
      await register(form);
      toast.success(t('accountCreated'));
      router.push('/');
    } catch (err) {
      toast.error(err.response?.data?.message || t('registrationFailed'));
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
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <span className="text-3xl">🚀</span>
          </div>
          <h1 className="text-2xl font-black gradient-text">{t('registerTitle')}</h1>
          <p className="text-xs text-gray-500 mt-1">{t('registerSubtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <div>
            <label className="label">{t('name')} *</label>
            <input type="text" className="input-field" placeholder={t('enterName')}
              value={form.name} onChange={(e) => update('name', e.target.value)} />
          </div>
          <div>
            <label className="label">{t('email')} *</label>
            <input type="email" className="input-field" placeholder={t('emailPlaceholder')}
              value={form.email} onChange={(e) => update('email', e.target.value)} />
          </div>
          <div>
            <label className="label">{t('phone')} ({t('optional')})</label>
            <input type="tel" className="input-field" placeholder={t('phonePlaceholder')}
              value={form.phone} onChange={(e) => update('phone', e.target.value)} />
          </div>
          <PasswordInput
            label={t('password')}
            required
            value={form.password}
            onChange={(val) => update('password', val)}
            placeholder={t('enterPassword')}
            showStrength={true}
            showRequirements={true}
          />

          {/* Terms Agreement */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-indigo-500/5 border border-indigo-500/20">
            <input
              type="checkbox"
              id="terms"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="mt-1 w-4 h-4 accent-indigo-500 cursor-pointer"
            />
            <label htmlFor="terms" className="text-xs text-gray-400 leading-relaxed cursor-pointer">
              By registering, I agree to the{' '}
              <Link href="/terms" className="text-indigo-400 hover:text-indigo-300 font-semibold">
                Terms of Service
              </Link>
              {' '}and{' '}
              <Link href="/privacy-policy" className="text-indigo-400 hover:text-indigo-300 font-semibold">
                Privacy Policy
              </Link>
            </label>
          </div>

          <button type="submit" disabled={loading || !agreedToTerms} className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? <span className="animate-spin">⏳</span> : <>🚀 {t('registerBtn')}</>}
          </button>
        </form>

        <div className="text-center mt-5">
          <p className="text-sm text-gray-500">
            {t('haveAccount')}{' '}
            <Link href="/login" className="text-indigo-400 font-bold hover:text-indigo-300">{t('loginHere')} →</Link>
          </p>
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

        <div className="text-center mt-4">
          <Link href="/" className="text-xs text-gray-400 hover:text-gray-300 transition">
            {t('backToHome')}
          </Link>
        </div>
      </div>
    </div>
  );
}
