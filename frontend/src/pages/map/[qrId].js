// ============================================
// pages/map/[qrId].js - Last Scan Location View
// ============================================
// Shows last scan location details (no live map needed)
// Password protected - same as track page

import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { useLanguage } from '../../context/LanguageContext';

export default function LastLocationPage() {
  const router = useRouter();
  const { qrId } = router.query;
  const { t } = useLanguage();

  const [locations, setLocations] = useState([]);
  const [qrInfo, setQrInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);

  const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

  const handleAuth = async (e) => {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    setError('');
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
        // Sort by newest first
        locs.sort((a, b) => new Date(b.scannedAt) - new Date(a.scannedAt));
        setLocations(locs);
        setAuthenticated(true);
      } else {
        setError(data.message || 'Incorrect password');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const openInGoogleMaps = (lat, lng) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
  };

  // Password form
  if (!authenticated) {
    return (
      <>
        <Head><title>Last Location | QRCodeKey</title></Head>
        <div className="min-h-screen flex items-center justify-center px-5">
          <div className="w-full max-w-sm">
            <div className="text-center mb-6">
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center">
                <span className="text-2xl">📍</span>
              </div>
              <h1 className="text-xl font-black bg-gradient-to-r from-indigo-400 to-pink-400 bg-clip-text text-transparent">Last Location</h1>
              {qrId && <p className="text-xs font-mono text-indigo-300 mt-1">{qrId}</p>}
            </div>

            <form onSubmit={handleAuth} className="glass-card rounded-3xl p-6 space-y-4 border border-white/5">
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-2">Password</label>
                <input
                  type="password"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-200 text-sm focus:border-indigo-500/50 focus:outline-none"
                  placeholder="Enter QR password..."
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoFocus
                />
              </div>
              {error && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">{error}</div>}
              <button type="submit" disabled={loading} className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-sm font-bold hover:shadow-lg hover:shadow-indigo-500/25 transition-all disabled:opacity-50">
                {loading ? '...' : '📍 View Location'}
              </button>
            </form>
            <div className="text-center mt-4">
              <Link href="/track" className="text-xs text-gray-500 hover:text-gray-300">← Back to Track</Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  const lastScan = locations[0] || null;

  return (
    <>
      <Head><title>Location - {qrId} | QRCodeKey</title></Head>
      <div className="min-h-screen pb-20">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-[rgba(10,10,30,0.85)] backdrop-blur-xl border-b border-[rgba(99,102,241,0.15)] px-4 py-3">
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <Link href="/track" className="text-gray-500 hover:text-gray-300 text-sm">← Back</Link>
            <h1 className="font-bold text-sm bg-gradient-to-r from-indigo-400 to-pink-400 bg-clip-text text-transparent">
              📍 {qrInfo?.registeredName || qrId}
            </h1>
            <div className="w-12" />
          </div>
        </header>

        <main className="max-w-lg mx-auto px-5 pt-6 space-y-4">
          {/* QR Info Card */}
          <div className="glass-card rounded-3xl p-5 border border-white/5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center">
                <span className="text-2xl">
                  {qrInfo?.category === 'child' ? '👶' : qrInfo?.category === 'car' ? '🚗' : qrInfo?.category === 'pet' ? '🐕' : qrInfo?.category === 'bag' ? '👜' : qrInfo?.category === 'key' ? '🔑' : '📦'}
                </span>
              </div>
              <div>
                <div className="font-bold text-gray-200">{qrInfo?.registeredName || 'Unknown'}</div>
                <div className="text-[10px] text-gray-500">{qrInfo?.category || 'General'} • {qrInfo?.totalScans || locations.length} scans</div>
              </div>
            </div>
          </div>

          {/* Last Scan Location */}
          {lastScan ? (
            <div className="glass-card rounded-3xl p-5 border border-green-500/10">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs font-bold text-green-400">LAST SCAN LOCATION</span>
              </div>

              {/* Location Details */}
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-white/3 border border-white/5">
                  <span className="text-lg mt-0.5">📍</span>
                  <div>
                    <div className="text-sm font-bold text-gray-200">
                      {lastScan.address?.city || 'Unknown City'}{lastScan.address?.country ? ', ' + lastScan.address.country : ''}
                    </div>
                    {lastScan.address?.state && (
                      <div className="text-[10px] text-gray-500">{lastScan.address.state}</div>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-white/3 border border-white/5">
                  <span className="text-lg mt-0.5">🕐</span>
                  <div>
                    <div className="text-sm font-bold text-gray-200">
                      {new Date(lastScan.scannedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                    </div>
                    <div className="text-[10px] text-gray-500">
                      {getTimeAgo(lastScan.scannedAt)}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-white/3 border border-white/5">
                  <span className="text-lg mt-0.5">📱</span>
                  <div>
                    <div className="text-sm font-bold text-gray-200">
                      {lastScan.device?.browser || 'Unknown Browser'}
                    </div>
                    <div className="text-[10px] text-gray-500">
                      {lastScan.device?.os || 'Unknown OS'} • {lastScan.device?.deviceType || 'device'}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-white/3 border border-white/5">
                  <span className="text-lg mt-0.5">🛰️</span>
                  <div>
                    <div className="text-sm font-bold text-gray-200">
                      {lastScan.locationSource === 'gps' ? 'GPS (Exact)' : lastScan.locationSource === 'ip' ? 'IP (Approximate)' : 'Estimated'}
                    </div>
                    <div className="text-[10px] text-gray-500">
                      {lastScan.latitude?.toFixed(4)}, {lastScan.longitude?.toFixed(4)}
                      {lastScan.accuracy ? ` • ±${Math.round(lastScan.accuracy)}m` : ''}
                    </div>
                  </div>
                </div>

                {/* Open in Google Maps button */}
                <button
                  onClick={() => openInGoogleMaps(lastScan.latitude, lastScan.longitude)}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm font-bold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-blue-500/25 transition-all"
                >
                  🗺️ Open in Google Maps
                </button>
              </div>
            </div>
          ) : (
            <div className="glass-card rounded-3xl p-8 text-center border border-white/5">
              <span className="text-3xl block mb-2">📭</span>
              <p className="text-sm text-gray-400">No scan locations found</p>
              <p className="text-[10px] text-gray-600 mt-1">QR code has not been scanned yet</p>
            </div>
          )}

          {/* All Scans History */}
          {locations.length > 1 && (
            <div className="glass-card rounded-3xl p-5 border border-white/5">
              <div className="text-xs font-bold text-gray-400 mb-3">ALL SCANS ({locations.length})</div>
              <div className="space-y-2">
                {locations.map((loc, i) => (
                  <div key={loc._id || i} className="flex items-center gap-3 p-3 rounded-xl bg-white/3 border border-white/5">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${i === 0 ? 'bg-green-500/15' : 'bg-white/5'}`}>
                      <span className="text-sm">{i === 0 ? '🔴' : '📍'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-gray-300 font-semibold truncate">
                        {loc.address?.city || 'Unknown'}{loc.address?.country ? ', ' + loc.address.country : ''}
                      </div>
                      <div className="text-[9px] text-gray-500">
                        {loc.device?.deviceType || 'device'} • {new Date(loc.scannedAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                        {loc.locationSource === 'ip' ? ' • IP' : loc.locationSource === 'gps' ? ' • GPS' : ''}
                      </div>
                    </div>
                    <button
                      onClick={() => openInGoogleMaps(loc.latitude, loc.longitude)}
                      className="px-2 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[9px] text-blue-400 font-bold shrink-0"
                    >
                      🗺️
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}

function getTimeAgo(dateStr) {
  const now = new Date();
  const then = new Date(dateStr);
  const diff = Math.floor((now - then) / 1000);

  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
  return `${Math.floor(diff / 604800)} weeks ago`;
}
