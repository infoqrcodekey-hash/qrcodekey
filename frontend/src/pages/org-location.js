// ============================================
// pages/org-location.js - Set Organization GPS Location
// ============================================

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useAuth } from '../context/AuthContext';
import { orgAPI, attendanceScanAPI } from '../lib/api';

export default function OrgLocation() {
  const router = useRouter();
  const { orgId } = router.query;
  const { user, loading: authLoading } = useAuth();
  const [org, setOrg] = useState(null);
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [radius, setRadius] = useState(100);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }
    if (!orgId) return;

    const fetchOrg = async () => {
      try {
        const res = await orgAPI.getOrg(orgId);
        const orgData = res.data.data;
        setOrg(orgData);
        if (orgData.location?.lat) setLat(orgData.location.lat.toString());
        if (orgData.location?.lng) setLng(orgData.location.lng.toString());
        if (orgData.allowedRadius) setRadius(orgData.allowedRadius);
      } catch (err) { setError('Failed to load organization'); }
      setLoading(false);
    };
    fetchOrg();
  }, [orgId, user, authLoading, router]);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('GPS not supported on this device');
      return;
    }
    setError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        setSuccess('GPS location captured!');
      },
      (err) => setError('Failed to get GPS: ' + err.message),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!lat || !lng) { setError('GPS coordinates are required'); return; }

    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await attendanceScanAPI.updateOrgLocation(orgId, {
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        allowedRadius: parseInt(radius)
      });
      setSuccess('Location saved! Attendance GPS validation is now active.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save location');
    }
    setSaving(false);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <>
      <Head><title>Set GPS Location - QRcodeKey</title></Head>
      <div className="min-h-screen bg-[#0a0a1a] text-white p-4">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => router.back()} className="text-gray-400 hover:text-white">&larr; Back</button>
            <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              GPS Location Setup
            </h1>
            <div></div>
          </div>

          <div className="bg-white/5 backdrop-blur rounded-xl p-6 mb-6">
            <div className="text-center mb-6">
              <div className="text-4xl mb-3">📍</div>
              <h2 className="text-lg font-bold">{org?.name || 'Organization'}</h2>
              <p className="text-gray-400 text-sm mt-1">
                Set the GPS location where attendance scanning is allowed.
                Only scans within the radius will be accepted.
              </p>
            </div>

            {/* Get Current Location Button */}
            <button
              onClick={getCurrentLocation}
              className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl text-lg font-bold hover:opacity-90 transition mb-6"
            >
              📡 Use My Current Location
            </button>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    placeholder="28.6139"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                    placeholder="77.2090"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-1 block">
                  Allowed Radius: <span className="text-indigo-400 font-bold">{radius}m</span>
                </label>
                <input
                  type="range"
                  min="10"
                  max="1000"
                  step="10"
                  value={radius}
                  onChange={(e) => setRadius(parseInt(e.target.value))}
                  className="w-full accent-indigo-500"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>10m</span>
                  <span>500m</span>
                  <span>1000m</span>
                </div>
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}
              {success && <p className="text-green-400 text-sm">{success}</p>}

              <button
                type="submit"
                disabled={saving}
                className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl text-lg font-bold hover:opacity-90 transition disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Location'}
              </button>
            </form>
          </div>

          {/* Map Preview */}
          {lat && lng && (
            <div className="bg-white/5 backdrop-blur rounded-xl p-4">
              <h3 className="text-sm text-gray-400 mb-2">Location Preview</h3>
              <iframe
                src={`https://maps.google.com/maps?q=${lat},${lng}&z=17&output=embed`}
                width="100%"
                height="250"
                style={{ border: 0, borderRadius: '8px' }}
                allowFullScreen
                loading="lazy"
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
