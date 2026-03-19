// ============================================
// pages/generate.js - QR Code Generator
// ============================================

import { useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { qrAPI } from '../lib/api';
import Link from 'next/link';
import LanguageSwitcher from '../components/LanguageSwitcher';
import PasswordInput from '../components/PasswordInput';
import toast from 'react-hot-toast';

export default function Generate() {
  const { user, isLoggedIn } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  const categories = [
    { id: 'pet', label: t('pet'), icon: '🐕' },
    { id: 'child', label: t('child'), icon: '👶' },
    { id: 'car', label: t('vehicle'), icon: '🚗' },
    { id: 'bag', label: t('luggage'), icon: '👜' },
    { id: 'key', label: t('electronic'), icon: '🔑' },
    { id: 'luggage', label: t('luggage'), icon: '🧳' },
    { id: 'document', label: t('document'), icon: '📄' },
    { id: 'other', label: t('other'), icon: '📦' },
  ];
  
  const [step, setStep] = useState(1); // 1: Generate, 2: Fill Form, 3: Success
  const [generating, setGenerating] = useState(false);
  const [activating, setActivating] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [form, setForm] = useState({
    registeredName: '', registeredEmail: '', registeredPhone: '',
    category: 'pet', message: '', qrPassword: ''
  });

  const update = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const validatePassword = (pwd) => {
    const requirements = {
      minLength: pwd.length >= 6,
      uppercase: /[A-Z]/.test(pwd),
      lowercase: /[a-z]/.test(pwd),
    };
    return Object.values(requirements).every(v => v === true);
  };

  // Redirect if not logged in
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-5">
        <div className="card p-8 text-center max-w-sm">
          <span className="text-5xl block mb-4">🔒</span>
          <h2 className="font-bold text-lg text-gray-200 mb-2">{t('loginRequired')}</h2>
          <p className="text-xs text-gray-400 mb-5">{t('loginToGenerate')}</p>
          <Link href="/login" className="btn-primary inline-block">{t('login')} →</Link>
        </div>
      </div>
    );
  }

  // ====== Step 1: Generate QR ======
  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await qrAPI.generate({
        qrPassword: 'TempPass12345', // Temporary placeholder - user sets actual password in step 2
        category: 'other'
      });
      setQrData(res.data.data);
      setStep(2);
      toast.success(t('qrGenerated'));
    } catch (err) {
      toast.error(err.response?.data?.message || t('error'));
    } finally {
      setGenerating(false);
    }
  };

  // ====== Step 2: Activate QR ======
  const handleActivate = async () => {
    if (!form.registeredName || !form.registeredEmail || !form.qrPassword) {
      toast.error(t('requiredFields'));
      return;
    }
    if (!validatePassword(form.qrPassword)) {
      toast.error(t('passwordRequirements') || 'Password must have 6+ characters, 1 uppercase, and 1 lowercase letter');
      return;
    }

    setActivating(true);
    try {
      await qrAPI.activate(qrData.qrId, form);
      setStep(3);
      toast.success(t('activated'));
    } catch (err) {
      toast.error(err.response?.data?.message || t('error'));
    } finally {
      setActivating(false);
    }
  };

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[rgba(10,10,30,0.85)] backdrop-blur-xl border-b border-[rgba(99,102,241,0.15)] px-5 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-400 hover:text-white text-sm">←</Link>
            <div>
              <div className="font-bold text-sm text-gray-200">{t('generateQR')}</div>
              <div className="text-[10px] text-gray-500">{t('step')} {step} {t('of')} 3</div>
            </div>
          </div>
          <LanguageSwitcher />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-5 pt-6">
        {/* Progress Bar */}
        <div className="flex gap-2 mb-6">
          {[1, 2, 3].map(s => (
            <div key={s} className={`h-1 flex-1 rounded-full transition-all duration-500 ${s <= step ? 'bg-gradient-to-r from-indigo-500 to-pink-500' : 'bg-white/10'}`} />
          ))}
        </div>

        {/* ===== STEP 1: Generate ===== */}
        {step === 1 && (
          <div className="text-center animate-fadeIn">
            <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-indigo-500/20 to-pink-500/10 border border-indigo-500/20 flex items-center justify-center">
              <span className="text-5xl animate-float">📱</span>
            </div>
            <h2 className="text-xl font-black text-gray-200 mb-2">{t('generateTitle')}</h2>
            <p className="text-xs text-gray-400 mb-8 max-w-xs mx-auto">
              {t('generateSubtitle')}
            </p>
            <button onClick={handleGenerate} disabled={generating} className="btn-primary text-lg px-10">
              {generating ? `⏳ ${t('generating')}...` : `➕ ${t('generateBtn')}`}
            </button>
          </div>
        )}

        {/* ===== STEP 2: Fill Form ===== */}
        {step === 2 && qrData && (
          <div className="animate-fadeIn">
            {/* QR Preview */}
            <div className="card p-5 text-center mb-4">
              <div className="inline-block bg-white rounded-xl p-3 shadow-lg shadow-black/20 mb-3">
                {/* eslint-disable-next-line */}
                <img src={qrData.qrImage} alt="QR Code" className="w-36 h-36" />
              </div>
              <div className="font-mono font-extrabold text-indigo-300 text-sm tracking-wider">{qrData.qrId}</div>
              <div className="text-[10px] text-gray-500 mt-1">Scan URL: {qrData.scanUrl}</div>
            </div>

            {/* Form */}
            <div className="card p-5 space-y-4">
              <h3 className="font-bold text-sm text-indigo-400 flex items-center gap-2">
                📝 {t('registrationForm')}
              </h3>

              <div>
                <label className="label">{t('fullName')} *</label>
                <input type="text" className="input-field" placeholder={t('nameOfItem')}
                  value={form.registeredName} onChange={(e) => update('registeredName', e.target.value)} />
              </div>

              <div>
                <label className="label">{t('email')} *</label>
                <input type="email" className="input-field" placeholder="email@example.com"
                  value={form.registeredEmail} onChange={(e) => update('registeredEmail', e.target.value)} />
              </div>

              <div>
                <label className="label">{t('phone')}</label>
                <input type="tel" className="input-field" placeholder="+91 XXXXXXXXXX"
                  value={form.registeredPhone} onChange={(e) => update('registeredPhone', e.target.value)} />
              </div>

              {/* Category */}
              <div>
                <label className="label">{t('category')} *</label>
                <div className="flex flex-wrap gap-2">
                  {categories.map(cat => (
                    <button key={cat.id} type="button" onClick={() => update('category', cat.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                        form.category === cat.id
                          ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white'
                          : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                      }`}>
                      {cat.icon} {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">{t('message')}</label>
                <textarea className="input-field resize-none" rows={3} placeholder={t('specialInstructions')}
                  value={form.message} onChange={(e) => update('message', e.target.value)} />
              </div>

              <div>
                <label className="label">🔐 {t('setPassword')} * ({t('requiredToView')})</label>
                <PasswordInput
                  value={form.qrPassword}
                  onChange={(val) => update('qrPassword', val)}
                  placeholder={t('minCharacters')}
                  showStrength={true}
                  showRequirements={true}
                />
                <p className="text-[10px] text-gray-600 mt-1">{t('passwordNeeded')}</p>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setStep(1)} className="btn-secondary flex-1">← {t('back')}</button>
                <button onClick={handleActivate} disabled={activating} className="btn-primary flex-[2]">
                  {activating ? `⏳ ${t('activating')}...` : `✅ ${t('activateBtn')}`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===== STEP 3: Success ===== */}
        {step === 3 && qrData && (
          <div className="text-center animate-fadeIn">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center">
              <span className="text-4xl">✅</span>
            </div>
            <h2 className="text-xl font-black text-green-400 mb-2">{t('activated')}</h2>
            <p className="text-xs text-gray-400 mb-6">{t('trackingStarted')}</p>

            <div className="card p-5 mb-4">
              <div className="inline-block bg-white rounded-xl p-3 mb-3">
                {/* eslint-disable-next-line */}
                <img src={qrData.qrImage} alt="QR Code" className="w-40 h-40" />
              </div>
              <div className="font-mono font-extrabold text-indigo-300">{qrData.qrId}</div>
            </div>

            <div className="card p-4 mb-4 text-left text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">{t('registeredName')}:</span>
                <span className="font-semibold text-gray-300">{form.registeredName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t('category')}:</span>
                <span className="font-semibold text-gray-300">{categories.find(c=>c.id===form.category)?.icon} {form.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t('status')}:</span>
                <span className="badge badge-active">{t('active')}</span>
              </div>
            </div>

            <div className="space-y-3">
              <a href={qrData.qrImage} download={`QR-${qrData.qrId}.png`} className="btn-primary w-full block text-center">
                📥 {t('downloadQR')}
              </a>
              <Link href="/dashboard" className="btn-secondary w-full block text-center">
                📍 {t('trackNow')}
              </Link>
              <button onClick={() => { setStep(1); setQrData(null); setForm({ registeredName:'', registeredEmail:'', registeredPhone:'', category:'pet', message:'', qrPassword:'' }); }}
                className="text-xs text-indigo-400 font-semibold hover:text-indigo-300">
                ➕ {t('generateAnother')}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
