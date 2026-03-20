// ============================================
// pages/contact.js - Contact Page
// ============================================

import { useState } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import toast from 'react-hot-toast';

export default function Contact() {
  const { t } = useLanguage();
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error(t('requiredFields'));
      return;
    }
    setSending(true);
    // Simulate send (can connect to backend later)
    setTimeout(() => {
      toast.success(t('messageSent'));
      setForm({ name: '', email: '', subject: '', message: '' });
      setSending(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen pb-24">
      <Head>
        <title>Contact - QRCodeKey</title>
        <meta name="description" content="Contact QRCodeKey support team" />
      </Head>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-[rgba(10,10,30,0.85)] backdrop-blur-xl border-b border-[rgba(99,102,241,0.15)] px-5 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <Link href="/" className="text-gray-400 hover:text-white text-sm">←</Link>
          <div className="font-bold text-sm text-gray-200">{t('contactUs')}</div>
          <LanguageSwitcher />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-5 pt-8 space-y-6">
        {/* Hero */}
        <div className="text-center mb-6 animate-fadeIn">
          <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <span className="text-3xl">✉️</span>
          </div>
          <h1 className="text-2xl font-black gradient-text mb-2">{t('contactTitle')}</h1>
          <p className="text-sm text-gray-400">{t('contactSubtitle')}</p>
        </div>

        {/* Contact Info Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 animate-fadeIn">
          {[
            { icon: '📧', label: t('emailUs'), value: 'info.qrcodekey@gmail.com', href: 'mailto:info.qrcodekey@gmail.com' },
            { icon: '🕐', label: t('responseTime'), value: t('within24hrs') },
            { icon: '🌐', label: t('website'), value: 'qrcodekey.com', href: 'https://qrcodekey.com' },
          ].map((item, i) => (
            <div key={i} className="card p-4 text-center">
              <span className="text-2xl block mb-2">{item.icon}</span>
              <div className="text-[10px] text-gray-500 uppercase font-bold">{item.label}</div>
              {item.href ? (
                <a href={item.href} className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold mt-1 block break-all">{item.value}</a>
              ) : (
                <div className="text-xs text-gray-300 font-semibold mt-1">{item.value}</div>
              )}
            </div>
          ))}
        </div>

        {/* Contact Form */}
        <div className="card p-6 animate-fadeIn">
          <h2 className="text-lg font-bold text-gray-100 mb-4">{t('sendMessage')}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">{t('name')} *</label>
              <input
                type="text"
                className="input-field"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={t('yourName')}
              />
            </div>
            <div>
              <label className="label">{t('email')} *</label>
              <input
                type="email"
                className="input-field"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder={t('yourEmail')}
              />
            </div>
            <div>
              <label className="label">{t('subject')}</label>
              <input
                type="text"
                className="input-field"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder={t('subjectPlaceholder')}
              />
            </div>
            <div>
              <label className="label">{t('message')} *</label>
              <textarea
                className="input-field min-h-[120px] resize-y"
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder={t('messagePlaceholder')}
              />
            </div>
            <button
              type="submit"
              disabled={sending}
              className="btn-primary w-full text-sm"
            >
              {sending ? t('sending') : t('sendMessage')}
            </button>
          </form>
        </div>

        {/* FAQ Quick Links */}
        <div className="card p-5 animate-fadeIn">
          <h3 className="font-bold text-sm text-gray-200 mb-3">{t('quickLinks')}</h3>
          <div className="space-y-2">
            {[
              { label: t('helpCenter'), href: '/help', icon: '❓' },
              { label: t('pricing'), href: '/pricing', icon: '💎' },
              { label: t('termsOfService'), href: '/terms', icon: '📋' },
              { label: t('privacyPolicy'), href: '/privacy-policy', icon: '🔒' },
            ].map((link, i) => (
              <Link key={i} href={link.href} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-all">
                <span>{link.icon}</span>
                <span className="text-sm text-gray-300 font-medium">{link.label}</span>
                <span className="ml-auto text-gray-600">→</span>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
