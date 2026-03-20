import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { shiftAPI, orgAPI } from '@/lib/api';

export default function ShiftManagementPage() {
  const router = useRouter();
  const [orgs, setOrgs] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState('');
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [tab, setTab] = useState('shifts');
  const [overtime, setOvertime] = useState([]);
  const [monthlyOT, setMonthlyOT] = useState({});
  const [form, setForm] = useState({
    name: '', code: '', startTime: '09:00', endTime: '18:00', graceMinutes: 15,
    breakStart: '13:00', breakEnd: '14:00', totalHours: 8, overtimeEnabled: true,
    isNightShift: false, color: '#6366f1'
  });

  useEffect(() => { loadOrgs(); }, []);
  useEffect(() => { if (selectedOrg) { fetchShifts(); if (tab === 'overtime') fetchOvertime(); } }, [selectedOrg, tab]);

  const loadOrgs = async () => {
    try {
      const res = await orgAPI.getMyOrgs();
      const list = res.data.data || [];
      setOrgs(list);
      if (list.length > 0) setSelectedOrg(list[0]._id);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const fetchShifts = async () => {
    try {
      const res = await shiftAPI.getAll(selectedOrg);
      setShifts(res.data.data || []);
    } catch (err) { console.error(err); }
  };

  const fetchOvertime = async () => {
    try {
      const res = await shiftAPI.getOvertime(selectedOrg);
      setOvertime(res.data.data || []);
      setMonthlyOT(res.data.monthlyOvertime || {});
    } catch (err) { console.error(err); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await shiftAPI.create({ ...form, orgId: selectedOrg });
      setShowForm(false);
      setForm({ name: '', code: '', startTime: '09:00', endTime: '18:00', graceMinutes: 15, breakStart: '13:00', breakEnd: '14:00', totalHours: 8, overtimeEnabled: true, isNightShift: false, color: '#6366f1' });
      fetchShifts();
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this shift?')) return;
    try { await shiftAPI.delete(id); fetchShifts(); } catch (err) { alert('Error'); }
  };

  const dayNames = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white">
      <Head><title>Shift Management - QRcodeKey</title></Head>
      <div className="max-w-3xl mx-auto p-4">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-white">← Back</button>
          <h1 className="text-xl font-bold text-purple-400">🕐 Shifts & Overtime</h1>
          <div></div>
        </div>

        {orgs.length > 1 && (
          <select value={selectedOrg} onChange={e => setSelectedOrg(e.target.value)}
            className="w-full mb-4 p-3 rounded-xl bg-white/5 border border-white/10 text-white">
            {orgs.map(o => <option key={o._id} value={o._id}>{o.name}</option>)}
          </select>
        )}

        <div className="flex gap-2 mb-4">
          {['shifts', 'overtime'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm capitalize ${tab === t ? 'bg-purple-600' : 'bg-white/5'}`}>{t}</button>
          ))}
        </div>

        {tab === 'shifts' && (
          <>
            <button onClick={() => setShowForm(!showForm)}
              className="w-full mb-4 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 font-semibold">
              + Create Shift
            </button>

            {showForm && (
              <form onSubmit={handleCreate} className="p-4 mb-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" placeholder="Shift Name *" value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                    className="p-3 rounded-lg bg-white/5 border border-white/10 text-white" required />
                  <input type="text" placeholder="Code (e.g. DAY)" value={form.code} onChange={e => setForm({...form, code: e.target.value})}
                    className="p-3 rounded-lg bg-white/5 border border-white/10 text-white" required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400">Start Time</label>
                    <input type="time" value={form.startTime} onChange={e => setForm({...form, startTime: e.target.value})}
                      className="w-full p-3 rounded-lg bg-white/5 border border-white/10 text-white" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">End Time</label>
                    <input type="time" value={form.endTime} onChange={e => setForm({...form, endTime: e.target.value})}
                      className="w-full p-3 rounded-lg bg-white/5 border border-white/10 text-white" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-gray-400">Grace (min)</label>
                    <input type="number" value={form.graceMinutes} onChange={e => setForm({...form, graceMinutes: parseInt(e.target.value)})}
                      className="w-full p-3 rounded-lg bg-white/5 border border-white/10 text-white" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Total Hours</label>
                    <input type="number" value={form.totalHours} onChange={e => setForm({...form, totalHours: parseInt(e.target.value)})}
                      className="w-full p-3 rounded-lg bg-white/5 border border-white/10 text-white" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Color</label>
                    <input type="color" value={form.color} onChange={e => setForm({...form, color: e.target.value})}
                      className="w-full p-3 rounded-lg bg-white/5 border border-white/10 h-[46px]" />
                  </div>
                </div>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={form.overtimeEnabled} onChange={e => setForm({...form, overtimeEnabled: e.target.checked})} /> Overtime
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={form.isNightShift} onChange={e => setForm({...form, isNightShift: e.target.checked})} /> Night Shift
                  </label>
                </div>
                <button type="submit" className="w-full py-3 rounded-lg bg-purple-600 font-semibold">Create Shift</button>
              </form>
            )}

            <div className="space-y-3">
              {shifts.length === 0 ? (
                <div className="text-center py-10 text-gray-500">No shifts created yet</div>
              ) : shifts.map(s => (
                <div key={s._id} className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{backgroundColor: s.color}}></div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{s.name}</span>
                        <span className="text-xs text-gray-400 bg-white/5 px-2 py-0.5 rounded">{s.code}</span>
                        {s.isNightShift && <span className="text-xs text-purple-400">🌙 Night</span>}
                      </div>
                      <div className="text-sm text-gray-400 mt-1">
                        {s.startTime} - {s.endTime} • {s.totalHours}h • Grace: {s.graceMinutes}min
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Days: {s.workingDays?.map(d => dayNames[d]).join(', ')}
                      </div>
                    </div>
                    <button onClick={() => handleDelete(s._id)} className="text-red-400 hover:text-red-300">🗑</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === 'overtime' && (
          <>
            <div className="p-4 mb-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-center">
              <div className="text-2xl font-bold text-purple-400">{monthlyOT.totalHours?.toFixed(1) || 0}h</div>
              <div className="text-xs text-gray-400">Monthly Overtime</div>
            </div>

            <div className="space-y-2">
              {overtime.length === 0 ? (
                <div className="text-center py-10 text-gray-500">No overtime records</div>
              ) : overtime.map(o => (
                <div key={o._id} className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">{o.member?.name}</span>
                    <span className="text-purple-400 font-bold">{o.overtimeHours}h</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(o.date).toLocaleDateString()} • {o.shift?.name || 'N/A'} • {o.overtimeMinutes} min
                  </div>
                  <div className={`text-xs mt-1 ${o.status === 'approved' ? 'text-green-400' : o.status === 'rejected' ? 'text-red-400' : 'text-yellow-400'}`}>
                    {o.status}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
