// ============================================
// pages/qr/[qrId].js - QR Code Display Page
// ============================================
// Ye page tab use hota hai jab:
//   1. User apna QR code dekhna/download/print karna chahta hai
//   2. QR image badi dikhti hai + download + print button hai

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { qrAPI } from '../../lib/api';
import toast from 'react-hot-toast';

export default function QRDisplayPage() {
  const router = useRouter();
  const { qrId } = router.query;
  const { isLoggedIn } = useAuth();
  const { t } = useLanguage();

  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const printRef = useRef(null);

  const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    if (!qrId || !isLoggedIn) return;
    loadQR();
  }, [qrId, isLoggedIn]);

  const loadQR = async () => {
    try {
      setLoading(true);
      const res = await qrAPI.getQRCode(qrId);
      setQrData(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || t('loadingError'));
    } finally {
      setLoading(false);
    }
  };

  // Download QR as PNG
  const handleDownload = async () => {
    try {
      const token = localStorage.getItem('qr_token');
      const res = await fetch(`${API}/qr/${qrId}/download`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `QR-${qrId}.png`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t('downloadSuccess'));
    } catch (err) {
      toast.error(t('downloadFailed'));
    }
  };

  // Print QR
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    const scanUrl = `${window.location.origin}/scan/${qrId}`;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>QR Code - ${qrId}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; font-family: Arial, sans-serif; background: white; }
          .qr-container { text-align: center; padding: 30px; border: 2px dashed #ccc; border-radius: 16px; max-width: 320px; }
          .qr-image { width: 220px; height: 220px; border: 3px solid #1a1a2e; border-radius: 8px; padding: 8px; }
          .qr-id { font-family: monospace; font-size: 12px; color: #6366f1; margin-top: 12px; font-weight: bold; }
          .qr-name { font-size: 16px; font-weight: bold; color: #1a1a2e; margin-top: 8px; }
          .qr-cat { font-size: 12px; color: #666; margin-top: 4px; text-transform: uppercase; letter-spacing: 1px; }
          .qr-msg { font-size: 11px; color: #444; margin-top: 10px; font-style: italic; }
          .qr-instruction { font-size: 10px; color: #888; margin-top: 16px; border-top: 1px solid #eee; padding-top: 12px; }
          .brand { font-size: 10px; color: #bbb; margin-top: 8px; }
          @media print { body { -webkit-print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <div class="qr-container">
          ${qrData?.qrImageUrl ? `<img src="${qrData.qrImageUrl}" alt="QR Code" class="qr-image" />` : ''}
          <div class="qr-id">${qrId}</div>
          ${qrData?.registeredName ? `<div class="qr-name">${qrData.registeredName}</div>` : '<div class="qr-name">Not Registered</div>'}
          ${qrData?.category ? `<div class="qr-cat">${getCategoryEmoji(qrData.category)} ${qrData.category}</div>` : ''}
          ${qrData?.message ? `<div class="qr-msg">"${qrData.message}"</div>` : ''}
          <div class="qr-instruction">
            📱 ${t('howToUse')}<br/>
            ${t('viewTracking')}
          </div>
          <div class="brand">QR Tracker System</div>
        </div>
        <script>window.onload = () => { window.print(); window.close(); }</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const getCategoryEmoji = (cat) => {
    const emojis = { child: '👶', car: '🚗', bag: '👜', pet: '🐕', key: '🔑', luggage: '🧳', other: '📦' };
    return emojis[cat] || '📦';
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-5">
        <div className="card p-8 text-center max-w-sm">
          <span className="text-5xl block mb-4">🔒</span>
          <h2 className="font-bold text-gray-200 mb-4">{t('loginRequired')}</h2>
          <Link href="/login" className="btn-primary inline-block">→ {t('login')}</Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head><title>QR Code - {qrId} | QR Tracker</title></Head>
      <div className="min-h-screen pb-8">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-[rgba(10,10,30,0.85)] backdrop-blur-xl border-b border-[rgba(99,102,241,0.15)] px-5 py-3">
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/dashboard" className="text-gray-400 hover:text-white text-sm">← {t('back')}</Link>
              <div>
                <div className="font-bold text-sm text-gray-200">{t('qrCode')}</div>
                <div className="text-[10px] font-mono text-indigo-300">{qrId}</div>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-lg mx-auto px-5 pt-6">
          {loading ? (
            <div className="text-center py-16">
              <div className="animate-spin text-4xl mb-4">⏳</div>
              <p className="text-sm text-gray-500">{t('loading')}</p>
            </div>
          ) : error ? (
            <div className="card p-8 text-center">
              <span className="text-4xl block mb-3">❌</span>
              <p className="text-sm text-red-400">{error}</p>
            </div>
          ) : qrData ? (
            <div className="space-y-4">
              {/* QR Image Card */}
              <div className="card p-6 text-center">
                <div className="flex items-center justify-center mb-5">
                  {qrData.qrImageUrl ? (
                    <div className="relative">
                      {/* Glow effect */}
                      <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-2xl" />
                      <div className="relative bg-white rounded-2xl p-4 shadow-2xl shadow-indigo-500/20">
                        {/* eslint-disable-next-line */}
                        <img
                          src={qrData.qrImageUrl}
                          alt={`QR Code ${qrId}`}
                          className="w-52 h-52 rounded-lg"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="w-52 h-52 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10">
                      <span className="text-5xl">📷</span>
                    </div>
                  )}
                </div>

                {/* QR ID */}
                <div className="font-mono text-sm font-black text-indigo-300 mb-1">{qrId}</div>

                {/* Status badge */}
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold ${
                  qrData.isActive
                    ? 'bg-green-500/15 text-green-400 border border-green-500/20'
                    : 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${qrData.isActive ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`} />
                  {qrData.isActive ? t('active') : t('inactive')}
                </span>

                {/* Scan URL info */}
                {!qrData.isActive && (
                  <div className="mt-4 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-left">
                    <p className="text-[11px] text-yellow-300 font-bold mb-1">📌 {t('instructions')}:</p>
                    <ol className="text-[10px] text-gray-400 space-y-1 list-decimal list-inside">
                      <li>{t('step1')}</li>
                      <li>{t('step2')}</li>
                      <li>{t('step3')}</li>
                      <li>{t('step4')}</li>
                    </ol>
                  </div>
                )}
              </div>

              {/* Info Card */}
              <div className="card p-4 space-y-3">
                {[
                  { label: t('category'), value: qrData.category ? `${getCategoryEmoji(qrData.category)} ${qrData.category}` : '—' },
                  { label: t('registeredName'), value: qrData.registeredName || t('notRegistered') },
                  { label: t('phone'), value: qrData.registeredPhone || '—' },
                  { label: t('totalScans'), value: qrData.totalScans || 0 },
                  { label: t('created'), value: new Date(qrData.createdAt).toLocaleDateString('en-IN') },
                  qrData.activatedAt && { label: t('activated'), value: new Date(qrData.activatedAt).toLocaleDateString('en-IN') },
                  qrData.message && { label: t('message'), value: `"${qrData.message}"` },
                  qrData.lastKnownLocation?.city && {
                    label: t('lastLocation'),
                    value: `${qrData.lastKnownLocation.city}, ${qrData.lastKnownLocation.country}`
                  },
                ].filter(Boolean).map((item, i) => (
                  <div key={i} className="flex justify-between items-center py-1.5 border-b border-white/5 last:border-0">
                    <span className="text-[11px] text-gray-500 font-semibold">{item.label}</span>
                    <span className="text-[11px] text-gray-200 capitalize text-right max-w-[60%]">{item.value}</span>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleDownload}
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 hover:bg-indigo-500/20 transition-all text-indigo-300"
                >
                  <span className="text-2xl">📥</span>
                  <span className="text-xs font-bold">{t('downloadQR')}</span>
                  <span className="text-[9px] text-indigo-400/60">High Quality 1024px</span>
                </button>

                <button
                  onClick={handlePrint}
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-purple-500/10 border border-purple-500/25 hover:bg-purple-500/20 transition-all text-purple-300"
                >
                  <span className="text-2xl">🖨️</span>
                  <span className="text-xs font-bold">{t('printQR')}</span>
                  <span className="text-[9px] text-purple-400/60">{t('printReady')}</span>
                </button>
              </div>

              {/* Navigation Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <Link
                  href={`/map/${qrId}`}
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-green-500/10 border border-green-500/25 hover:bg-green-500/20 transition-all text-green-300"
                >
                  <span className="text-2xl">🗺️</span>
                  <span className="text-xs font-bold">{t('viewMap')}</span>
                  <span className="text-[9px] text-green-400/60">{t('scanLocations')}</span>
                </Link>

                <Link
                  href="/track"
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-pink-500/10 border border-pink-500/25 hover:bg-pink-500/20 transition-all text-pink-300"
                >
                  <span className="text-2xl">📍</span>
                  <span className="text-xs font-bold">{t('trackLocation')}</span>
                  <span className="text-[9px] text-pink-400/60">{t('passwordTracking')}</span>
                </Link>
              </div>
            </div>
          ) : null}
        </main>
      </div>
    </>
  );
}
