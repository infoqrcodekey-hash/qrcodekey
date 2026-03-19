// ============================================
// pages/map/[qrId].js - Interactive Map View
// Uses Leaflet (free, no API key required)
// ============================================

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { trackAPI } from '../../lib/api';
import dynamic from 'next/dynamic';

// Leaflet must be loaded client-side only (no SSR)
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then(mod => mod.Polyline), { ssr: false });

export default function MapView() {
  const router = useRouter();
  const { qrId } = router.query;
  const [password, setPassword] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [leafletReady, setLeafletReady] = useState(false);
  const [customIcon, setCustomIcon] = useState(null);
  const [latestIcon, setLatestIcon] = useState(null);

  // Load Leaflet CSS
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    // Create custom icons after Leaflet loads
    import('leaflet').then(L => {
      setCustomIcon(new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
      }));
      setLatestIcon(new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
      }));
      setLeafletReady(true);
    });

    return () => { document.head.removeChild(link); };
  }, []);

  const handleLoad = async () => {
    if (!password) { setError('Enter password'); return; }
    setLoading(true); setError('');
    try {
      const res = await trackAPI.viewLocations({ qrId, password });
      setData(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Error loading data');
    } finally { setLoading(false); }
  };

  const locations = data?.locations?.filter(l => l.latitude && l.longitude && l.latitude !== 0) || [];
  const center = locations.length > 0 ? [locations[0].latitude, locations[0].longitude] : [20.5937, 78.9629]; // Default: India
  const path = locations.map(l => [l.latitude, l.longitude]);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 bg-[rgba(10,10,30,0.85)] backdrop-blur-xl border-b border-[rgba(99,102,241,0.15)] px-5 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/track" className="text-gray-400 hover:text-white text-sm">←</Link>
            <div>
              <div className="font-bold text-sm text-gray-200">Map View</div>
              <div className="text-[10px] text-gray-500">{qrId || '...'}</div>
            </div>
          </div>
          {data && (
            <div className="flex gap-2">
              <a href={`${API_URL}/export/csv/${qrId}?password=${encodeURIComponent(password)}`}
                className="text-[10px] bg-green-500/10 border border-green-500/20 text-green-400 font-bold px-3 py-1.5 rounded-lg">
                📥 CSV
              </a>
              <a href={`${API_URL}/export/json/${qrId}?password=${encodeURIComponent(password)}`}
                className="text-[10px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold px-3 py-1.5 rounded-lg">
                📥 JSON
              </a>
            </div>
          )}
        </div>
      </header>

      {!data ? (
        /* Password Form */
        <div className="max-w-sm mx-auto px-5 pt-20">
          <div className="card p-6 text-center">
            <span className="text-4xl block mb-3">🗺️</span>
            <h2 className="font-bold text-gray-200 mb-4">Enter Password to View Map</h2>
            <input type="password" className="input-field text-center mb-3" placeholder="QR Code Password"
              value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLoad()} />
            {error && <div className="text-xs text-red-400 mb-3">{error}</div>}
            <button onClick={handleLoad} disabled={loading} className="btn-primary w-full">
              {loading ? '⏳ Loading...' : '🗺️ Load Map'}
            </button>
          </div>
        </div>
      ) : (
        /* Map + Data */
        <div>
          {/* Map */}
          <div style={{ height: '55vh', width: '100%' }}>
            {leafletReady && locations.length > 0 ? (
              <MapContainer center={center} zoom={12} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {/* Scan path line */}
                {path.length > 1 && <Polyline positions={path} color="#6366f1" weight={2} dashArray="5,10" />}

                {/* Markers */}
                {locations.map((loc, i) => (
                  <Marker key={i} position={[loc.latitude, loc.longitude]} icon={i === 0 ? latestIcon : customIcon}>
                    <Popup>
                      <div style={{ fontSize: 12, minWidth: 150 }}>
                        <strong>{i === 0 ? '🔴 Latest Scan' : `Scan #${locations.length - i}`}</strong><br />
                        📍 {loc.address?.city || 'Unknown'}, {loc.address?.country || ''}<br />
                        📱 {loc.device?.deviceType || 'Unknown'}<br />
                        🕐 {new Date(loc.scannedAt).toLocaleString('en-US')}<br />
                        📡 {loc.locationSource === 'gps' ? 'GPS' : loc.locationSource === 'ip' ? 'IP-based' : 'Fallback'}
                        {loc.accuracy && <><br />🎯 ±{loc.accuracy.toFixed(0)}m</>}
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            ) : (
              <div className="h-full flex items-center justify-center bg-[#1a1a3e]">
                <div className="text-center text-gray-500">
                  <span className="text-4xl block mb-2">📍</span>
                  <div className="text-sm">{locations.length === 0 ? 'No scan locations yet' : 'Loading map...'}</div>
                </div>
              </div>
            )}
          </div>

          {/* Info Panel */}
          <div className="max-w-4xl mx-auto px-5 py-4">
            {/* Stats */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              <div className="stat-card bg-indigo-500/5 border-indigo-500/10">
                <div className="text-lg font-black text-indigo-400">{data.qrInfo.totalScans}</div>
                <div className="text-[8px] text-gray-500">Total Scans</div>
              </div>
              <div className="stat-card bg-pink-500/5 border-pink-500/10">
                <div className="text-lg font-black text-pink-400">{data.analytics?.uniqueCities?.length || 0}</div>
                <div className="text-[8px] text-gray-500">Cities</div>
              </div>
              <div className="stat-card bg-green-500/5 border-green-500/10">
                <div className="text-lg font-black text-green-400">{data.analytics?.uniqueCountries?.length || 0}</div>
                <div className="text-[8px] text-gray-500">Countries</div>
              </div>
              <div className="stat-card bg-yellow-500/5 border-yellow-500/10">
                <div className="text-lg font-black text-yellow-400">{locations.filter(l => l.locationSource === 'gps').length}</div>
                <div className="text-[8px] text-gray-500">GPS Scans</div>
              </div>
            </div>

            {/* Recent scans list */}
            <div className="card p-4">
              <div className="text-xs font-bold text-gray-400 mb-3">📍 Scan Log ({locations.length})</div>
              <div className="max-h-48 overflow-y-auto space-y-1.5">
                {locations.map((loc, i) => (
                  <div key={i} className={`flex items-center gap-2 p-2 rounded-lg text-xs ${i === 0 ? 'bg-red-500/5 border border-red-500/10' : 'bg-white/2'}`}>
                    <span>{i === 0 ? '🔴' : '🔵'}</span>
                    <span className="font-semibold text-gray-300 flex-1">{loc.address?.city || 'Unknown'}</span>
                    <span className="text-gray-500">{loc.device?.deviceType}</span>
                    <span className="text-gray-600">{new Date(loc.scannedAt).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
