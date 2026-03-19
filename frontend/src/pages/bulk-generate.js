// ============================================
// pages/bulk-generate.js - Bulk QR Generation
// ============================================
// Generate 1-100 QR codes at once
// Download all in ZIP or individually

import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import Link from 'next/link';
import Head from 'next/head';
import toast from 'react-hot-toast';
import api from '../lib/api';
import LanguageSwitcher from '../components/LanguageSwitcher';

export default function BulkGenerate() {
  const { isLoggedIn, user } = useAuth();
  const { t } = useLanguage();
  const [count, setCount] = useState(5);
  const [category, setCategory] = useState('other');
  const [prefix, setPrefix] = useState('');
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState([]);
  const [showAll, setShowAll] = useState(false);

  const categoryOptions = [
    { value: 'other', label: `📦 ${t('other')}`, emoji: '📦' },
    { value: 'child', label: `👶 ${t('child')}`, emoji: '👶' },
    { value: 'car', label: `🚗 ${t('vehicle')}`, emoji: '🚗' },
    { value: 'bag', label: `👜 ${t('luggage')}`, emoji: '👜' },
    { value: 'pet', label: `🐕 ${t('pet')}`, emoji: '🐕' },
    { value: 'key', label: `🔑 ${t('key')}`, emoji: '🔑' },
    { value: 'luggage', label: `🧳 ${t('luggage')}`, emoji: '🧳' },
  ];

  const handleGenerate = async () => {
    if (count < 1 || count > 100) return toast.error(t('quantityRange'));
    setLoading(true);
    setGenerated([]);
    try {
      const res = await api.post('/qr/bulk-generate', { count, category, prefix });
      const data = res.data;
      if (data.success) {
        setGenerated(data.data.generated);
        toast.success(`${data.data.count} ${t('qrCode')}s ${t('success')}! 🎉`);
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || t('error'));
    } finally {
      setLoading(false);
    }
  };

  // Download single QR
  const downloadSingle = (qr) => {
    const link = document.createElement('a');
    link.href = qr.qrImage;
    link.download = `${qr.qrId}.png`;
    link.click();
    toast.success(`${qr.qrId} ${t('success')}`);
  };

  // Download all as individual files
  const downloadAll = async () => {
    toast(t('downloading'), { icon: '⏳' });
    for (let i = 0; i < generated.length; i++) {
      await new Promise(r => setTimeout(r, 150));
      const link = document.createElement('a');
      link.href = generated[i].qrImage;
      link.download = `${generated[i].qrId}.png`;
      link.click();
    }
    toast.success(`${t('downloadAll')} 📥`);
  };

  // Print all
  const printAll = () => {
    const printWindow = window.open('', '_blank');
    const visible = generated;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${t('bulkGenerate')} ${t('printAll')}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; background: white; }
          .grid { display: flex; flex-wrap: wrap; gap: 16px; padding: 20px; }
          .qr-card { width: 160px; text-align: center; border: 1px solid #ddd; border-radius: 8px; padding: 12px; page-break-inside: avoid; }
          .qr-img { width: 130px; height: 130px; }
          .qr-id { font-family: monospace; font-size: 8px; color: #6366f1; margin-top: 6px; word-break: break-all; }
          .qr-cat { font-size: 9px; color: #888; margin-top: 2px; }
          @media print { .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="no-print" style="padding:16px;background:#f0f0ff;text-align:center;">
          <button onclick="window.print()" style="padding:8px 20px;background:#6366f1;color:white;border:none;border-radius:6px;cursor:pointer;font-size:14px">🖨️ ${t('printAll')}</button>
        </div>
        <div class="grid">
          ${visible.map(qr => `
            <div class="qr-card">
              <img src="${qr.qrImage}" alt="${qr.qrId}" class="qr-img" />
              <div class="qr-id">${qr.qrId}</div>
              <div class="qr-cat">${qr.category}</div>
            </div>
          `).join('')}
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-5">
        <div className="card p-8 text-center max-w-sm">
          <span className="text-5xl block mb-4">🔒</span>
          <h2 className="font-bold text-gray-200 mb-4">{t('loginRequired')}</h2>
          <Link href="/login" className="btn-primary inline-block">{t('login')} →</Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head><title>{t('bulkGenerate')} | QR Tracker</title></Head>
      <div className="min-h-screen pb-24">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-[rgba(10,10,30,0.85)] backdrop-blur-xl border-b border-[rgba(99,102,241,0.15)] px-5 py-3">
          <div className="max-w-lg mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Link href="/dashboard" className="text-gray-400 hover:text-white text-sm">←</Link>
              <div>
                <div className="font-bold text-sm text-gray-200">{t('bulkGenerate')}</div>
                <div className="text-[10px] text-gray-500">{t('bulkGenerateDesc')}</div>
              </div>
            </div>
            <LanguageSwitcher />
          </div>
        </header>

        <main className="max-w-lg mx-auto px-5 pt-5 space-y-4">
          {/* Plan info */}
          <div className="flex items-center gap-2 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
            <span className="text-sm">💎</span>
            <div>
              <span className="text-xs text-indigo-300 font-bold">{user?.plan?.toUpperCase()} {t('plan')}</span>
              <span className="text-[10px] text-gray-500 ml-2">— {user?.qrLimit} {t('qrCode')} {t('limit')}</span>
            </div>
          </div>

          {/* Config Card */}
          <div className="card p-5 space-y-4">
            {/* Count */}
            <div>
              <label className="label">{t('quantity')} (1-100)</label>
              <div className="flex items-center gap-3">
                <input
                  type="range" min={1} max={Math.min(100, user?.qrLimit || 5)}
                  value={count}
                  onChange={e => setCount(parseInt(e.target.value))}
                  className="flex-1 accent-indigo-500"
                />
                <div className="w-12 h-10 flex items-center justify-center rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-black text-sm">
                  {count}
                </div>
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="label">{t('category')}</label>
              <div className="grid grid-cols-4 gap-1.5">
                {categoryOptions.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setCategory(opt.value)}
                    className={`flex flex-col items-center p-2 rounded-xl border text-[9px] font-bold transition-all ${
                      category === opt.value
                        ? 'bg-indigo-500/25 border-indigo-500/50 text-indigo-300'
                        : 'bg-white/3 border-white/10 text-gray-500 hover:border-white/20'
                    }`}
                  >
                    <span className="text-base mb-0.5">{opt.emoji}</span>
                    <span className="capitalize">{opt.value}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Prefix */}
            <div>
              <label className="label">{t('prefix')} ({t('optional')})</label>
              <input
                type="text"
                className="input-field"
                style={{ textTransform: 'uppercase' }}
                placeholder={`${t('example')}: SHOP, BAG, CAR`}
                value={prefix}
                onChange={e => setPrefix(e.target.value.toUpperCase().slice(0, 10))}
                maxLength={10}
              />
              <p className="text-[10px] text-gray-600 mt-1">
                {prefix ? `${t('qrCode')} IDs: ${prefix}-XXXXXX` : `${t('qrCode')} IDs: QR-XXXXXX`}
              </p>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <><span className="animate-spin">⏳</span> {count} {t('generating')}...</>
              ) : (
                <>⚡ {count} {t('generateBtn')}</>
              )}
            </button>
          </div>

          {/* Results */}
          {generated.length > 0 && (
            <div className="space-y-3">
              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={downloadAll}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-500/15 border border-indigo-500/25 text-indigo-400 text-xs font-bold hover:bg-indigo-500/25"
                >
                  📥 {t('downloadAll')} ({generated.length})
                </button>
                <button
                  onClick={printAll}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-purple-500/15 border border-purple-500/25 text-purple-400 text-xs font-bold hover:bg-purple-500/25"
                >
                  🖨️ {t('printAll')}
                </button>
              </div>

              {/* QR Grid */}
              <div className="card p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-gray-400">✅ {generated.length} {t('qrCode')}s {t('success')}</span>
                  {generated.length > 6 && (
                    <button onClick={() => setShowAll(p => !p)} className="text-[10px] text-indigo-400">
                      {showAll ? t('showLess') : `${t('showAll')} (${generated.length})`}
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(showAll ? generated : generated.slice(0, 6)).map((qr, i) => (
                    <div
                      key={qr.qrId}
                      className="bg-white/3 border border-white/10 rounded-xl p-2 text-center hover:border-indigo-500/30 transition-all cursor-pointer"
                      onClick={() => downloadSingle(qr)}
                    >
                      {/* eslint-disable-next-line */}
                      <img src={qr.qrImage} alt={qr.qrId} className="w-full aspect-square rounded-lg bg-white p-0.5 mb-1" />
                      <div className="text-[8px] font-mono text-indigo-300 truncate">{qr.qrId}</div>
                      <div className="text-[7px] text-gray-600">{t('tapToDownload')}</div>
                    </div>
                  ))}
                </div>
                {!showAll && generated.length > 6 && (
                  <div className="text-center mt-2">
                    <button onClick={() => setShowAll(true)} className="text-[10px] text-gray-500 hover:text-indigo-400">
                      + {generated.length - 6} {t('more')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>

        {/* Bottom Nav */}
        <nav className="fixed bottom-0 inset-x-0 z-50 bg-[rgba(10,10,30,0.92)] backdrop-blur-xl border-t border-[rgba(99,102,241,0.12)] py-2 px-4">
          <div className="max-w-lg mx-auto flex justify-around">
            {[
              { icon: '🏠', label: t('home'), href: '/' },
              { icon: '➕', label: t('generate'), href: '/generate' },
              { icon: '⚡', label: t('bulkGenerate'), href: '/bulk-generate' },
              { icon: '📋', label: t('dashboard'), href: '/dashboard' },
            ].map((item, i) => (
              <Link key={i} href={item.href} className={`nav-item ${item.href === '/bulk-generate' ? 'text-indigo-400 bg-indigo-500/10' : 'text-gray-500'}`}>
                <span className="text-lg">{item.icon}</span>
                <span className="text-[10px] font-semibold">{item.label}</span>
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </>
  );
}
