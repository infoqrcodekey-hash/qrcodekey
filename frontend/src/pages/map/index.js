// ============================================
// pages/map/index.js - Map View (Select QR Code)
// ============================================
// Shows list of user's QR codes to view on map

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { qrAPI } from '../../lib/api';

export default function MapIndex() {
  const router = useRouter();
  const { user, isLoggedIn, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const [qrCodes, setQrCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [manualQrId, setManualQrId] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) {
      setLoading(false);
      return;
    }
    fetchQRCodes();
  }, [isLoggedIn, authLoading]);

  const fetchQRCodes = async () => {
    try {
      const res = await qrAPI.getMyQRCodes();
      setQrCodes(res.data?.data || []);
    } catch (err) {
      console.error('Failed to fetch QR codes:', err);
    }
    setLoading(false);
  };

  const handleManualSearch = (e) => {
    e.preventDefault();
    if (manualQrId.trim()) {
      router.push(`/map/${manualQrId.trim().toUpperCase()}`);
    }
  };

  return (
    <>
      <Head>
        <title>Map View | QRCodeKey</title>
      </Head>

      <div className="min-h-screen pb-20">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-[rgba(10,10,30,0.85)] backdrop-blur-xl border-b border-[rgba(99,102,241,0.15)] px-4 py-3">
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link href="/" className="text-gray-500 hover:text-gray-300 text-sm">← Back</Link>
            </div>
            <h1 className="font-bold text-sm gradient-text">Map View</h1>
            <div className="w-12" />
          </div>
        </header>

        <main className="max-w-lg mx-auto px-5 pt-6">
          {/* Search by QR ID */}
          <div className="card p-5 mb-6 border-indigo-500/15">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center text-lg">🔍</div>
              <h2 className="font-bold text-sm text-indigo-400">Search QR on Map</h2>
            </div>
            <form onSubmit={handleManualSearch} className="flex gap-2">
              <input
                type="text"
                className="input-field flex-1 font-mono text-sm"
                placeholder="Enter QR Code ID..."
                value={manualQrId}
                onChange={(e) => setManualQrId(e.target.value.toUpperCase())}
              />
              <button type="submit" className="btn-primary px-4 text-sm shrink-0">
                🗺️ View
              </button>
            </form>
          </div>

          {/* My QR Codes */}
          {isLoggedIn && (
            <div className="card p-5 border-green-500/15">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-green-500/15 flex items-center justify-center text-lg">📍</div>
                <h2 className="font-bold text-sm text-green-400">My QR Codes</h2>
              </div>

              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                </div>
              ) : qrCodes.length === 0 ? (
                <div className="text-center py-8">
                  <span className="text-3xl block mb-2">📭</span>
                  <p className="text-sm text-gray-400">No QR Codes yet</p>
                  <Link href="/generate" className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold mt-2 inline-block">
                    ➕ Create QR Code
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {qrCodes.filter(qr => qr.isActive).map((qr, i) => (
                    <Link key={qr._id || i} href={`/map/${qr.qrId}`}
                      className="flex items-center gap-3 p-3 rounded-xl bg-white/3 border border-white/5 hover:border-green-500/30 hover:bg-white/5 transition-all group">
                      <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                        <span className="text-lg">📍</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-gray-200 truncate">{qr.registeredName || qr.qrId}</div>
                        <div className="text-[10px] text-gray-500">{qr.category || 'General'} • {qr.totalScans || 0} scans</div>
                      </div>
                      <div className="text-[10px] text-green-400 font-bold shrink-0 group-hover:translate-x-1 transition-transform">
                        View Map →
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Not logged in */}
          {!isLoggedIn && !authLoading && (
            <div className="card p-6 text-center border-indigo-500/15">
              <span className="text-3xl block mb-3">🔑</span>
              <p className="text-sm text-gray-400 mb-3">Login to see your QR codes on map</p>
              <Link href="/login" className="inline-block px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold">
                Login →
              </Link>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
