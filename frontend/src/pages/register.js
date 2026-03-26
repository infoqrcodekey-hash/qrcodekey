// ============================================
// pages/register.js - Registration Page with OTP
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

export default function Register() {
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '', phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [step, setStep] = useState(1);
  const [emailOtp, setEmailOtp] = useState('');
  const [phoneOtp, setPhoneOtp] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);

  const { register, logout } = useAuth();
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
      await authAPI.sendEmailOTP({ email: form.email });
      toast.success('OTP sent to ' + form.email);
      startTimer();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setOtpSending(false);
    }
  };

  const sendPhoneOTP = async () => {
    setOtpSending(true);
    try {
      await authAPI.sendPhoneOTP({ phone: form.phone });
      toast.success('OTP sent to ' + form.phone);
      startTimer();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setOtpSending(false);
    }
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
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (!agreedToTerms) {
      toast.error('You must agree to Terms of Service and Privacy Policy');
      return;
    }
    setLoading(true);
    try {
      await register(form);
      logout();
      toast.success('Account created! Please verify your email.');
      await sendEmailOTP();
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.message || t('registrationFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (!emailOtp || emailOtp.length !== 6) {
      toast.error('Please enter 6-digit OTP');
      return;
    }
    setLoading(true);
    try {
      await authAPI.verifyEmailOTP({ email: form.email, otp: emailOtp });
      toast.success('Email verified!');
      if (form.phone) {
        setOtpTimer(0);
        await sendPhoneOTP();
        setStep(3);
      } else {
        toast.success('Registration complete! Please login.');
        router.push('/login');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPhone = async () => {
    if (!phoneOtp || phoneOtp.length !== 6) {
      toast.error('Please enter 6-digit OTP');
      return;
    }
    setLoading(true);
    try {
      await authAPI.verifyPhoneOTP({ phone: form.phone, otp: phoneOtp });
      toast.success('Phone verified! Registration complete!');
      router.push('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const skipPhoneVerification = () => {
    toast.success('Registration complete! Please login.');
    router.push('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-5">
      <div className="absolute top-5 right-5">
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <span className="text-3xl">{step === 1 ? '🚀' : '🔐'}</span>
          </div>
          <h1 className="text-2xl font-black gradient-text">
            {step === 1 ? t('registerTitle') : step === 2 ? 'Verify Email' : 'Verify Phone'}
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            {step === 1 ? t('registerSubtitle') : step === 2 ? 'Enter the OTP sent to your email' : 'Enter the OTP sent to your phone'}
          </p>
          {step > 1 && (
            <div className="flex justify-center gap-2 mt-3">
              {[1, 2, 3].map(s => (
                <div key={s} className={`w-8 h-1 rounded-full ${s <= step ? 'bg-indigo-500' : 'bg-gray-700'}`} />
              ))}
            </div>
          )}
        </div>

        {/* STEP 1: Registration Form */}
        {step === 1 && (
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
              <label className="label">{t('phone')}</label>
              <input type="tel" className="input-field" placeholder={t('phonePlaceholder')}
                value={form.phone} onChange={(e) => update('phone', e.target.value)} />
            </div>
            <PasswordInput label={t('password')} required value={form.password}
              onChange={(val) => update('password', val)} placeholder={t('enterPassword')}
              showStrength={true} showRequirements={true} />
            <div>
              <label className="label">{t('confirmPassword')} *</label>
              <input type="password" className="input-field" placeholder="Re-enter your password"
                value={form.confirmPassword} onChange={(e) => update('confirmPassword', e.target.value)} required />
              {form.confirmPassword && form.password !== form.confirmPassword && (
                <p className="text-[10px] text-red-400 mt-1">Passwords do not match</p>
              )}
              {form.confirmPassword && form.password === form.confirmPassword && form.confirmPassword.length > 0 && (
                <p className="text-[10px] text-green-400 mt-1">Passwords match</p>
              )}
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-indigo-500/5 border border-indigo-500/20">
              <input type="checkbox" id="terms" checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-1 w-4 h-4 accent-indigo-500 cursor-pointer" />
              <label htmlFor="terms" className="text-xs text-gray-400 leading-relaxed cursor-pointer">
                By registering, I agree to the{' '}
                <Link href="/terms" className="text-indigo-400 hover:text-indigo-300 font-semibold">Terms of Service</Link>
                {' '}and{' '}
                <Link href="/privacy-policy" className="text-indigo-400 hover:text-indigo-300 font-semibold">Privacy Policy</Link>
              </label>
            </div>
            <button type="submit" disabled={loading || !agreedToTerms}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? <span className="animate-spin">⏳</span> : <>🚀 {t('registerBtn')}</>}
            </button>
          </form>
        )}

        {/* STEP 2: Email OTP Verification */}
        {step === 2 && (
          <div className="card p-6 space-y-4">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                <span className="text-2xl">📧</span>
              </div>
              <p className="text-sm text-gray-400">
                OTP sent to <span className="text-indigo-400 font-semibold">{form.email}</span>
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
          </div>
        )}

        {/* STEP 3: Phone OTP Verification */}
        {step === 3 && (
          <div className="card p-6 space-y-4">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-green-500/10 flex items-center justify-center">
                <span className="text-2xl">📱</span>
              </div>
              <p className="text-sm text-gray-400">
                OTP sent to <span className="text-green-400 font-semibold">{form.phone}</span>
              </p>
            </div>
            <div>
              <label className="label">Enter 6-digit OTP</label>
              <input type="text" className="input-field text-center text-2xl tracking-[0.5em] font-mono"
                placeholder="000000" maxLength={6} value={phoneOtp}
                onChange={(e) => setPhoneOtp(e.target.value.replace(/\D/g, ''))} autoFocus />
            </div>
            <button onClick={handleVerifyPhone} disabled={loading || phoneOtp.length !== 6}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50">
              {loading ? <span className="animate-spin">⏳</span> : 'Verify Phone'}
            </button>
            <div className="flex justify-between items-center">
              <button onClick={sendPhoneOTP} disabled={otpSending || otpTimer > 0}
                className="text-xs text-indigo-400 hover:text-indigo-300 disabled:text-gray-600">
                {otpTimer > 0 ? `Resend in ${otpTimer}s` : otpSending ? 'Sending...' : 'Resend OTP'}
              </button>
              <button onClick={skipPhoneVerification}
                className="text-xs text-gray-500 hover:text-gray-400">
                Skip for now
              </button>
            </div>
          </div>
        )}

        {/* Bottom Links */}
        <div className="text-center mt-5">
          <p className="text-sm text-gray-500">
            {t('haveAccount')}{' '}
            <Link href="/login" className="text-indigo-400 font-bold hover:text-indigo-300">{t('loginHere')} →</Link>
          </p>
        </div>
        <div className="mt-6 pt-6 border-t border-white/10 flex justify-center gap-4 text-xs">
          <Link href="/privacy-policy" className="text-gray-500 hover:text-indigo-400 transition">Privacy Policy</Link>
          <span className="text-gray-700">•</span>
          <Link href="/terms" className="text-gray-500 hover:text-indigo-400 transition">Terms of Service</Link>
          <span className="text-gray-700">•</span>
          <Link href="/refund-policy" className="text-gray-500 hover:text-indigo-400 transition">Refund Policy</Link>
        </div>
        <div className="text-center mt-4">
          <Link href="/" className="text-xs text-gray-400 hover:text-gray-300 transition">{t('backToHome')}</Link>
        </div>
      </div>
    </div>
  );
}
