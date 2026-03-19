// ============================================
// pages/forgot-password.js - 3-Step OTP Reset
// ============================================

import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import api from '../lib/api';

export default function ForgotPassword() {
  const router = useRouter();
  const { t } = useLanguage();
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Step 1: Send OTP
  const handleSendOTP = async () => {
    if (!email) { toast.error(t('error')); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/otp/send', { email });
      toast.success(data.message);
      // Dev mode: show OTP in console
      if (data.devOTP) console.log('Dev OTP:', data.devOTP);
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.message || t('error'));
    } finally { setLoading(false); }
  };

  // Step 2: Verify OTP
  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) { toast.error(t('error')); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/otp/verify', { email, otp });
      toast.success(data.message);
      setResetToken(data.resetToken);
      setStep(3);
    } catch (err) {
      toast.error(err.response?.data?.message || t('error'));
    } finally { setLoading(false); }
  };

  // Step 3: Reset Password
  const handleResetPassword = async () => {
    if (newPassword.length < 6) { toast.error(t('error')); return; }
    if (newPassword !== confirmPassword) { toast.error(t('error')); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/otp/reset-password', { email, resetToken, newPassword });
      toast.success(data.message);
      router.push('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || t('error'));
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-5">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <span className="text-3xl">{step === 1 ? '📧' : step === 2 ? '🔢' : '🔐'}</span>
          </div>
          <h1 className="text-2xl font-black gradient-text">
            {step === 1 ? t('forgotPassword') : step === 2 ? t('verifyOTP') : t('newPassword')}
          </h1>
          <p className="text-xs text-gray-500 mt-1">Step {step} of 3</p>
          <div className="mt-2">
            <LanguageSwitcher />
          </div>
        </div>

        {/* Progress */}
        <div className="flex gap-2 mb-6">
          {[1, 2, 3].map(s => (
            <div key={s} className={`h-1 flex-1 rounded-full ${s <= step ? 'bg-gradient-to-r from-indigo-500 to-pink-500' : 'bg-white/10'}`} />
          ))}
        </div>

        <div className="card p-6 space-y-4">
          {/* Step 1: Email */}
          {step === 1 && (
            <>
              <p className="text-xs text-gray-400">{t('sendOTP')}</p>
              <div>
                <label className="label">{t('email')}</label>
                <input type="email" className="input-field" placeholder="your@email.com"
                  value={email} onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendOTP()} />
              </div>
              <button onClick={handleSendOTP} disabled={loading} className="btn-primary w-full">
                {loading ? '⏳ ' + t('loading') : '📧 ' + t('sendOTP')}
              </button>
            </>
          )}

          {/* Step 2: OTP */}
          {step === 2 && (
            <>
              <p className="text-xs text-gray-400">{t('verifyOTP')} <strong className="text-indigo-400">{email}</strong></p>
              <div>
                <label className="label">{t('verifyOTP')}</label>
                <input type="text" className="input-field text-center text-2xl tracking-[0.5em] font-mono font-bold"
                  placeholder="000000" maxLength={6}
                  value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={e => e.key === 'Enter' && handleVerifyOTP()} />
              </div>
              <button onClick={handleVerifyOTP} disabled={loading} className="btn-primary w-full">
                {loading ? '⏳ ' + t('loading') : '✅ ' + t('verifyOTP')}
              </button>
              <button onClick={() => { setStep(1); setOtp(''); }} className="text-xs text-gray-500 w-full text-center">
                ← {t('back')}
              </button>
            </>
          )}

          {/* Step 3: New Password */}
          {step === 3 && (
            <>
              <p className="text-xs text-gray-400">{t('newPassword')}</p>
              <div>
                <label className="label">{t('newPassword')}</label>
                <input type="password" className="input-field" placeholder="Min 6 characters"
                  value={newPassword} onChange={e => setNewPassword(e.target.value)} />
              </div>
              <div>
                <label className="label">{t('confirmPassword')}</label>
                <input type="password" className="input-field" placeholder="Re-enter password"
                  value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleResetPassword()} />
              </div>
              <button onClick={handleResetPassword} disabled={loading} className="btn-primary w-full">
                {loading ? '⏳ ' + t('loading') : '🔐 ' + t('resetPassword')}
              </button>
            </>
          )}
        </div>

        <div className="text-center mt-5">
          <Link href="/login" className="text-sm text-gray-500 hover:text-gray-300">← {t('back')}</Link>
        </div>
      </div>
    </div>
  );
}
