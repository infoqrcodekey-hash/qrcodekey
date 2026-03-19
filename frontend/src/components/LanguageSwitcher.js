// ============================================
// components/LanguageSwitcher.js - Language Toggle
// ============================================
// Simple toggle button: EN ↔ हि

import { useLanguage } from '../context/LanguageContext';

export default function LanguageSwitcher({ className = '' }) {
  const { lang, switchLanguage, languages } = useLanguage();

  const toggle = () => {
    const currentIdx = languages.findIndex(l => l.code === lang);
    const nextIdx = (currentIdx + 1) % languages.length;
    switchLanguage(languages[nextIdx].code);
  };

  const current = languages.find(l => l.code === lang);

  return (
    <button
      onClick={toggle}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold
        bg-white/10 hover:bg-white/20 text-white/90 hover:text-white
        border border-white/20 hover:border-white/40
        transition-all duration-200 backdrop-blur-sm ${className}`}
      title="Switch Language"
    >
      <span className="text-sm">{current?.flag || '🌐'}</span>
      <span>{current?.label || lang.toUpperCase()}</span>
    </button>
  );
}
