// ============================================
// pages/attendance-scanner.js - QR Attendance Scanner
// ============================================
// GPS-validated QR scan for Clock-In / Clock-Out

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { attendanceScanAPI } from '../lib/api';

export default function AttendanceScanner() {
  const router = useRouter();
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [gpsStatus, setGpsStatus] = useState('Getting GPS...');
  const [gpsCoords, setGpsCoords] = useState(null);
  const [manualQrId, setManualQrId] = useState('');
  const [loading, setLoading] = useState(false);
  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);

  // Get GPS on load
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setGpsStatus(`GPS Ready (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`);
        },
        (err) => {
          setGpsStatus('GPS unavailable - attendance may be rejected');
          console.error('GPS error:', err);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setGpsStatus('GPS not supported');
    }
  }, []);

  // Start QR scanner
  const startScanner = async () => {
    setScanning(true);
    setError('');
    setResult(null);

    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode('qr-reader');
      html5QrCodeRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          // Parse QR data
          let qrId = decodedText;
          try {
            const parsed = JSON.parse(decodedText);
            qrId = parsed.qrId || decodedText;
          } catch (e) {
            // If not JSON, use as plain QR ID
          }

          await scanner.stop();
          setScanning(false);
          await handleScan(qrId);
        },
        () => {} // ignore errors during scanning
      );
    } catch (err) {
      setScanning(false);
      setError('Camera access denied or not available');
    }
  };

  // Stop scanner
  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (e) {}
    }
    setScanning(false);
  };

  // Handle scan
  const handleScan = async (qrId) => {
    setLoading(true);
    setError('');
    try {
      const res = await attendanceScanAPI.scan({
        qrId,
        lat: gpsCoords?.lat,
        lng: gpsCoords?.lng,
        timestamp: Date.now()
      });
      setResult(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Scan failed');
    }
    setLoading(false);
  };

  // Manual QR ID entry
  const handleManualScan = async (e) => {
    e.preventDefault();
    if (!manualQrId.trim()) return;
    await handleScan(manualQrId.trim());
  };

  return (
    <>
      <Head><title>Attendance Scanner - QRcodeKey</title></Head>
      <div className="min-h-screen bg-[#0a0a1a] text-white p-4">
        <div className="max-w-lg mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => router.back()} className="text-gray-400 hover:text-white">
              &larr; Back
            </button>
            <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Attendance Scanner
            </h1>
            <div></div>
          </div>

          {/* GPS Status */}
          <div className={`mb-4 p-3 rounded-lg text-sm ${gpsCoords ? 'bg-green-900/30 text-green-400' : 'bg-yellow-900/30 text-yellow-400'}`}>
            {gpsCoords ? '📍' : '⚠️'} {gpsStatus}
          </div>

          {/* Scanner Area */}
          <div className="bg-white/5 backdrop-blur rounded-xl p-6 mb-6">
            <div id="qr-reader" ref={scannerRef} className="mb-4 rounded-lg overflow-hidden"></div>

            {!scanning ? (
              <button
                onClick={startScanner}
                className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl text-lg font-bold hover:opacity-90 transition"
              >
                📷 Start Camera Scan
              </button>
            ) : (
              <button
                onClick={stopScanner}
                className="w-full py-4 bg-red-600 rounded-xl text-lg font-bold hover:opacity-90 transition"
              >
                ⬛ Stop Scanner
              </button>
            )}
          </div>

          {/* Manual Entry */}
          <div className="bg-white/5 backdrop-blur rounded-xl p-6 mb-6">
            <h3 className="text-sm text-gray-400 mb-3">Or enter QR ID manually:</h3>
            <form onSubmit={handleManualScan} className="flex gap-2">
              <input
                type="text"
                value={manualQrId}
                onChange={(e) => setManualQrId(e.target.value)}
                placeholder="QR-XXXXXXXXXXXX"
                className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-indigo-600 rounded-lg font-bold hover:bg-indigo-700 transition disabled:opacity-50"
              >
                {loading ? '...' : 'Scan'}
              </button>
            </form>
          </div>

          {/* Loading */}
          {loading && (
            <div className="text-center py-8">
              <div className="animate-spin w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-3"></div>
              <p className="text-gray-400">Processing scan...</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-900/30 border border-red-500/30 rounded-xl p-4 mb-6">
              <p className="text-red-400 font-semibold">❌ {error}</p>
            </div>
          )}

          {/* Success Result */}
          {result && (
            <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-6 mb-6 animate-fadeIn">
              <div className="text-center mb-4">
                <div className="text-4xl mb-2">{result.action === 'clock_in' ? '🟢' : '🔴'}</div>
                <h2 className="text-2xl font-bold text-green-400">
                  {result.action === 'clock_in' ? 'CLOCK IN' : 'CLOCK OUT'}
                </h2>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Name:</span>
                  <span className="font-semibold">{result.member?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Roll No:</span>
                  <span>{result.member?.rollNumber || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Status:</span>
                  <span className={`font-semibold ${result.status === 'present' ? 'text-green-400' : result.status === 'late' ? 'text-yellow-400' : 'text-red-400'}`}>
                    {result.status?.toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Time:</span>
                  <span>{new Date(result.time).toLocaleTimeString('en-IN')}</span>
                </div>
                {result.totalHours > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Hours:</span>
                    <span className="font-semibold text-indigo-400">{result.totalHours}h</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-400">GPS Distance:</span>
                  <span className="text-green-400">{result.gpsDistance}m</span>
                </div>
              </div>

              <button
                onClick={() => { setResult(null); setManualQrId(''); }}
                className="w-full mt-6 py-3 bg-white/10 rounded-lg hover:bg-white/20 transition"
              >
                Scan Next
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
