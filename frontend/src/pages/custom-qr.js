// ============================================
// pages/custom-qr.js - Custom QR Design Page
// ============================================
// Colors choose karo, preview dekho, generate karo

import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import Link from 'next/link';
import Head from 'next/head';
import toast from 'react-hot-toast';
import api from '../lib/api';
import LanguageSwitcher from '../components/LanguageSwitcher';

const PRESETS = [
  { name: 'Classic', dark: '#1a1a2e', light: '#ffffff' },
  { name: 'Blue', dark: '#1e3a8a', light: '#eff6ff' },
  { name: 'Purple', dark: '#4c1d95', light: '#f5f3ff' },
  { name: 'Green', dark: '#14532d', light: '#f0fdf4' },
  { name: 'Red', dark: '#7f1d1d', light: '#fff1f2' },
  { name: 'Dark Gold', dark: '#1c1400', light: '#fef9c3' },
  { name: 'Ocean', dark: '#0c4a6e', light: '#e0f2fe' },
  { name: 'Midnight', dark: '#0f172a', light: '#e2e8f0' },
];

export default function CustomQRPage() {
  const { isLoggedIn, user } = useAuth();
  const { t } = useLanguage();

  const [form, setForm] = useState({
    category: 'other',
    qrPassword: '',
    registeredName: '',
    message: '',
    darkColor: '#1a1a2e',
    lightColor: '#ffffff',
    size: 400,
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const categoryOptions = [
    { value: 'other', emoji: '📦' }, { value: 'child', emoji: '👶' },
    { value: 'car', emoji: '🚗' }, { value: 'bag', emoji: '👜' },
    { value: 'pet', emoji: '🐕' }, { value: 'key', emoji: '🔑' }, { value: 'luggage', emoji: '🧳' },
  ];

  const applyPreset = (p) => setForm(f => ({ ...f, darkColor: p.dark, lightColor: p.light }));

  const handleGenerate = async () => {
    if (!form.qrPassword || form.qrPassword.length < 6 || !/[A-Z]/.test(form.qrPassword) || !/[a-z]/.test(form.qrPassword)) return toast.error(t('passwordMinLength') || 'Password must have 6+ characters, 1 uppercase, and 1 lowercase letter');
    setLoading(true);
    try {
      const res = await api.post('/qr/generate-custom', form);
      if (res.data.success) {
        setResult(res.data.data);
        toast.success(t('customQRReady'));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || t('generationFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const a = document.createElement('a');
    a.href = result.qrImage;
    a.download = `${result.qrId}-custom.png`;
    a.click();
    toast.success(t('downloadSuccess'));
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-5">
        <div className="card p-8 text-center max-w-sm">
          <span className="text-5xl block mb-4">🔒</span>
          <div className="mb-4 text-gray-300">{t('loginRequired')}</div>
          <Link href="/login" className="btn-primary inline-block">{t('login')} →</Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head><title>{t('customQRTitle')} | QR Tracker</title></Head>
      <div className="min-h-screen pb-24">
        <header className="sticky top-0 z-50 bg-[rgba(10,10,30,0.85)] backdrop-blur-xl border-b border-[rgba(99,102,241,0.15)] px-5 py-3">
          <div className="max-w-lg mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Link href="/generate" className="text-gray-400 hover:text-white text-sm">←</Link>
              <div>
                <div className="font-bold text-sm text-gray-200">🎨 {t('customQRTitle')}</div>
                <div className="text-[10px] text-gray-500">{t('customQRDesc')}</div>
              </div>
            </div>
            <LanguageSwitcher />
          </div>
        </header>

        <main className="max-w-lg mx-auto px-5 pt-5 space-y-4">
          {/* Preview */}
          <div className="card p-6 text-center">
            <div className="flex items-center justify-center mb-2">
              <div className="relative w-40 h-40 rounded-2xl overflow-hidden flex items-center justify-center shadow-xl"
                style={{ background: form.lightColor, border: `3px solid ${form.darkColor}` }}>
                {result ? (
                  // eslint-disable-next-line
                  <img src={result.qrImage} alt="Custom QR" className="w-full h-full object-contain" />
                ) : (
                  <div className="text-center" style={{ color: form.darkColor }}>
                    <div className="text-4xl mb-1">📷</div>
                    <div className="text-[9px] font-bold opacity-60">{t('preview')}</div>
                  </div>
                )}
              </div>
            </div>
            <p className="text-[10px] text-gray-500 mt-2">
              {t('darkColor')}: <span className="font-mono" style={{ color: form.darkColor }}>{form.darkColor}</span>
              {' '} | {t('lightColor')}: <span className="font-mono text-gray-300">{form.lightColor}</span>
            </p>
          </div>

          {/* Color Presets */}
          <div className="card p-4">
            <label className="label mb-3">{t('colorPresets')}</label>
            <div className="grid grid-cols-4 gap-2">
              {PRESETS.map(p => (
                <button
                  key={p.name}
                  onClick={() => applyPreset(p)}
                  className={`flex flex-col items-center p-2 rounded-xl border text-[9px] font-bold transition-all ${
                    form.darkColor === p.dark && form.lightColor === p.light
                      ? 'border-indigo-500/60 bg-indigo-500/10'
                      : 'border-white/10 bg-white/3 hover:border-white/20'
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg mb-1 flex items-center justify-center border border-white/10"
                    style={{ background: p.light }}>
                    <div className="w-4 h-4 rounded" style={{ background: p.dark }} />
                  </div>
                  <span className="text-gray-400">{p.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Colors */}
          <div className="card p-4 space-y-3">
            <label className="label">{t('customColor')}</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">{t('darkColor')}</label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={form.darkColor}
                    onChange={e => setForm(f => ({ ...f, darkColor: e.target.value }))}
                    className="w-10 h-10 rounded-lg border border-white/10 cursor-pointer bg-transparent" />
                  <input type="text" value={form.darkColor}
                    onChange={e => setForm(f => ({ ...f, darkColor: e.target.value }))}
                    className="input-field flex-1 font-mono text-xs" placeholder="#000000" maxLength={7} />
                </div>
              </div>
              <div>
                <label className="label">{t('lightColor')}</label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={form.lightColor}
                    onChange={e => setForm(f => ({ ...f, lightColor: e.target.value }))}
                    className="w-10 h-10 rounded-lg border border-white/10 cursor-pointer bg-transparent" />
                  <input type="text" value={form.lightColor}
                    onChange={e => setForm(f => ({ ...f, lightColor: e.target.value }))}
                    className="input-field flex-1 font-mono text-xs" placeholder="#ffffff" maxLength={7} />
                </div>
              </div>
            </div>

            {/* Size */}
            <div>
              <label className="label">{t('size')}: {form.size}px</label>
              <input type="range" min={200} max={1000} step={100} value={form.size}
                onChange={e => setForm(f => ({ ...f, size: parseInt(e.target.value) }))}
                className="w-full accent-indigo-500" />
              <div className="flex justify-between text-[9px] text-gray-600 mt-1">
                <span>200px</span><span>600px</span><span>1000px</span>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="card p-4 space-y-3">
            <label className="label">{t('details')}</label>
            <div>
              <label className="label">{t('category')}</label>
              <div className="grid grid-cols-4 gap-1.5">
                {categoryOptions.map(opt => (
                  <button key={opt.value} type="button"
                    onClick={() => setForm(f => ({ ...f, category: opt.value }))}
                    className={`flex flex-col items-center p-2 rounded-xl border text-[9px] font-bold transition-all ${
                      form.category === opt.value
                        ? 'bg-indigo-500/25 border-indigo-500/50 text-indigo-300'
                        : 'bg-white/3 border-white/10 text-gray-500'
                    }`}>
                    <span className="text-base mb-0.5">{opt.emoji}</span>
                    <span className="capitalize">{opt.value}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">{t('name')} ({t('optional')})</label>
              <input type="text" className="input-field" placeholder={t('namePlaceholder')}
                value={form.registeredName} onChange={e => setForm(f => ({ ...f, registeredName: e.target.value }))} />
            </div>
            <div>
              <label className="label">{t('password')} *</label>
              <input type="password" className="input-field" placeholder={t('passwordPlaceholder')}
                value={form.qrPassword} onChange={e => setForm(f => ({ ...f, qrPassword: e.target.value }))} minLength={4} />
            </div>
            <div>
              <label className="label">{t('message')} ({t('optional')})</label>
              <input type="text" className="input-field" placeholder={t('messagePlaceholder')}
                value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} maxLength={200} />
            </div>
          </div>

          {/* Generate Button */}
          <button onClick={handleGenerate} disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
            {loading ? <><span className="animate-spin">⏳</span> {t('generating')}...</> : `🎨 ${t('generateBtn')}`}
          </button>

          {/* Result */}
          {result && (
            <div className="card p-5 space-y-3">
              <div className="text-center">
                <div className="text-green-400 font-bold text-sm mb-1">✅ {t('success')}</div>
                <div className="font-mono text-xs text-indigo-300">{result.qrId}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={handleDownload}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-500/15 border border-indigo-500/25 text-indigo-300 text-xs font-bold hover:bg-indigo-500/25">
                  📥 {t('downloadQR')}
                </button>
                <Link href={`/qr/${result.qrId}`}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl bg-purple-500/15 border border-purple-500/25 text-purple-300 text-xs font-bold hover:bg-purple-500/25">
                  👁️ {t('details')}
                </Link>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
