// ============================================
// components/InstallPrompt.js - PWA Install Banner
// ============================================

import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';

export default function InstallPrompt() {
  const { t } = useLanguage();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    // Check if dismissed recently
    const dismissed = localStorage.getItem('pwa_install_dismissed');
    if (dismissed && Date.now() - parseInt(dismissed) < 7 * 24 * 60 * 60 * 1000) return;

    // Detect iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(isIOSDevice);

    if (isIOSDevice) {
      // Show iOS install guide after 3 seconds
      setTimeout(() => setShowBanner(true), 3000);
      return;
    }

    // Android/Chrome: Listen for beforeinstallprompt
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setTimeout(() => setShowBanner(true), 2000);
    };
    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }

    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setShowIOSGuide(false);
    localStorage.setItem('pwa_install_dismissed', Date.now().toString());
  };

  if (!showBanner) return null;

  return (
    <>
      {/* Install Banner */}
      <div className="fixed bottom-20 left-4 right-4 z-[100] max-w-lg mx-auto animate-fadeInUp">
        <div className="bg-[rgba(15,15,45,0.95)] backdrop-blur-xl border border-indigo-500/30 rounded-2xl p-4 shadow-xl shadow-indigo-500/10">
          {showIOSGuide ? (
            // iOS Install Guide
            <div>
              <div className="text-sm font-bold text-gray-200 mb-3">{t('iosInstallTitle')}</div>
              <div className="space-y-2 text-xs text-gray-400">
                <div className="flex items-center gap-2">
                  <span className="text-lg">1️⃣</span>
                  <span>{t('iosStep1')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">2️⃣</span>
                  <span>{t('iosStep2')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">3️⃣</span>
                  <span>{t('iosStep3')}</span>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="mt-3 text-xs text-indigo-400 font-semibold"
              >
                {t('gotIt')}
              </button>
            </div>
          ) : (
            // Standard Install Banner
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center shrink-0">
                <span className="text-2xl">📍</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm text-gray-200">{t('installApp')}</div>
                <div className="text-[11px] text-gray-400 mt-0.5">{t('installAppDesc')}</div>
              </div>
              <div className="flex flex-col gap-1.5 shrink-0">
                <button
                  onClick={handleInstall}
                  className="px-4 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg text-xs font-bold text-white"
                >
                  {t('install')}
                </button>
                <button
                  onClick={handleDismiss}
                  className="text-[10px] text-gray-500 hover:text-gray-400"
                >
                  {t('notNow')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
