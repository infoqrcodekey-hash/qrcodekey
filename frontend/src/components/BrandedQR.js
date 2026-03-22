// ============================================
// components/BrandedQR.js - Advanced Branded QR Code
// ============================================
// Unique QRCodeKey branded QR with:
// - Center logo
// - Gradient border frame
// - High error correction (H) for maximum scanner compatibility
// - Rounded modules for modern look
// - Brand colors
// - Works on ALL smartphone cameras, QR apps, Google Lens, etc.

import { useState, useEffect, useRef } from 'react';

// Generate QR matrix using qrcode library
const generateQRMatrix = async (text) => {
  const QRCode = (await import('qrcode')).default;
  // Create QR with highest error correction for logo overlay
  const qr = await QRCode.create(text, { errorCorrectionLevel: 'H' });
  const size = qr.modules.size;
  const data = qr.modules.data;
  const matrix = [];
  for (let y = 0; y < size; y++) {
    const row = [];
    for (let x = 0; x < size; x++) {
      row.push(data[y * size + x] ? 1 : 0);
    }
    matrix.push(row);
  }
  return matrix;
};

// Check if module is part of a finder pattern (corners)
const isFinderPattern = (x, y, size) => {
  // Top-left
  if (x < 7 && y < 7) return true;
  // Top-right
  if (x >= size - 7 && y < 7) return true;
  // Bottom-left
  if (x < 7 && y >= size - 7) return true;
  return false;
};

// Check if in center zone (for logo)
const isInCenter = (x, y, size, centerSize) => {
  const center = size / 2;
  const half = centerSize / 2;
  return x >= center - half && x <= center + half && y >= center - half && y <= center + half;
};

export default function BrandedQR({ url, size = 280, showFrame = true, onReady }) {
  const canvasRef = useRef(null);
  const [dataUrl, setDataUrl] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!url) return;
    renderQR();
  }, [url, size]);

  const renderQR = async () => {
    try {
      const matrix = await generateQRMatrix(url);
      const qrSize = matrix.length;
      const moduleSize = Math.floor((size * 0.78) / qrSize);
      const qrPixelSize = moduleSize * qrSize;
      const padding = Math.floor((size - qrPixelSize) / 2);

      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');

      // White background with rounded corners
      ctx.fillStyle = '#ffffff';
      roundRect(ctx, 0, 0, size, size, 16);
      ctx.fill();

      // Draw QR modules
      for (let y = 0; y < qrSize; y++) {
        for (let x = 0; x < qrSize; x++) {
          if (!matrix[y][x]) continue;

          // Skip center zone for logo
          const centerModules = Math.floor(qrSize * 0.22);
          if (isInCenter(x, y, qrSize, centerModules)) continue;

          const px = padding + x * moduleSize;
          const py = padding + y * moduleSize;

          if (isFinderPattern(x, y, qrSize)) {
            // Finder patterns — solid dark with brand color
            drawFinderModule(ctx, px, py, moduleSize, x, y, qrSize);
          } else {
            // Data modules — rounded dots
            drawDataModule(ctx, px, py, moduleSize, x, y, qrSize);
          }
        }
      }

      // Draw center logo
      drawCenterLogo(ctx, size, qrPixelSize, padding);

      // Draw frame border
      if (showFrame) {
        drawFrame(ctx, size);
      }

      const result = canvas.toDataURL('image/png');
      setDataUrl(result);
      setReady(true);
      if (onReady) onReady(result);
    } catch (err) {
      console.error('BrandedQR render error:', err);
      // Fallback to basic QR
      try {
        const QRCode = (await import('qrcode')).default;
        const fallback = await QRCode.toDataURL(url, {
          width: size,
          margin: 2,
          color: { dark: '#1a1a2e', light: '#ffffff' },
          errorCorrectionLevel: 'H',
        });
        setDataUrl(fallback);
        setReady(true);
        if (onReady) onReady(fallback);
      } catch (e) {
        console.error('Fallback QR also failed:', e);
      }
    }
  };

  // Draw rounded rectangle
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // Finder pattern modules (the 3 corner squares)
  function drawFinderModule(ctx, px, py, ms, x, y, qrSize) {
    // Determine which finder pattern
    let cornerX, cornerY;
    if (x < 7 && y < 7) { cornerX = 0; cornerY = 0; }
    else if (x >= qrSize - 7 && y < 7) { cornerX = qrSize - 7; cornerY = 0; }
    else { cornerX = 0; cornerY = qrSize - 7; }

    const localX = x - cornerX;
    const localY = y - cornerY;

    // Outer ring — brand gradient purple
    if (localX === 0 || localX === 6 || localY === 0 || localY === 6) {
      ctx.fillStyle = '#6366f1';
      roundRect(ctx, px + 0.5, py + 0.5, ms - 1, ms - 1, ms * 0.2);
      ctx.fill();
    }
    // Inner core — dark pink/magenta
    else if (localX >= 2 && localX <= 4 && localY >= 2 && localY <= 4) {
      ctx.fillStyle = '#ec4899';
      roundRect(ctx, px + 0.5, py + 0.5, ms - 1, ms - 1, ms * 0.25);
      ctx.fill();
    }
    // White gap ring
    else {
      // Don't draw — stays white
    }
  }

  // Data modules — rounded dots with gradient
  function drawDataModule(ctx, px, py, ms, x, y, qrSize) {
    // Gradient from indigo to purple based on position
    const progress = (x + y) / (qrSize * 2);
    const r = Math.round(99 + progress * (168 - 99));
    const g = Math.round(102 + progress * (85 - 102));
    const b = Math.round(241 + progress * (247 - 241));
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;

    // Rounded dot
    const dotSize = ms * 0.82;
    const offset = (ms - dotSize) / 2;
    const radius = dotSize * 0.35;
    roundRect(ctx, px + offset, py + offset, dotSize, dotSize, radius);
    ctx.fill();
  }

  // Center logo area
  function drawCenterLogo(ctx, canvasSize, qrPixelSize, padding) {
    const centerX = canvasSize / 2;
    const centerY = canvasSize / 2;
    const logoSize = canvasSize * 0.2;
    const halfLogo = logoSize / 2;

    // White circle background
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(centerX, centerY, halfLogo + 4, 0, Math.PI * 2);
    ctx.fill();

    // Gradient circle border
    const gradient = ctx.createLinearGradient(
      centerX - halfLogo, centerY - halfLogo,
      centerX + halfLogo, centerY + halfLogo
    );
    gradient.addColorStop(0, '#6366f1');
    gradient.addColorStop(0.5, '#a855f7');
    gradient.addColorStop(1, '#ec4899');
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(centerX, centerY, halfLogo + 2, 0, Math.PI * 2);
    ctx.stroke();

    // Inner colored circle
    const innerGradient = ctx.createRadialGradient(
      centerX - 4, centerY - 4, 2,
      centerX, centerY, halfLogo
    );
    innerGradient.addColorStop(0, '#818cf8');
    innerGradient.addColorStop(1, '#6366f1');
    ctx.fillStyle = innerGradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, halfLogo - 2, 0, Math.PI * 2);
    ctx.fill();

    // Pin icon (📍) — draw as text
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${logoSize * 0.55}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('📍', centerX, centerY + 1);

    // "QRCodeKey" text below logo circle
    ctx.fillStyle = '#6366f1';
    ctx.font = `bold ${Math.max(8, canvasSize * 0.032)}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText('QRCodeKey', centerX, centerY + halfLogo + 14);
  }

  // Outer frame
  function drawFrame(ctx, canvasSize) {
    const gradient = ctx.createLinearGradient(0, 0, canvasSize, canvasSize);
    gradient.addColorStop(0, '#6366f1');
    gradient.addColorStop(0.5, '#a855f7');
    gradient.addColorStop(1, '#ec4899');
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 3;
    roundRect(ctx, 1.5, 1.5, canvasSize - 3, canvasSize - 3, 14);
    ctx.stroke();
  }

  const downloadQR = () => {
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.download = 'QRCodeKey-QR.png';
    link.href = dataUrl;
    link.click();
  };

  return {
    dataUrl,
    ready,
    downloadQR,
    component: dataUrl ? (
      <img src={dataUrl} alt="QRCodeKey QR Code" style={{ width: size, height: size }} className="mx-auto" />
    ) : (
      <div style={{ width: size, height: size }} className="flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    )
  };
}

// Hook version for easy use
export function useBrandedQR(url, size = 280) {
  const [dataUrl, setDataUrl] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!url) return;
    renderBrandedQR(url, size).then(result => {
      setDataUrl(result);
      setReady(true);
    }).catch(() => {
      // Fallback
      import('qrcode').then(({ default: QRCode }) => {
        QRCode.toDataURL(url, {
          width: size, margin: 2,
          color: { dark: '#1a1a2e', light: '#ffffff' },
          errorCorrectionLevel: 'H',
        }).then(fallback => {
          setDataUrl(fallback);
          setReady(true);
        });
      });
    });
  }, [url, size]);

  const download = (filename = 'QRCodeKey-QR.png') => {
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.click();
  };

  return { dataUrl, ready, download };
}

// Standalone render function
async function renderBrandedQR(url, size = 280) {
  const QRCode = (await import('qrcode')).default;
  const qr = await QRCode.create(url, { errorCorrectionLevel: 'H' });
  const qrSize = qr.modules.size;
  const data = qr.modules.data;
  const moduleSize = Math.floor((size * 0.78) / qrSize);
  const qrPixelSize = moduleSize * qrSize;
  const padding = Math.floor((size - qrPixelSize) / 2);

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // White bg
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(16, 0); ctx.lineTo(size - 16, 0);
  ctx.quadraticCurveTo(size, 0, size, 16);
  ctx.lineTo(size, size - 16);
  ctx.quadraticCurveTo(size, size, size - 16, size);
  ctx.lineTo(16, size);
  ctx.quadraticCurveTo(0, size, 0, size - 16);
  ctx.lineTo(0, 16);
  ctx.quadraticCurveTo(0, 0, 16, 0);
  ctx.closePath();
  ctx.fill();

  const centerModules = Math.floor(qrSize * 0.22);

  for (let y = 0; y < qrSize; y++) {
    for (let x = 0; x < qrSize; x++) {
      if (!data[y * qrSize + x]) continue;
      const cx = qrSize / 2, cy = qrSize / 2, half = centerModules / 2;
      if (x >= cx - half && x <= cx + half && y >= cy - half && y <= cy + half) continue;

      const px = padding + x * moduleSize;
      const py = padding + y * moduleSize;

      // Finder patterns
      const isFinder = (x < 7 && y < 7) || (x >= qrSize - 7 && y < 7) || (x < 7 && y >= qrSize - 7);

      if (isFinder) {
        let cX, cY;
        if (x < 7 && y < 7) { cX = 0; cY = 0; }
        else if (x >= qrSize - 7 && y < 7) { cX = qrSize - 7; cY = 0; }
        else { cX = 0; cY = qrSize - 7; }
        const lx = x - cX, ly = y - cY;
        if (lx === 0 || lx === 6 || ly === 0 || ly === 6) {
          ctx.fillStyle = '#6366f1';
        } else if (lx >= 2 && lx <= 4 && ly >= 2 && ly <= 4) {
          ctx.fillStyle = '#ec4899';
        } else {
          continue;
        }
        ctx.beginPath();
        const r = moduleSize * 0.2;
        ctx.moveTo(px + r, py); ctx.lineTo(px + moduleSize - r, py);
        ctx.quadraticCurveTo(px + moduleSize, py, px + moduleSize, py + r);
        ctx.lineTo(px + moduleSize, py + moduleSize - r);
        ctx.quadraticCurveTo(px + moduleSize, py + moduleSize, px + moduleSize - r, py + moduleSize);
        ctx.lineTo(px + r, py + moduleSize); ctx.quadraticCurveTo(px, py + moduleSize, px, py + moduleSize - r);
        ctx.lineTo(px, py + r); ctx.quadraticCurveTo(px, py, px + r, py);
        ctx.closePath(); ctx.fill();
      } else {
        // Data dots
        const progress = (x + y) / (qrSize * 2);
        const r = Math.round(99 + progress * 69);
        const g = Math.round(102 - progress * 17);
        const b = Math.round(241 + progress * 6);
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        const dot = moduleSize * 0.78;
        const off = (moduleSize - dot) / 2;
        ctx.beginPath();
        ctx.arc(px + moduleSize / 2, py + moduleSize / 2, dot / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Center logo
  const ctrX = size / 2, ctrY = size / 2;
  const logoR = size * 0.1;
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(ctrX, ctrY, logoR + 4, 0, Math.PI * 2); ctx.fill();
  const g = ctx.createLinearGradient(ctrX - logoR, ctrY - logoR, ctrX + logoR, ctrY + logoR);
  g.addColorStop(0, '#6366f1'); g.addColorStop(1, '#ec4899');
  ctx.strokeStyle = g; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(ctrX, ctrY, logoR + 2, 0, Math.PI * 2); ctx.stroke();
  const ig = ctx.createRadialGradient(ctrX - 3, ctrY - 3, 1, ctrX, ctrY, logoR);
  ig.addColorStop(0, '#818cf8'); ig.addColorStop(1, '#6366f1');
  ctx.fillStyle = ig;
  ctx.beginPath(); ctx.arc(ctrX, ctrY, logoR - 1, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${logoR * 1.1}px Arial`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('📍', ctrX, ctrY + 1);

  // Border
  const bg = ctx.createLinearGradient(0, 0, size, size);
  bg.addColorStop(0, '#6366f1'); bg.addColorStop(0.5, '#a855f7'); bg.addColorStop(1, '#ec4899');
  ctx.strokeStyle = bg; ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(14, 0.5); ctx.lineTo(size - 14, 0.5);
  ctx.quadraticCurveTo(size - 0.5, 0.5, size - 0.5, 14);
  ctx.lineTo(size - 0.5, size - 14);
  ctx.quadraticCurveTo(size - 0.5, size - 0.5, size - 14, size - 0.5);
  ctx.lineTo(14, size - 0.5);
  ctx.quadraticCurveTo(0.5, size - 0.5, 0.5, size - 14);
  ctx.lineTo(0.5, 14);
  ctx.quadraticCurveTo(0.5, 0.5, 14, 0.5);
  ctx.closePath(); ctx.stroke();

  return canvas.toDataURL('image/png');
}
