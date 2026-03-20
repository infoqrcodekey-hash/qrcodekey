import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { holidayAPI, orgAPI } from '@/lib/api';

export default function HolidayCalendarPage() {
  const router = useRouter();
  const [orgs, setOrgs] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState('');
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear());
  const [form, setForm] = useState({ name: '', date: '', endDate: '', type: 'company', description: '', isOptional: false });

  useEffect(() => { loadOrgs(); }, []);
  useEffect(() => { if (selectedOrg) fetchHolidays(); }, [selectedOrg, year]);

  const loadOrgs = async () => {
    try {
      const res = await orgAPI.getMyOrgs();
      const list = res.data.data || [];
      setOrgs(list);
      if (list.length > 0) setSelectedOrg(list[0]._id);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const fetchHolidays = async () => {
    try {
      const res = await holidayAPI.getAll(selectedOrg, year);
      setHolidays(res.data.data || []);
    } catch (err) { console.error(err); }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await holidayAPI.add({ ...form, orgId: selectedOrg });
      setShowForm(false);
      setForm({ name: '', date: '', endDate: '', type: 'company', description: '', isOptional: false });
      fetchHolidays();
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this holiday?')) return;
    try { await holidayAPI.delete(id); fetchHolidays(); } catch (err) { alert('Error'); }
  };

  const typeColors = {
    national: 'bg-red-500/20 text-red-400', regional: 'bg-orange-500/20 text-orange-400',
    religious: 'bg-yellow-500/20 text-yellow-400', company: 'bg-blue-500/20 text-blue-400',
    optional: 'bg-green-500/20 text-green-400', restricted: 'bg-gray-500/20 text-gray-400'
  };

  const types = ['national', 'regional', 'religious', 'company', 'optional', 'restricted'];

  // Group by month
  const groupedByMonth = {};
  holidays.forEach(h => {
    const m = new Date(h.date).toLocaleString('default', { month: 'long' });
    if (!groupedByMonth[m]) groupedByMonth[m] = [];
    groupedByMonth[m].push(h);
  });

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white">
      <Head><title>Holiday Calendar - QRcodeKey</title></Head>
      <div className="max-w-2xl mx-auto p-4">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-white">← Back</button>
          <h1 className="text-xl font-bold text-purple-400">🎉 Holiday Calendar</h1>
          <div></div>
        </div>

        {orgs.length > 1 && (
          <select value={selectedOrg} onChange={e => setSelectedOrg(e.target.value)}
            className="w-full mb-4 p-3 rounded-xl bg-white/5 border border-white/10 text-white">
            {orgs.map(o => <option key={o._id} value={o._id}>{o.name}</option>)}
          </select>
        )}

        {/* Year Selector */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <button onClick={() => setYear(y => y - 1)} className="text-gray-400 hover:text-white text-xl">◀</button>
          <span className="text-2xl font-bold text-purple-400">{year}</span>
          <button onClick={() => setYear(y => y + 1)} className="text-gray-400 hover:text-white text-xl">▶</button>
          <span className="ml-4 text-sm text-gray-400">{holidays.length} holidays</span>
        </div>

        <button onClick={() => setShowForm(!showForm)}
          className="w-full mb-4 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 font-semibold">
          + Add Holiday
        </button>

        {showForm && (
          <form onSubmit={handleAdd} className="p-4 mb-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
            <input type="text" placeholder="Holiday name" value={form.name} onChange={e => setForm({...form, name: e.target.value})}
              className="w-full p-3 rounded-lg bg-white/5 border border-white/10 text-white" required />
            <div className="grid grid-cols-2 gap-3">
              <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})}
                className="p-3 rounded-lg bg-white/5 border border-white/10 text-white" required />
              <input type="date" placeholder="End date (optional)" value={form.endDate} onChange={e => setForm({...form, endDate: e.target.value})}
                className="p-3 rounded-lg bg-white/5 border border-white/10 text-white" />
            </div>
            <select value={form.type} onChange={e => setForm({...form, type: e.target.value})}
              className="w-full p-3 rounded-lg bg-white/5 border border-white/10 text-white">
              {types.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
            <textarea placeholder="Description (optional)" value={form.description} onChange={e => setForm({...form, description: e.target.value})}
              className="w-full p-3 rounded-lg bg-white/5 border border-white/10 text-white" rows={2} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isOptional} onChange={e => setForm({...form, isOptional: e.target.checked})} /> Optional Holiday
            </label>
            <button type="submit" className="w-full py-3 rounded-lg bg-purple-600 font-semibold">Add Holiday</button>
          </form>
        )}

        {/* Holiday List by Month */}
        {Object.keys(groupedByMonth).length === 0 ? (
          <div className="text-center py-10 text-gray-500"><div className="text-4xl mb-2">📅</div><p>No holidays added for {year}</p></div>
        ) : Object.entries(groupedByMonth).map(([month, items]) => (
          <div key={month} className="mb-6">
            <h3 className="text-sm font-semibold text-gray-400 mb-2 uppercase">{month}</h3>
            <div className="space-y-2">
              {items.map(h => (
                <div key={h._id} className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3">
                  <div className="text-center min-w-[50px]">
                    <div className="text-lg font-bold text-purple-400">{new Date(h.date).getDate()}</div>
                    <div className="text-[10px] text-gray-500">{new Date(h.date).toLocaleString('default', {weekday:'short'})}</div>
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{h.name}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] ${typeColors[h.type] || ''}`}>{h.type}</span>
                      {h.isOptional && <span className="text-[10px] text-gray-500">Optional</span>}
                    </div>
                  </div>
                  <button onClick={() => handleDelete(h._id)} className="text-red-400 hover:text-red-300 text-sm">🗑</button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
