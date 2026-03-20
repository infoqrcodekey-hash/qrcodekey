import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { visitorAPI, orgAPI } from '@/lib/api';

export default function VisitorManagementPage() {
  const router = useRouter();
  const [orgs, setOrgs] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState('');
  const [visitors, setVisitors] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [tab, setTab] = useState('today');
  const [form, setForm] = useState({ name: '', phone: '', email: '', company: '', purpose: '', hostName: '', vehicleNumber: '', notes: '' });

  useEffect(() => { loadOrgs(); }, []);
  useEffect(() => { if (selectedOrg) fetchVisitors(); }, [selectedOrg, tab]);

  const loadOrgs = async () => {
    try {
      const res = await orgAPI.getMyOrgs();
      const list = res.data.data || [];
      setOrgs(list);
      if (list.length > 0) setSelectedOrg(list[0]._id);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const fetchVisitors = async () => {
    try {
      let res;
      if (tab === 'today') {
        res = await visitorAPI.getToday(selectedOrg);
        setStats(res.data.stats || {});
      } else {
        res = await visitorAPI.getHistory(selectedOrg);
      }
      setVisitors(res.data.data || []);
    } catch (err) { console.error(err); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await visitorAPI.register({ ...form, orgId: selectedOrg });
      setShowForm(false);
      setForm({ name: '', phone: '', email: '', company: '', purpose: '', hostName: '', vehicleNumber: '', notes: '' });
      fetchVisitors();
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  const handleCheckIn = async (id) => {
    try { await visitorAPI.checkIn(id, {}); fetchVisitors(); } catch (err) { alert('Error'); }
  };

  const handleCheckOut = async (id) => {
    try { await visitorAPI.checkOut(id, {}); fetchVisitors(); } catch (err) { alert('Error'); }
  };

  const statusColors = {
    pre_registered: 'bg-blue-500/20 text-blue-400',
    checked_in: 'bg-green-500/20 text-green-400',
    checked_out: 'bg-gray-500/20 text-gray-400',
    cancelled: 'bg-red-500/20 text-red-400'
  };

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white">
      <Head><title>Visitor Management - QRcodeKey</title></Head>
      <div className="max-w-3xl mx-auto p-4">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-white">← Back</button>
          <h1 className="text-xl font-bold text-purple-400">👤 Visitors</h1>
          <div></div>
        </div>

        {orgs.length > 1 && (
          <select value={selectedOrg} onChange={e => setSelectedOrg(e.target.value)}
            className="w-full mb-4 p-3 rounded-xl bg-white/5 border border-white/10 text-white">
            {orgs.map(o => <option key={o._id} value={o._id}>{o.name}</option>)}
          </select>
        )}

        {/* Stats */}
        {tab === 'today' && (
          <div className="grid grid-cols-4 gap-2 mb-4">
            {[{label:'Total',val:stats.total||0,c:'purple'},{label:'Inside',val:stats.checkedIn||0,c:'green'},{label:'Left',val:stats.checkedOut||0,c:'gray'},{label:'Expected',val:stats.preRegistered||0,c:'blue'}].map(s => (
              <div key={s.label} className={`p-3 rounded-xl bg-${s.c}-500/10 border border-${s.c}-500/20 text-center`}>
                <div className={`text-xl font-bold text-${s.c}-400`}>{s.val}</div>
                <div className="text-[10px] text-gray-400">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {['today', 'history'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm capitalize ${tab === t ? 'bg-purple-600' : 'bg-white/5'}`}>{t}</button>
          ))}
        </div>

        <button onClick={() => setShowForm(!showForm)}
          className="w-full mb-4 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 font-semibold">
          + Register Visitor
        </button>

        {showForm && (
          <form onSubmit={handleRegister} className="p-4 mb-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
            <input type="text" placeholder="Visitor Name *" value={form.name} onChange={e => setForm({...form, name: e.target.value})}
              className="w-full p-3 rounded-lg bg-white/5 border border-white/10 text-white" required />
            <div className="grid grid-cols-2 gap-3">
              <input type="tel" placeholder="Phone" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
                className="p-3 rounded-lg bg-white/5 border border-white/10 text-white" />
              <input type="email" placeholder="Email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                className="p-3 rounded-lg bg-white/5 border border-white/10 text-white" />
            </div>
            <input type="text" placeholder="Company" value={form.company} onChange={e => setForm({...form, company: e.target.value})}
              className="w-full p-3 rounded-lg bg-white/5 border border-white/10 text-white" />
            <input type="text" placeholder="Purpose of Visit *" value={form.purpose} onChange={e => setForm({...form, purpose: e.target.value})}
              className="w-full p-3 rounded-lg bg-white/5 border border-white/10 text-white" required />
            <input type="text" placeholder="Host / Meeting With" value={form.hostName} onChange={e => setForm({...form, hostName: e.target.value})}
              className="w-full p-3 rounded-lg bg-white/5 border border-white/10 text-white" />
            <input type="text" placeholder="Vehicle Number" value={form.vehicleNumber} onChange={e => setForm({...form, vehicleNumber: e.target.value})}
              className="w-full p-3 rounded-lg bg-white/5 border border-white/10 text-white" />
            <textarea placeholder="Notes" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})}
              className="w-full p-3 rounded-lg bg-white/5 border border-white/10 text-white" rows={2} />
            <button type="submit" className="w-full py-3 rounded-lg bg-purple-600 font-semibold">Register</button>
          </form>
        )}

        {/* Visitor List */}
        <div className="space-y-2">
          {visitors.length === 0 ? (
            <div className="text-center py-10 text-gray-500"><div className="text-4xl mb-2">👤</div><p>No visitors {tab === 'today' ? 'today' : 'found'}</p></div>
          ) : visitors.map(v => (
            <div key={v._id} className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold">{v.name}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs ${statusColors[v.status] || ''}`}>
                  {v.status?.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="text-sm text-gray-400">{v.purpose}</div>
              <div className="text-xs text-gray-500 mt-1">
                {v.company && <span>{v.company} • </span>}
                {v.hostName && <span>Host: {v.hostName} • </span>}
                {v.phone && <span>{v.phone}</span>}
              </div>
              {v.checkIn?.time && <div className="text-xs text-green-400 mt-1">In: {new Date(v.checkIn.time).toLocaleTimeString()}</div>}
              {v.checkOut?.time && <div className="text-xs text-gray-400">Out: {new Date(v.checkOut.time).toLocaleTimeString()}</div>}
              <div className="flex gap-2 mt-2">
                {v.status === 'pre_registered' && (
                  <button onClick={() => handleCheckIn(v._id)} className="flex-1 py-2 rounded-lg bg-green-600 text-sm">Check In</button>
                )}
                {v.status === 'checked_in' && (
                  <button onClick={() => handleCheckOut(v._id)} className="flex-1 py-2 rounded-lg bg-gray-600 text-sm">Check Out</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
