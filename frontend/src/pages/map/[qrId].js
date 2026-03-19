// ============================================
// pages/map/[qrId].js - Live Map View
// ============================================
// Scan history map with real-time updates
// Uses OpenStreetMap (FREE - no API key needed)

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useLanguage } from '../../context/LanguageContext';

// Dynamic import (SSR disable for map)
const MapView = dynamic(() => import('../../components/MapView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-900 rounded-xl">
      <div className="text-center">
        <div className="animate-spin text-3xl mb-2">🗺️</div>
        <p className="text-sm text-gray-400">Map load ho raha hai...</p>
      </div>
    </div>
  )
});

export default function MapPage() {
  const router = useRouter();
  const { qrId } = router.query;
  const { t } = useLanguage();

  const [locations, setLocations] = useState([]);
  const [qrInfo, setQrInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [selectedScan, setSelectedScan] = useState(null);
  const [liveMode, setLiveMode] = useState(false);

  const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

  const handleAuth = async (e) => {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/track/view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrId, password }),
      });
      const data = await res.json();
      if (data.success) {
        setQrInfo(data.data.qrInfo);
        const locs = (data.data.locations || []).filter(l => l.latitude && l.longitude && l.latitude !== 0);
        setLocations(locs);
        setAuthenticated(true);
        setError('');
      } else {
        setError(data.message || t('incorrectPassword'));
      }
    } catch (err) {
      setError(t('connectionError'));
    } finally {
      setLoading(false);
    }
  };

  // Real-time Socket.io
  useEffect(() => {
    if (!authenticated || !qrId) return;
    const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

    let socket;
    import('socket.io-client').then(({ default: io }) => {
      socket = io(SOCKET_URL);
      socket.emit('join_qr_tracking', qrId);
      socket.on('new_scan', (data) => {
        if (data.qrId === qrId && data.location?.lat) {
          const newLoc = {
            latitude: data.location.lat,
            longitude: data.location.lng,
            address: { city: data.location.city, country: data.location.country },
            device: { deviceType: data.device },
            scannedAt: data.time,
            _id: Date.now().toString(),
          };
          setLocations(prev => [newLoc, ...prev]);
          if (liveMode) setSelectedScan(newLoc);
        }
      });
    });
    return () => { if (socket) socket.disconnect(); };
  }, [authenticated, qrId, liveMode]);

  if (!authenticated) {
    return (
      <>
        <Head><title>Map View | QR Tracker</title></Head>
        <div className="min-h-screen flex items-center justify-center px-5">
          <div className="w-full max-w-sm">
            <div className="text-center mb-6">
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center">
                <span className="text-2xl">🗺️</span>
              </div>
              <h1 className="text-xl font-black gradient-text">{t('liveMap')}</h1>
              {qrId && <p className="text-xs font-mono text-indigo-300 mt-1">{qrId}</p>}
            </div>

            <form onSubmit={handleAuth} className="card p-6 space-y-4">
              <div>
                <label className="label">{t('password')}</label>
                <input
                  type="password"
                  className="input-field"
                  placeholder={t('enterPassword')}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoFocus
                />
              </div>
              {error && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">❌ {error}</div>}
              <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
                {loading ? <span className="animate-spin">⏳</span> : `🗺️ ${t('unlock')}`}
              </button>
            </form>
            <div className="text-center mt-4">
              <Link href="/track" className="text-xs text-gray-500 hover:text-gray-300">← {t('back')}</Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head><title>Map - {qrId} | QR Tracker</title></Head>
      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-[rgba(10,10,30,0.9)] backdrop-blur-xl border-b border-[rgba(99,102,241,0.15)] px-4 py-3">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/track" className="text-gray-400 hover:text-white text-sm">←</Link>
              <div>
                <div className="font-bold text-sm text-gray-200">📍 {qrInfo?.registeredName || qrId}</div>
                <div className="text-[10px] text-gray-500">{locations.length} scan locations • {qrInfo?.category}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setLiveMode(p => !p)}
                className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-all ${
                  liveMode ? 'bg-green-500/20 border-green-500/40 text-green-400' : 'bg-white/5 border-white/10 text-gray-500'
                }`}
              >
                {liveMode ? '🟢 LIVE' : '⬜ LIVE'}
              </button>
            </div>
          </div>
        </header>

        {/* Map */}
        <div className="flex-1 relative" style={{ height: 'calc(100vh - 120px)' }}>
          <MapView
            locations={locations}
            selectedScan={selectedScan}
            onSelectScan={setSelectedScan}
            qrInfo={qrInfo}
          />
        </div>

        {/* Bottom scan list */}
        <div className="max-h-48 overflow-y-auto bg-[rgba(10,10,30,0.95)] border-t border-[rgba(99,102,241,0.15)]">
          <div className="max-w-2xl mx-auto px-4 py-2">
            <div className="text-[10px] text-gray-500 font-bold mb-2">{t('scanHistory')}</div>
            {locations.length === 0 ? (
              <div className="text-center py-4 text-xs text-gray-600">{t('noScansYet')}</div>
            ) : (
              <div className="space-y-1.5">
                {locations.slice(0, 20).map((loc, i) => (
                  <button
                    key={loc._id || i}
                    onClick={() => setSelectedScan(loc)}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all ${
                      selectedScan?._id === loc._id
                        ? 'bg-indigo-500/20 border border-indigo-500/30'
                        : 'bg-white/3 border border-white/5 hover:bg-white/5'
                    }`}
                  >
                    <span className="text-sm">{i === 0 ? '🔴' : '📍'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-gray-300 font-semibold truncate">
                        {loc.address?.city || 'Unknown City'}, {loc.address?.country || ''}
                      </div>
                      <div className="text-[9px] text-gray-500">
                        {loc.device?.deviceType || 'device'} •{' '}
                        {new Date(loc.scannedAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                        {loc.isApproximate && ' • approx'}
                      </div>
                    </div>
                    {i === 0 && <span className="text-[9px] font-bold text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded">LATEST</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
