// ============================================
// context/LanguageContext.js - Language Provider
// ============================================
// Auto-detects browser language, stores preference in localStorage

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import translations, { detectLanguage, getTranslation, LANGUAGES } from '../lib/translations';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState('en');
  const [isReady, setIsReady] = useState(false);

  // On mount: detect language from localStorage or browser
  useEffect(() => {
    const detected = detectLanguage();
    setLang(detected);
    setIsReady(true);
  }, []);

  // Switch language and persist
  const switchLanguage = useCallback((newLang) => {
    if (translations[newLang]) {
      setLang(newLang);
      if (typeof window !== 'undefined') {
        localStorage.setItem('qrtrack_lang', newLang);
      }
    }
  }, []);

  // Translation helper - t('keyName')
  const t = useCallback((key) => {
    return getTranslation(lang, key);
  }, [lang]);

  const value = {
    lang,
    switchLanguage,
    t,
    isReady,
    languages: LANGUAGES
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

// Hook to use language context
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}

export default LanguageContext;
