import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { reportAPI, orgAPI } from '@/lib/api';

export default function ReportsPage() {
  const router = useRouter();
  const [orgs, setOrgs] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState('');
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);
  const [summary, setSummary] = useState(null);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('');

  useEffect(() => { loadOrgs(); }, []);
  useEffect(() => { if (selectedOrg) { loadGroups(); fetchReport(); } }, [selectedOrg, month, year, selectedGroup]);

  const loadOrgs = async () => {
    try {
      const res = await orgAPI.getMyOrgs();
      const list = res.data.data || [];
      setOrgs(list);
      if (list.length > 0) setSelectedOrg(list[0]._id);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const loadGroups = async () => {
    try {
      const res = await orgAPI.getGroups(selectedOrg);
      setGroups(res.data.data || []);
    } catch (err) { console.error(err); }
  };

  const fetchReport = async () => {
    try {
      setLoading(true);
      const res = await reportAPI.getMonthly(selectedOrg, month, year, selectedGroup || undefined);
      setReport(res.data.data?.report || []);
      setSummary(res.data.data?.summary || null);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const getBarWidth = (pct) => Math.max(5, Math.min(100, pct));
  const getBarColor = (pct) => {
    if (pct >= 90) return 'bg-green-500';
    if (pct >= 75) return 'bg-blue-500';
    if (pct >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white">
      <Head><title>Reports - QRcodeKey</title></Head>
      <div className="max-w-4xl mx-auto p-4">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-white">← Back</button>
          <h1 className="text-xl font-bold text-purple-400">📊 Monthly Reports</h1>
          <div></div>
        </div>

        {orgs.length > 1 && (
          <select value={selectedOrg} onChange={e => setSelectedOrg(e.target.value)}
            className="w-full mb-4 p-3 rounded-xl bg-white/5 border border-white/10 text-white">
            {orgs.map(o => <option key={o._id} value={o._id}>{o.name}</option>)}
          </select>
        )}

        {/* Month/Year + Group */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <select value={month} onChange={e => setMonth(parseInt(e.target.value))}
            className="p-3 rounded-xl bg-white/5 border border-white/10 text-white">
            {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select value={year} onChange={e => setYear(parseInt(e.target.value))}
            className="p-3 rounded-xl bg-white/5 border border-white/10 text-white">
            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)}
            className="p-3 rounded-xl bg-white/5 border border-white/10 text-white">
            <option value="">All Groups</option>
            {groups.map(g => <option key={g._id} value={g._id}>{g.name}</option>)}
          </select>
        </div>

        {/* Summary */}
        {summary && (
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-center">
              <div className="text-2xl font-bold text-purple-400">{summary.totalMembers}</div>
              <div className="text-xs text-gray-400">Total Members</div>
            </div>
            <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-center">
              <div className="text-2xl font-bold text-green-400">{summary.avgAttendance}%</div>
              <div className="text-xs text-gray-400">Avg Attendance</div>
            </div>
          </div>
        )}

        {/* Report Table */}
        {loading ? (
          <div className="text-center py-10"><div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto"></div></div>
        ) : !report || report.length === 0 ? (
          <div className="text-center py-10 text-gray-500">No data for this period</div>
        ) : (
          <div className="space-y-2">
            {report.sort((a,b) => b.attendancePercentage - a.attendancePercentage).map((r, i) => (
              <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-semibold text-sm">{r.member.name}</span>
                    <span className="text-xs text-gray-500 ml-2">{r.member.group}</span>
                  </div>
                  <span className="text-lg font-bold" style={{color: r.attendancePercentage >= 75 ? '#22c55e' : r.attendancePercentage >= 50 ? '#eab308' : '#ef4444'}}>
                    {r.attendancePercentage}%
                  </span>
                </div>
                {/* Progress bar */}
                <div className="w-full h-2 bg-white/5 rounded-full mb-2">
                  <div className={`h-full rounded-full ${getBarColor(r.attendancePercentage)}`} style={{width: `${getBarWidth(r.attendancePercentage)}%`}}></div>
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                  <span className="text-green-400">✅ {r.present}P</span>
                  <span className="text-red-400">❌ {r.absent}A</span>
                  <span className="text-yellow-400">⏰ {r.late}L</span>
                  <span className="text-blue-400">½ {r.halfDay}H</span>
                  <span className="text-purple-400">📋 {r.onLeave}Lv</span>
                  <span>⏱️ {r.totalHours}h</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
