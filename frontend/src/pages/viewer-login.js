// ============================================
// pages/viewer-login.js - Parent/Viewer Attendance Access
// ============================================
// Enter QR ID + Temporary Password to view attendance

import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { attendanceScanAPI } from '../lib/api';

export default function ViewerLogin() {
  const router = useRouter();
  const [qrId, setQrId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [mode, setMode] = useState('temp'); // 'temp' or 'group'

  const handleViewerAccess = async (e) => {
    e.preventDefault();
    if (!qrId.trim() || !password.trim()) {
      setError('QR ID and Password are required');
      return;
    }

    setLoading(true);
    setError('');
    try {
      let res;
      if (mode === 'temp') {
        res = await attendanceScanAPI.viewerAccess({ qrId: qrId.trim(), password: password.trim() });
      } else {
        res = await attendanceScanAPI.verify({ qrId: qrId.trim(), groupPassword: password.trim() });
      }
      setData(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Access denied');
    }
    setLoading(false);
  };

  return (
    <>
      <Head><title>View Attendance - QRcodeKey</title></Head>
      <div className="min-h-screen bg-[#0a0a1a] text-white p-4">
        <div className="max-w-lg mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => router.back()} className="text-gray-400 hover:text-white">&larr; Back</button>
            <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              View Attendance
            </h1>
            <div></div>
          </div>

          {!data ? (
            <>
              {/* Mode Toggle */}
              <div className="flex mb-6 bg-white/5 rounded-lg p-1">
                <button
                  onClick={() => setMode('temp')}
                  className={`flex-1 py-2 rounded-md text-sm font-semibold transition ${mode === 'temp' ? 'bg-indigo-600 text-white' : 'text-gray-400'}`}
                >
                  Temporary Password
                </button>
                <button
                  onClick={() => setMode('group')}
                  className={`flex-1 py-2 rounded-md text-sm font-semibold transition ${mode === 'group' ? 'bg-indigo-600 text-white' : 'text-gray-400'}`}
                >
                  Group Password
                </button>
              </div>

              {/* Login Form */}
              <div className="bg-white/5 backdrop-blur rounded-xl p-6">
                <div className="text-center mb-6">
                  <div className="text-4xl mb-3">👁</div>
                  <p className="text-gray-400 text-sm">
                    {mode === 'temp'
                      ? 'Enter the QR ID and temporary password shared by the teacher'
                      : 'Enter QR ID and group master password to verify attendance'}
                  </p>
                </div>

                <form onSubmit={handleViewerAccess} className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">QR ID</label>
                    <input
                      type="text"
                      value={qrId}
                      onChange={(e) => setQrId(e.target.value)}
                      placeholder="QR-XXXXXXXXXXXX"
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">
                      {mode === 'temp' ? 'Temporary Password' : 'Group Password'}
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={mode === 'temp' ? '6-digit password' : 'Group master password'}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </div>

                  {error && <p className="text-red-400 text-sm">{error}</p>}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl text-lg font-bold hover:opacity-90 transition disabled:opacity-50"
                  >
                    {loading ? 'Verifying...' : 'View Attendance'}
                  </button>
                </form>
              </div>
            </>
          ) : (
            <>
              {/* Attendance View */}
              <div className="bg-white/5 backdrop-blur rounded-xl p-6 mb-6">
                <div className="text-center mb-4">
                  <h2 className="text-2xl font-bold">{data.member?.name}</h2>
                  <p className="text-gray-400">{data.member?.group} | {data.member?.organization || ''}</p>
                  <p className="text-sm text-gray-500">Roll No: {data.member?.rollNumber || '-'}</p>
                </div>

                {/* Summary */}
                <div className="grid grid-cols-4 gap-2 mb-6">
                  <div className="text-center p-2 bg-white/5 rounded-lg">
                    <p className="text-lg font-bold text-indigo-400">{data.summary?.totalDays || 0}</p>
                    <p className="text-xs text-gray-500">Days</p>
                  </div>
                  <div className="text-center p-2 bg-white/5 rounded-lg">
                    <p className="text-lg font-bold text-green-400">{data.summary?.present || 0}</p>
                    <p className="text-xs text-gray-500">Present</p>
                  </div>
                  <div className="text-center p-2 bg-white/5 rounded-lg">
                    <p className="text-lg font-bold text-red-400">{data.summary?.absent || 0}</p>
                    <p className="text-xs text-gray-500">Absent</p>
                  </div>
                  <div className="text-center p-2 bg-white/5 rounded-lg">
                    <p className="text-lg font-bold text-yellow-400">{data.summary?.late || 0}</p>
                    <p className="text-xs text-gray-500">Late</p>
                  </div>
                </div>

                {/* Attendance Rate */}
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-400 text-sm">Attendance Rate</span>
                  <span className="font-bold text-indigo-400">{data.summary?.attendanceRate || 0}%</span>
                </div>
                <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden mb-6">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-indigo-500 rounded-full"
                    style={{ width: `${data.summary?.attendanceRate || 0}%` }}
                  />
                </div>

                {data.accessExpiresAt && (
                  <p className="text-xs text-gray-500 text-center mb-4">
                    Access expires: {new Date(data.accessExpiresAt).toLocaleString('en-IN')}
                  </p>
                )}
              </div>

              {/* History */}
              <div className="bg-white/5 backdrop-blur rounded-xl p-6">
                <h3 className="font-bold mb-4">Attendance History</h3>
                <div className="space-y-2">
                  {(data.history || []).map((h, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                      <div>
                        <p className="font-semibold text-sm">
                          {new Date(h.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </p>
                        <p className="text-xs text-gray-500">
                          {h.clockIn ? new Date(h.clockIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '-'}
                          {' → '}
                          {h.clockOut ? new Date(h.clockOut).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '-'}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`text-sm font-bold ${
                          h.status === 'present' ? 'text-green-400' :
                          h.status === 'late' ? 'text-yellow-400' :
                          h.status === 'absent' ? 'text-red-400' : 'text-gray-400'
                        }`}>
                          {h.status?.toUpperCase()}
                        </span>
                        {h.totalHours > 0 && (
                          <p className="text-xs text-gray-500">{h.totalHours}h</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => { setData(null); setQrId(''); setPassword(''); }}
                className="w-full mt-6 py-3 bg-white/10 rounded-xl hover:bg-white/20 transition"
              >
                &larr; Back to Login
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
