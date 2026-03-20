import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { notificationAPI, orgAPI } from '@/lib/api';

export default function EmergencyBroadcastPage() {
  const router = useRouter();
  const [orgs, setOrgs] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [result, setResult] = useState(null);
  const [form, setForm] = useState({ title: '', message: '', priority: 'urgent' });

  useEffect(() => { loadOrgs(); }, []);

  const loadOrgs = async () => {
    try {
      const res = await orgAPI.getMyOrgs();
      const list = res.data.data || [];
      setOrgs(list);
      if (list.length > 0) setSelectedOrg(list[0]._id);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!confirm('⚠️ This will send an EMERGENCY alert to ALL members. Are you sure?')) return;

    try {
      setSending(true);
      const res = await notificationAPI.sendEmergency({ orgId: selectedOrg, ...form });
      setResult(res.data);
      setSent(true);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  const templates = [
    { title: '🔥 Fire Evacuation', message: 'FIRE ALERT: Please evacuate the building immediately using the nearest exit. Do NOT use elevators. Gather at the assembly point.' },
    { title: '🌊 Natural Disaster', message: 'EMERGENCY: Natural disaster warning. Follow safety protocols immediately. Stay calm and move to designated safe zones.' },
    { title: '🔒 Lockdown', message: 'LOCKDOWN: The premises is under lockdown. Stay where you are, lock doors, and wait for further instructions from authorities.' },
    { title: '⚕️ Medical Emergency', message: 'MEDICAL EMERGENCY: A medical emergency has been reported. Medical team is responding. Please keep corridors clear.' },
    { title: '📢 General Alert', message: 'IMPORTANT ALERT: Please check with your supervisor for immediate instructions. Stay calm and follow protocols.' }
  ];

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white">
      <Head><title>Emergency Broadcast - QRcodeKey</title></Head>
      <div className="max-w-2xl mx-auto p-4">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-white">← Back</button>
          <h1 className="text-xl font-bold text-red-400">🚨 Emergency Broadcast</h1>
          <div></div>
        </div>

        {/* Warning Banner */}
        <div className="p-4 mb-6 rounded-xl bg-red-500/10 border border-red-500/30">
          <div className="text-sm text-red-400 font-semibold">⚠️ Warning</div>
          <div className="text-xs text-gray-400 mt-1">This will immediately send an alert to ALL members of the selected organization via in-app notification, email, and SMS.</div>
        </div>

        {sent ? (
          <div className="text-center py-10">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-green-400 mb-2">Broadcast Sent!</h2>
            <p className="text-gray-400 mb-2">Alert delivered to {result?.recipientCount || 0} recipients</p>
            <button onClick={() => { setSent(false); setForm({ title: '', message: '', priority: 'urgent' }); }}
              className="mt-4 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10">Send Another</button>
          </div>
        ) : (
          <>
            {orgs.length > 1 && (
              <select value={selectedOrg} onChange={e => setSelectedOrg(e.target.value)}
                className="w-full mb-4 p-3 rounded-xl bg-white/5 border border-white/10 text-white">
                {orgs.map(o => <option key={o._id} value={o._id}>{o.name}</option>)}
              </select>
            )}

            {/* Quick Templates */}
            <div className="mb-4">
              <div className="text-sm text-gray-400 mb-2">Quick Templates:</div>
              <div className="flex flex-wrap gap-2">
                {templates.map((t, i) => (
                  <button key={i} onClick={() => setForm({ ...form, title: t.title, message: t.message })}
                    className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs">{t.title}</button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSend} className="space-y-4">
              <div>
                <label className="text-sm text-gray-400">Alert Title</label>
                <input type="text" placeholder="e.g. Fire Evacuation Alert" value={form.title}
                  onChange={e => setForm({...form, title: e.target.value})}
                  className="w-full mt-1 p-3 rounded-xl bg-white/5 border border-white/10 text-white" required />
              </div>

              <div>
                <label className="text-sm text-gray-400">Message</label>
                <textarea placeholder="Detailed emergency message..." value={form.message}
                  onChange={e => setForm({...form, message: e.target.value})}
                  className="w-full mt-1 p-3 rounded-xl bg-white/5 border border-white/10 text-white" rows={4} required />
              </div>

              <div>
                <label className="text-sm text-gray-400">Priority</label>
                <div className="flex gap-2 mt-1">
                  {['high', 'urgent'].map(p => (
                    <button key={p} type="button" onClick={() => setForm({...form, priority: p})}
                      className={`flex-1 py-2 rounded-lg text-sm capitalize ${form.priority === p ? (p === 'urgent' ? 'bg-red-600' : 'bg-yellow-600') : 'bg-white/5'}`}>
                      {p === 'urgent' ? '🚨 ' : '⚠️ '}{p}
                    </button>
                  ))}
                </div>
              </div>

              <button type="submit" disabled={sending}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-red-600 to-red-800 font-bold text-lg disabled:opacity-50">
                {sending ? '📡 Sending...' : '🚨 SEND EMERGENCY BROADCAST'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}