// -----------------------------------------------
// pages/group/[id].js - Smart Admin Dashboard
// -----------------------------------------------
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../context/AuthContext';
import { groupAttendanceAPI } from '../../lib/api';
import { useGroupT } from '../../lib/groupTranslations';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';

export default function GroupDashboard() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuth();
  const { gt } = useGroupT();

  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [qrInput, setQrInput] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [tab, setTab] = useState('live');
  const [summary, setSummary] = useState(null);
  const [summaryMonth, setSummaryMonth] = useState(new Date().getMonth() + 1);
  const [summaryYear, setSummaryYear] = useState(new Date().getFullYear());
  const [currentTime, setCurrentTime] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [recentScans, setRecentScans] = useState([]);

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchGroup = useCallback(async () => {
    if (!id) return;
    try {
      const res = await groupAttendanceAPI.getGroup(id);
      if (res.data.success) setGroup(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load group');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchRecentScans = useCallback(async () => {
    if (!id) return;
    try {
      const res = await groupAttendanceAPI.getRecentScans(id);
      if (res.data.success) setRecentScans(res.data.data);
    } catch (err) { /* Silent */ }
  }, [id]);

  useEffect(() => { fetchGroup(); fetchRecentScans(); }, [fetchGroup, fetchRecentScans]);

  useEffect(() => {
    if (!id) return;
    const interval = setInterval(() => { fetchGroup(); fetchRecentScans(); }, 10000);
    return () => clearInterval(interval);
  }, [id, fetchGroup, fetchRecentScans]);

  const handleToggle = async () => {
    try {
      const res = await groupAttendanceAPI.toggleAttendance(id);
      if (res.data.success) setGroup(res.data.data);
    } catch (err) { alert(err.response?.data?.message || 'Toggle failed'); }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!qrInput.trim()) return;
    setAddingMember(true);
    try {
      const res = await groupAttendanceAPI.addMember(id, { qrNumber: qrInput.trim() });
      if (res.data.success) { setGroup(res.data.data); setQrInput(''); }
    } catch (err) { alert(err.response?.data?.message || 'Failed to add member'); }
    finally { setAddingMember(false); }
  };

  const handleRemoveMember = async (memberId) => {
    if (!confirm(gt('removeMemberMsg'))) return;
    try {
      const res = await groupAttendanceAPI.removeMember(id, memberId);
      if (res.data.success) setGroup(res.data.data);
    } catch (err) { alert(err.response?.data?.message || 'Failed to remove member'); }
  };

  const fetchSummary = async () => {
    try {
      const res = await groupAttendanceAPI.getAttendanceSummary(id, summaryMonth, summaryYear);
      if (res.data.success) setSummary(res.data.data);
    } catch (err) { alert(err.response?.data?.message || 'Failed to load summary'); }
  };

  const handleExportCSV = async () => {
    try {
      const res = await groupAttendanceAPI.exportCSV(id, summaryMonth, summaryYear);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance-${group?.name}-${summaryYear}-${summaryMonth}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) { alert('Export failed'); }
  };

  useEffect(() => {
    if (tab === 'summary' && id) fetchSummary();
  }, [tab, summaryMonth, summaryYear]);

  const handleDeleteGroup = async () => {
    if (!confirm(gt('deleteGroupMsg'))) return;
    try {
      await groupAttendanceAPI.deleteGroup(id);
      router.push('/group');
    } catch (err) { alert(err.response?.data?.message || 'Delete failed'); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-950 to-black flex items-center justify-center">
        <div className="text-white text-lg animate-pulse">{gt('loadingGroup')}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-950 to-black flex items-center justify-center flex-col gap-4">
        <div className="text-red-400 text-lg">{error}</div>
        <button onClick={() => router.push('/group')} className="text-indigo-400 hover:text-indigo-300">{gt('backToGroups')}</button>
      </div>
    );
  }

  const presentCount = group?.members?.filter(m => m.isPresent).length || 0;
  const totalMembers = group?.members?.length || 0;
  const absentCount = totalMembers - presentCount;

  const filteredMembers = (group?.members || []).filter(m => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (m.name || '').toLowerCase().includes(q) || (m.qrNumber || '').toLowerCase().includes(q);
  });

  const formatTime = (date) => {
    return new Date(date).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
    });
  };

  const formatScanTime = (date) => {
    return new Date(date).toLocaleString('en-IN', {
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-950 to-black text-white">
      <div className="max-w-4xl mx-auto px-4 py-6">

        {/* === HEADER === */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <button onClick={() => router.push('/group')} className="text-gray-400 text-sm hover:text-white">
                &larr; {gt('backToGroups')}
              </button>
              <LanguageSwitcher />
            </div>
            <h1 className="text-2xl font-bold">{group?.name}</h1>
            <p className="text-gray-400 text-sm mt-1">{group?.category} | {group?.fixedAddress?.address}</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-mono text-indigo-400 font-bold">
              {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {currentTime.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
            </div>
          </div>
        </div>

        {/* === Attendance Toggle === */}
        <div className="mb-6">
          <button onClick={handleToggle}
            className={`w-full py-4 rounded-2xl text-lg font-bold transition-all ${
              group?.attendanceEnabled
                ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800'
                : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800'
            }`}>
            {group?.attendanceEnabled ? gt('stopAttendance') : gt('startAttendance')}
          </button>
        </div>

        {/* === Stats Cards === */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-indigo-400">{totalMembers}</div>
            <div className="text-xs text-gray-400 mt-1">{gt('totalLabel')}</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-green-400">{presentCount}</div>
            <div className="text-xs text-gray-400 mt-1">{gt('presentLabel')}</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-red-400">{absentCount}</div>
            <div className="text-xs text-gray-400 mt-1">{gt('absentLabel')}</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <div className={`text-3xl font-bold ${group?.attendanceEnabled ? 'text-green-400' : 'text-red-400'}`}>
              {group?.attendanceEnabled ? gt('onStatus') : gt('offStatus')}
            </div>
            <div className="text-xs text-gray-400 mt-1">{gt('statusLabel')}</div>
          </div>
        </div>

        {/* === Tabs === */}
        <div className="flex border-b border-white/10 mb-5">
          {['live', 'members', 'summary'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-3 text-sm font-semibold capitalize transition-all border-b-2 ${
                tab === t ? 'text-indigo-400 border-indigo-400' : 'text-gray-500 border-transparent hover:text-gray-300'
              }`}>
              {t === 'live' ? gt('liveActivity') : t === 'members' ? gt('membersTab') : gt('monthlySummary')}
            </button>
          ))}
        </div>

        {/* === LIVE ACTIVITY TAB === */}
        {tab === 'live' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">{gt('currentStatusLabel')}</h3>
              {(group?.members || []).length === 0 ? (
                <div className="text-center py-8 text-gray-500">{gt('noMembersYet')}</div>
              ) : (
                <div className="space-y-2">
                  {(group?.members || []).map((member, idx) => (
                    <div key={member._id || idx} className={`flex items-center justify-between rounded-xl px-4 py-3 border transition-all ${
                      member.isPresent ? 'bg-green-500/10 border-green-500/30' : 'bg-white/5 border-white/10'
                    }`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${member.isPresent ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`} />
                        <div>
                          <span className="font-semibold text-white text-sm">{member.name || gt('memberLabel')}</span>
                          <span className="text-gray-400 text-xs ml-2 font-mono">{member.qrNumber}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {member.lastScanTime && (
                          <span className="text-xs text-gray-500">{formatScanTime(member.lastScanTime)}</span>
                        )}
                        <span className={`px-3 py-1 rounded-full text-xs font-bold min-w-[42px] text-center ${
                          member.isPresent
                            ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                            : 'bg-red-500/20 text-red-400 border border-red-500/40'
                        }`}>
                          {member.isPresent ? gt('onStatus') : gt('offStatus')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Scans */}
            <div className="space-y-2 mt-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">{gt('recentScans')}</h3>
                <button onClick={fetchRecentScans} className="text-xs text-indigo-400 hover:text-indigo-300">{gt('refreshBtn')}</button>
              </div>
              {recentScans.length === 0 ? (
                <div className="text-center py-8 text-gray-500 bg-white/5 rounded-xl border border-white/10">
                  <div className="text-3xl mb-2">📡</div>
                  <p>{gt('noScanActivity')}</p>
                  <p className="text-xs mt-1">{gt('scanAppearHere')}</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {recentScans.map((scan, idx) => (
                    <div key={scan._id || idx} className={`flex items-center justify-between rounded-lg px-4 py-2.5 border ${
                      scan.action === 'clock_in' ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'
                    }`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${scan.action === 'clock_in' ? 'bg-green-400' : 'bg-red-400'}`} />
                        <div>
                          <span className="font-medium text-white text-sm">{scan.memberName}</span>
                          <span className="text-gray-500 text-xs ml-2 font-mono">{scan.qrNumber}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400">{formatScanTime(scan.timestamp)}</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          scan.action === 'clock_in' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {scan.action === 'clock_in' ? gt('onStatus') : gt('offStatus')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="text-center text-xs text-gray-600 pt-2">{gt('autoRefresh')}</div>
          </div>
        )}

        {/* === MEMBERS TAB === */}
        {tab === 'members' && (
          <div className="space-y-4">
            <form onSubmit={handleAddMember} className="flex gap-2">
              <input type="text" value={qrInput} onChange={e => setQrInput(e.target.value)}
                placeholder={gt('enterQrToAdd')}
                className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 outline-none focus:border-indigo-500" />
              <button type="submit" disabled={addingMember}
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-sm disabled:opacity-50">
                {addingMember ? gt('addingMember') : gt('addMemberBtn')}
              </button>
            </form>

            {totalMembers > 3 && (
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder={gt('searchMembers')}
                className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 outline-none text-sm" />
            )}

            {filteredMembers.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                {totalMembers === 0 ? gt('noMembersAddByQr') : gt('noMembersMatch')}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredMembers.map((member, idx) => (
                  <div key={member._id || idx} className={`rounded-xl p-4 border transition-all ${
                    member.isPresent ? 'bg-green-500/5 border-green-500/20' : 'bg-white/5 border-white/10'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                          member.isPresent ? 'bg-green-500/20 text-green-400' : 'bg-gray-600/30 text-gray-400'
                        }`}>
                          {(member.name || 'M')[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-white text-sm">{member.name || gt('memberLabel')}</p>
                          <p className="text-xs text-gray-400 font-mono">{member.qrNumber}</p>
                        </div>
                      </div>
                      <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                        member.isPresent
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                          : 'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}>
                        {member.isPresent ? gt('onStatus') : gt('offStatus')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-t border-white/5 pt-2">
                      <div className="text-xs text-gray-400">
                        {gt('lastScan')}: {member.lastScanTime ? formatTime(member.lastScanTime) : gt('neverScanned')}
                      </div>
                      <button onClick={() => handleRemoveMember(member._id || member.user)}
                        className="text-red-400 hover:text-red-300 text-xs px-3 py-1 rounded-lg hover:bg-red-500/10 border border-red-500/20">
                        {gt('deleteGroupBtn') === 'Delete Group' ? 'Delete' : gt('deleteGroupBtn').split(' ')[0]}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="text-center text-xs text-gray-500 pt-2">
              {gt('showingOf', { shown: filteredMembers.length, total: totalMembers, present: presentCount, absent: absentCount })}
            </div>
          </div>
        )}

        {/* === SUMMARY TAB === */}
        {tab === 'summary' && (
          <div className="space-y-4">
            <div className="flex gap-3 items-center flex-wrap">
              <select value={summaryMonth} onChange={e => setSummaryMonth(parseInt(e.target.value))}
                className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm outline-none">
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(2000, i).toLocaleString('default', { month: 'long' })}
                  </option>
                ))}
              </select>
              <select value={summaryYear} onChange={e => setSummaryYear(parseInt(e.target.value))}
                className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm outline-none">
                {[2024, 2025, 2026, 2027].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <button onClick={fetchSummary}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium">
                {gt('loadBtn')}
              </button>
              <button onClick={handleExportCSV}
                className="px-4 py-2 rounded-lg bg-white/5 border border-indigo-500 text-indigo-400 hover:bg-indigo-500/10 text-sm font-medium">
                {gt('exportCsv')}
              </button>
            </div>

            {summary ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left px-3 py-3 text-gray-400 font-medium">{gt('memberLabel')}</th>
                      <th className="text-center px-3 py-3 text-gray-400 font-medium">{gt('qrCodeLabel')}</th>
                      <th className="text-center px-3 py-3 text-gray-400 font-medium">{gt('presentLabel')}</th>
                      <th className="text-center px-3 py-3 text-gray-400 font-medium">{gt('absentLabel')}</th>
                      <th className="text-center px-3 py-3 text-gray-400 font-medium">{gt('clockIn')}</th>
                      <th className="text-center px-3 py-3 text-gray-400 font-medium">{gt('clockOut')}</th>
                      <th className="text-center px-3 py-3 text-gray-400 font-medium">{gt('percentLabel')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.members?.map((m, i) => (
                      <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                        <td className="px-3 py-3 font-medium">{m.name}</td>
                        <td className="text-center px-3 py-3 text-gray-400 font-mono text-xs">{m.qrNumber}</td>
                        <td className="text-center px-3 py-3 text-green-400 font-bold">{m.presentDays}</td>
                        <td className="text-center px-3 py-3 text-red-400 font-bold">{m.absentDays}</td>
                        <td className="text-center px-3 py-3 text-blue-400">{m.clockIns || 0}</td>
                        <td className="text-center px-3 py-3 text-orange-400">{m.clockOuts || 0}</td>
                        <td className="text-center px-3 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                            m.percentage >= 75 ? 'bg-green-500/20 text-green-400'
                              : m.percentage >= 50 ? 'bg-yellow-500/20 text-yellow-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}>
                            {m.percentage}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-10 text-gray-500">{gt('selectMonthLoad')}</div>
            )}
          </div>
        )}

        {/* === FOOTER === */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/10">
          <button onClick={() => router.push('/group')} className="text-indigo-400 hover:text-indigo-300 text-sm font-medium">
            &larr; {gt('backToGroups')}
          </button>
          <button onClick={handleDeleteGroup}
            className="px-4 py-2 rounded-lg border border-red-500/50 text-red-400 hover:bg-red-500/10 text-sm font-medium transition-all">
            {gt('deleteGroupBtn')}
          </button>
        </div>
      </div>
    </div>
  );
}
