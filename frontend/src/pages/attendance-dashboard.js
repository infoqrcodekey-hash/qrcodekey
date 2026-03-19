// ============================================
// pages/attendance-dashboard.js - Attendance Dashboard
// ============================================
// Admin dashboard: present count, late, absent, group breakdown

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useAuth } from '../context/AuthContext';
import { attendanceScanAPI, orgAPI } from '../lib/api';

export default function AttendanceDashboard() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [orgs, setOrgs] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch organizations
  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }

    const fetchOrgs = async () => {
      try {
        const res = await orgAPI.getMyOrgs();
        setOrgs(res.data.data || []);
        if (res.data.data?.length > 0) {
          setSelectedOrg(res.data.data[0]._id);
        }
      } catch (err) {
        setError('Failed to load organizations');
      }
      setLoading(false);
    };
    fetchOrgs();
  }, [user, authLoading, router]);

  // Fetch dashboard data
  const fetchDashboard = useCallback(async () => {
    if (!selectedOrg) return;
    try {
      const res = await attendanceScanAPI.getDashboard(selectedOrg);
      setDashboard(res.data.data);
    } catch (err) {
      setError('Failed to load dashboard');
    }
  }, [selectedOrg]);

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const today = dashboard?.today || {};
  const groups = dashboard?.groupBreakdown || [];
  const weekly = dashboard?.weeklyTrend || [];
  const recentScans = dashboard?.recentScans || [];

  return (
    <>
      <Head><title>Attendance Dashboard - QRcodeKey</title></Head>
      <div className="min-h-screen bg-[#0a0a1a] text-white p-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => router.push('/organizations')} className="text-gray-400 hover:text-white">
              &larr; Back
            </button>
            <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Attendance Dashboard
            </h1>
            <button
              onClick={() => router.push('/attendance-scanner')}
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg text-sm font-bold"
            >
              📷 Scan
            </button>
          </div>

          {/* Org Selector */}
          {orgs.length > 1 && (
            <select
              value={selectedOrg || ''}
              onChange={(e) => setSelectedOrg(e.target.value)}
              className="w-full mb-6 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white"
            >
              {orgs.map(o => (
                <option key={o._id} value={o._id} className="bg-gray-900">{o.name}</option>
              ))}
            </select>
          )}

          {error && (
            <div className="bg-red-900/30 border border-red-500/30 rounded-xl p-4 mb-6 text-red-400">{error}</div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard label="Total Members" value={today.totalMembers || 0} color="indigo" icon="👥" />
            <StatCard label="Present" value={today.totalPresent || 0} color="green" icon="✅" />
            <StatCard label="Absent" value={today.totalAbsent || 0} color="red" icon="❌" />
            <StatCard label="Late" value={today.totalLate || 0} color="yellow" icon="⏰" />
          </div>

          {/* Attendance Rate Bar */}
          <div className="bg-white/5 backdrop-blur rounded-xl p-6 mb-6">
            <div className="flex justify-between mb-2">
              <span className="text-gray-400">Today&apos;s Attendance Rate</span>
              <span className="text-2xl font-bold text-indigo-400">{today.attendanceRate || 0}%</span>
            </div>
            <div className="w-full h-4 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-1000"
                style={{ width: `${today.attendanceRate || 0}%` }}
              />
            </div>
          </div>

          {/* Group Breakdown */}
          <div className="bg-white/5 backdrop-blur rounded-xl p-6 mb-6">
            <h2 className="text-lg font-bold mb-4">Group Breakdown</h2>
            {groups.length === 0 ? (
              <p className="text-gray-500">No attendance data for today</p>
            ) : (
              <div className="space-y-3">
                {groups.map((g, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div>
                      <p className="font-semibold">{g.groupName}</p>
                      <p className="text-xs text-gray-400">{g.groupType}</p>
                    </div>
                    <div className="flex gap-4 text-sm">
                      <span className="text-green-400">{g.present} present</span>
                      <span className="text-yellow-400">{g.late} late</span>
                      <span className="text-red-400">{g.absent} absent</span>
                      <span className="text-gray-400">/ {g.total}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Scans */}
          <div className="bg-white/5 backdrop-blur rounded-xl p-6 mb-6">
            <h2 className="text-lg font-bold mb-4">Recent Scans</h2>
            {recentScans.length === 0 ? (
              <p className="text-gray-500">No scans today</p>
            ) : (
              <div className="space-y-2">
                {recentScans.map((s, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div>
                      <p className="font-semibold">{s.memberName}</p>
                      <p className="text-xs text-gray-400">{s.rollNumber}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm font-semibold ${s.action === 'clock_in' ? 'text-green-400' : 'text-blue-400'}`}>
                        {s.action === 'clock_in' ? '🟢 IN' : '🔴 OUT'}
                      </span>
                      <p className="text-xs text-gray-400">{new Date(s.time).toLocaleTimeString('en-IN')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Weekly Trend */}
          {weekly.length > 0 && (
            <div className="bg-white/5 backdrop-blur rounded-xl p-6 mb-6">
              <h2 className="text-lg font-bold mb-4">Weekly Trend</h2>
              <div className="flex gap-2 items-end h-40">
                {weekly.map((d, i) => {
                  const rate = d.total > 0 ? (d.present / d.total) * 100 : 0;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xs text-gray-400">{Math.round(rate)}%</span>
                      <div className="w-full bg-white/10 rounded-t-lg" style={{ height: '120px', position: 'relative' }}>
                        <div
                          className="absolute bottom-0 w-full bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-t-lg transition-all"
                          style={{ height: `${rate}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(d.date).toLocaleDateString('en-IN', { weekday: 'short' })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => router.push('/attendance-scanner')}
              className="p-4 bg-white/5 rounded-xl text-center hover:bg-white/10 transition"
            >
              <div className="text-2xl mb-2">📷</div>
              <p className="font-semibold">Scan QR</p>
            </button>
            <button
              onClick={() => router.push('/viewer-login')}
              className="p-4 bg-white/5 rounded-xl text-center hover:bg-white/10 transition"
            >
              <div className="text-2xl mb-2">👁</div>
              <p className="font-semibold">Viewer Access</p>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function StatCard({ label, value, color, icon }) {
  const colors = {
    indigo: 'from-indigo-600/20 to-indigo-900/20 border-indigo-500/30',
    green: 'from-green-600/20 to-green-900/20 border-green-500/30',
    red: 'from-red-600/20 to-red-900/20 border-red-500/30',
    yellow: 'from-yellow-600/20 to-yellow-900/20 border-yellow-500/30',
  };

  return (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-xl p-4 text-center`}>
      <div className="text-2xl mb-1">{icon}</div>
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-xs text-gray-400 mt-1">{label}</p>
    </div>
  );
}
