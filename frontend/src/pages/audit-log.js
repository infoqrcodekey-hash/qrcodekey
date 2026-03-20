import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { auditAPI, orgAPI } from '@/lib/api';

export default function AuditLogPage() {
  const router = useRouter();
  const [orgs, setOrgs] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState('');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionFilter, setActionFilter] = useState('');

  useEffect(() => { loadOrgs(); }, []);
  useEffect(() => { if (selectedOrg) { fetchLogs(); fetchSummary(); } }, [selectedOrg, page, actionFilter]);

  const loadOrgs = async () => {
    try {
      const res = await orgAPI.getMyOrgs();
      const list = res.data.data || [];
      setOrgs(list);
      if (list.length > 0) setSelectedOrg(list[0]._id);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const fetchLogs = async () => {
    try {
      const params = `page=${page}&limit=30${actionFilter ? '&action=' + actionFilter : ''}`;
      const res = await auditAPI.getLogs(selectedOrg, params);
      setLogs(res.data.data || []);
      setTotalPages(res.data.pagination?.pages || 1);
    } catch (err) { console.error(err); }
  };

  const fetchSummary = async () => {
    try {
      const res = await auditAPI.getSummary(selectedOrg);
      setSummary(res.data.data || null);
    } catch (err) { console.error(err); }
  };

  const actionIcons = {
    member_added: '👤➕', member_removed: '👤❌', member_updated: '👤✏️',
    group_created: '📁➕', group_deleted: '📁❌', group_updated: '📁✏️',
    attendance_marked: '✅', attendance_modified: '✏️', attendance_locked: '🔒',
    leave_approved: '✅📋', leave_rejected: '❌📋',
    holiday_added: '🎉➕', holiday_removed: '🎉❌',
    settings_changed: '⚙️', location_updated: '📍', password_changed: '🔑',
    emergency_broadcast: '🚨', visitor_checked_in: '👤➡️', visitor_checked_out: '👤⬅️',
    shift_created: '🕐➕', shift_updated: '🕐✏️', shift_deleted: '🕐❌',
    qr_generated: '📱', qr_bulk_generated: '📱📱', report_generated: '📊'
  };

  const actions = ['member_added', 'member_removed', 'attendance_marked', 'attendance_modified', 'leave_approved', 'leave_rejected', 'holiday_added', 'settings_changed', 'emergency_broadcast', 'visitor_checked_in', 'shift_created', 'qr_generated', 'report_generated'];

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white">
      <Head><title>Audit Log - QRcodeKey</title></Head>
      <div className="max-w-3xl mx-auto p-4">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-white">← Back</button>
          <h1 className="text-xl font-bold text-purple-400">📜 Audit Log</h1>
          <div></div>
        </div>

        {orgs.length > 1 && (
          <select value={selectedOrg} onChange={e => setSelectedOrg(e.target.value)}
            className="w-full mb-4 p-3 rounded-xl bg-white/5 border border-white/10 text-white">
            {orgs.map(o => <option key={o._id} value={o._id}>{o.name}</option>)}
          </select>
        )}

        {/* Summary */}
        {summary && (
          <div className="p-4 mb-4 rounded-xl bg-white/5 border border-white/10">
            <div className="text-sm text-gray-400 mb-2">Last {summary.period}</div>
            <div className="text-2xl font-bold text-purple-400">{summary.totalActions} actions</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {summary.summary?.slice(0, 5).map(s => (
                <span key={s._id} className="px-2 py-1 rounded-full bg-white/5 text-xs text-gray-300">
                  {s._id.replace(/_/g, ' ')}: {s.count}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Action Filter */}
        <select value={actionFilter} onChange={e => { setActionFilter(e.target.value); setPage(1); }}
          className="w-full mb-4 p-3 rounded-xl bg-white/5 border border-white/10 text-white">
          <option value="">All Actions</option>
          {actions.map(a => <option key={a} value={a}>{a.replace(/_/g, ' ').toUpperCase()}</option>)}
        </select>

        {/* Log List */}
        {loading ? (
          <div className="text-center py-10"><div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto"></div></div>
        ) : logs.length === 0 ? (
          <div className="text-center py-10 text-gray-500">No audit logs yet</div>
        ) : (
          <div className="space-y-2">
            {logs.map(log => (
              <div key={log._id} className="p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-start gap-3">
                  <span className="text-lg">{actionIcons[log.action] || '📋'}</span>
                  <div className="flex-1">
                    <div className="text-sm">{log.description}</div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span>{log.user?.name || 'System'}</span>
                      <span>{new Date(log.createdAt).toLocaleString()}</span>
                      <span className="px-1.5 py-0.5 rounded bg-white/5">{log.action?.replace(/_/g, ' ')}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-4">
            <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
              className="px-4 py-2 rounded-lg bg-white/5 text-sm disabled:opacity-30">Prev</button>
            <span className="px-4 py-2 text-sm text-gray-400">Page {page}/{totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages}
              className="px-4 py-2 rounded-lg bg-white/5 text-sm disabled:opacity-30">Next</button>
          </div>
        )}
      </div>
    </div>
  );
}
