// -----------------------------------------------
// components/LanguageSwitcher.js - Language Toggle
// -----------------------------------------------
import { useLanguage } from '../context/LanguageContext';

const langOptions = [
  { code: 'en', label: 'EN' },
  { code: 'hi', label: 'à¤¹à¤¿' },
  { code: 'gu', label: 'àªà«' },
];

export function LanguageSwitcher({ className = '' }) {
  const { lang, switchLanguage } = useLanguage();

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {langOptions.map((l) => (
        <button
          key={l.code}
          onClick={() => switchLanguage(l.code)}
          className={`px-2 py-1 rounded text-xs font-bold transition-all ${
            lang === l.code
              ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30'
              : 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white'
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}

export default LanguageSwitcher;
