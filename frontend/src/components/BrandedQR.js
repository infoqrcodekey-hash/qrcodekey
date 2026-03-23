// ============================================
// components/BrandedQR.js - Branded QR Code with Logo
// ============================================
// Uses qrcode library + CSS overlay for center logo
// Error correction H (30%) allows logo overlay without breaking scan
// Works on ALL phone cameras, Google Lens, QR apps, smart POS

import { useState, useEffect } from 'react';

export function useBrandedQR(url, size = 300) {
  const [dataUrl, setDataUrl] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!url) return;
    generateQR();
  }, [url, size]);

  const generateQR = async () => {
    try {
      const QRCode = (await import('qrcode')).default;
      const result = await QRCode.toDataURL(url, {
        width: size,
        margin: 2,
        color: {
          dark: '#1e1b4b',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'H',
      });
      setDataUrl(result);
      setReady(true);
    } catch (err) {
      console.error('BrandedQR error:', err);
      // Fallback
      setDataUrl(`https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}&ecc=H`);
      setReady(true);
    }
  };

  const download = (filename = 'QRCodeKey-QR.png') => {
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.click();
  };

  return { dataUrl, ready, download };
}

// Branded QR display component with logo overlay
export function BrandedQRDisplay({ dataUrl, size = 280 }) {
  if (!dataUrl) {
    return (
      <div style={{ width: size, height: size }} className="flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  const logoSize = size * 0.22;

  return (
    <div className="relative inline-block">
      {/* Gradient glow behind QR */}
      <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500/20 via-purple-500/25 to-pink-500/20 rounded-3xl blur-xl" />

      {/* Gradient border frame */}
      <div className="relative p-[3px] rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
        <div className="bg-white rounded-[13px] p-3 relative">
          {/* QR Code image */}
          <img
            src={dataUrl}
            alt="QRCodeKey QR Code"
            style={{ width: size, height: size }}
            className="block"
          />

          {/* Center logo overlay */}
          <div
            className="absolute"
            style={{
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: logoSize,
              height: logoSize,
            }}
          >
            {/* White circle background */}
            <div
              className="rounded-full bg-white flex items-center justify-center shadow-lg"
              style={{
                width: logoSize,
                height: logoSize,
                boxShadow: '0 0 0 3px white, 0 0 0 5px rgba(99,102,241,0.4)',
              }}
            >
              {/* Inner gradient circle */}
              <div
                className="rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center"
                style={{
                  width: logoSize - 8,
                  height: logoSize - 8,
                }}
              >
                <span style={{ fontSize: logoSize * 0.45 }}>📍</span>
              </div>
            </div>
          </div>

          {/* Brand name at bottom */}
          <div className="text-center mt-2 mb-0">
            <span className="text-[10px] font-black tracking-widest bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              QRCODEKEY
            </span>
          </div>
        </div>
      </div>

      {/* Corner decorations */}
      <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-indigo-400 rounded-tl-lg" />
      <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-purple-400 rounded-tr-lg" />
      <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-purple-400 rounded-bl-lg" />
      <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-pink-400 rounded-br-lg" />
    </div>
  );
}

export default BrandedQRDisplay;
