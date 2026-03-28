// -----------------------------------------------
// pages/group/create.js - Create Group
// -----------------------------------------------
// Admin QR > Address > Current Address Tab > QR Invite

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { groupAttendanceAPI, qrAPI } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/La nguageContext';

const CATEGORIES = ['Office', 'School', 'Event', 'Security', 'Warehouse', 'Other'];

export default function CreateGroup() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useLanguage();

  // Form state
  const [form, setForm] = useState({
    name: '', category: 'Office', address: '',
    latitude: '', longitude: '',
    currentLatitude: '', currentLongitude: '', currentAddress: '',
    adminQrNumber: ''
  });
  const [addressTab, setAddressTab] = useState('fixed'); // 'fixed' or 'current'
  const [myQRCodes, setMyQRCodes] = useState([]);
  const [inviteQRs, setInviteQRs] = useState([]);
  const [inviteInput, setInviteInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [currentGpsLoading, setCurrentGpsLoading] = useState(false);

  // Fetch user's QR codes for Admin QR dropdown
  useEffect(() => {
    (async () => {
      try {
        const res = await qrAPI.getMyQRCodes();
        const qrList = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        setMyQRCodes(qrList);
        if (qrList.length > 0) {
          setForm(f => ({ ...f, adminQrNumber: qrList[0].qrId || qrList[0].qrNumber || '' }));
        }
      } catch {}
    })();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const getFixedLocation = () => {
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm(f => ({
          ...f,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6)
        }));
        setGpsLoading(false);
      },
      () => { setError('GPS location failed'); setGpsLoading(false); },
      { enableHighAccuracy: true }
    );
  };

  const getCurrentLocation = () => {
    setCurrentGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm(f => ({
          ...f,
          currentLatitude: pos.coords.latitude.toFixed(6),
          currentLongitude: pos.coords.longitude.toFixed(6),
          currentAddress: 'GPS: ' + pos.coords.latitude.toFixed(6) + ', ' + pos.coords.longitude.toFixed(6)
        }));
        setCurrentGpsLoading(false);
      },
      () => { setError('GPS location failed'); setCurrentGpsLoading(false); },
      { enableHighAccuracy: true }
    );
  };

  const addInviteQR = () => {
    const qr = inviteInput.trim();
    if (qr && !inviteQRs.includes(qr)) {
      setInviteQRs([...inviteQRs, qr]);
      setInviteInput('');
    }
  };

  const removeInviteQR = (qr) => {
    setInviteQRs(inviteQRs.filter(q => q !== qr));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      // Use current address GPS if tab is 'current' and has coordinates
      const lat = addressTab === 'current' && form.currentLatitude ? form.currentLatitude : form.latitude;
      const lng = addressTab === 'current' && form.currentLongitude ? form.currentLongitude : form.longitude;
      const addr = addressTab === 'current' && form.currentAddress ? form.currentAddress : form.address;

      const res = await groupAttendanceAPI.createGroup({
        name: form.name,
        category: form.category,
        fixedAddress: {
          address: addr,
          latitude: parseFloat(lat) || 0,
          longitude: parseFloat(lng) || 0
        },
        adminQrNumber: form.adminQrNumber
      });

      const groupId = res.data?.data?._id || res.data?.group?._id || res.data?._id;

      // Add invited QR codes as members
      if (groupId && inviteQRs.length > 0) {
        for (const qr of inviteQRs) {
          try {
            await groupAttendanceAPI.addMember(groupId, { qrNumber: qr });
          } catch {}
        }
      }

      router.push('/group' + (groupId ? '/' + groupId : ''));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create group');
    }
    setLoading(false);
  };

  const inputStyle = 'w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none';
  const labelStyle = 'block text-sm font-medium text-gray-300 mb-1';
  const tabActive = 'px-4 py-2 rounded-lg text-sm font-semibold transition-all ';

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-950 to-black text-white px-4 py-6 max-w-lg mx-auto">
      <button onClick={() => router.back()} className="text-gray-400 mb-4 text-sm hover:text-white">
        ← Back
      </button>

      <h1 className="text-2xl font-bold mb-6">Create Group</h1>

      {error && (
        <div className="bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-xl mb-4 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* ===== 1. ADMIN QR ===== */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <label className={labelStyle}>📍 Admin QR Code *</label>
          <select
            name="adminQrNumber"
            value={form.adminQrNumber}
            onChange={handleChange}
            className={inputStyle}
            required
          >
            <option value="">Select your QR Code</option>
            {myQRCodes.map((qr) => (
              <option key={qr._id} value={qr.qrId || qr.qrNumber}>
                {qr.qrId || qr.qrNumber} {qr.label ? '- ' + qr.label : ''}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">This QR will be the admin of the group</p>
        </div>

        {/* ===== GROUP NAME & CATEGORY ===== */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-4">
          <div>
            <label className={labelStyle}>Group Name *</label>
            <input name="name" value={form.name} onChange={handleChange} placeholder="e.g. Office Team" className={inputStyle} required />
          </div>
          <div>
            <label className={labelStyle}>Category</label>
            <select name="category" value={form.category} onChange={handleChange} className={inputStyle}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* ===== 2. ADDRESS (Registered) ===== */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-4">
          <label className={labelStyle}>📌 Address *</label>
          <input name="address" value={form.address} onChange={handleChange} placeholder="Enter registered address" className={inputStyle} required />

          {/* Address Tabs */}
          <div className="flex gap-2 bg-white/5 rounded-xl p-1">
            <button
              type="button"
              onClick={() => setAddressTab('fixed')}
              className={tabActive + (addressTab === 'fixed' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white')}
            >
              📍 Fixed Address
            </button>
            <button
              type="button"
              onClick={() => setAddressTab('current')}
              className={tabActive + (addressTab === 'current' ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-white')}
            >
              📡 Current Address
            </button>
          </div>

          {/* Fixed Address GPS */}
          {addressTab === 'fixed' && (
            <div className="space-y-3">
              <p className="text-xs text-gray-400">Set the GPS location of your fixed office/address. Scans within 12m will count as ON.</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400">Latitude</label>
                  <input name="latitude" value={form.latitude} onChange={handleChange} placeholder="0.000000" className={inputStyle} />
                </div>
                <div>
                  <label className="text-xs text-gray-400">Longitude</label>
                  <input name="longitude" value={form.longitude} onChange={handleChange} placeholder="0.000000" className={inputStyle} />
                </div>
              </div>
              <button type="button" onClick={getFixedLocation} disabled={gpsLoading}
                className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium disabled:opacity-50">
                {gpsLoading ? '📡 Getting GPS...' : '📍 Get Current GPS Location'}
              </button>
            </div>
          )}

          {/* Current Address (for big companies - different location) */}
          {addressTab === 'current' && (
            <div className="space-y-3">
              <p className="text-xs text-gray-400">For large companies where office is far from registered address. Tap below to set current working location. Scans within 12m of THIS location will count as ON.</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400">Current Lat</label>
                  <input value={form.currentLatitude} readOnly placeholder="—" className={inputStyle + ' opacity-60'} />
                </div>
                <div>
                  <label className="text-xs text-gray-400">Current Lng</label>
                  <input value={form.currentLongitude} readOnly placeholder="—" className={inputStyle + ' opacity-60'} />
                </div>
              </div>
              {form.currentAddress && (
                <p className="text-xs text-green-400">✅ {form.currentAddress}</p>
              )}
              <button type="button" onClick={getCurrentLocation} disabled={currentGpsLoading}
                className="w-full py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-medium disabled:opacity-50">
                {currentGpsLoading ? '📡 Detecting...' : '📡 Set Current Location (GPS)'}
              </button>
            </div>
          )}
        </div>

        {/* ===== 3. QR CODE INVITE ===== */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
          <label className={labelStyle}>🔗 QR Code Invite</label>
          <p className="text-xs text-gray-400">Add QR codes to this group. Members with these QR codes can scan to clock in/out.</p>
          <div className="flex gap-2">
            <input
              value={inviteInput}
              onChange={(e) => setInviteInput(e.target.value)}
              placeholder="Enter QR Code ID (e.g. QR-XXXX)"
              className={inputStyle + ' flex-1'}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addInviteQR(); } }}
            />
            <button type="button" onClick={addInviteQR}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold whitespace-nowrap">
              + Add
            </button>
          </div>
          {inviteQRs.length > 0 && (
            <div className="space-y-2">
              {inviteQRs.map((qr, i) => (
                <div key={i} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                  <span className="text-sm text-gray-300">📎 {qr}</span>
                  <button type="button" onClick={() => removeInviteQR(qr)} className="text-red-400 hover:text-red-300 text-xs">
                    ✕ Remove
                  </button>
                </div>
              ))}
              <p className="text-xs text-gray-500">{inviteQRs.length} QR code(s) will be invited</p>
            </div>
          )}
        </div>

        {/* Submit */}
        <button type="submit" disabled={loading}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-lg disabled:opacity-50 transition-all">
          {loading ? 'Creating...' : '🚀 Create Group'}
        </button>
      </form>
    </div>
  );
}
