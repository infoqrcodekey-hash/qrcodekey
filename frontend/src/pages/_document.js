import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* PWA Meta Tags */}
        <meta name="theme-color" content="#6366f1" />
        <meta name="application-name" content="QRCodeKey" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="QRCodeKey" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#6366f1" />
        <meta name="msapplication-TileImage" content="/icons/icon-144x144.png" />

        {/* SEO Meta */}
        <meta name="description" content="Smart QR-based attendance management, real-time GPS tracking, and workforce analytics for modern organizations." />
        <meta name="keywords" content="QR code, attendance, tracking, GPS, workforce management, employee attendance, QR scanner" />
        <meta name="author" content="QRCodeKey" />

        {/* Open Graph / Social */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="QRCodeKey - Smart Attendance & QR Tracking" />
        <meta property="og:description" content="Smart QR-based attendance management, real-time GPS tracking, and workforce analytics." />
        <meta property="og:image" content="/icons/icon-512x512.png" />
        <meta property="og:site_name" content="QRCodeKey" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="QRCodeKey - Smart Attendance & QR Tracking" />
        <meta name="twitter:description" content="Smart QR-based attendance management with real-time GPS tracking." />
        <meta name="twitter:image" content="/icons/icon-512x512.png" />

        {/* PWA Manifest */}
        <link rel="manifest" href="/manifest.json" />

        {/* Favicon */}
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-96x96.png" />

        {/* Apple Touch Icons */}
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icons/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/icons/icon-512x512.png" />

        {/* Apple Splash Screens */}
        <link rel="apple-touch-startup-image" href="/icons/icon-512x512.png" />

  {/* Emoji Font */}
              <link rel="preconnect" href="https://fonts.googleapis.com" />
              <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
              <link href="https://fonts.googleapis.com/css2?family=Noto+Color+Emoji&display=swap" rel="stylesheet" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
