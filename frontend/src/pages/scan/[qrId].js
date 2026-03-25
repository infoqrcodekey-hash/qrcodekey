// ============================================
// pages/scan/[qrId].js - QR Code Scan Page
// ============================================
// IMPORTANT: "TURANT SCAN" approach
// Page load → IMMEDIATELY send scan to backend (IP capture)
// GPS ka wait NAHI karte — pehle IP se log hota hai
// GPS milti hai → UPDATE bhejte hain better location ke saath

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useLanguage } from '../../context/LanguageContext';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import PasswordInput from '../../components/PasswordInput';

export default function ScanPage() {
  const router = useRouter();
  const { qrId } = router.query;
  const { t } = useLanguage();

  const [phase, setPhase] = useState('loading');
  const [qrInfo, setQrInfo] = useState(null);
  const [locationStatus, setLocationStatus] = useState('pending');
  const [gpsCoords, setGpsCoords] = useState(null);
  const [gpsAddress, setGpsAddress] = useState(null);
  const [showGPSPrompt, setShowGPSPrompt] = useState(false);
  const [scanSent, setScanSent] = useState(false);
  const scanSentRef = useRef(false);

  // Activation form state
  const [form, setForm] = useState({
    registeredName: '',
    registeredPhone: '',
    registeredAddress: '',
    category: 'other',
    message: '',
    qrPassword: '',
    confirmPassword: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Finder registration form state (for active QR scans)
  const [finderForm, setFinderForm] = useState({
    finderName: '',
    finderPhone: '',
    finderEmail: '',
    finderMessage: '',
  });
  const [finderSubmitting, setFinderSubmitting] = useState(false);
  const [finderSubmitted, setFinderSubmitted] = useState(false);
  const [finderError, setFinderError] = useState('');
  const [finderSuccess, setFinderSuccess] = useState('');

  const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    if (!qrId) return;
    Promise.allSettled([
      fireTurantScan(),
      fetchQRInfo(),
    ]);
  }, [qrId]);

  const fireTurantScan = async () => {
    if (scanSentRef.current) return;
    scanSentRef.current = true;
    setScanSent(true);
    setLocationStatus('ip-sent');

    try {
      const res = await fetch(`${API}/track/scan/${qrId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();

      if (data.success) {
        setQrInfo(prev => ({ ...prev, ...data.data }));
        // Set phase from scan response — don't wait for fetchQRInfo
        // Backend returns isActive:false + needsActivation:true for inactive QRs
        // For active QRs, backend doesn't send isActive but sends scanCount, category etc.
        if (data.data?.needsActivation || data.data?.isActive === false) {
          setPhase('inactive');
        } else {
          // Scan was successful = QR is active
          setPhase('active');
        }
        tryGPSUpdate();
      }
    } catch (err) {
      console.error('Turant scan failed:', err);
    }
  };

    // --- GPS Reverse Geocode: coordinates se full address ---
  const reverseGeocode = async (lat, lng) => {
    try {
      const res = await fetch(
        'https://nominatim.openstreetmap.org/reverse?format=json&lat=' + lat + '&lon=' + lng + '&zoom=19&addressdetails=1',
        { headers: { 'User-Agent': 'QRCodeKey/2.0' } }
      );
      const data = await res.json();
      const a = data.address || {};
      return {
        full_address: data.display_name || '',
        street: [a.house_number, a.road].filter(Boolean).join(' '),
        area: a.neighbourhood || a.suburb || '',
        city: a.city || a.town || a.village || '',
        district: a.county || '',
        state: a.state || '',
        country: a.country || '',
        country_code: (a.country_code || '').toUpperCase(),
        postal_code: a.postcode || ''
      };
    } catch (e) {
      return { full_address: lat + ', ' + lng };
    }
  };

  const sendGPSToServer = async (pos) => {
    setLocationStatus('gps-done');
    setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
    try {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const accuracy = pos.coords.accuracy;
      // Get full address from GPS coordinates
      const address = await reverseGeocode(lat, lng);
      setGpsAddress(address);
      await fetch(`${API}/track/scan/${qrId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: lat,
          longitude: lng,
          accuracy: accuracy,
          locationSource: 'gps',
          street: address.street,
          area: address.area,
          city: address.city,
          state: address.state,
          country: address.country,
          countryCode: address.country_code,
          postalCode: address.postal_code,
          fullAddress: address.full_address,
        }),
      });
    } catch (err) {
      console.error('GPS update failed:', err);
    }
  };

  const tryGPSUpdate = async () => {
    if (!navigator.geolocation) {
      setLocationStatus('gps-denied');
      return;
    }
    // Check if location permission is blocked
    try {
      if (navigator.permissions) {
        const perm = await navigator.permissions.query({ name: 'geolocation' });
        if (perm.state === 'prompt') {
          setShowGPSPrompt(true);
          return;
        }
        if (perm.state === 'denied') {
          setLocationStatus('gps-blocked');
          return;
        }
      }
    } catch (e) { /* not supported */ }

    requestGPSNow();
  };

  const requestGPSNow = () => {
    setShowGPSPrompt(false);
    setLocationStatus('gps-capturing');

    // Single quick GPS try — 8 seconds max, then show IP success
    navigator.geolocation.getCurrentPosition(
      (pos) => sendGPSToServer(pos),
      () => setLocationStatus('gps-denied'),
      { timeout: 15000, enableHighAccuracy: true, maximumAge: 0 }
    );
  };

  const fetchQRInfo = async () => {
    try {
      const res = await fetch(`${API}/track/scan-info/${qrId}`);
      const data = await res.json();

      if (!data.success) {
        setPhase('error');
        setError(data.message || 'QR Code not found');
        return;
      }

      setQrInfo(data.data);

      if (data.data.isActive) {
        setPhase('active');
      } else {
        setPhase('inactive');
      }
    } catch (err) {
      setPhase('error');
      setError(t('connectionError'));
    }
  };

  const validatePassword = (pwd) => {
    const requirements = {
      minLength: pwd.length >= 12,
      uppercase: /[A-Z]/.test(pwd),
      lowercase: /[a-z]/.test(pwd),
    };
    return Object.values(requirements).every(v => v === true);
  };

  const handleActivation = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.registeredName.trim()) return setError(t('nameRequired'));
    if (!form.registeredPhone.trim()) return setError(t('phoneRequired'));
    if (!form.qrPassword) return setError('Password is required');
    if (!validatePassword(form.qrPassword)) return setError('Password must have 12+ characters, 1 uppercase, and 1 lowercase letter');
    if (form.qrPassword !== form.confirmPassword) return setError(t('passwordMismatch'));

    setSubmitting(true);
    try {
      const res = await fetch(`${API}/track/activate-public/${qrId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registeredName: form.registeredName,
          registeredPhone: form.registeredPhone,
          registeredAddress: form.registeredAddress,
          category: form.category,
          message: form.message,
          qrPassword: form.qrPassword,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(t('activationSuccess'));
        setPhase('success');
      } else {
        setError(data.message || t('activationFailed'));
      }
    } catch (err) {
      setError(t('serverError'));
    } finally {
      setSubmitting(false);
    }
  };

  // ====== Finder Registration Submit ======
  const handleFinderSubmit = async (e) => {
    e.preventDefault();
    setFinderError('');

    if (!finderForm.finderName.trim()) return setFinderError('Please enter your name');
    if (!finderForm.finderPhone.trim()) return setFinderError('Please enter your phone number');

    setFinderSubmitting(true);
    try {
      const res = await fetch(`${API}/track/finder-info/${qrId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          finderName: finderForm.finderName,
          finderPhone: finderForm.finderPhone,
          finderEmail: finderForm.finderEmail,
          finderMessage: finderForm.finderMessage,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFinderSuccess(data.message || 'Your details have been sent to the owner!');
        setFinderSubmitted(true);
      } else {
        setFinderError(data.message || 'Failed to submit. Please try again.');
      }
    } catch (err) {
      setFinderError('Connection error. Please try again.');
    } finally {
      setFinderSubmitting(false);
    }
  };

  const categoryOptions = [
    { value: 'child', emoji: '👶', label: t('category_child') },
    { value: 'car', emoji: '🚗', label: t('category_vehicle') },
    { value: 'bag', emoji: '👜', label: t('category_luggage') },
    { value: 'pet', emoji: '🐕', label: t('category_pet') },
    { value: 'key', emoji: '🔑', label: t('category_key') },
    { value: 'luggage', emoji: '🧳', label: t('category_luggage') },
    { value: 'other', emoji: '📦', label: t('category_other') },
  ];

  return (
    <>
      <Head>
        <title>{t('scanTitle')} | QRCodeKey</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <div className="min-h-screen relative overflow-hidden">
        {/* Background effects */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-600/5 blur-[120px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-pink-600/5 blur-[120px]" />
        </div>

        <div className="relative flex flex-col items-center justify-center min-h-screen px-5 py-8">
          <div className="w-full max-w-md">

            {/* Language Switcher */}
            <div className="absolute top-5 right-5 z-50">
              <LanguageSwitcher />

      {showGPSPrompt && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-5">
          <div className="w-full max-w-sm rounded-3xl bg-gray-900/95 border border-indigo-500/20 p-8 text-center space-y-5">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-indigo-500/30 to-purple-500/20 flex items-center justify-center">
              <span className="text-4xl">{String.fromCodePoint(0x1F4CD)}</span>
            </div>
            <h3 className="text-lg font-black text-white">Enable Location</h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              To track this item accurately, we need your exact location. Your location is only shared with the item owner.
            </p>
            <button onClick={requestGPSNow} className="w-full py-4 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 shadow-lg shadow-green-500/25 transition-all">
              Allow Location Access
            </button>
            <button onClick={() => setShowGPSPrompt(false)} className="w-full py-3 rounded-xl text-xs text-gray-500 hover:text-gray-400 transition-colors">
              Skip (use approximate location)
            </button>
            <p className="text-[9px] text-gray-600">Secure | Private | One-time only</p>
          </div>
        </div>
      )}
            </div>

            {/* Logo + Brand */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-2xl shadow-indigo-500/30 transform hover:scale-105 transition-transform">
                <span className="text-3xl">📍</span>
              </div>
              {qrId && (
                <div className="font-mono text-xs text-indigo-300/80 bg-indigo-500/8 border border-indigo-500/15 rounded-xl px-4 py-2 inline-flex items-center gap-2 mb-2 backdrop-blur-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                  {qrId}
                </div>
              )}
              <h1 className="text-xl font-black bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                QRCodeKey
              </h1>
              <p className="text-[10px] text-gray-500 mt-1">{t('realtimeTracking')}</p>
            </div>

            {/* ─── LOADING ─── */}
            {phase === 'loading' && (
              <div className="glass-card rounded-3xl p-10 text-center border border-white/5">
                <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-indigo-500/10 flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-400 rounded-full animate-spin" />
                </div>
                <p className="text-sm text-gray-300 font-medium">{t('scanning')}</p>
                <p className="text-[10px] text-gray-600 mt-1">{t('pleaseWait')}</p>
                {scanSent && (
                  <div className="mt-4 inline-flex items-center gap-2 text-[11px] text-green-400 bg-green-500/8 border border-green-500/15 rounded-full px-4 py-2">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    {t('ipCaptured')}
                  </div>
                )}
              </div>
            )}

            {/* ─── ERROR ─── */}
            {phase === 'error' && (
              <div className="glass-card rounded-3xl p-10 text-center border border-red-500/10">
                <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-red-500/10 flex items-center justify-center">
                  <span className="text-3xl">❌</span>
                </div>
                <h2 className="font-bold text-lg text-gray-200 mb-2">{t('scanError')}</h2>
                <p className="text-sm text-gray-400">{error}</p>
                {scanSent && (
                  <div className="mt-5 p-4 rounded-2xl bg-green-500/5 border border-green-500/15">
                    <p className="text-xs text-green-400 font-semibold">✅ {t('ipCaptured')}</p>
                    <p className="text-[10px] text-gray-500 mt-1">{t('locationSavedAnyway')}</p>
                  </div>
                )}
              </div>
            )}

            {/* ─── ACTIVE QR (Scan Successful) ─── */}
            {phase === 'active' && (
              <div className="space-y-4">
                <div className="glass-card rounded-3xl p-8 text-center border border-green-500/10">
                  <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/10 flex items-center justify-center shadow-lg shadow-green-500/10">
                    <span className="text-4xl">✅</span>
                  </div>
                  <h2 className="font-black text-xl text-green-400 mb-1">{t('locationCaptured')}</h2>
                  <p className="text-xs text-gray-500">{t('ownerNotified')}</p>

                  {qrInfo?.registeredName && (
                    <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/8 border border-indigo-500/15">
                      <span className="text-sm">👤</span>
                      <span className="text-sm font-bold text-indigo-300">{qrInfo.registeredName}</span>
                    </div>
                  )}

                  {qrInfo?.message && (
                    <div className="mt-5 p-4 rounded-2xl bg-white/3 border border-white/5 text-left">
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">📝 {t('message')}</p>
                      <p className="text-sm text-gray-200 leading-relaxed">"{qrInfo.message}"</p>
                    </div>
                  )}
                </div>

                {/* Location Status Cards */}
                <div className="space-y-2">
                  <div className="glass-card rounded-2xl p-4 border border-green-500/10 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
                      <span className="text-lg">🌐</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-green-400 font-bold">{t('ipCaptured')} ✅</div>
                      <div className="text-[10px] text-gray-500">{t('approximateLocation')}</div>
                    </div>
                    <span className="w-2.5 h-2.5 rounded-full bg-green-400 shadow-lg shadow-green-400/50" />
                  </div>

                  <div className={`glass-card rounded-2xl p-4 border flex items-center gap-3 ${
                    locationStatus === 'gps-done' ? 'border-green-500/10'
                    : locationStatus === 'gps-capturing' ? 'border-indigo-500/10'
                    : locationStatus === 'gps-blocked' ? 'border-orange-500/20'
                    : 'border-green-500/10'
                  }`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      locationStatus === 'gps-done' ? 'bg-green-500/10' : locationStatus === 'gps-capturing' ? 'bg-indigo-500/10' : 'bg-green-500/10'
                    }`}>
                      <span className="text-lg">
                        {locationStatus === 'gps-done' ? '📡' : locationStatus === 'gps-capturing' ? '⏳' : '📡'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-xs font-bold ${
                        locationStatus === 'gps-done' ? 'text-green-400' : locationStatus === 'gps-capturing' ? 'text-indigo-400' : 'text-green-400'
                      }`}>
                        {locationStatus === 'gps-done' ? `${t('gpsCaptured')} ✅`
                          : locationStatus === 'gps-capturing' ? `${t('gpsAttempting')}...`
                          : 'Location captured via IP ✅'}
                      </div>
                      <div className="text-[10px] text-gray-500">
                        {locationStatus === 'gps-done' ? t('exactLocation')
                          : locationStatus === 'gps-blocked' ? (/iPhone|iPad|iPod/.test(navigator.userAgent || '') ? 'Location blocked! Settings → Safari → Location → Allow' : 'Location blocked! Tap lock icon → Site settings → Location → Allow')
                          : locationStatus === 'gps-denied' ? 'Approximate location saved'
                          : t('waitingForGPS')}
                      </div>
                    </div>
                    {(locationStatus === 'gps-denied' || locationStatus === 'gps-blocked') ? (
                      <button onClick={tryGPSUpdate} className="px-3 py-1.5 rounded-lg bg-indigo-500/15 border border-indigo-500/25 text-[10px] text-indigo-400 font-bold hover:bg-indigo-500/25 transition-all shrink-0">
                        📡 GPS
                      </button>
                    ) : (
                      <span className={`w-2.5 h-2.5 rounded-full shadow-lg ${
                        locationStatus === 'gps-done' ? 'bg-green-400 shadow-green-400/50'
                        : locationStatus === 'gps-capturing' ? 'bg-indigo-400 shadow-indigo-400/50 animate-pulse'
                        : 'bg-green-400 shadow-green-400/50'
                      }`} />
                    )}
                  </div>
                </div>

                {/* GPS ADDRESS + MAP + NAVIGATE */}
                {gpsCoords && gpsAddress && (
                  <div className="glass-card rounded-2xl border border-indigo-500/10 overflow-hidden">
                    <div className="w-full h-48 relative">
                      <iframe
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${gpsCoords.lng-0.003},${gpsCoords.lat-0.002},${gpsCoords.lng+0.003},${gpsCoords.lat+0.002}&layer=mapnik&marker=${gpsCoords.lat},${gpsCoords.lng}`}
                        className="w-full h-full border-0"
                        loading="lazy"
                      />
                    </div>
                    <div className="p-4 space-y-2">
                      <div className="flex items-start gap-2">
                        <span className="text-lg mt-0.5 shrink-0">📍</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-indigo-300 mb-1">Exact Location</p>
                          <p className="text-sm text-gray-200 leading-relaxed">{gpsAddress.full_address}</p>
                          {gpsAddress.street && <p className="text-[11px] text-gray-400 mt-1">Street: {gpsAddress.street}</p>}
                          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                            {gpsAddress.area && <span className="text-[10px] text-gray-500">Area: {gpsAddress.area}</span>}
                            {gpsAddress.city && <span className="text-[10px] text-gray-500">City: {gpsAddress.city}</span>}
                            {gpsAddress.state && <span className="text-[10px] text-gray-500">State: {gpsAddress.state}</span>}
                            {gpsAddress.country && <span className="text-[10px] text-gray-500">Country: {gpsAddress.country}</span>}
                            {gpsAddress.postal_code && <span className="text-[10px] text-gray-500">PIN: {gpsAddress.postal_code}</span>}
                          </div>
                          <p className="text-[9px] text-gray-600 mt-1">Accuracy: {Math.round(gpsCoords.accuracy)}m</p>
                        </div>
                      </div>
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${gpsCoords.lat},${gpsCoords.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full mt-2 py-3 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 hover:shadow-lg hover:shadow-blue-500/20 transition-all flex items-center justify-center gap-2 block text-center no-underline"
                      >
                        🧭 Navigate to Location
                      </a>
                    </div>
                  </div>
                )}

                <div className="text-center pt-2">
                  <span className="text-[10px] text-gray-600">
                    {t('totalScans')}: <span className="text-indigo-400 font-bold">{qrInfo?.scanCount || 1}</span>
                  </span>
                </div>

                {/* ─── FINDER REGISTRATION FORM ─── */}
                {!finderSubmitted ? (
                  <div className="mt-6">
                    <div className="text-center mb-4">
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/8 border border-emerald-500/15 mb-2 backdrop-blur-sm">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-xs text-emerald-400 font-bold">Found this item? Help the owner!</span>
                      </div>
                      <p className="text-xs text-gray-500 max-w-xs mx-auto leading-relaxed">
                        Please fill your contact details so the owner can reach you
                      </p>
                    </div>

                    <form onSubmit={handleFinderSubmit} className="glass-card rounded-3xl border border-white/5 overflow-hidden">
                      <div className="px-6 py-4 bg-gradient-to-r from-emerald-500/8 to-green-500/8 border-b border-white/5">
                        <h3 className="font-bold text-sm text-gray-200 flex items-center gap-2">
                          <span className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center text-xs">📋</span>
                          Registration Form
                        </h3>
                      </div>

                      <div className="p-6 space-y-4">
                        {/* Finder Name */}
                        <div>
                          <label className="block text-xs font-semibold text-gray-400 mb-2">
                            Your Name <span className="text-pink-400">*</span>
                          </label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm">👤</span>
                            <input type="text" className="input-field pl-10" placeholder="Enter your full name"
                              value={finderForm.finderName} onChange={e => setFinderForm(p => ({ ...p, finderName: e.target.value }))} required />
                          </div>
                        </div>

                        {/* Finder Phone */}
                        <div>
                          <label className="block text-xs font-semibold text-gray-400 mb-2">
                            Your Phone <span className="text-pink-400">*</span>
                          </label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm">📱</span>
                            <input type="tel" className="input-field pl-10" placeholder="+91 98765 43210"
                              value={finderForm.finderPhone} onChange={e => setFinderForm(p => ({ ...p, finderPhone: e.target.value }))} required />
                          </div>
                        </div>

                        {/* Finder Email (Optional) */}
                        <div>
                          <label className="block text-xs font-semibold text-gray-400 mb-2">
                            Your Email <span className="text-gray-600 font-normal">(optional)</span>
                          </label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm">📧</span>
                            <input type="email" className="input-field pl-10" placeholder="your@email.com"
                              value={finderForm.finderEmail} onChange={e => setFinderForm(p => ({ ...p, finderEmail: e.target.value }))} />
                          </div>
                        </div>

                        {/* Finder Message (Optional) */}
                        <div>
                          <label className="block text-xs font-semibold text-gray-400 mb-2">
                            Message <span className="text-gray-600 font-normal">(optional)</span>
                          </label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-3 text-gray-500 text-sm">💬</span>
                            <textarea className="input-field pl-10 resize-none" rows={2} placeholder="Where did you find this? Any message for the owner..."
                              value={finderForm.finderMessage} onChange={e => setFinderForm(p => ({ ...p, finderMessage: e.target.value }))} maxLength={500} />
                          </div>
                          <div className="text-right text-[9px] text-gray-600 mt-1">{finderForm.finderMessage.length}/500</div>
                        </div>

                        {/* Error */}
                        {finderError && (
                          <div className="p-4 rounded-2xl bg-red-500/8 border border-red-500/15 flex items-center gap-3">
                            <span className="text-lg shrink-0">❌</span>
                            <p className="text-xs text-red-400 font-medium">{finderError}</p>
                          </div>
                        )}

                        {/* Submit Button */}
                        <button type="submit" disabled={finderSubmitting}
                          className="w-full py-4 rounded-2xl font-bold text-sm text-white transition-all duration-300
                            bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500
                            hover:from-emerald-400 hover:via-green-400 hover:to-teal-400
                            hover:shadow-xl hover:shadow-emerald-500/20 hover:scale-[1.01]
                            active:scale-[0.99]
                            disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                            flex items-center justify-center gap-2">
                          {finderSubmitting ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              Sending...
                            </>
                          ) : (
                            <>📤 Send My Details to Owner</>
                          )}
                        </button>
                      </div>
                    </form>

                    <p className="text-center text-[10px] text-gray-600 mt-4 max-w-xs mx-auto leading-relaxed">
                      🔒 Your information will only be shared with the item owner
                    </p>
                  </div>
                ) : (
                  /* Finder Submitted Success */
                  <div className="mt-6 glass-card rounded-3xl p-8 text-center border border-emerald-500/10">
                    <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-gradient-to-br from-emerald-500/20 to-green-500/10 flex items-center justify-center shadow-lg shadow-emerald-500/10">
                      <span className="text-4xl">🎉</span>
                    </div>
                    <h3 className="font-black text-lg text-emerald-400 mb-2">Thank You!</h3>
                    <p className="text-sm text-gray-400 mb-4">{finderSuccess}</p>
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/8 border border-emerald-500/15">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span className="text-xs text-emerald-400 font-bold">Owner has been notified</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ─── SUCCESS (After Activation) ─── */}
            {phase === 'success' && (
              <div className="glass-card rounded-3xl p-10 text-center border border-green-500/10">
                <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-500/20 via-emerald-500/10 to-indigo-500/10 flex items-center justify-center shadow-xl shadow-green-500/10">
                  <span className="text-5xl">🎉</span>
                </div>
                <h2 className="text-2xl font-black bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent mb-2">
                  {t('scanSuccess')}
                </h2>
                <p className="text-sm text-gray-400 mb-6">{success}</p>

                <div className="space-y-3 text-left p-5 rounded-2xl bg-white/3 border border-white/5">
                  <div className="flex items-center gap-3 text-xs text-gray-300">
                    <span className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">✅</span>
                    <span>{t('qrActivated')}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-300">
                    <span className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">🔐</span>
                    <span>{t('passwordSet')}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-300">
                    <span className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">📱</span>
                    <span>{t('trackingActive')}</span>
                  </div>
                </div>
              </div>
            )}

            {/* ─── INACTIVE QR → PREMIUM ACTIVATION FORM ─── */}
            {phase === 'inactive' && (
              <div>
                {/* Status badge */}
                <div className="text-center mb-6">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/8 border border-amber-500/15 mb-3 backdrop-blur-sm">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    <span className="text-xs text-amber-400 font-bold">{t('activateTitle')}</span>
                  </div>
                  <p className="text-xs text-gray-500 max-w-xs mx-auto leading-relaxed">
                    {t('activateDesc')}
                  </p>
                </div>

                {/* Premium Form Card */}
                <form onSubmit={handleActivation} className="glass-card rounded-3xl border border-white/5 overflow-hidden">
                  {/* Form Header */}
                  <div className="px-6 py-4 bg-gradient-to-r from-indigo-500/8 to-purple-500/8 border-b border-white/5">
                    <h3 className="font-bold text-sm text-gray-200 flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-indigo-500/15 flex items-center justify-center text-xs">📝</span>
                      {t('activationForm')}
                    </h3>
                  </div>

                  <div className="p-6 space-y-5">
                    {/* Full Name */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-2">
                        {t('fullName')} <span className="text-pink-400">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm">👤</span>
                        <input type="text" className="input-field pl-10" placeholder={t('enterFullName')}
                          value={form.registeredName} onChange={e => setForm(p => ({ ...p, registeredName: e.target.value }))} required />
                      </div>
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-2">
                        {t('phone')} <span className="text-pink-400">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm">📱</span>
                        <input type="tel" className="input-field pl-10" placeholder="+91 98765 43210"
                          value={form.registeredPhone} onChange={e => setForm(p => ({ ...p, registeredPhone: e.target.value }))} required />
                      </div>
                    </div>

                    {/* Address */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-2">
                        Address <span className="text-gray-600 font-normal">(optional)</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-3 text-gray-500 text-sm">🏠</span>
                        <textarea className="input-field pl-10 resize-none" rows={2} placeholder="Enter your home/office address (for directions on map)"
                          value={form.registeredAddress} onChange={e => setForm(p => ({ ...p, registeredAddress: e.target.value }))} maxLength={500} />
                      </div>
                      <p className="text-[10px] text-gray-600 mt-1 flex items-center gap-1">
                        <span>📍</span> Used to show directions from your address to scan location
                      </p>
                    </div>

                    {/* Category */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-2">{t('category')}</label>
                      <div className="grid grid-cols-4 gap-2">
                        {categoryOptions.map((opt) => (
                          <button key={opt.value} type="button"
                            onClick={() => setForm(p => ({ ...p, category: opt.value }))}
                            className={`flex flex-col items-center gap-1 p-3 rounded-2xl border transition-all duration-200 ${
                              form.category === opt.value
                                ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300 shadow-lg shadow-indigo-500/10 scale-[1.02]'
                                : 'bg-white/2 border-white/5 text-gray-500 hover:border-white/15 hover:bg-white/5'
                            }`}>
                            <span className="text-xl">{opt.emoji}</span>
                            <span className="text-[9px] font-bold leading-tight">{opt.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Message */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-2">
                        {t('message')} <span className="text-gray-600 font-normal">({t('optional')})</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-3 text-gray-500 text-sm">💬</span>
                        <textarea className="input-field pl-10 resize-none" rows={2} placeholder={t('messageForFinder')}
                          value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} maxLength={200} />
                      </div>
                      <div className="text-right text-[9px] text-gray-600 mt-1">{form.message.length}/200</div>
                    </div>

                    {/* Divider */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                      <span className="text-[10px] text-gray-600 font-semibold">🔐 {t('security')}</span>
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                    </div>

                    {/* Password */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-2">
                        {t('password')} <span className="text-pink-400">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute left-3.5 top-3 text-gray-500 text-sm pointer-events-none">🔒</div>
                        <div className="pl-10">
                          <PasswordInput
                            value={form.qrPassword}
                            onChange={(val) => setForm(p => ({ ...p, qrPassword: val }))}
                            placeholder={t('setTrackingPassword')}
                            showStrength={true}
                            showRequirements={true}
                          />
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-600 mt-1.5 flex items-center gap-1">
                        <span>💡</span> {t('passwordReminder')}
                      </p>
                    </div>

                    {/* Confirm Password */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-2">
                        {t('confirmPassword')} <span className="text-pink-400">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm">🔒</span>
                        <input type="password" className="input-field pl-10" placeholder={t('reenterPassword')}
                          value={form.confirmPassword} onChange={e => setForm(p => ({ ...p, confirmPassword: e.target.value }))} required />
                      </div>
                    </div>

                    {/* Error */}
                    {error && (
                      <div className="p-4 rounded-2xl bg-red-500/8 border border-red-500/15 flex items-center gap-3">
                        <span className="text-lg shrink-0">❌</span>
                        <p className="text-xs text-red-400 font-medium">{error}</p>
                      </div>
                    )}

                    {/* Submit Button */}
                    <button type="submit" disabled={submitting}
                      className="w-full py-4 rounded-2xl font-bold text-sm text-white transition-all duration-300
                        bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500
                        hover:from-indigo-400 hover:via-purple-400 hover:to-pink-400
                        hover:shadow-xl hover:shadow-indigo-500/20 hover:scale-[1.01]
                        active:scale-[0.99]
                        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                        flex items-center justify-center gap-2">
                      {submitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          {t('activating')}...
                        </>
                      ) : (
                        <>🚀 {t('activateBtn')}</>
                      )}
                    </button>
                  </div>
                </form>

                {/* Footer note */}
                <p className="text-center text-[10px] text-gray-600 mt-5 max-w-xs mx-auto leading-relaxed">
                  🔒 {t('dataSecure')}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
    }// ============================================
// pages/scan/[qrId].js - QR Code Scan Page
// ============================================
// IMPORTANT: "TURANT SCAN" approach
// Page load → IMMEDIATELY send scan to backend (IP capture)
// GPS ka wait NAHI karte — pehle IP se log hota hai
// GPS milti hai → UPDATE bhejte hain better location ke saath

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useLanguage } from '../../context/LanguageContext';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import PasswordInput from '../../components/PasswordInput';

export default function ScanPage() {
  const router = useRouter();
  const { qrId } = router.query;
  const { t } = useLanguage();

  const [phase, setPhase] = useState('loading');
  const [qrInfo, setQrInfo] = useState(null);
  const [locationStatus, setLocationStatus] = useState('pending');
  const [gpsCoords, setGpsCoords] = useState(null);
  const [gpsAddress, setGpsAddress] = useState(null);
  const [showGPSPrompt, setShowGPSPrompt] = useState(false);
  const [scanSent, setScanSent] = useState(false);
  const scanSentRef = useRef(false);

  // Activation form state
  const [form, setForm] = useState({
    registeredName: '',
    registeredPhone: '',
    registeredAddress: '',
    category: 'other',
    message: '',
    qrPassword: '',
    confirmPassword: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Finder registration form state (for active QR scans)
  const [finderForm, setFinderForm] = useState({
    finderName: '',
    finderPhone: '',
    finderEmail: '',
    finderMessage: '',
  });
  const [finderSubmitting, setFinderSubmitting] = useState(false);
  const [finderSubmitted, setFinderSubmitted] = useState(false);
  const [finderError, setFinderError] = useState('');
  const [finderSuccess, setFinderSuccess] = useState('');

  const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    if (!qrId) return;
    Promise.allSettled([
      fireTurantScan(),
      fetchQRInfo(),
    ]);
  }, [qrId]);

  const fireTurantScan = async () => {
    if (scanSentRef.current) return;
    scanSentRef.current = true;
    setScanSent(true);
    setLocationStatus('ip-sent');

    try {
      const res = await fetch(`${API}/track/scan/${qrId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();

      if (data.success) {
        setQrInfo(prev => ({ ...prev, ...data.data }));
        // Set phase from scan response — don't wait for fetchQRInfo
        // Backend returns isActive:false + needsActivation:true for inactive QRs
        // For active QRs, backend doesn't send isActive but sends scanCount, category etc.
        if (data.data?.needsActivation || data.data?.isActive === false) {
          setPhase('inactive');
        } else {
          // Scan was successful = QR is active
          setPhase('active');
        }
        tryGPSUpdate();
      }
    } catch (err) {
      console.error('Turant scan failed:', err);
    }
  };

    // --- GPS Reverse Geocode: coordinates se full address ---
  const reverseGeocode = async (lat, lng) => {
    try {
      const res = await fetch(
        'https://nominatim.openstreetmap.org/reverse?format=json&lat=' + lat + '&lon=' + lng + '&zoom=19&addressdetails=1',
        { headers: { 'User-Agent': 'QRCodeKey/2.0' } }
      );
      const data = await res.json();
      const a = data.address || {};
      return {
        full_address: data.display_name || '',
        street: [a.house_number, a.road].filter(Boolean).join(' '),
        area: a.neighbourhood || a.suburb || '',
        city: a.city || a.town || a.village || '',
        district: a.county || '',
        state: a.state || '',
        country: a.country || '',
        country_code: (a.country_code || '').toUpperCase(),
        postal_code: a.postcode || ''
      };
    } catch (e) {
      return { full_address: lat + ', ' + lng };
    }
  };

  const sendGPSToServer = async (pos) => {
    setLocationStatus('gps-done');
    setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
    try {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const accuracy = pos.coords.accuracy;
      // Get full address from GPS coordinates
      const address = await reverseGeocode(lat, lng);
      setGpsAddress(address);
      await fetch(`${API}/track/scan/${qrId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: lat,
          longitude: lng,
          accuracy: accuracy,
          locationSource: 'gps',
          street: address.street,
          area: address.area,
          city: address.city,
          state: address.state,
          country: address.country,
          countryCode: address.country_code,
          postalCode: address.postal_code,
          fullAddress: address.full_address,
        }),
      });
    } catch (err) {
      console.error('GPS update failed:', err);
    }
  };

  const tryGPSUpdate = async () => {
    if (!navigator.geolocation) {
      setLocationStatus('gps-denied');
      return;
    }
    // Check if location permission is blocked
    try {
      if (navigator.permissions) {
        const perm = await navigator.permissions.query({ name: 'geolocation' });
        if (perm.state === 'prompt') {
          setShowGPSPrompt(true);
          return;
        }
        if (perm.state === 'denied') {
          setLocationStatus('gps-blocked');
          return;
        }
      }
    } catch (e) { /* not supported */ }

    requestGPSNow();
  };

  const requestGPSNow = () => {
    setShowGPSPrompt(false);
    setLocationStatus('gps-capturing');

    // Single quick GPS try — 8 seconds max, then show IP success
    navigator.geolocation.getCurrentPosition(
      (pos) => sendGPSToServer(pos),
      () => setLocationStatus('gps-denied'),
      { timeout: 15000, enableHighAccuracy: true, maximumAge: 0 }
    );
  };

  const fetchQRInfo = async () => {
    try {
      const res = await fetch(`${API}/track/scan-info/${qrId}`);
      const data = await res.json();

      if (!data.success) {
        setPhase('error');
        setError(data.message || 'QR Code not found');
        return;
      }

      setQrInfo(data.data);

      if (data.data.isActive) {
        setPhase('active');
      } else {
        setPhase('inactive');
      }
    } catch (err) {
      setPhase('error');
      setError(t('connectionError'));
    }
  };

  const validatePassword = (pwd) => {
    const requirements = {
      minLength: pwd.length >= 12,
      uppercase: /[A-Z]/.test(pwd),
      lowercase: /[a-z]/.test(pwd),
    };
    return Object.values(requirements).every(v => v === true);
  };

  const handleActivation = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.registeredName.trim()) return setError(t('nameRequired'));
    if (!form.registeredPhone.trim()) return setError(t('phoneRequired'));
    if (!form.qrPassword) return setError('Password is required');
    if (!validatePassword(form.qrPassword)) return setError('Password must have 12+ characters, 1 uppercase, and 1 lowercase letter');
    if (form.qrPassword !== form.confirmPassword) return setError(t('passwordMismatch'));

    setSubmitting(true);
    try {
      const res = await fetch(`${API}/track/activate-public/${qrId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registeredName: form.registeredName,
          registeredPhone: form.registeredPhone,
          registeredAddress: form.registeredAddress,
          category: form.category,
          message: form.message,
          qrPassword: form.qrPassword,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(t('activationSuccess'));
        setPhase('success');
      } else {
        setError(data.message || t('activationFailed'));
      }
    } catch (err) {
      setError(t('serverError'));
    } finally {
      setSubmitting(false);
    }
  };

  // ====== Finder Registration Submit ======
  const handleFinderSubmit = async (e) => {
    e.preventDefault();
    setFinderError('');

    if (!finderForm.finderName.trim()) return setFinderError('Please enter your name');
    if (!finderForm.finderPhone.trim()) return setFinderError('Please enter your phone number');

    setFinderSubmitting(true);
    try {
      const res = await fetch(`${API}/track/finder-info/${qrId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          finderName: finderForm.finderName,
          finderPhone: finderForm.finderPhone,
          finderEmail: finderForm.finderEmail,
          finderMessage: finderForm.finderMessage,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFinderSuccess(data.message || 'Your details have been sent to the owner!');
        setFinderSubmitted(true);
      } else {
        setFinderError(data.message || 'Failed to submit. Please try again.');
      }
    } catch (err) {
      setFinderError('Connection error. Please try again.');
    } finally {
      setFinderSubmitting(false);
    }
  };

  const categoryOptions = [
    { value: 'child', emoji: '👶', label: t('category_child') },
    { value: 'car', emoji: '🚗', label: t('category_vehicle') },
    { value: 'bag', emoji: '👜', label: t('category_luggage') },
    { value: 'pet', emoji: '🐕', label: t('category_pet') },
    { value: 'key', emoji: '🔑', label: t('category_key') },
    { value: 'luggage', emoji: '🧳', label: t('category_luggage') },
    { value: 'other', emoji: '📦', label: t('category_other') },
  ];

  return (
    <>
      <Head>
        <title>{t('scanTitle')} | QRCodeKey</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <div className="min-h-screen relative overflow-hidden">
        {/* Background effects */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-600/5 blur-[120px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-pink-600/5 blur-[120px]" />
        </div>

        <div className="relative flex flex-col items-center justify-center min-h-screen px-5 py-8">
          <div className="w-full max-w-md">

            {/* Language Switcher */}
            <div className="absolute top-5 right-5 z-50">
              <LanguageSwitcher />

      {showGPSPrompt && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-5">
          <div className="w-full max-w-sm rounded-3xl bg-gray-900/95 border border-indigo-500/20 p-8 text-center space-y-5">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-indigo-500/30 to-purple-500/20 flex items-center justify-center">
              <span className="text-4xl">{String.fromCodePoint(0x1F4CD)}</span>
            </div>
            <h3 className="text-lg font-black text-white">Enable Location</h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              To track this item accurately, we need your exact location. Your location is only shared with the item owner.
            </p>
            <button onClick={requestGPSNow} className="w-full py-4 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 shadow-lg shadow-green-500/25 transition-all">
              Allow Location Access
            </button>
            <button onClick={() => setShowGPSPrompt(false)} className="w-full py-3 rounded-xl text-xs text-gray-500 hover:text-gray-400 transition-colors">
              Skip (use approximate location)
            </button>
            <p className="text-[9px] text-gray-600">Secure | Private | One-time only</p>
          </div>
        </div>
      )}
            </div>

            {/* Logo + Brand */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-2xl shadow-indigo-500/30 transform hover:scale-105 transition-transform">
                <span className="text-3xl">📍</span>
              </div>
              {qrId && (
                <div className="font-mono text-xs text-indigo-300/80 bg-indigo-500/8 border border-indigo-500/15 rounded-xl px-4 py-2 inline-flex items-center gap-2 mb-2 backdrop-blur-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                  {qrId}
                </div>
              )}
              <h1 className="text-xl font-black bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                QRCodeKey
              </h1>
              <p className="text-[10px] text-gray-500 mt-1">{t('realtimeTracking')}</p>
            </div>

            {/* ─── LOADING ─── */}
            {phase === 'loading' && (
              <div className="glass-card rounded-3xl p-10 text-center border border-white/5">
                <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-indigo-500/10 flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-400 rounded-full animate-spin" />
                </div>
                <p className="text-sm text-gray-300 font-medium">{t('scanning')}</p>
                <p className="text-[10px] text-gray-600 mt-1">{t('pleaseWait')}</p>
                {scanSent && (
                  <div className="mt-4 inline-flex items-center gap-2 text-[11px] text-green-400 bg-green-500/8 border border-green-500/15 rounded-full px-4 py-2">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    {t('ipCaptured')}
                  </div>
                )}
              </div>
            )}

            {/* ─── ERROR ─── */}
            {phase === 'error' && (
              <div className="glass-card rounded-3xl p-10 text-center border border-red-500/10">
                <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-red-500/10 flex items-center justify-center">
                  <span className="text-3xl">❌</span>
                </div>
                <h2 className="font-bold text-lg text-gray-200 mb-2">{t('scanError')}</h2>
                <p className="text-sm text-gray-400">{error}</p>
                {scanSent && (
                  <div className="mt-5 p-4 rounded-2xl bg-green-500/5 border border-green-500/15">
                    <p className="text-xs text-green-400 font-semibold">✅ {t('ipCaptured')}</p>
                    <p className="text-[10px] text-gray-500 mt-1">{t('locationSavedAnyway')}</p>
                  </div>
                )}
              </div>
            )}

            {/* ─── ACTIVE QR (Scan Successful) ─── */}
            {phase === 'active' && (
              <div className="space-y-4">
                <div className="glass-card rounded-3xl p-8 text-center border border-green-500/10">
                  <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/10 flex items-center justify-center shadow-lg shadow-green-500/10">
                    <span className="text-4xl">✅</span>
                  </div>
                  <h2 className="font-black text-xl text-green-400 mb-1">{t('locationCaptured')}</h2>
                  <p className="text-xs text-gray-500">{t('ownerNotified')}</p>

                  {qrInfo?.registeredName && (
                    <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/8 border border-indigo-500/15">
                      <span className="text-sm">👤</span>
                      <span className="text-sm font-bold text-indigo-300">{qrInfo.registeredName}</span>
                    </div>
                  )}

                  {qrInfo?.message && (
                    <div className="mt-5 p-4 rounded-2xl bg-white/3 border border-white/5 text-left">
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">📝 {t('message')}</p>
                      <p className="text-sm text-gray-200 leading-relaxed">"{qrInfo.message}"</p>
                    </div>
                  )}
                </div>

                {/* Location Status Cards */}
                <div className="space-y-2">
                  <div className="glass-card rounded-2xl p-4 border border-green-500/10 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
                      <span className="text-lg">🌐</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-green-400 font-bold">{t('ipCaptured')} ✅</div>
                      <div className="text-[10px] text-gray-500">{t('approximateLocation')}</div>
                    </div>
                    <span className="w-2.5 h-2.5 rounded-full bg-green-400 shadow-lg shadow-green-400/50" />
                  </div>

                  <div className={`glass-card rounded-2xl p-4 border flex items-center gap-3 ${
                    locationStatus === 'gps-done' ? 'border-green-500/10'
                    : locationStatus === 'gps-capturing' ? 'border-indigo-500/10'
                    : locationStatus === 'gps-blocked' ? 'border-orange-500/20'
                    : 'border-green-500/10'
                  }`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      locationStatus === 'gps-done' ? 'bg-green-500/10' : locationStatus === 'gps-capturing' ? 'bg-indigo-500/10' : 'bg-green-500/10'
                    }`}>
                      <span className="text-lg">
                        {locationStatus === 'gps-done' ? '📡' : locationStatus === 'gps-capturing' ? '⏳' : '📡'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-xs font-bold ${
                        locationStatus === 'gps-done' ? 'text-green-400' : locationStatus === 'gps-capturing' ? 'text-indigo-400' : 'text-green-400'
                      }`}>
                        {locationStatus === 'gps-done' ? `${t('gpsCaptured')} ✅`
                          : locationStatus === 'gps-capturing' ? `${t('gpsAttempting')}...`
                          : 'Location captured via IP ✅'}
                      </div>
                      <div className="text-[10px] text-gray-500">
                        {locationStatus === 'gps-done' ? t('exactLocation')
                          : locationStatus === 'gps-blocked' ? (/iPhone|iPad|iPod/.test(navigator.userAgent || '') ? 'Location blocked! Settings → Safari → Location → Allow' : 'Location blocked! Tap lock icon → Site settings → Location → Allow')
                          : locationStatus === 'gps-denied' ? 'Approximate location saved'
                          : t('waitingForGPS')}
                      </div>
                    </div>
                    {(locationStatus === 'gps-denied' || locationStatus === 'gps-blocked') ? (
                      <button onClick={tryGPSUpdate} className="px-3 py-1.5 rounded-lg bg-indigo-500/15 border border-indigo-500/25 text-[10px] text-indigo-400 font-bold hover:bg-indigo-500/25 transition-all shrink-0">
                        📡 GPS
                      </button>
                    ) : (
                      <span className={`w-2.5 h-2.5 rounded-full shadow-lg ${
                        locationStatus === 'gps-done' ? 'bg-green-400 shadow-green-400/50'
                        : locationStatus === 'gps-capturing' ? 'bg-indigo-400 shadow-indigo-400/50 animate-pulse'
                        : 'bg-green-400 shadow-green-400/50'
                      }`} />
                    )}
                  </div>
                </div>

                {/* GPS ADDRESS + MAP + NAVIGATE */}
                {gpsCoords && gpsAddress && (
                  <div className="glass-card rounded-2xl border border-indigo-500/10 overflow-hidden">
                    <div className="w-full h-48 relative">
                      <iframe
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${gpsCoords.lng-0.003},${gpsCoords.lat-0.002},${gpsCoords.lng+0.003},${gpsCoords.lat+0.002}&layer=mapnik&marker=${gpsCoords.lat},${gpsCoords.lng}`}
                        className="w-full h-full border-0"
                        loading="lazy"
                      />
                    </div>
                    <div className="p-4 space-y-2">
                      <div className="flex items-start gap-2">
                        <span className="text-lg mt-0.5 shrink-0">📍</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-indigo-300 mb-1">Exact Location</p>
                          <p className="text-sm text-gray-200 leading-relaxed">{gpsAddress.full_address}</p>
                          {gpsAddress.street && <p className="text-[11px] text-gray-400 mt-1">Street: {gpsAddress.street}</p>}
                          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                            {gpsAddress.area && <span className="text-[10px] text-gray-500">Area: {gpsAddress.area}</span>}
                            {gpsAddress.city && <span className="text-[10px] text-gray-500">City: {gpsAddress.city}</span>}
                            {gpsAddress.state && <span className="text-[10px] text-gray-500">State: {gpsAddress.state}</span>}
                            {gpsAddress.country && <span className="text-[10px] text-gray-500">Country: {gpsAddress.country}</span>}
                            {gpsAddress.postal_code && <span className="text-[10px] text-gray-500">PIN: {gpsAddress.postal_code}</span>}
                          </div>
                          <p className="text-[9px] text-gray-600 mt-1">Accuracy: {Math.round(gpsCoords.accuracy)}m</p>
                        </div>
                      </div>
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${gpsCoords.lat},${gpsCoords.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full mt-2 py-3 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 hover:shadow-lg hover:shadow-blue-500/20 transition-all flex items-center justify-center gap-2 block text-center no-underline"
                      >
                        🧭 Navigate to Location
                      </a>
                    </div>
                  </div>
                )}

                <div className="text-center pt-2">
                  <span className="text-[10px] text-gray-600">
                    {t('totalScans')}: <span className="text-indigo-400 font-bold">{qrInfo?.scanCount || 1}</span>
                  </span>
                </div>

                {/* ─── FINDER REGISTRATION FORM ─── */}
                {!finderSubmitted ? (
                  <div className="mt-6">
                    <div className="text-center mb-4">
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/8 border border-emerald-500/15 mb-2 backdrop-blur-sm">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-xs text-emerald-400 font-bold">Found this item? Help the owner!</span>
                      </div>
                      <p className="text-xs text-gray-500 max-w-xs mx-auto leading-relaxed">
                        Please fill your contact details so the owner can reach you
                      </p>
                    </div>

                    <form onSubmit={handleFinderSubmit} className="glass-card rounded-3xl border border-white/5 overflow-hidden">
                      <div className="px-6 py-4 bg-gradient-to-r from-emerald-500/8 to-green-500/8 border-b border-white/5">
                        <h3 className="font-bold text-sm text-gray-200 flex items-center gap-2">
                          <span className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center text-xs">📋</span>
                          Registration Form
                        </h3>
                      </div>

                      <div className="p-6 space-y-4">
                        {/* Finder Name */}
                        <div>
                          <label className="block text-xs font-semibold text-gray-400 mb-2">
                            Your Name <span className="text-pink-400">*</span>
                          </label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm">👤</span>
                            <input type="text" className="input-field pl-10" placeholder="Enter your full name"
                              value={finderForm.finderName} onChange={e => setFinderForm(p => ({ ...p, finderName: e.target.value }))} required />
                          </div>
                        </div>

                        {/* Finder Phone */}
                        <div>
                          <label className="block text-xs font-semibold text-gray-400 mb-2">
                            Your Phone <span className="text-pink-400">*</span>
                          </label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm">📱</span>
                            <input type="tel" className="input-field pl-10" placeholder="+91 98765 43210"
                              value={finderForm.finderPhone} onChange={e => setFinderForm(p => ({ ...p, finderPhone: e.target.value }))} required />
                          </div>
                        </div>

                        {/* Finder Email (Optional) */}
                        <div>
                          <label className="block text-xs font-semibold text-gray-400 mb-2">
                            Your Email <span className="text-gray-600 font-normal">(optional)</span>
                          </label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm">📧</span>
                            <input type="email" className="input-field pl-10" placeholder="your@email.com"
                              value={finderForm.finderEmail} onChange={e => setFinderForm(p => ({ ...p, finderEmail: e.target.value }))} />
                          </div>
                        </div>

                        {/* Finder Message (Optional) */}
                        <div>
                          <label className="block text-xs font-semibold text-gray-400 mb-2">
                            Message <span className="text-gray-600 font-normal">(optional)</span>
                          </label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-3 text-gray-500 text-sm">💬</span>
                            <textarea className="input-field pl-10 resize-none" rows={2} placeholder="Where did you find this? Any message for the owner..."
                              value={finderForm.finderMessage} onChange={e => setFinderForm(p => ({ ...p, finderMessage: e.target.value }))} maxLength={500} />
                          </div>
                          <div className="text-right text-[9px] text-gray-600 mt-1">{finderForm.finderMessage.length}/500</div>
                        </div>

                        {/* Error */}
                        {finderError && (
                          <div className="p-4 rounded-2xl bg-red-500/8 border border-red-500/15 flex items-center gap-3">
                            <span className="text-lg shrink-0">❌</span>
                            <p className="text-xs text-red-400 font-medium">{finderError}</p>
                          </div>
                        )}

                        {/* Submit Button */}
                        <button type="submit" disabled={finderSubmitting}
                          className="w-full py-4 rounded-2xl font-bold text-sm text-white transition-all duration-300
                            bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500
                            hover:from-emerald-400 hover:via-green-400 hover:to-teal-400
                            hover:shadow-xl hover:shadow-emerald-500/20 hover:scale-[1.01]
                            active:scale-[0.99]
                            disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                            flex items-center justify-center gap-2">
                          {finderSubmitting ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              Sending...
                            </>
                          ) : (
                            <>📤 Send My Details to Owner</>
                          )}
                        </button>
                      </div>
                    </form>

                    <p className="text-center text-[10px] text-gray-600 mt-4 max-w-xs mx-auto leading-relaxed">
                      🔒 Your information will only be shared with the item owner
                    </p>
                  </div>
                ) : (
                  /* Finder Submitted Success */
                  <div className="mt-6 glass-card rounded-3xl p-8 text-center border border-emerald-500/10">
                    <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-gradient-to-br from-emerald-500/20 to-green-500/10 flex items-center justify-center shadow-lg shadow-emerald-500/10">
                      <span className="text-4xl">🎉</span>
                    </div>
                    <h3 className="font-black text-lg text-emerald-400 mb-2">Thank You!</h3>
                    <p className="text-sm text-gray-400 mb-4">{finderSuccess}</p>
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/8 border border-emerald-500/15">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span className="text-xs text-emerald-400 font-bold">Owner has been notified</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ─── SUCCESS (After Activation) ─── */}
            {phase === 'success' && (
              <div className="glass-card rounded-3xl p-10 text-center border border-green-500/10">
                <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-500/20 via-emerald-500/10 to-indigo-500/10 flex items-center justify-center shadow-xl shadow-green-500/10">
                  <span className="text-5xl">🎉</span>
                </div>
                <h2 className="text-2xl font-black bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent mb-2">
                  {t('scanSuccess')}
                </h2>
                <p className="text-sm text-gray-400 mb-6">{success}</p>

                <div className="space-y-3 text-left p-5 rounded-2xl bg-white/3 border border-white/5">
                  <div className="flex items-center gap-3 text-xs text-gray-300">
                    <span className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">✅</span>
                    <span>{t('qrActivated')}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-300">
                    <span className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">🔐</span>
                    <span>{t('passwordSet')}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-300">
                    <span className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">📱</span>
                    <span>{t('trackingActive')}</span>
                  </div>
                </div>
              </div>
            )}

            {/* ─── INACTIVE QR → PREMIUM ACTIVATION FORM ─── */}
            {phase === 'inactive' && (
              <div>
                {/* Status badge */}
                <div className="text-center mb-6">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/8 border border-amber-500/15 mb-3 backdrop-blur-sm">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    <span className="text-xs text-amber-400 font-bold">{t('activateTitle')}</span>
                  </div>
                  <p className="text-xs text-gray-500 max-w-xs mx-auto leading-relaxed">
                    {t('activateDesc')}
                  </p>
                </div>

                {/* Premium Form Card */}
                <form onSubmit={handleActivation} className="glass-card rounded-3xl border border-white/5 overflow-hidden">
                  {/* Form Header */}
                  <div className="px-6 py-4 bg-gradient-to-r from-indigo-500/8 to-purple-500/8 border-b border-white/5">
                    <h3 className="font-bold text-sm text-gray-200 flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-indigo-500/15 flex items-center justify-center text-xs">📝</span>
                      {t('activationForm')}
                    </h3>
                  </div>

                  <div className="p-6 space-y-5">
                    {/* Full Name */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-2">
                        {t('fullName')} <span className="text-pink-400">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm">👤</span>
                        <input type="text" className="input-field pl-10" placeholder={t('enterFullName')}
                          value={form.registeredName} onChange={e => setForm(p => ({ ...p, registeredName: e.target.value }))} required />
                      </div>
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-2">
                        {t('phone')} <span className="text-pink-400">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm">📱</span>
                        <input type="tel" className="input-field pl-10" placeholder="+91 98765 43210"
                          value={form.registeredPhone} onChange={e => setForm(p => ({ ...p, registeredPhone: e.target.value }))} required />
                      </div>
                    </div>

                    {/* Address */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-2">
                        Address <span className="text-gray-600 font-normal">(optional)</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-3 text-gray-500 text-sm">🏠</span>
                        <textarea className="input-field pl-10 resize-none" rows={2} placeholder="Enter your home/office address (for directions on map)"
                          value={form.registeredAddress} onChange={e => setForm(p => ({ ...p, registeredAddress: e.target.value }))} maxLength={500} />
                      </div>
                      <p className="text-[10px] text-gray-600 mt-1 flex items-center gap-1">
                        <span>📍</span> Used to show directions from your address to scan location
                      </p>
                    </div>

                    {/* Category */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-2">{t('category')}</label>
                      <div className="grid grid-cols-4 gap-2">
                        {categoryOptions.map((opt) => (
                          <button key={opt.value} type="button"
                            onClick={() => setForm(p => ({ ...p, category: opt.value }))}
                            className={`flex flex-col items-center gap-1 p-3 rounded-2xl border transition-all duration-200 ${
                              form.category === opt.value
                                ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300 shadow-lg shadow-indigo-500/10 scale-[1.02]'
                                : 'bg-white/2 border-white/5 text-gray-500 hover:border-white/15 hover:bg-white/5'
                            }`}>
                            <span className="text-xl">{opt.emoji}</span>
                            <span className="text-[9px] font-bold leading-tight">{opt.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Message */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-2">
                        {t('message')} <span className="text-gray-600 font-normal">({t('optional')})</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-3 text-gray-500 text-sm">💬</span>
                        <textarea className="input-field pl-10 resize-none" rows={2} placeholder={t('messageForFinder')}
                          value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} maxLength={200} />
                      </div>
                      <div className="text-right text-[9px] text-gray-600 mt-1">{form.message.length}/200</div>
                    </div>

                    {/* Divider */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                      <span className="text-[10px] text-gray-600 font-semibold">🔐 {t('security')}</span>
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                    </div>

                    {/* Password */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-2">
                        {t('password')} <span className="text-pink-400">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute left-3.5 top-3 text-gray-500 text-sm pointer-events-none">🔒</div>
                        <div className="pl-10">
                          <PasswordInput
                            value={form.qrPassword}
                            onChange={(val) => setForm(p => ({ ...p, qrPassword: val }))}
                            placeholder={t('setTrackingPassword')}
                            showStrength={true}
                            showRequirements={true}
                          />
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-600 mt-1.5 flex items-center gap-1">
                        <span>💡</span> {t('passwordReminder')}
                      </p>
                    </div>

                    {/* Confirm Password */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-2">
                        {t('confirmPassword')} <span className="text-pink-400">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm">🔒</span>
                        <input type="password" className="input-field pl-10" placeholder={t('reenterPassword')}
                          value={form.confirmPassword} onChange={e => setForm(p => ({ ...p, confirmPassword: e.target.value }))} required />
                      </div>
                    </div>

                    {/* Error */}
                    {error && (
                      <div className="p-4 rounded-2xl bg-red-500/8 border border-red-500/15 flex items-center gap-3">
                        <span className="text-lg shrink-0">❌</span>
                        <p className="text-xs text-red-400 font-medium">{error}</p>
                      </div>
                    )}

                    {/* Submit Button */}
                    <button type="submit" disabled={submitting}
                      className="w-full py-4 rounded-2xl font-bold text-sm text-white transition-all duration-300
                        bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500
                        hover:from-indigo-400 hover:via-purple-400 hover:to-pink-400
                        hover:shadow-xl hover:shadow-indigo-500/20 hover:scale-[1.01]
                        active:scale-[0.99]
                        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                        flex items-center justify-center gap-2">
                      {submitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          {t('activating')}...
                        </>
                      ) : (
                        <>🚀 {t('activateBtn')}</>
                      )}
                    </button>
                  </div>
                </form>

                {/* Footer note */}
                <p className="text-center text-[10px] text-gray-600 mt-5 max-w-xs mx-auto leading-relaxed">
                  🔒 {t('dataSecure')}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
// ============================================
// pages/scan/[qrId].js - QR Code Scan Page
// ============================================
// IMPORTANT: "TURANT SCAN" approach
// Page load → IMMEDIATELY send scan to backend (IP capture)
// GPS ka wait NAHI karte — pehle IP se log hota hai
// GPS milti hai → UPDATE bhejte hain better location ke saath

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useLanguage } from '../../context/LanguageContext';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import PasswordInput from '../../components/PasswordInput';

export default function ScanPage() {
  const router = useRouter();
  const { qrId } = router.query;
  const { t } = useLanguage();

  const [phase, setPhase] = useState('loading');
  const [qrInfo, setQrInfo] = useState(null);
  const [locationStatus, setLocationStatus] = useState('pending');
  const [gpsCoords, setGpsCoords] = useState(null);
  const [gpsAddress, setGpsAddress] = useState(null);
  const [scanSent, setScanSent] = useState(false);
  const scanSentRef = useRef(false);

  // Activation form state
  const [form, setForm] = useState({
    registeredName: '',
    registeredPhone: '',
    registeredAddress: '',
    category: 'other',
    message: '',
    qrPassword: '',
    confirmPassword: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Finder registration form state (for active QR scans)
  const [finderForm, setFinderForm] = useState({
    finderName: '',
    finderPhone: '',
    finderEmail: '',
    finderMessage: '',
  });
  const [finderSubmitting, setFinderSubmitting] = useState(false);
  const [finderSubmitted, setFinderSubmitted] = useState(false);
  const [finderError, setFinderError] = useState('');
  const [finderSuccess, setFinderSuccess] = useState('');

  const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    if (!qrId) return;
    Promise.allSettled([
      fireTurantScan(),
      fetchQRInfo(),
    ]);
  }, [qrId]);

  const fireTurantScan = async () => {
    if (scanSentRef.current) return;
    scanSentRef.current = true;
    setScanSent(true);
    setLocationStatus('ip-sent');

    try {
      const res = await fetch(`${API}/track/scan/${qrId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();

      if (data.success) {
        setQrInfo(prev => ({ ...prev, ...data.data }));
        // Set phase from scan response — don't wait for fetchQRInfo
        // Backend returns isActive:false + needsActivation:true for inactive QRs
        // For active QRs, backend doesn't send isActive but sends scanCount, category etc.
        if (data.data?.needsActivation || data.data?.isActive === false) {
          setPhase('inactive');
        } else {
          // Scan was successful = QR is active
          setPhase('active');
        }
        tryGPSUpdate();
      }
    } catch (err) {
      console.error('Turant scan failed:', err);
    }
  };

    // --- GPS Reverse Geocode: coordinates se full address ---
  const reverseGeocode = async (lat, lng) => {
    try {
      const res = await fetch(
        'https://nominatim.openstreetmap.org/reverse?format=json&lat=' + lat + '&lon=' + lng + '&zoom=19&addressdetails=1',
        { headers: { 'User-Agent': 'QRCodeKey/2.0' } }
      );
      const data = await res.json();
      const a = data.address || {};
      return {
        full_address: data.display_name || '',
        street: [a.house_number, a.road].filter(Boolean).join(' '),
        area: a.neighbourhood || a.suburb || '',
        city: a.city || a.town || a.village || '',
        district: a.county || '',
        state: a.state || '',
        country: a.country || '',
        country_code: (a.country_code || '').toUpperCase(),
        postal_code: a.postcode || ''
      };
    } catch (e) {
      return { full_address: lat + ', ' + lng };
    }
  };

  const sendGPSToServer = async (pos) => {
    setLocationStatus('gps-done');
    setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
    try {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const accuracy = pos.coords.accuracy;
      // Get full address from GPS coordinates
      const address = await reverseGeocode(lat, lng);
      setGpsAddress(address);
      await fetch(`${API}/track/scan/${qrId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: lat,
          longitude: lng,
          accuracy: accuracy,
          locationSource: 'gps',
          street: address.street,
          area: address.area,
          city: address.city,
          state: address.state,
          country: address.country,
          countryCode: address.country_code,
          postalCode: address.postal_code,
          fullAddress: address.full_address,
        }),
      });
    } catch (err) {
      console.error('GPS update failed:', err);
    }
  };

  const tryGPSUpdate = async () => {
    if (!navigator.geolocation) {
      setLocationStatus('gps-denied');
      return;
    }
    // Check if location permission is blocked
    try {
      if (navigator.permissions) {
        const perm = await navigator.permissions.query({ name: 'geolocation' });
        if (perm.state === 'denied') {
          setLocationStatus('gps-blocked');
          return;
        }
      }
    } catch (e) { /* not supported */ }

    setLocationStatus('gps-capturing');

    // Single quick GPS try — 8 seconds max, then show IP success
    navigator.geolocation.getCurrentPosition(
      (pos) => sendGPSToServer(pos),
      () => setLocationStatus('gps-denied'),
      { timeout: 15000, enableHighAccuracy: true, maximumAge: 0 }
    );
  };

  const fetchQRInfo = async () => {
    try {
      const res = await fetch(`${API}/track/scan-info/${qrId}`);
      const data = await res.json();

      if (!data.success) {
        setPhase('error');
        setError(data.message || 'QR Code not found');
        return;
      }

      setQrInfo(data.data);

      if (data.data.isActive) {
        setPhase('active');
      } else {
        setPhase('inactive');
      }
    } catch (err) {
      setPhase('error');
      setError(t('connectionError'));
    }
  };

  const validatePassword = (pwd) => {
    const requirements = {
      minLength: pwd.length >= 12,
      uppercase: /[A-Z]/.test(pwd),
      lowercase: /[a-z]/.test(pwd),
    };
    return Object.values(requirements).every(v => v === true);
  };

  const handleActivation = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.registeredName.trim()) return setError(t('nameRequired'));
    if (!form.registeredPhone.trim()) return setError(t('phoneRequired'));
    if (!form.qrPassword) return setError('Password is required');
    if (!validatePassword(form.qrPassword)) return setError('Password must have 12+ characters, 1 uppercase, and 1 lowercase letter');
    if (form.qrPassword !== form.confirmPassword) return setError(t('passwordMismatch'));

    setSubmitting(true);
    try {
      const res = await fetch(`${API}/track/activate-public/${qrId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registeredName: form.registeredName,
          registeredPhone: form.registeredPhone,
          registeredAddress: form.registeredAddress,
          category: form.category,
          message: form.message,
          qrPassword: form.qrPassword,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(t('activationSuccess'));
        setPhase('success');
      } else {
        setError(data.message || t('activationFailed'));
      }
    } catch (err) {
      setError(t('serverError'));
    } finally {
      setSubmitting(false);
    }
  };

  // ====== Finder Registration Submit ======
  const handleFinderSubmit = async (e) => {
    e.preventDefault();
    setFinderError('');

    if (!finderForm.finderName.trim()) return setFinderError('Please enter your name');
    if (!finderForm.finderPhone.trim()) return setFinderError('Please enter your phone number');

    setFinderSubmitting(true);
    try {
      const res = await fetch(`${API}/track/finder-info/${qrId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          finderName: finderForm.finderName,
          finderPhone: finderForm.finderPhone,
          finderEmail: finderForm.finderEmail,
          finderMessage: finderForm.finderMessage,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFinderSuccess(data.message || 'Your details have been sent to the owner!');
        setFinderSubmitted(true);
      } else {
        setFinderError(data.message || 'Failed to submit. Please try again.');
      }
    } catch (err) {
      setFinderError('Connection error. Please try again.');
    } finally {
      setFinderSubmitting(false);
    }
  };

  const categoryOptions = [
    { value: 'child', emoji: '👶', label: t('category_child') },
    { value: 'car', emoji: '🚗', label: t('category_vehicle') },
    { value: 'bag', emoji: '👜', label: t('category_luggage') },
    { value: 'pet', emoji: '🐕', label: t('category_pet') },
    { value: 'key', emoji: '🔑', label: t('category_key') },
    { value: 'luggage', emoji: '🧳', label: t('category_luggage') },
    { value: 'other', emoji: '📦', label: t('category_other') },
  ];

  return (
    <>
      <Head>
        <title>{t('scanTitle')} | QRCodeKey</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <div className="min-h-screen relative overflow-hidden">
        {/* Background effects */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-600/5 blur-[120px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-pink-600/5 blur-[120px]" />
        </div>

        <div className="relative flex flex-col items-center justify-center min-h-screen px-5 py-8">
          <div className="w-full max-w-md">

            {/* Language Switcher */}
            <div className="absolute top-5 right-5 z-50">
              <LanguageSwitcher />
            </div>

            {/* Logo + Brand */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-2xl shadow-indigo-500/30 transform hover:scale-105 transition-transform">
                <span className="text-3xl">📍</span>
              </div>
              {qrId && (
                <div className="font-mono text-xs text-indigo-300/80 bg-indigo-500/8 border border-indigo-500/15 rounded-xl px-4 py-2 inline-flex items-center gap-2 mb-2 backdrop-blur-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                  {qrId}
                </div>
              )}
              <h1 className="text-xl font-black bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                QRCodeKey
              </h1>
              <p className="text-[10px] text-gray-500 mt-1">{t('realtimeTracking')}</p>
            </div>

            {/* ─── LOADING ─── */}
            {phase === 'loading' && (
              <div className="glass-card rounded-3xl p-10 text-center border border-white/5">
                <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-indigo-500/10 flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-400 rounded-full animate-spin" />
                </div>
                <p className="text-sm text-gray-300 font-medium">{t('scanning')}</p>
                <p className="text-[10px] text-gray-600 mt-1">{t('pleaseWait')}</p>
                {scanSent && (
                  <div className="mt-4 inline-flex items-center gap-2 text-[11px] text-green-400 bg-green-500/8 border border-green-500/15 rounded-full px-4 py-2">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    {t('ipCaptured')}
                  </div>
                )}
              </div>
            )}

            {/* ─── ERROR ─── */}
            {phase === 'error' && (
              <div className="glass-card rounded-3xl p-10 text-center border border-red-500/10">
                <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-red-500/10 flex items-center justify-center">
                  <span className="text-3xl">❌</span>
                </div>
                <h2 className="font-bold text-lg text-gray-200 mb-2">{t('scanError')}</h2>
                <p className="text-sm text-gray-400">{error}</p>
                {scanSent && (
                  <div className="mt-5 p-4 rounded-2xl bg-green-500/5 border border-green-500/15">
                    <p className="text-xs text-green-400 font-semibold">✅ {t('ipCaptured')}</p>
                    <p className="text-[10px] text-gray-500 mt-1">{t('locationSavedAnyway')}</p>
                  </div>
                )}
              </div>
            )}

            {/* ─── ACTIVE QR (Scan Successful) ─── */}
            {phase === 'active' && (
              <div className="space-y-4">
                <div className="glass-card rounded-3xl p-8 text-center border border-green-500/10">
                  <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/10 flex items-center justify-center shadow-lg shadow-green-500/10">
                    <span className="text-4xl">✅</span>
                  </div>
                  <h2 className="font-black text-xl text-green-400 mb-1">{t('locationCaptured')}</h2>
                  <p className="text-xs text-gray-500">{t('ownerNotified')}</p>

                  {qrInfo?.registeredName && (
                    <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/8 border border-indigo-500/15">
                      <span className="text-sm">👤</span>
                      <span className="text-sm font-bold text-indigo-300">{qrInfo.registeredName}</span>
                    </div>
                  )}

                  {qrInfo?.message && (
                    <div className="mt-5 p-4 rounded-2xl bg-white/3 border border-white/5 text-left">
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">📝 {t('message')}</p>
                      <p className="text-sm text-gray-200 leading-relaxed">"{qrInfo.message}"</p>
                    </div>
                  )}
                </div>

                {/* Location Status Cards */}
                <div className="space-y-2">
                  <div className="glass-card rounded-2xl p-4 border border-green-500/10 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
                      <span className="text-lg">🌐</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-green-400 font-bold">{t('ipCaptured')} ✅</div>
                      <div className="text-[10px] text-gray-500">{t('approximateLocation')}</div>
                    </div>
                    <span className="w-2.5 h-2.5 rounded-full bg-green-400 shadow-lg shadow-green-400/50" />
                  </div>

                  <div className={`glass-card rounded-2xl p-4 border flex items-center gap-3 ${
                    locationStatus === 'gps-done' ? 'border-green-500/10'
                    : locationStatus === 'gps-capturing' ? 'border-indigo-500/10'
                    : locationStatus === 'gps-blocked' ? 'border-orange-500/20'
                    : 'border-green-500/10'
                  }`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      locationStatus === 'gps-done' ? 'bg-green-500/10' : locationStatus === 'gps-capturing' ? 'bg-indigo-500/10' : 'bg-green-500/10'
                    }`}>
                      <span className="text-lg">
                        {locationStatus === 'gps-done' ? '📡' : locationStatus === 'gps-capturing' ? '⏳' : '📡'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-xs font-bold ${
                        locationStatus === 'gps-done' ? 'text-green-400' : locationStatus === 'gps-capturing' ? 'text-indigo-400' : 'text-green-400'
                      }`}>
                        {locationStatus === 'gps-done' ? `${t('gpsCaptured')} ✅`
                          : locationStatus === 'gps-capturing' ? `${t('gpsAttempting')}...`
                          : 'Location captured via IP ✅'}
                      </div>
                      <div className="text-[10px] text-gray-500">
                        {locationStatus === 'gps-done' ? t('exactLocation')
                          : locationStatus === 'gps-blocked' ? 'Location blocked! Tap lock icon → Location → Allow'
                          : locationStatus === 'gps-denied' ? 'Approximate location saved'
                          : t('waitingForGPS')}
                      </div>
                    </div>
                    {(locationStatus === 'gps-denied' || locationStatus === 'gps-blocked') ? (
                      <button onClick={tryGPSUpdate} className="px-3 py-1.5 rounded-lg bg-indigo-500/15 border border-indigo-500/25 text-[10px] text-indigo-400 font-bold hover:bg-indigo-500/25 transition-all shrink-0">
                        📡 GPS
                      </button>
                    ) : (
                      <span className={`w-2.5 h-2.5 rounded-full shadow-lg ${
                        locationStatus === 'gps-done' ? 'bg-green-400 shadow-green-400/50'
                        : locationStatus === 'gps-capturing' ? 'bg-indigo-400 shadow-indigo-400/50 animate-pulse'
                        : 'bg-green-400 shadow-green-400/50'
                      }`} />
                    )}
                  </div>
                </div>

                {/* GPS ADDRESS + MAP + NAVIGATE */}
                {gpsCoords && gpsAddress && (
                  <div className="glass-card rounded-2xl border border-indigo-500/10 overflow-hidden">
                    <div className="w-full h-48 relative">
                      <iframe
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${gpsCoords.lng-0.003},${gpsCoords.lat-0.002},${gpsCoords.lng+0.003},${gpsCoords.lat+0.002}&layer=mapnik&marker=${gpsCoords.lat},${gpsCoords.lng}`}
                        className="w-full h-full border-0"
                        loading="lazy"
                      />
                    </div>
                    <div className="p-4 space-y-2">
                      <div className="flex items-start gap-2">
                        <span className="text-lg mt-0.5 shrink-0">📍</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-indigo-300 mb-1">Exact Location</p>
                          <p className="text-sm text-gray-200 leading-relaxed">{gpsAddress.full_address}</p>
                          {gpsAddress.street && <p className="text-[11px] text-gray-400 mt-1">Street: {gpsAddress.street}</p>}
                          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                            {gpsAddress.area && <span className="text-[10px] text-gray-500">Area: {gpsAddress.area}</span>}
                            {gpsAddress.city && <span className="text-[10px] text-gray-500">City: {gpsAddress.city}</span>}
                            {gpsAddress.state && <span className="text-[10px] text-gray-500">State: {gpsAddress.state}</span>}
                            {gpsAddress.country && <span className="text-[10px] text-gray-500">Country: {gpsAddress.country}</span>}
                            {gpsAddress.postal_code && <span className="text-[10px] text-gray-500">PIN: {gpsAddress.postal_code}</span>}
                          </div>
                          <p className="text-[9px] text-gray-600 mt-1">Accuracy: {Math.round(gpsCoords.accuracy)}m</p>
                        </div>
                      </div>
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${gpsCoords.lat},${gpsCoords.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full mt-2 py-3 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 hover:shadow-lg hover:shadow-blue-500/20 transition-all flex items-center justify-center gap-2 block text-center no-underline"
                      >
                        🧭 Navigate to Location
                      </a>
                    </div>
                  </div>
                )}

                <div className="text-center pt-2">
                  <span className="text-[10px] text-gray-600">
                    {t('totalScans')}: <span className="text-indigo-400 font-bold">{qrInfo?.scanCount || 1}</span>
                  </span>
                </div>

                {/* ─── FINDER REGISTRATION FORM ─── */}
                {!finderSubmitted ? (
                  <div className="mt-6">
                    <div className="text-center mb-4">
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/8 border border-emerald-500/15 mb-2 backdrop-blur-sm">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-xs text-emerald-400 font-bold">Found this item? Help the owner!</span>
                      </div>
                      <p className="text-xs text-gray-500 max-w-xs mx-auto leading-relaxed">
                        Please fill your contact details so the owner can reach you
                      </p>
                    </div>

                    <form onSubmit={handleFinderSubmit} className="glass-card rounded-3xl border border-white/5 overflow-hidden">
                      <div className="px-6 py-4 bg-gradient-to-r from-emerald-500/8 to-green-500/8 border-b border-white/5">
                        <h3 className="font-bold text-sm text-gray-200 flex items-center gap-2">
                          <span className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center text-xs">📋</span>
                          Registration Form
                        </h3>
                      </div>

                      <div className="p-6 space-y-4">
                        {/* Finder Name */}
                        <div>
                          <label className="block text-xs font-semibold text-gray-400 mb-2">
                            Your Name <span className="text-pink-400">*</span>
                          </label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm">👤</span>
                            <input type="text" className="input-field pl-10" placeholder="Enter your full name"
                              value={finderForm.finderName} onChange={e => setFinderForm(p => ({ ...p, finderName: e.target.value }))} required />
                          </div>
                        </div>

                        {/* Finder Phone */}
                        <div>
                          <label className="block text-xs font-semibold text-gray-400 mb-2">
                            Your Phone <span className="text-pink-400">*</span>
                          </label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm">📱</span>
                            <input type="tel" className="input-field pl-10" placeholder="+91 98765 43210"
                              value={finderForm.finderPhone} onChange={e => setFinderForm(p => ({ ...p, finderPhone: e.target.value }))} required />
                          </div>
                        </div>

                        {/* Finder Email (Optional) */}
                        <div>
                          <label className="block text-xs font-semibold text-gray-400 mb-2">
                            Your Email <span className="text-gray-600 font-normal">(optional)</span>
                          </label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm">📧</span>
                            <input type="email" className="input-field pl-10" placeholder="your@email.com"
                              value={finderForm.finderEmail} onChange={e => setFinderForm(p => ({ ...p, finderEmail: e.target.value }))} />
                          </div>
                        </div>

                        {/* Finder Message (Optional) */}
                        <div>
                          <label className="block text-xs font-semibold text-gray-400 mb-2">
                            Message <span className="text-gray-600 font-normal">(optional)</span>
                          </label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-3 text-gray-500 text-sm">💬</span>
                            <textarea className="input-field pl-10 resize-none" rows={2} placeholder="Where did you find this? Any message for the owner..."
                              value={finderForm.finderMessage} onChange={e => setFinderForm(p => ({ ...p, finderMessage: e.target.value }))} maxLength={500} />
                          </div>
                          <div className="text-right text-[9px] text-gray-600 mt-1">{finderForm.finderMessage.length}/500</div>
                        </div>

                        {/* Error */}
                        {finderError && (
                          <div className="p-4 rounded-2xl bg-red-500/8 border border-red-500/15 flex items-center gap-3">
                            <span className="text-lg shrink-0">❌</span>
                            <p className="text-xs text-red-400 font-medium">{finderError}</p>
                          </div>
                        )}

                        {/* Submit Button */}
                        <button type="submit" disabled={finderSubmitting}
                          className="w-full py-4 rounded-2xl font-bold text-sm text-white transition-all duration-300
                            bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500
                            hover:from-emerald-400 hover:via-green-400 hover:to-teal-400
                            hover:shadow-xl hover:shadow-emerald-500/20 hover:scale-[1.01]
                            active:scale-[0.99]
                            disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                            flex items-center justify-center gap-2">
                          {finderSubmitting ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              Sending...
                            </>
                          ) : (
                            <>📤 Send My Details to Owner</>
                          )}
                        </button>
                      </div>
                    </form>

                    <p className="text-center text-[10px] text-gray-600 mt-4 max-w-xs mx-auto leading-relaxed">
                      🔒 Your information will only be shared with the item owner
                    </p>
                  </div>
                ) : (
                  /* Finder Submitted Success */
                  <div className="mt-6 glass-card rounded-3xl p-8 text-center border border-emerald-500/10">
                    <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-gradient-to-br from-emerald-500/20 to-green-500/10 flex items-center justify-center shadow-lg shadow-emerald-500/10">
                      <span className="text-4xl">🎉</span>
                    </div>
                    <h3 className="font-black text-lg text-emerald-400 mb-2">Thank You!</h3>
                    <p className="text-sm text-gray-400 mb-4">{finderSuccess}</p>
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/8 border border-emerald-500/15">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span className="text-xs text-emerald-400 font-bold">Owner has been notified</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ─── SUCCESS (After Activation) ─── */}
            {phase === 'success' && (
              <div className="glass-card rounded-3xl p-10 text-center border border-green-500/10">
                <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-500/20 via-emerald-500/10 to-indigo-500/10 flex items-center justify-center shadow-xl shadow-green-500/10">
                  <span className="text-5xl">🎉</span>
                </div>
                <h2 className="text-2xl font-black bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent mb-2">
                  {t('scanSuccess')}
                </h2>
                <p className="text-sm text-gray-400 mb-6">{success}</p>

                <div className="space-y-3 text-left p-5 rounded-2xl bg-white/3 border border-white/5">
                  <div className="flex items-center gap-3 text-xs text-gray-300">
                    <span className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">✅</span>
                    <span>{t('qrActivated')}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-300">
                    <span className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">🔐</span>
                    <span>{t('passwordSet')}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-300">
                    <span className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">📱</span>
                    <span>{t('trackingActive')}</span>
                  </div>
                </div>
              </div>
            )}

            {/* ─── INACTIVE QR → PREMIUM ACTIVATION FORM ─── */}
            {phase === 'inactive' && (
              <div>
                {/* Status badge */}
                <div className="text-center mb-6">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/8 border border-amber-500/15 mb-3 backdrop-blur-sm">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    <span className="text-xs text-amber-400 font-bold">{t('activateTitle')}</span>
                  </div>
                  <p className="text-xs text-gray-500 max-w-xs mx-auto leading-relaxed">
                    {t('activateDesc')}
                  </p>
                </div>

                {/* Premium Form Card */}
                <form onSubmit={handleActivation} className="glass-card rounded-3xl border border-white/5 overflow-hidden">
                  {/* Form Header */}
                  <div className="px-6 py-4 bg-gradient-to-r from-indigo-500/8 to-purple-500/8 border-b border-white/5">
                    <h3 className="font-bold text-sm text-gray-200 flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-indigo-500/15 flex items-center justify-center text-xs">📝</span>
                      {t('activationForm')}
                    </h3>
                  </div>

                  <div className="p-6 space-y-5">
                    {/* Full Name */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-2">
                        {t('fullName')} <span className="text-pink-400">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm">👤</span>
                        <input type="text" className="input-field pl-10" placeholder={t('enterFullName')}
                          value={form.registeredName} onChange={e => setForm(p => ({ ...p, registeredName: e.target.value }))} required />
                      </div>
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-2">
                        {t('phone')} <span className="text-pink-400">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm">📱</span>
                        <input type="tel" className="input-field pl-10" placeholder="+91 98765 43210"
                          value={form.registeredPhone} onChange={e => setForm(p => ({ ...p, registeredPhone: e.target.value }))} required />
                      </div>
                    </div>

                    {/* Address */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-2">
                        Address <span className="text-gray-600 font-normal">(optional)</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-3 text-gray-500 text-sm">🏠</span>
                        <textarea className="input-field pl-10 resize-none" rows={2} placeholder="Enter your home/office address (for directions on map)"
                          value={form.registeredAddress} onChange={e => setForm(p => ({ ...p, registeredAddress: e.target.value }))} maxLength={500} />
                      </div>
                      <p className="text-[10px] text-gray-600 mt-1 flex items-center gap-1">
                        <span>📍</span> Used to show directions from your address to scan location
                      </p>
                    </div>

                    {/* Category */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-2">{t('category')}</label>
                      <div className="grid grid-cols-4 gap-2">
                        {categoryOptions.map((opt) => (
                          <button key={opt.value} type="button"
                            onClick={() => setForm(p => ({ ...p, category: opt.value }))}
                            className={`flex flex-col items-center gap-1 p-3 rounded-2xl border transition-all duration-200 ${
                              form.category === opt.value
                                ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300 shadow-lg shadow-indigo-500/10 scale-[1.02]'
                                : 'bg-white/2 border-white/5 text-gray-500 hover:border-white/15 hover:bg-white/5'
                            }`}>
                            <span className="text-xl">{opt.emoji}</span>
                            <span className="text-[9px] font-bold leading-tight">{opt.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Message */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-2">
                        {t('message')} <span className="text-gray-600 font-normal">({t('optional')})</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-3 text-gray-500 text-sm">💬</span>
                        <textarea className="input-field pl-10 resize-none" rows={2} placeholder={t('messageForFinder')}
                          value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} maxLength={200} />
                      </div>
                      <div className="text-right text-[9px] text-gray-600 mt-1">{form.message.length}/200</div>
                    </div>

                    {/* Divider */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                      <span className="text-[10px] text-gray-600 font-semibold">🔐 {t('security')}</span>
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                    </div>

                    {/* Password */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-2">
                        {t('password')} <span className="text-pink-400">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute left-3.5 top-3 text-gray-500 text-sm pointer-events-none">🔒</div>
                        <div className="pl-10">
                          <PasswordInput
                            value={form.qrPassword}
                            onChange={(val) => setForm(p => ({ ...p, qrPassword: val }))}
                            placeholder={t('setTrackingPassword')}
                            showStrength={true}
                            showRequirements={true}
                          />
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-600 mt-1.5 flex items-center gap-1">
                        <span>💡</span> {t('passwordReminder')}
                      </p>
                    </div>

                    {/* Confirm Password */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-2">
                        {t('confirmPassword')} <span className="text-pink-400">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm">🔒</span>
                        <input type="password" className="input-field pl-10" placeholder={t('reenterPassword')}
                          value={form.confirmPassword} onChange={e => setForm(p => ({ ...p, confirmPassword: e.target.value }))} required />
                      </div>
                    </div>

                    {/* Error */}
                    {error && (
                      <div className="p-4 rounded-2xl bg-red-500/8 border border-red-500/15 flex items-center gap-3">
                        <span className="text-lg shrink-0">❌</span>
                        <p className="text-xs text-red-400 font-medium">{error}</p>
                      </div>
                    )}

                    {/* Submit Button */}
                    <button type="submit" disabled={submitting}
                      className="w-full py-4 rounded-2xl font-bold text-sm text-white transition-all duration-300
                        bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500
                        hover:from-indigo-400 hover:via-purple-400 hover:to-pink-400
                        hover:shadow-xl hover:shadow-indigo-500/20 hover:scale-[1.01]
                        active:scale-[0.99]
                        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                        flex items-center justify-center gap-2">
                      {submitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          {t('activating')}...
                        </>
                      ) : (
                        <>🚀 {t('activateBtn')}</>
                      )}
                    </button>
                  </div>
                </form>

                {/* Footer note */}
                <p className="text-center text-[10px] text-gray-600 mt-5 max-w-xs mx-auto leading-relaxed">
                  🔒 {t('dataSecure')}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
