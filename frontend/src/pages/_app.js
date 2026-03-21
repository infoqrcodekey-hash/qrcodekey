// ============================================
// pages/_app.js - App Root
// ============================================

import { useEffect } from 'react';
import '../styles/globals.css';
import { AuthProvider } from '../context/AuthContext';
import { LanguageProvider } from '../context/LanguageContext';
import { Toaster } from 'react-hot-toast';
import InstallPrompt from '../components/InstallPrompt';

export default function App({ Component, pageProps }) {
  // Register Service Worker for PWA
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        console.log('SW registered:', reg.scope);
      }).catch((err) => {
        console.log('SW registration failed:', err);
      });
    }
  }, []);

  return (
    <LanguageProvider>
      <AuthProvider>
        <Component {...pageProps} />
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: {
              background: 'rgba(15,15,45,0.95)',
              color: '#e0e0f0',
              border: '1px solid rgba(99,102,241,0.3)',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: '600',
            },
            success: { iconTheme: { primary: '#10b981', secondary: 'white' } },
            error: { iconTheme: { primary: '#ef4444', secondary: 'white' } },
          }}
        />
        <InstallPrompt />
      </AuthProvider>
    </LanguageProvider>
  );
}
