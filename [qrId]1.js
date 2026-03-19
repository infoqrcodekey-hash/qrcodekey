// ============================================
// pages/scan/[qrId].js - QR Scan Landing Page
// ============================================
// This page opens when someone scans a QR Code
// GPS Location is captured automatically

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { trackAPI } from '../../lib/api';
import { getCurrentLocation } from '../../lib/gps';

export default function ScanPage() {
  const router = useRouter();
  const { qrId } = router.query;

  const [status, setStatus] = useState('loading');  // loading, capturing, success, error, inactive
  const [qrInfo, setQrInfo] = useState(null);
  const [locationData, setLocationData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [scanResult, setScanResult] = useState(null);

  useEffect(() => {
    if (!qrId) return;
    handleScan();
  }, [qrId]);

  const handleScan = async () => {
    try {
      // Step 1: Fetch QR Info
      setStatus('loading');
      const infoRes = await trackAPI.getScanInfo(qrId);
      const info = infoRes.data.data;
      setQrInfo(info);

      if (!info.isActive) {
        setStatus('inactive');
        return;
      }

      // Step 2: Capture GPS Location
      setStatus('capturing');
      const location = await getCurrentLocation();
      setLocationData(location);

      // Step 3: Send location to backend
      const scanRes = await trackAPI.submitScan(qrId, {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        altitude: location.altitude
      });

      setScanResult(scanRes.data.data);
      setStatus('success');

    } catch (err) {
      console.error('Scan Error:', err);
      setErrorMsg(err.response?.data?.message || 'Something went wrong');
      
      // Report scan even if location capture fails (IP-based fallback)
      try {
        await trackAPI.submitScan(qrId, {
          latitude: 0,
          longitude: 0,
          accuracy: null
        });
        setStatus('success');
      } catch {
        setStatus('error');
      }
    }
  };

  const categoryInfo = {
    child: { icon: '👶', label: 'Child', color: 'text-blue-400' },
    car: { icon: '🚗', label: 'Car', color: 'text-green-400' },
    bag: { icon: '👜', label: 'Bag', color: 'text-purple-400' },
    pet: { icon: '🐕', label: 'Pet', color: 'text-yellow-400' },
    key: { icon: '🔑', label: 'Key', color: 'text-orange-400' },
    luggage: { icon: '🧳', label: 'Luggage', color: 'text-cyan-400' },
    other: { icon: '📦', label: 'Other', color: 'text-gray-400' },
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-5">
      <div className="w-full max-w-sm">
        
        {/* ===== LOADING ===== */}
        {status === 'loading' && (
          <div className="text-center animate-fadeIn">
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center animate-pulse-glow">
              <span className="text-4xl animate-spin">📡</span>
            </div>
            <h2 className="font-bold text-lg text-gray-200">Verifying QR Code...</h2>
            <p className="text-xs text-gray-500 mt-2">Please wait</p>
          </div>
        )}

        {/* ===== CAPTURING LOCATION ===== */}
        {status === 'capturing' && (
          <div className="text-center animate-fadeIn">
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center animate-pulse-glow">
              <span className="text-4xl">📍</span>
            </div>
            <h2 className="font-bold text-lg text-gray-200">Capturing Location...</h2>
            <p className="text-xs text-gray-500 mt-2">Searching for GPS signal. Click "Allow" to grant permission</p>
            <div className="mt-4 h-1 w-48 mx-auto bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full animate-[pulse_1s_infinite]" style={{ width: '70%' }} />
            </div>
          </div>
        )}

        {/* ===== SUCCESS ===== */}
        {status === 'success' && (
          <div className="text-center animate-fadeIn">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center">
              <span className="text-4xl">✅</span>
            </div>
            <h2 className="font-bold text-xl text-green-400 mb-1">Location Captured!</h2>
            <p className="text-xs text-gray-400 mb-6">Owner has been notified</p>

            {/* QR Info */}
            {qrInfo && (
              <div className="card p-5 text-left mb-4">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">{categoryInfo[qrInfo.category]?.icon || '📦'}</span>
                  <div>
                    <div className="font-bold text-gray-200">{qrInfo.registeredName || 'Item'}</div>
                    <div className="text-[11px] text-gray-500 font-mono">{qrInfo.qrId}</div>
                  </div>
                </div>
                
                {qrInfo.message && (
                  <div className="p-3 rounded-lg bg-indigo-500/5 border border-indigo-500/10 text-xs text-gray-300">
                    💬 {qrInfo.message}
                  </div>
                )}
              </div>
            )}

            {/* Location Info */}
            {locationData && locationData.source !== 'fallback' && (
              <div className="card p-4 text-xs text-left">
                <div className="font-bold text-gray-400 mb-2">📍 Captured Location</div>
                <div className="space-y-1 text-gray-300">
                  <div>Lat: {locationData.latitude?.toFixed(6)}</div>
                  <div>Lng: {locationData.longitude?.toFixed(6)}</div>
                  {locationData.accuracy && <div>Accuracy: ±{locationData.accuracy.toFixed(0)}m</div>}
                  <div>Source: {locationData.source === 'gps' ? '📡 GPS' : '📶 WiFi'}</div>
                </div>
              </div>
            )}

            <p className="text-[11px] text-gray-600 mt-4">
              The owner of this QR Code can see your location
            </p>
          </div>
        )}

        {/* ===== INACTIVE ===== */}
        {status === 'inactive' && (
          <div className="text-center animate-fadeIn">
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
              <span className="text-4xl">⚠️</span>
            </div>
            <h2 className="font-bold text-lg text-yellow-400 mb-2">QR Code Inactive</h2>
            <p className="text-xs text-gray-400">This QR Code has not been activated yet</p>
            <div className="card p-4 mt-4">
              <div className="font-mono text-sm text-gray-400">{qrId}</div>
            </div>
          </div>
        )}

        {/* ===== ERROR ===== */}
        {status === 'error' && (
          <div className="text-center animate-fadeIn">
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <span className="text-4xl">❌</span>
            </div>
            <h2 className="font-bold text-lg text-red-400 mb-2">Error</h2>
            <p className="text-xs text-gray-400 mb-4">{errorMsg || 'Something went wrong'}</p>
            <button onClick={handleScan} className="btn-primary">🔄 Retry</button>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-8">
          <div className="text-[10px] text-gray-600">
            Powered by <span className="gradient-text font-bold">QR Tracker</span>
          </div>
        </div>
      </div>
    </div>
  );
}
