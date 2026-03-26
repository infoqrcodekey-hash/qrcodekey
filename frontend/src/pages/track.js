// ============================================
// pages/track.js - Track QR Location
// ============================================
// QR ID + Password → Last Seen Location PROMINENT DISPLAY
// Scanner error aaye ya na aaye → Last location hamesha dikhega

import { useState, useEffect, useRef } from 'react';
import { trackAPI } from '../lib/api';
import { joinQRTracking, onNewScan, leaveQRTracking } from '../lib/socket';
import Link from 'next/link';
import Head from 'next/head';
import toast from 'react-hot-toast';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';

export default function Track() {
  const { t } = useLanguage();
  const [qrId, setQrId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [liveUpdate, setLiveUpdate] = useState(false);

  // Real-time socket updates
  useEffect(() => {
    if (!result) return;
    joinQRTracking(result.qrInfo.qrId);
    const cleanup = onNewScan((data) => {
      toast(`📍 ${t('newScan')}! ${data.location?.city || t('unknown')}`, { icon: '🔔' });
      setLiveUpdate(true);
      handleTrack(true);
      setTimeout(() => setLiveUpdate(false), 3000);
    });
    return () => {
      leaveQRTracking(result.qrInfo.qrId);
      cleanup();
    };
  }, [result?.qrInfo?.qrId, t]);

  // Auto-refresh every 10 seconds when result is showing
  useEffect(() => {
    if (!result) return;
    const interval = setInterval(() => {
      handleTrack(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [result?.qrInfo?.qrId, qrId, password]);

  const handleTrack = async (silent = false) => {
    if (!qrId.trim()) { setError(t('enterQRId')); return; }
    if (!password.trim()) { setError(t('enterPassword')); return; }
    setError('');
    if (!silent) setLoading(true);
    try {
      const res = await trackAPI.viewLocations({ qrId: qrId.trim().toUpperCase(), password });
      setResult(res.data.data);
      if (!silent) toast.success(`${t('locationDataReceived')} 🗺️`);
    } catch (err) {
      const msg = err.response?.data?.message || t('error');
      setError(msg);
      if (!silent) toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    setResult(null);
    setQrId('');
    setPassword('');
    setError('');
  };

  // Format time (multi-language support)
  const formatTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);
    if (diffMin < 1) return t('justNow');
    if (diffMin < 60) return `${diffMin} ${t('minutesAgo') || 'minutes ago'}`;
    if (diffHr < 24) return `${diffHr} ${t('hoursAgo') || 'hours ago'}`;
    if (diffDay === 1) return t('yesterday');
    if (diffDay < 7) return `${diffDay} ${t('daysAgo') || 'days ago'}`;
    return d.toLocaleDateString('en-IN');
  };

  const getGoogleMapsUrl = (lat, lng) =>
    `https://maps.google.com/?q=${lat},${lng}`;

  const getOpenStreetMapUrl = (lat, lng) =>
    `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}&zoom=15`;

  // Inline mini-map using Leaflet
  const MiniMap = ({ lat, lng, locations: locs }) => {
    const mapContainerRef = useRef(null);
    const mapInstanceRef = useRef(null);

    useEffect(() => {
      if (!mapContainerRef.current || mapInstanceRef.current) return;
      if (typeof window === 'undefined') return;

      const L = require('leaflet');

      const map = L.map(mapContainerRef.current, {
        center: [lat, lng],
        zoom: 13,
        zoomControl: true,
        attributionControl: false,
        dragging: true,
        scrollWheelZoom: true,
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(map);

      // Add main marker
      const mainIcon = L.divIcon({
        html: '<div style="width:16px;height:16px;background:#ef4444;border:2px solid white;border-radius:50%;box-shadow:0 0 10px rgba(239,68,68,0.6)"></div>',
        className: '',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      L.marker([lat, lng], { icon: mainIcon }).addTo(map)
        .bindPopup('<b>Last Known Location</b>');

      // Add scan history markers if available
      if (locs && locs.length > 0) {
        const scanIcon = L.divIcon({
          html: '<div style="width:10px;height:10px;background:#6366f1;border:2px solid white;border-radius:50%;"></div>',
          className: '',
          iconSize: [10, 10],
          iconAnchor: [5, 5],
        });

        const points = [[lat, lng]];
        locs.forEach((loc, i) => {
          if (loc.latitude && loc.longitude && loc.latitude !== 0) {
            L.marker([loc.latitude, loc.longitude], { icon: i === 0 ? mainIcon : scanIcon }).addTo(map);
            points.push([loc.latitude, loc.longitude]);
          }
        });

        if (points.length > 1) {
          const bounds = L.latLngBounds(points);
          map.fitBounds(bounds, { padding: [30, 30] });
        }
      }

      mapInstanceRef.current = map;

      // Fix map rendering after container becomes visible
      setTimeout(() => map.invalidateSize(), 200);

      return () => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }
      };
    }, [lat, lng]);

    return (
      <div
        ref={mapContainerRef}
        style={{ width: '100%', height: '250px', borderRadius: '16px', overflow: 'hidden' }}
        className="border border-indigo-500/20"
      />
    );
  };

  return (
    <>
      <Head><title>{t('track')} | QR Tracker</title></Head>
      <div className="min-h-screen pb-24">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-[rgba(10,10,30,0.85)] backdrop-blur-xl border-b border-[rgba(99,102,241,0.15)] px-5 py-3">
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="text-gray-400 hover:text-white text-sm">←</Link>
              <div>
                <div className="font-bold text-sm text-gray-200">📍 {t('trackLocation')}</div>
                <div className="text-[10px] text-gray-500">{t('trackSubtitle')}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              {result && (
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold ${
                  liveUpdate
                    ? 'bg-green-500/20 border-green-500/40 text-green-400'
                    : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${liveUpdate ? 'bg-green-400 animate-ping' : 'bg-indigo-400'}`} />
                  {liveUpdate ? t('updating') : t('liveTracking')}
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="max-w-lg mx-auto px-5 pt-5">
          {!result ? (
            /* ─── INPUT FORM ─── */
            <div className="animate-fadeIn">
              <div className="text-center mb-6">
                <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-pink-500/20 border border-indigo-500/20 flex items-center justify-center">
                  <span className="text-4xl">🗺️</span>
                </div>
                <h2 className="text-2xl font-black gradient-text mb-1">{t('trackTitle')}</h2>
                <p className="text-xs text-gray-500">{t('trackSubtitleForm')}</p>
              </div>

              <div className="card p-6 space-y-4">
                <div>
                  <label className="label">{t('qrCodeNumber')}</label>
                  <input
                    className="input-field font-mono font-black tracking-widest text-center text-lg"
                    placeholder="QR-XXXXXXXX"
                    value={qrId}
                    onChange={e => setQrId(e.target.value.toUpperCase())}
                    autoCapitalize="characters"
                                        autoComplete="off"
                  />
                </div>
                <div>
                  <label className="label">{t('password')}</label>
                  <input
                    type="password"
                    className="input-field text-center text-lg tracking-widest"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleTrack()}
                                        autoComplete="off"
                  />
                </div>

                {error && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold text-center">
                    ❌ {error}
                  </div>
                )}

                <button
                  onClick={() => handleTrack()}
                  disabled={loading}
                  className="btn-primary w-full text-base py-4 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <><span className="animate-spin text-xl">⏳</span> {t('loading')}</>
                  ) : (
                    <>👁️ {t('viewLocation')}</>
                  )}
                </button>
              </div>

              <div className="mt-5 p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 text-center">
                <p className="text-[10px] text-gray-500">
                  💡 {t('trackInfoTip')}
                </p>
              </div>
            </div>

          ) : (
            /* ─── RESULTS ─── */
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between">
                <button onClick={goBack} className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1">
                  ← {t('back')}
                </button>
                <button onClick={() => handleTrack(false)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-500/15 border border-indigo-500/25 text-xs text-indigo-400 font-bold hover:bg-indigo-500/25 transition-all">
                  🔄 Refresh
                </button>
              </div>

              {/* ══ LAST SEEN LOCATION ══ BIG PROMINENT CARD */}
              {result.qrInfo.lastKnownLocation?.latitude ? (
                <div className="relative overflow-hidden rounded-2xl border border-green-500/30"
                  style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(6,95,70,0.2))' }}>
                  {/* Pulse animation overlay */}
                  <div className="absolute top-4 right-4">
                    <div className="relative w-8 h-8">
                      <div className="absolute inset-0 rounded-full bg-green-500/30 animate-ping" />
                      <div className="absolute inset-1 rounded-full bg-green-500/50 animate-ping" style={{ animationDelay: '0.3s' }} />
                      <div className="absolute inset-0 flex items-center justify-center text-base">📍</div>
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="text-[10px] text-green-400 font-black uppercase tracking-widest mb-2">
                      🟢 {t('lastSeenLocation')}
                    </div>

                    {/* City + Country — BIG */}
                    <div className="text-3xl font-black text-white mb-1">
                      {result.qrInfo.lastKnownLocation.city || t('unknownCity')}
                    </div>
                    <div className="text-lg font-bold text-green-300 mb-3">
                      {result.qrInfo.lastKnownLocation.country || ''}
                    </div>

                    {/* Coordinates */}
                    <div className="font-mono text-xs text-green-400/70 mb-4">
                      📌 {result.qrInfo.lastKnownLocation.latitude?.toFixed(6)},
                      {result.qrInfo.lastKnownLocation.longitude?.toFixed(6)}
                    </div>

                    {/* Time */}
                    {result.qrInfo.lastKnownLocation.capturedAt && (
                      <div className="inline-flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 rounded-full px-3 py-1 text-[11px] text-green-300 font-bold mb-4">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                        {formatTime(result.qrInfo.lastKnownLocation.capturedAt)} •{' '}
                        {new Date(result.qrInfo.lastKnownLocation.capturedAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                      </div>
                    )}

                    {/* Map buttons */}
                    <div className="flex gap-2">
                      <a
                        href={getGoogleMapsUrl(result.qrInfo.lastKnownLocation.latitude, result.qrInfo.lastKnownLocation.longitude)}
                        target="_blank" rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-xs font-bold hover:bg-white/15 transition-all"
                      >
                        🗺️ {t('googleMaps')}
                      </a>
                      <a
                        href={getOpenStreetMapUrl(result.qrInfo.lastKnownLocation.latitude, result.qrInfo.lastKnownLocation.longitude)}
                        target="_blank" rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-xs font-bold hover:bg-white/15 transition-all"
                      >
                        🌍 {t('openStreetMap')}
                      </a>
                      <Link
                        href={`/map/${result.qrInfo.qrId}`}
                        className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold hover:bg-indigo-500/30 transition-all"
                      >
                        📊 {t('fullMap')}
                      </Link>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="card p-6 text-center border-yellow-500/20">
                  <span className="text-4xl block mb-3">⚠️</span>
                  <h3 className="font-bold text-yellow-400 mb-1">{t('noGPSLocation')}</h3>
                  <p className="text-xs text-gray-500 mb-3">
                    {t('noGPSLocationDesc')}
                  </p>
                  {result.qrInfo.totalScans === 0 && (
                    <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-400">
                      💡 This QR has not been scanned yet. When someone scans it, their location will appear here.
                    </div>
                  )}
                </div>
              )}

              {/* Inline Map */}
              {result.qrInfo.lastKnownLocation?.latitude && (
                <div className="card p-3 border-indigo-500/15">
                  <div className="text-[10px] font-bold text-indigo-400 mb-2">🗺️ Live Map</div>
                  <MiniMap
                    lat={result.qrInfo.lastKnownLocation.latitude}
                    lng={result.qrInfo.lastKnownLocation.longitude}
                    locations={result.locations}
                  />
                </div>
              )}

              {/* QR Info */}
              <div className="card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-mono font-black text-indigo-300 text-sm">{result.qrInfo.qrId}</div>
                    <div className="text-[11px] text-gray-500 capitalize">
                      {result.qrInfo.category} • {result.qrInfo.registeredName || t('notRegistered')}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-indigo-400">{result.qrInfo.totalScans}</div>
                    <div className="text-[10px] text-gray-500">{t('totalScans')}</div>
                  </div>
                </div>
              </div>

              {/* Stats */}
              {result.analytics && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="stat-card bg-indigo-500/5 border-indigo-500/10">
                    <div className="text-lg font-black text-indigo-400">{result.analytics.totalScans || 0}</div>
                    <div className="text-[9px] text-gray-500">{t('scans')}</div>
                  </div>
                  <div className="stat-card bg-pink-500/5 border-pink-500/10">
                    <div className="text-lg font-black text-pink-400">{result.analytics.uniqueCities?.length || 0}</div>
                    <div className="text-[9px] text-gray-500">{t('cities')}</div>
                  </div>
                  <div className="stat-card bg-green-500/5 border-green-500/10">
                    <div className="text-lg font-black text-green-400">{result.analytics.uniqueCountries?.length || 0}</div>
                    <div className="text-[9px] text-gray-500">{t('countries')}</div>
                  </div>
                </div>
              )}

              {/* Scan History */}
              <div className="card p-4">
                <div className="text-xs font-bold text-gray-400 mb-3">
                  📋 {t('scanHistory')} ({result.locations.length} {t('records')})
                </div>
                {result.locations.length === 0 ? (
                  <div className="text-center py-6 text-xs text-gray-600">
                    {t('noScansYet')}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {result.locations.map((loc, i) => (
                      <div key={i} className={`p-3 rounded-xl border ${
                        i === 0 ? 'bg-red-500/5 border-red-500/20' : 'bg-white/2 border-white/5'
                      }`}>
                        <div className="flex items-start gap-3">
                          <div className={`w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center text-xs ${
                            i === 0 ? 'bg-red-500/20 text-red-400' : 'bg-indigo-500/10 text-indigo-400'
                          }`}>
                            {i === 0 ? '🔴' : '📍'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-gray-200 truncate">
                              {loc.address?.city || t('unknownCity')}, {loc.address?.state || ''} {loc.address?.country || ''}
                            </div>
                            <div className="text-[10px] text-gray-500 mt-0.5">
                              {loc.latitude && loc.longitude
                                ? `${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}`
                                : t('noCoordinates')
                              }
                              {' '}• {loc.device?.deviceType || t('device')} • {loc.device?.os || ''}
                            </div>
                            {loc.isApproximate && (
                              <span className="text-[9px] text-yellow-400 bg-yellow-500/10 px-1.5 py-0.5 rounded mt-1 inline-block">
                                ≈ {t('approximate')}
                              </span>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className={`text-[10px] font-bold ${i === 0 ? 'text-red-400' : 'text-gray-500'}`}>
                              {formatTime(loc.scannedAt)}
                            </div>
                            <div className="text-[9px] text-gray-600">
                              {loc.locationSource === 'gps' ? `📡 ${t('gps')}` : loc.locationSource === 'ip' ? `🌐 ${t('ip')}` : '📌'}
                            </div>
                            {loc.latitude && loc.longitude && (
                              <a
                                href={getGoogleMapsUrl(loc.latitude, loc.longitude)}
                                target="_blank" rel="noopener noreferrer"
                                className="text-[9px] text-indigo-400 hover:text-indigo-300 mt-0.5 block"
                              >
                                {t('maps')} →
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {result.pagination?.hasMore && (
                  <button className="btn-secondary w-full mt-3 text-xs py-2">
                    {t('loadMore')}
                  </button>
                )}
              </div>
            </div>
          )}
        </main>

        {/* Bottom Nav */}
        <nav className="fixed bottom-0 inset-x-0 z-50 bg-[rgba(10,10,30,0.92)] backdrop-blur-xl border-t border-[rgba(99,102,241,0.12)] py-2 px-4">
          <div className="max-w-lg mx-auto flex justify-around">
            {[
              { icon: '🏠', label: t('home'), href: '/' },
              { icon: '➕', label: t('generate'), href: '/generate' },
              { icon: '📍', label: t('track'), href: '/track' },
              { icon: '📋', label: t('dashboard'), href: '/dashboard' },
            ].map((item, i) => (
              <Link key={i} href={item.href}
                className={`nav-item ${item.href === '/track' ? 'text-indigo-400 bg-indigo-500/10' : 'text-gray-500'}`}>
                <span className="text-lg">{item.icon}</span>
                <span className="text-[10px] font-semibold">{item.label}</span>
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </>
  );
}
