// ============================================
// pages/about.js - About Page
// ============================================

import Link from 'next/link';
import Head from 'next/head';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';

export default function About() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen pb-24">
      <Head>
        <title>About - QRCodeKey</title>
        <meta name="description" content="Learn about QRCodeKey - real-time QR tracking & attendance management" />
      </Head>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-[rgba(10,10,30,0.85)] backdrop-blur-xl border-b border-[rgba(99,102,241,0.15)] px-5 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <Link href="/" className="text-gray-400 hover:text-white text-sm">←</Link>
          <div className="font-bold text-sm text-gray-200">{t('aboutUs')}</div>
          <LanguageSwitcher />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 pt-8 space-y-6">
        {/* Hero */}
        <div className="text-center mb-8 animate-fadeIn">
          <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <span className="text-4xl">📍</span>
          </div>
          <h1 className="text-3xl font-black gradient-text mb-3">{t('aboutTitle')}</h1>
          <p className="text-sm text-gray-400 max-w-md mx-auto leading-relaxed">
            {t('aboutSubtitle')}
          </p>
        </div>

        {/* Mission */}
        <div className="card p-6 animate-fadeIn">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">🎯</span>
            <h2 className="text-lg font-bold text-gray-100">{t('ourMission')}</h2>
          </div>
          <p className="text-sm text-gray-400 leading-relaxed">
            {t('missionDesc')}
          </p>
        </div>

        {/* What We Offer */}
        <div className="card p-6 animate-fadeIn">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">⚡</span>
            <h2 className="text-lg font-bold text-gray-100">{t('whatWeOffer')}</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { icon: '📱', title: t('aboutFeature1Title'), desc: t('aboutFeature1Desc') },
              { icon: '📷', title: t('aboutFeature2Title'), desc: t('aboutFeature2Desc') },
              { icon: '🗺️', title: t('aboutFeature3Title'), desc: t('aboutFeature3Desc') },
              { icon: '📊', title: t('aboutFeature4Title'), desc: t('aboutFeature4Desc') },
              { icon: '🔒', title: t('aboutFeature5Title'), desc: t('aboutFeature5Desc') },
              { icon: '🌐', title: t('aboutFeature6Title'), desc: t('aboutFeature6Desc') },
            ].map((f, i) => (
              <div key={i} className="bg-white/5 rounded-xl p-4 border border-white/5 hover:border-indigo-500/20 transition-all">
                <span className="text-xl block mb-2">{f.icon}</span>
                <div className="font-bold text-sm text-gray-200">{f.title}</div>
                <div className="text-xs text-gray-500 mt-1">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="card p-6 animate-fadeIn">
          <h2 className="text-lg font-bold text-gray-100 mb-4 text-center">{t('byTheNumbers')}</h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { number: '10K+', label: t('qrGenerated') },
              { number: '500+', label: t('activeUsers') },
              { number: '99.9%', label: t('uptime') },
            ].map((s, i) => (
              <div key={i} className="text-center p-3 bg-white/5 rounded-xl">
                <div className="text-2xl font-black gradient-text">{s.number}</div>
                <div className="text-[10px] text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tech Stack */}
        <div className="card p-6 animate-fadeIn">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">🛠️</span>
            <h2 className="text-lg font-bold text-gray-100">{t('builtWith')}</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {['Next.js', 'React', 'Node.js', 'MongoDB', 'Tailwind CSS', 'Razorpay', 'Vercel', 'Render'].map((tech, i) => (
              <span key={i} className="px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-xs text-indigo-300 font-semibold">
                {tech}
              </span>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="card p-6 text-center animate-fadeIn">
          <h2 className="text-lg font-bold text-gray-100 mb-2">{t('readyToStart')}</h2>
          <p className="text-xs text-gray-400 mb-4">{t('readyToStartDesc')}</p>
          <div className="flex gap-3 justify-center">
            <Link href="/register" className="btn-primary text-sm px-6 py-2.5">{t('register')}</Link>
            <Link href="/contact" className="btn-secondary text-sm px-6 py-2.5">{t('contactUs')}</Link>
          </div>
        </div>

        {/* Footer Links */}
        <div className="text-center text-xs text-gray-600 space-x-4 pt-4">
          <Link href="/terms" className="hover:text-indigo-400 transition-colors">{t('termsOfService')}</Link>
          <Link href="/privacy-policy" className="hover:text-indigo-400 transition-colors">{t('privacyPolicy')}</Link>
          <Link href="/contact" className="hover:text-indigo-400 transition-colors">{t('contactUs')}</Link>
        </div>
      </main>
    </div>
  );
}
