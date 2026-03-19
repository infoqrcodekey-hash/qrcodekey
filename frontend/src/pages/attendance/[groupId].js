// ============================================
// pages/attendance/[groupId].js - Attendance Dashboard
// ============================================

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { orgAPI } from '../../lib/api';
import Link from 'next/link';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import toast from 'react-hot-toast';

const statusColors = {
  present: 'bg-green-500/20 text-green-400 border-green-500/30',
  absent: 'bg-red-500/20 text-red-400 border-red-500/30',
  late: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  excused: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
};
const statusIcons = { present: '✅', absent: '❌', late: '⏰', excused: '📝' };

export default function AttendanceDashboard() {
  const router = useRouter();
  const { groupId } = router.query;
  const { t } = useLanguage();

  const [group, setGroup] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showReport, setShowReport] = useState(false);
  const [report, setReport] = useState(null);

  useEffect(() => {
    if (groupId) {
      fetchGroup();
      fetchAttendance();
    }
  }, [groupId, selectedDate]);

  const fetchGroup = async () => {
    try {
      const { data } = await orgAPI.getGroup(groupId);
      setGroup(data.data);
    } catch (err) { /* ignore */ }
  };

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const { data } = await orgAPI.getAttendance(groupId, selectedDate);
      setAttendance(data.data);
    } catch (err) {
      toast.error('Failed to load attendance');
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (memberId, currentStatus) => {
    const cycle = ['present', 'absent', 'late', 'excused'];
    const nextIdx = (cycle.indexOf(currentStatus) + 1) % cycle.length;
    const newStatus = cycle[nextIdx];

    try {
      await orgAPI.updateAttendance(groupId, { memberId, status: newStatus, date: selectedDate });
      fetchAttendance();
    } catch (err) {
      toast.error(err.response?.data?.message || t('error'));
    }
  };

  const markAllPresent = async () => {
    if (!attendance?.records) return;
    try {
      for (const rec of attendance.records) {
        if (rec.status === 'absent') {
          await orgAPI.updateAttendance(groupId, { memberId: rec.member._id || rec.member, status: 'present', date: selectedDate });
        }
      }
      toast.success(t('allMarkedPresent'));
      fetchAttendance();
    } catch (err) {
      toast.error(t('error'));
    }
  };

  const handleLock = async () => {
    try {
      await orgAPI.lockAttendance(groupId, { date: selectedDate, lock: !attendance?.isLocked });
      toast.success(attendance?.isLocked ? 'Unlocked' : 'Locked');
      fetchAttendance();
    } catch (err) {
      toast.error(t('error'));
    }
  };

  const loadReport = async () => {
    const end = new Date().toISOString().split('T')[0];
    const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    try {
      const { data } = await orgAPI.getReport(groupId, start, end);
      setReport(data.data);
      setShowReport(true);
    } catch (err) {
      toast.error(t('error'));
    }
  };

  const summary = attendance?.summary || { total: 0, present: 0, absent: 0, late: 0, excused: 0 };

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-50 bg-[rgba(10,10,30,0.85)] backdrop-blur-xl border-b border-[rgba(99,102,241,0.15)] px-5 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="text-gray-400 hover:text-white text-sm">←</button>
            <div className="font-bold text-sm text-gray-200">📋 {t('attendance')}</div>
          </div>
          <LanguageSwitcher />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-5 pt-6">
        {/* Group Info */}
        {group && (
          <div className="mb-4">
            <h1 className="text-lg font-black gradient-text">{group.name}</h1>
            <p className="text-[10px] text-gray-500">{group.organization?.name}</p>
          </div>
        )}

        {/* Date Picker & Actions */}
        <div className="flex items-center gap-2 mb-4">
          <input type="date" className="input-field flex-1 text-xs" value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)} />
          <button onClick={loadReport} className="px-3 py-2 rounded-xl bg-purple-500/10 text-purple-400 text-xs font-semibold border border-purple-500/20 hover:bg-purple-500/20">
            📊 {t('report')}
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-2 mb-5">
          <div className="card p-2 text-center">
            <div className="text-lg font-black text-green-400">{summary.present}</div>
            <div className="text-[8px] text-gray-500 uppercase">{t('present')}</div>
          </div>
          <div className="card p-2 text-center">
            <div className="text-lg font-black text-red-400">{summary.absent}</div>
            <div className="text-[8px] text-gray-500 uppercase">{t('absent')}</div>
          </div>
          <div className="card p-2 text-center">
            <div className="text-lg font-black text-yellow-400">{summary.late}</div>
            <div className="text-[8px] text-gray-500 uppercase">{t('late')}</div>
          </div>
          <div className="card p-2 text-center">
            <div className="text-lg font-black text-blue-400">{summary.excused}</div>
            <div className="text-[8px] text-gray-500 uppercase">{t('excused')}</div>
          </div>
        </div>

        {/* Progress Bar */}
        {summary.total > 0 && (
          <div className="h-2 rounded-full bg-white/5 mb-5 overflow-hidden flex">
            <div className="bg-green-500 h-full" style={{width: `${(summary.present/summary.total)*100}%`}} />
            <div className="bg-yellow-500 h-full" style={{width: `${(summary.late/summary.total)*100}%`}} />
            <div className="bg-blue-500 h-full" style={{width: `${(summary.excused/summary.total)*100}%`}} />
            <div className="bg-red-500/50 h-full flex-1" />
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex gap-2 mb-4">
          <button onClick={markAllPresent} className="flex-1 py-2 rounded-xl bg-green-500/10 text-green-400 text-xs font-semibold border border-green-500/20 hover:bg-green-500/20">
            ✅ {t('markAllPresent')}
          </button>
          <button onClick={handleLock}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold border ${
              attendance?.isLocked ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-white/5 text-gray-400 border-white/10'
            }`}>
            {attendance?.isLocked ? '🔓 ' + t('unlock') : '🔒 ' + t('lock')}
          </button>
        </div>

        {/* Member List with Status */}
        {loading ? (
          <div className="space-y-2">
            {[1,2,3,4].map(i => <div key={i} className="card p-3 animate-pulse"><div className="h-4 bg-white/10 rounded w-3/4" /></div>)}
          </div>
        ) : (
          <div className="space-y-1.5">
            {attendance?.records?.map((rec, idx) => {
              const member = rec.member || {};
              const name = member.name || 'Unknown';
              const roll = member.rollNumber || (idx + 1);
              const status = rec.status || 'absent';
              const memberId = member._id || rec.member;

              return (
                <div key={memberId} className={`card p-3 flex items-center gap-3 border ${statusColors[status]?.split(' ')[2] || 'border-white/5'}`}>
                  <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-bold text-gray-400">
                    {roll}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-xs text-gray-200 truncate">{name}</div>
                    {rec.markedAt && (
                      <div className="text-[9px] text-gray-600">
                        {rec.markedBy === 'qr_scan' ? '📱 QR' : '✋ Manual'} • {new Date(rec.markedAt).toLocaleTimeString('en-IN', {hour:'2-digit',minute:'2-digit'})}
                      </div>
                    )}
                  </div>
                  <button onClick={() => toggleStatus(memberId, status)} disabled={attendance?.isLocked}
                    className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all ${statusColors[status]} ${attendance?.isLocked ? 'opacity-50' : 'hover:opacity-80'}`}>
                    {statusIcons[status]} {status.toUpperCase()}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Monthly Report Modal */}
        {showReport && report && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <div className="card p-5 w-full max-w-sm animate-fadeIn max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-sm gradient-text">📊 {t('monthlyReport')}</h3>
                <button onClick={() => setShowReport(false)} className="text-gray-400 hover:text-white">✕</button>
              </div>
              <p className="text-[10px] text-gray-500 mb-3">{report.groupName} • {report.totalDays} {t('days')}</p>

              <div className="space-y-2">
                {report.memberReport?.map(mr => (
                  <div key={mr.member._id} className="bg-white/5 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-xs text-gray-200">{mr.member.name}</span>
                      <span className={`text-xs font-bold ${mr.percentage >= 75 ? 'text-green-400' : mr.percentage >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {mr.percentage}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-indigo-500 to-green-500 rounded-full"
                        style={{width: `${mr.percentage}%`}} />
                    </div>
                    <div className="flex gap-3 mt-1 text-[9px] text-gray-500">
                      <span>✅{mr.present}</span>
                      <span>❌{mr.absent}</span>
                      <span>⏰{mr.late}</span>
                      <span>📝{mr.excused}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
