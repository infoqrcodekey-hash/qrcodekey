// ============================================
// pages/scanner.js - Camera QR Code Scanner
// ============================================
// Uses html5-qrcode library to scan QR codes via camera

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';

export default function Scanner() {
  const router = useRouter();
  const { t } = useLanguage();
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  const startScanner = async () => {
    setError('');
    setResult(null);

    try {
      // Dynamic import (html5-qrcode is browser-only)
      const { Html5Qrcode } = await import('html5-qrcode');

      // Get available cameras
      const devices = await Html5Qrcode.getCameras();
      if (!devices || devices.length === 0) {
        setError(t('error'));
        return;
      }

      setCameras(devices);
      // Prefer back camera
      const backCamera = devices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('rear'));
      const cameraId = backCamera?.id || devices[devices.length - 1].id;
      setSelectedCamera(cameraId);

      // Initialize scanner
      const html5QrCode = new Html5Qrcode('qr-reader');
      html5QrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        cameraId,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          // QR Code found!
          handleScanResult(decodedText);
          stopScanner();
        },
        (errorMessage) => {
          // Scan attempt failed (this is normal, keep scanning)
        }
      );

      setScanning(true);

    } catch (err) {
      console.error('Scanner Error:', err);
      if (err.toString().includes('NotAllowedError')) {
        setError(t('error'));
      } else if (err.toString().includes('NotFoundError')) {
        setError(t('error'));
      } else {
        setError(t('error'));
      }
    }
  };

  const stopScanner = async () => {
    try {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      }
    } catch (err) {
      // Ignore cleanup errors
    }
    setScanning(false);
  };

  const switchCamera = async () => {
    if (cameras.length <= 1) return;
    await stopScanner();
    const currentIdx = cameras.findIndex(c => c.id === selectedCamera);
    const nextIdx = (currentIdx + 1) % cameras.length;
    setSelectedCamera(cameras[nextIdx].id);
    // Restart with new camera
    setTimeout(() => startScanner(), 300);
  };

  const handleScanResult = (text) => {
    setResult(text);
    toast.success(t('success'));

    // Check if it's a QR Tracker URL
    const qrIdMatch = text.match(/\/scan\/(QR-[A-Z0-9-]+)/i);
    if (qrIdMatch) {
      // It's our QR code — redirect to scan page
      toast.success(t('success'));
      setTimeout(() => {
        router.push(`/scan/${qrIdMatch[1]}`);
      }, 1000);
    }
  };

  const handleManualInput = () => {
    const input = prompt(t('scanner'));
    if (input) {
      const cleaned = input.trim().toUpperCase();
      router.push(`/scan/${cleaned}`);
    }
  };

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-50 bg-[rgba(10,10,30,0.85)] backdrop-blur-xl border-b border-[rgba(99,102,241,0.15)] px-5 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-400 hover:text-white text-sm">←</Link>
            <div className="font-bold text-sm text-gray-200">{t('scanner')}</div>
          </div>
          <div className="flex items-center gap-3">
            {cameras.length > 1 && scanning && (
              <button onClick={switchCamera} className="text-xs text-indigo-400 font-bold bg-indigo-500/10 px-3 py-1.5 rounded-lg">
                🔄 {t('scanner')}
              </button>
            )}
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-5 pt-6">
        {/* Scanner Area */}
        <div className="card overflow-hidden mb-4">
          <div id="qr-reader" ref={scannerRef} style={{ width: '100%', minHeight: scanning ? 300 : 0 }} />

          {!scanning && !result && (
            <div className="p-8 text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                <span className="text-4xl">📷</span>
              </div>
              <h2 className="font-bold text-lg text-gray-200 mb-2">{t('scanner')}</h2>
              <p className="text-xs text-gray-400 mb-6">{t('scanQR')}</p>

              <button onClick={startScanner} className="btn-primary w-full text-lg mb-3">
                📷 {t('scanner')}
              </button>
              <button onClick={handleManualInput} className="btn-secondary w-full text-sm">
                ⌨️ {t('scanner')}
              </button>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="card p-4 border-red-500/20 mb-4">
            <div className="text-xs font-bold text-red-400 mb-1">⚠️ {t('error')}</div>
            <div className="text-xs text-gray-400">{error}</div>
            <button onClick={startScanner} className="btn-primary mt-3 text-xs w-full">🔄 {t('scanner')}</button>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="card p-5 text-center animate-fadeIn">
            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center">
              <span className="text-3xl">✅</span>
            </div>
            <div className="font-bold text-green-400 mb-2">{t('success')}</div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 font-mono text-sm text-indigo-300 break-all mb-4">
              {result}
            </div>

            {result.includes('/scan/QR-') ? (
              <div className="text-xs text-gray-400 mb-3">{t('loading')}</div>
            ) : (
              <div className="space-y-2">
                <a href={result} target="_blank" rel="noopener noreferrer" className="btn-primary w-full block text-center text-sm">
                  🔗 {t('scanner')}
                </a>
                <button onClick={() => { navigator.clipboard?.writeText(result); toast.success(t('success')); }}
                  className="btn-secondary w-full text-sm">📋 {t('submit')}</button>
              </div>
            )}

            <button onClick={() => { setResult(null); startScanner(); }}
              className="mt-3 text-xs text-indigo-400 font-semibold">📷 {t('scanner')}</button>
          </div>
        )}

        {/* Scanning indicator */}
        {scanning && (
          <div className="text-center mt-4">
            <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 px-4 py-2 rounded-full">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-xs font-semibold text-indigo-400">{t('loading')}</span>
            </div>
            <button onClick={stopScanner} className="block mx-auto mt-3 text-xs text-gray-500 hover:text-gray-300">
              ✕ {t('scanner')}
            </button>
          </div>
        )}

        {/* Tips */}
        <div className="card p-4 mt-6">
          <div className="text-xs font-bold text-gray-400 mb-3">💡 {t('scanner')}</div>
          <div className="space-y-2 text-[11px] text-gray-500">
            <div>• {t('scanner')}</div>
            <div>• {t('scanner')}</div>
            <div>• {t('scanner')}</div>
            <div>• {t('scanner')}</div>
          </div>
        </div>
      </main>
    </div>
  );
}
