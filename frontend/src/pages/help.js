// ============================================
// pages/help.js - Help & Support Page
// ============================================

import { useState } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';

export default function Help() {
  const { t } = useLanguage();
  const [openFaq, setOpenFaq] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const faqs = [
    { q: t('faq1Q'), a: t('faq1A'), category: 'general' },
    { q: t('faq2Q'), a: t('faq2A'), category: 'qr' },
    { q: t('faq3Q'), a: t('faq3A'), category: 'attendance' },
    { q: t('faq4Q'), a: t('faq4A'), category: 'attendance' },
    { q: t('faq5Q'), a: t('faq5A'), category: 'account' },
    { q: t('faq6Q'), a: t('faq6A'), category: 'payment' },
    { q: t('faq7Q'), a: t('faq7A'), category: 'qr' },
    { q: t('faq8Q'), a: t('faq8A'), category: 'general' },
  ];

  const guides = [
    { icon: '📱', title: t('guide1Title'), desc: t('guide1Desc'), href: '/generate' },
    { icon: '📷', title: t('guide2Title'), desc: t('guide2Desc'), href: '/attendance-scanner' },
    { icon: '🏢', title: t('guide3Title'), desc: t('guide3Desc'), href: '/organizations' },
    { icon: '📊', title: t('guide4Title'), desc: t('guide4Desc'), href: '/reports' },
    { icon: '👤', title: t('guide5Title'), desc: t('guide5Desc'), href: '/profile' },
    { icon: '💎', title: t('guide6Title'), desc: t('guide6Desc'), href: '/pricing' },
  ];

  const filteredFaqs = searchQuery
    ? faqs.filter(f => f.q.toLowerCase().includes(searchQuery.toLowerCase()) || f.a.toLowerCase().includes(searchQuery.toLowerCase()))
    : faqs;

  return (
    <div className="min-h-screen pb-24">
      <Head>
        <title>Help & Support - QRCodeKey</title>
        <meta name="description" content="QRCodeKey help center - FAQs, guides, and support" />
      </Head>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-[rgba(10,10,30,0.85)] backdrop-blur-xl border-b border-[rgba(99,102,241,0.15)] px-5 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <Link href="/" className="text-gray-400 hover:text-white text-sm">←</Link>
          <div className="font-bold text-sm text-gray-200">{t('helpCenter')}</div>
          <LanguageSwitcher />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 pt-8 space-y-6">
        {/* Hero */}
        <div className="text-center mb-6 animate-fadeIn">
          <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <span className="text-3xl">❓</span>
          </div>
          <h1 className="text-2xl font-black gradient-text mb-2">{t('helpTitle')}</h1>
          <p className="text-sm text-gray-400">{t('helpSubtitle')}</p>
        </div>

        {/* Search */}
        <div className="animate-fadeIn">
          <input
            type="text"
            className="input-field text-center"
            placeholder={t('searchHelp')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Quick Start Guides */}
        <div className="card p-6 animate-fadeIn">
          <h2 className="text-lg font-bold text-gray-100 mb-4">{t('quickStartGuides')}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {guides.map((g, i) => (
              <Link key={i} href={g.href} className="bg-white/5 rounded-xl p-4 border border-white/5 hover:border-indigo-500/20 transition-all text-center group">
                <span className="text-2xl block mb-2 group-hover:scale-110 transition-transform">{g.icon}</span>
                <div className="font-bold text-xs text-gray-200">{g.title}</div>
                <div className="text-[10px] text-gray-500 mt-1">{g.desc}</div>
              </Link>
            ))}
          </div>
        </div>

        {/* FAQs */}
        <div className="card p-6 animate-fadeIn">
          <h2 className="text-lg font-bold text-gray-100 mb-4">{t('faqTitle')}</h2>
          <div className="space-y-2">
            {filteredFaqs.map((faq, i) => (
              <div key={i} className="border border-white/5 rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full text-left p-4 flex items-center justify-between hover:bg-white/5 transition-all"
                >
                  <span className="text-sm font-semibold text-gray-200 pr-4">{faq.q}</span>
                  <span className={`text-indigo-400 text-lg transition-transform ${openFaq === i ? 'rotate-45' : ''}`}>+</span>
                </button>
                {openFaq === i && (
                  <div className="px-4 pb-4 text-sm text-gray-400 leading-relaxed border-t border-white/5 pt-3 animate-fadeIn">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
            {filteredFaqs.length === 0 && (
              <div className="text-center py-6 text-gray-500 text-sm">{t('noResults')}</div>
            )}
          </div>
        </div>

        {/* Still Need Help */}
        <div className="card p-6 text-center animate-fadeIn">
          <span className="text-3xl block mb-3">💬</span>
          <h2 className="text-lg font-bold text-gray-100 mb-2">{t('stillNeedHelp')}</h2>
          <p className="text-xs text-gray-400 mb-4">{t('stillNeedHelpDesc')}</p>
          <div className="flex gap-3 justify-center">
            <Link href="/contact" className="btn-primary text-sm px-6 py-2.5">{t('contactUs')}</Link>
            <Link href="/chatbot" className="btn-secondary text-sm px-6 py-2.5">{t('chatWithBot')}</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
