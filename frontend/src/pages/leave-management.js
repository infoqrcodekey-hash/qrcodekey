import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { leaveAPI, orgAPI } from '@/lib/api';

export default function LeaveManagementPage() {
  const router = useRouter();
  const [tab, setTab] = useState('requests'); // requests, apply, balance
  const [orgs, setOrgs] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState('');
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({});
  const [showApplyForm, setShowApplyForm] = useState(false);

  // Apply form
  const [form, setForm] = useState({ memberId: '', orgId: '', groupId: '', type: 'casual', startDate: '', endDate: '', reason: '', isHalfDay: false });
  const [groups, setGroups] = useState([]);
  const [members, setMembers] = useState([]);

  useEffect(() => {
    loadOrgs();
  }, []);

  useEffect(() => {
    if (selectedOrg) { fetchLeaves(); fetchSummary(); loadGroups(); }
  }, [selectedOrg]);

  const loadOrgs = async () => {
    try {
      const res = await orgAPI.getMyOrgs();
      const orgList = res.data.data || [];
      setOrgs(orgList);
      if (orgList.length > 0) setSelectedOrg(orgList[0]._id);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const loadGroups = async () => {
    try {
      const res = await orgAPI.getGroups(selectedOrg);
      setGroups(res.data.data || []);
    } catch (err) { console.error(err); }
  };

  const loadMembers = async (groupId) => {
    try {
      const res = await orgAPI.getMembers(selectedOrg, groupId);
      setMembers(res.data.data || []);
    } catch (err) { console.error(err); }
  };

  const fetchLeaves = async () => {
    try {
      const res = await leaveAPI.getOrgLeaves(selectedOrg);
      setLeaves(res.data.data || []);
    } catch (err) { console.error(err); }
  };

  const fetchSummary = async () => {
    try {
      const res = await leaveAPI.getSummary(selectedOrg);
      setSummary(res.data.data || {});
    } catch (err) { console.error(err); }
  };

  const handleApply = async (e) => {
    e.preventDefault();
    try {
      await leaveAPI.apply({ ...form, orgId: selectedOrg });
      alert('Leave applied successfully!');
      setShowApplyForm(false);
      setForm({ memberId: '', orgId: '', groupId: '', type: 'casual', startDate: '', endDate: '', reason: '', isHalfDay: false });
      fetchLeaves();
    } catch (err) { alert(err.response?.data?.message || 'Error applying leave'); }
  };

  const handleReview = async (leaveId, status) => {
    try {
      await leaveAPI.review(leaveId, { status });
      fetchLeaves(); fetchSummary();
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  const statusColor = (s) => {
    const colors = { pending: 'bg-yellow-500/20 text-yellow-400', approved: 'bg-green-500/20 text-green-400', rejected: 'bg-red-500/20 text-red-400', cancelled: 'bg-gray-500/20 text-gray-400' };
    return colors[s] || '';
  };

  const leaveTypes = ['sick', 'casual', 'earned', 'maternity', 'paternity', 'unpaid', 'half_day', 'work_from_home', 'other'];

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white">
      <Head><title>Leave Management - QRcodeKey</title></Head>

      <div className="max-w-4xl mx-auto p-4">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-white">← Back</button>
          <h1 className="text-xl font-bold text-purple-400">📋 Leave Management</h1>
          <div></div>
        </div>

        {/* Org Selector */}
        {orgs.length > 1 && (
          <select value={selectedOrg} onChange={e => setSelectedOrg(e.target.value)}
            className="w-full mb-4 p-3 rounded-xl bg-white/5 border border-white/10 text-white">
            {orgs.map(o => <option key={o._id} value={o._id}>{o.name}</option>)}
          </select>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-center">
            <div className="text-2xl font-bold text-green-400">{summary.onLeaveToday || 0}</div>
            <div className="text-xs text-gray-400">On Leave Today</div>
          </div>
          <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-center">
            <div className="text-2xl font-bold text-yellow-400">{summary.pendingRequests || 0}</div>
            <div className="text-xs text-gray-400">Pending</div>
          </div>
          <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">
            <div className="text-2xl font-bold text-blue-400">{summary.monthlyLeaves || 0}</div>
            <div className="text-xs text-gray-400">This Month</div>
          </div>
        </div>

        {/* Apply Button */}
        <button onClick={() => setShowApplyForm(!showApplyForm)}
          className="w-full mb-4 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 font-semibold">
          + Apply for Leave
        </button>

        {/* Apply Form */}
        {showApplyForm && (
          <form onSubmit={handleApply} className="p-4 mb-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
            <select value={form.groupId} onChange={e => { setForm({...form, groupId: e.target.value}); loadMembers(e.target.value); }}
              className="w-full p-3 rounded-lg bg-white/5 border border-white/10 text-white" required>
              <option value="">Select Group</option>
              {groups.map(g => <option key={g._id} value={g._id}>{g.name}</option>)}
            </select>
            <select value={form.memberId} onChange={e => setForm({...form, memberId: e.target.value})}
              className="w-full p-3 rounded-lg bg-white/5 border border-white/10 text-white" required>
              <option value="">Select Member</option>
              {members.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
            </select>
            <select value={form.type} onChange={e => setForm({...form, type: e.target.value})}
              className="w-full p-3 rounded-lg bg-white/5 border border-white/10 text-white">
              {leaveTypes.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ').toUpperCase()}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <input type="date" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})}
                className="p-3 rounded-lg bg-white/5 border border-white/10 text-white" required />
              <input type="date" value={form.endDate} onChange={e => setForm({...form, endDate: e.target.value})}
                className="p-3 rounded-lg bg-white/5 border border-white/10 text-white" required />
            </div>
            <textarea placeholder="Reason for leave..." value={form.reason} onChange={e => setForm({...form, reason: e.target.value})}
              className="w-full p-3 rounded-lg bg-white/5 border border-white/10 text-white" rows={2} required />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isHalfDay} onChange={e => setForm({...form, isHalfDay: e.target.checked})} />
              Half Day
            </label>
            <button type="submit" className="w-full py-3 rounded-lg bg-purple-600 font-semibold">Submit Application</button>
          </form>
        )}

        {/* Leave List */}
        <div className="space-y-2">
          {leaves.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No leave requests yet</div>
          ) : leaves.map(l => (
            <div key={l._id} className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">{l.member?.name || 'Unknown'}</span>
                <span className={`px-2 py-1 rounded-full text-xs ${statusColor(l.status)}`}>{l.status}</span>
              </div>
              <div className="text-sm text-gray-400">
                <span className="capitalize">{l.type?.replace(/_/g, ' ')}</span> • {l.totalDays} day(s)
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {new Date(l.startDate).toLocaleDateString()} → {new Date(l.endDate).toLocaleDateString()}
              </div>
              <div className="text-xs text-gray-500 mt-1">Reason: {l.reason}</div>
              {l.status === 'pending' && (
                <div className="flex gap-2 mt-3">
                  <button onClick={() => handleReview(l._id, 'approved')}
                    className="flex-1 py-2 rounded-lg bg-green-600 text-sm font-medium">Approve</button>
                  <button onClick={() => handleReview(l._id, 'rejected')}
                    className="flex-1 py-2 rounded-lg bg-red-600 text-sm font-medium">Reject</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
