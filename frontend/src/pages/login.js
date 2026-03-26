// ============================================
// pages/login.js - Login Page with OTP Verification
// ============================================
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { authAPI } from '../lib/api';
import Link from 'next/link';
import toast from 'react-hot-toast';
import LanguageSwitcher from '../components/LanguageSwitcher';
import PasswordInput from '../components/PasswordInput';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1=login, 2=emailOTP
  const [emailOtp, setEmailOtp] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);

  const { login, user } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  const startTimer = useCallback(() => {
    setOtpTimer(60);
  }, []);

  useEffect(() => {
    if (otpTimer <= 0) return;
    const id = setTimeout(() => setOtpTimer(prev => prev - 1), 1000);
    return () => clearTimeout(id);
  }, [otpTimer]);

  const sendEmailOTP = async () => {
    setOtpSending(true);
    try {
      await authAPI.sendEmailOTP({ email });
      toast.success('OTP sent to ' + email);
      startTimer();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setOtpSending(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error(t('emptyFieldsError'));
      return;
    }
    setLoading(true);
    const maxRetries = 3;
    let attempt = 0;
    let toastId = null;

    while (attempt < maxRetries) {
      try {
        attempt++;
        if (attempt > 1) {
          toastId = toast.loading('Server waking up... Retry ' + attempt + '/' + maxRetries);
        }
        const result = await login({ email, password });
        if (toastId) toast.dismiss(toastId);

        // Check if email is verified
        const userData = result?.user;
        if (userData && userData.emailVerified === false) {
          toast.success('Login successful! Please verify your email.');
          await sendEmailOTP();
          setStep(2);
          setLoading(false);
          return;
        }

        toast.success(t('loginSuccess'));
        router.push('/');
        setLoading(false);
        return;
      } catch (err) {
        if (toastId) toast.dismiss(toastId);
        const isNetworkErr = !err.response || err.code === 'ECONNABORTED';
        if (isNetworkErr && attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }
        toast.error(err.response?.data?.message || t('loginFailed'));
        break;
      }
    }
    setLoading(false);
  };

  const handleVerifyEmail = async () => {
    if (!emailOtp || emailOtp.length !== 6) {
      toast.error('Please enter 6-digit OTP');
      return;
    }
    setLoading(true);
    try {
      await authAPI.verifyEmailOTP({ email, otp: emailOtp });
      toast.success('Email verified! Welcome!');
      router.push('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid OTP');
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
            <span className="text-3xl">{step === 1 ? '🔒' : '🔐'}</span>
          </div>
          <h1 className="text-2xl font-black gradient-text">
            {step === 1 ? t('loginTitle') : 'Verify Email'}
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            {step === 1 ? t('loginSubtitle') : 'Enter the OTP sent to your email'}
          </p>
        </div>

        {/* STEP 1: Login Form */}
        {step === 1 && (
          <>
            <form onSubmit={handleSubmit} className="card p-6 space-y-4">
              <div>
                <label className="label">{t('email')}</label>
                <input type="email" className="input-field"
                  placeholder={t('emailPlaceholder')} value={email}
                  onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
              </div>
              <PasswordInput label={t('password')} value={password}
                onChange={setPassword} placeholder="••••••••"
                showStrength={false} showRequirements={false} />
              <button type="submit" disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2">
                {loading ? (
                  <span className="animate-spin">⏳</span>
                ) : (
                  <>🔒 {t('loginBtn')}</>
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
                🔑 {t('forgotPassword')}
              </Link>
            </div>
          </>
        )}

        {/* STEP 2: Email OTP Verification */}
        {step === 2 && (
          <div className="card p-6 space-y-4">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                <span className="text-2xl">📧</span>
              </div>
              <p className="text-sm text-gray-400">
                OTP sent to <span className="text-indigo-400 font-semibold">{email}</span>
              </p>
            </div>
            <div>
              <label className="label">Enter 6-digit OTP</label>
              <input type="text" className="input-field text-center text-2xl tracking-[0.5em] font-mono"
                placeholder="000000" maxLength={6} value={emailOtp}
                onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, ''))} autoFocus />
            </div>
            <button onClick={handleVerifyEmail} disabled={loading || emailOtp.length !== 6}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50">
              {loading ? <span className="animate-spin">⏳</span> : 'Verify Email'}
            </button>
            <div className="text-center">
              <button onClick={sendEmailOTP} disabled={otpSending || otpTimer > 0}
                className="text-xs text-indigo-400 hover:text-indigo-300 disabled:text-gray-600">
                {otpTimer > 0 ? `Resend OTP in ${otpTimer}s` : otpSending ? 'Sending...' : 'Resend OTP'}
              </button>
            </div>
            <div className="text-center">
              <button onClick={() => { setStep(1); setEmailOtp(''); }}
                className="text-xs text-gray-500 hover:text-gray-400">
                ← Back to Login
              </button>
            </div>
          </div>
        )}

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
