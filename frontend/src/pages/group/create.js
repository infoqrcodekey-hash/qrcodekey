// -----------------------------------------------
// pages/group/create.js - Create New Group
// -----------------------------------------------
import { useState } from 'react';
import { useRouter } from 'next/router';
import { groupAttendanceAPI } from '../../lib/api';

const CATEGORIES = [
  { value: 'school', label: 'School' },
  { value: 'college', label: 'College' },
  { value: 'office', label: 'Office' },
  { value: 'factory', label: 'Factory' },
  { value: 'hospital', label: 'Hospital' },
  { value: 'gym', label: 'Gym' },
  { value: 'coaching', label: 'Coaching' },
  { value: 'warehouse', label: 'Warehouse' },
  { value: 'event', label: 'Event' },
  { value: 'other', label: 'Other' },
];

export default function CreateGroup() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    category: 'other',
    address: '',
    latitude: '',
    longitude: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Get current GPS location
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported by your browser');
      return;
    }
    setGpsLoading(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm(prev => ({
          ...prev,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        }));
        setGpsLoading(false);
      },
      (err) => {
        setError('Failed to get location: ' + err.message);
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.name.trim()) {
      setError('Group name is required');
      return;
    }
    if (!form.address.trim() || !form.latitude || !form.longitude) {
      setError('Address and GPS coordinates are required');
      return;
    }

    setLoading(true);
    try {
      const res = await groupAttendanceAPI.createGroup({
        name: form.name.trim(),
        category: form.category,
        fixedAddress: {
          address: form.address.trim(),
          latitude: parseFloat(form.latitude),
          longitude: parseFloat(form.longitude),
        },
      });

      if (res.data.success) {
        router.push('/group/' + res.data.data._id);
      } else {
        setError(res.data.message || 'Failed to create group');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Server error');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '12px 16px',
    background: '#1a1a2e',
    border: '1px solid #2a2a4a',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '15px',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '6px',
    color: '#aaa',
    fontSize: '14px',
    fontWeight: '500',
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', padding: '20px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}>Create New Group</h1>
        <p style={{ color: '#888', marginBottom: '30px' }}>Set up a location-based attendance group</p>

        {error && (
          <div style={{ background: '#ff525220', border: '1px solid #ff5252', borderRadius: '8px', padding: '12px', marginBottom: '20px', color: '#ff5252' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Group Name */}
          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Group Name *</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. Morning Batch, Office Team A"
              style={inputStyle}
              maxLength={100}
            />
          </div>

          {/* Category */}
          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Category</label>
            <select
              name="category"
              value={form.category}
              onChange={handleChange}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              {CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>

          {/* Address */}
          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Fixed Address *</label>
            <input
              type="text"
              name="address"
              value={form.address}
              onChange={handleChange}
              placeholder="e.g. 123 Main St, Building A, Floor 2"
              style={inputStyle}
            />
          </div>

          {/* GPS Coordinates */}
          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>GPS Location *</label>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
              <input
                type="number"
                name="latitude"
                value={form.latitude}
                onChange={handleChange}
                placeholder="Latitude"
                step="any"
                style={{ ...inputStyle, flex: 1 }}
              />
              <input
                type="number"
                name="longitude"
                value={form.longitude}
                onChange={handleChange}
                placeholder="Longitude"
                step="any"
                style={{ ...inputStyle, flex: 1 }}
              />
            </div>
            <button
              type="button"
              onClick={getCurrentLocation}
              disabled={gpsLoading}
              style={{
                background: '#1a1a2e',
                color: '#667eea',
                border: '1px solid #667eea',
                borderRadius: '8px',
                padding: '10px 20px',
                fontSize: '14px',
                cursor: gpsLoading ? 'wait' : 'pointer',
                width: '100%',
              }}
            >
              {gpsLoading ? 'Getting location...' : '📍 Use My Current Location'}
            </button>
            <p style={{ color: '#666', fontSize: '12px', marginTop: '6px' }}>
              Members must be within 12 meters of this location to mark attendance
            </p>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              background: loading ? '#555' : 'linear-gradient(135deg, #667eea, #764ba2)',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading ? 'wait' : 'pointer',
              marginTop: '10px',
            }}
          >
            {loading ? 'Creating...' : 'Create Group'}
          </button>
        </form>

        {/* Back */}
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button
            onClick={() => router.push('/group')}
            style={{ background: 'none', border: 'none', color: '#667eea', cursor: 'pointer', fontSize: '15px' }}
          >
            ← Back to Groups
          </button>
        </div>
      </div>
    </div>
  );
}
