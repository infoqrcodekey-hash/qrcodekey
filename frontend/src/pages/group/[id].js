// -----------------------------------------------
// pages/group/[id].js - Group Admin Dashboard
// -----------------------------------------------
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../context/AuthContext';
import { groupAttendanceAPI } from '../../lib/api';

export default function GroupDashboard() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuth();
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [qrInput, setQrInput] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [tab, setTab] = useState('members'); // members | summary
  const [summary, setSummary] = useState(null);
  const [summaryMonth, setSummaryMonth] = useState(new Date().getMonth() + 1);
  const [summaryYear, setSummaryYear] = useState(new Date().getFullYear());

  const fetchGroup = useCallback(async () => {
    if (!id) return;
    try {
      const res = await groupAttendanceAPI.getGroup(id);
      if (res.data.success) {
        setGroup(res.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load group');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchGroup();
  }, [fetchGroup]);

  const handleToggle = async () => {
    try {
      const res = await groupAttendanceAPI.toggleAttendance(id);
      if (res.data.success) {
        setGroup(res.data.data);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Toggle failed');
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!qrInput.trim()) return;
    setAddingMember(true);
    try {
      const res = await groupAttendanceAPI.addMember(id, { qrNumber: qrInput.trim() });
      if (res.data.success) {
        setGroup(res.data.data);
        setQrInput('');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add member');
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!confirm('Remove this member?')) return;
    try {
      const res = await groupAttendanceAPI.removeMember(id, memberId);
      if (res.data.success) {
        setGroup(res.data.data);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove member');
    }
  };

  const fetchSummary = async () => {
    try {
      const res = await groupAttendanceAPI.getAttendanceSummary(id, summaryMonth, summaryYear);
      if (res.data.success) {
        setSummary(res.data.data);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to load summary');
    }
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
    } catch (err) {
      alert('Export failed');
    }
  };

  useEffect(() => {
    if (tab === 'summary' && id) {
      fetchSummary();
    }
  }, [tab, summaryMonth, summaryYear]);

  const handleDeleteGroup = async () => {
    if (!confirm('Are you sure you want to delete this group? This cannot be undone.')) return;
    try {
      await groupAttendanceAPI.deleteGroup(id);
      router.push('/group');
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#fff', fontSize: '18px' }}>Loading group...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <div style={{ color: '#ff5252', fontSize: '18px', marginBottom: '20px' }}>{error}</div>
        <button onClick={() => router.push('/group')} style={{ color: '#667eea', background: 'none', border: 'none', cursor: 'pointer' }}>
          Back to Groups
        </button>
      </div>
    );
  }

  const presentCount = group?.members?.filter(m => m.isPresent).length || 0;
  const totalMembers = group?.members?.length || 0;

  const inputStyle = {
    padding: '10px 14px',
    background: '#1a1a2e',
    border: '1px solid #2a2a4a',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', padding: '20px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '25px' }}>
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: 'bold', margin: '0 0 5px' }}>{group?.name}</h1>
            <p style={{ color: '#888', margin: 0, fontSize: '14px' }}>
              {group?.category} | {group?.fixedAddress?.address}
            </p>
          </div>
          <button
            onClick={handleToggle}
            style={{
              background: group?.attendanceEnabled
                ? 'linear-gradient(135deg, #ff5252, #d32f2f)'
                : 'linear-gradient(135deg, #00c853, #2e7d32)',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              padding: '12px 24px',
              fontSize: '15px',
              fontWeight: '600',
              cursor: 'pointer',
              minWidth: '160px',
            }}
          >
            {group?.attendanceEnabled ? 'Stop Attendance' : 'Start Attendance'}
          </button>
        </div>

        {/* Stats Bar */}
        <div style={{ display: 'flex', gap: '15px', marginBottom: '25px' }}>
          <div style={{ flex: 1, background: '#1a1a2e', borderRadius: '10px', padding: '18px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#667eea' }}>{totalMembers}</div>
            <div style={{ color: '#888', fontSize: '13px' }}>Total Members</div>
          </div>
          <div style={{ flex: 1, background: '#1a1a2e', borderRadius: '10px', padding: '18px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#00c853' }}>{presentCount}</div>
            <div style={{ color: '#888', fontSize: '13px' }}>Present Now</div>
          </div>
          <div style={{ flex: 1, background: '#1a1a2e', borderRadius: '10px', padding: '18px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#ff5252' }}>{totalMembers - presentCount}</div>
            <div style={{ color: '#888', fontSize: '13px' }}>Absent</div>
          </div>
          <div style={{ flex: 1, background: '#1a1a2e', borderRadius: '10px', padding: '18px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: group?.attendanceEnabled ? '#00c853' : '#ff5252' }}>
              {group?.attendanceEnabled ? 'ON' : 'OFF'}
            </div>
            <div style={{ color: '#888', fontSize: '13px' }}>Status</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0', marginBottom: '20px', borderBottom: '1px solid #2a2a4a' }}>
          {['members', 'summary'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                background: 'none',
                border: 'none',
                color: tab === t ? '#667eea' : '#888',
                padding: '10px 20px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer',
                borderBottom: tab === t ? '2px solid #667eea' : '2px solid transparent',
                textTransform: 'capitalize',
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Members Tab */}
        {tab === 'members' && (
          <div>
            {/* Add Member Form */}
            <form onSubmit={handleAddMember} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <input
                type="text"
                value={qrInput}
                onChange={e => setQrInput(e.target.value)}
                placeholder="Enter member's QR number"
                style={{ ...inputStyle, flex: 1 }}
              />
              <button
                type="submit"
                disabled={addingMember}
                style={{
                  background: 'linear-gradient(135deg, #667eea, #764ba2)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: addingMember ? 'wait' : 'pointer',
                }}
              >
                {addingMember ? 'Adding...' : '+ Add'}
              </button>
            </form>

            {/* Members List */}
            {group?.members?.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
                No members yet. Add members by their QR number.
              </div>
            ) : (
              group?.members?.map((member, idx) => (
                <div
                  key={member._id || idx}
                  className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-3"
                >
                  {/* Row 1: QR Name + ON/OFF Badge */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${member.isPresent ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                        {member.isPresent ? '🟢' : '🔴'}
                      </div>
                      <div>
                        <p className="font-semibold text-white text-sm">{member.name || 'Member'}</p>
                        <p className="text-xs text-gray-400 font-mono">{member.qrNumber}</p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${member.isPresent ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                      {member.isPresent ? '🔓 ON (Clocked In)' : '🔒 OFF (Clocked Out)'}
                    </span>
                  </div>

                  {/* Row 2: Last Scan Time */}
                  <div className="flex items-center justify-between text-xs border-t border-white/5 pt-2">
                    <span className="text-gray-400">
                      ⏰ Last Scan: {member.lastScanTime ? new Date(member.lastScanTime).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true }) : 'Never'}
                    </span>
                    <button
                      onClick={() => handleRemoveMember(member._id || member.user)}
                      className="text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded hover:bg-red-500/10"
                    >
                      ✕ Remove
                    </button>
                  </div>
                </div>
              )))
            )}
          </div>
        )}

        {/* Summary Tab */}
        {tab === 'summary' && (
          <div>
            {/* Month/Year Selector */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', alignItems: 'center' }}>
              <select
                value={summaryMonth}
                onChange={e => setSummaryMonth(parseInt(e.target.value))}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(2000, i).toLocaleString('default', { month: 'long' })}
                  </option>
                ))}
              </select>
              <select
                value={summaryYear}
                onChange={e => setSummaryYear(parseInt(e.target.value))}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                {[2024, 2025, 2026, 2027].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <button
                onClick={fetchSummary}
                style={{
                  background: '#667eea',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 16px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                Load
              </button>
              <button
                onClick={handleExportCSV}
                style={{
                  background: '#1a1a2e',
                  color: '#667eea',
                  border: '1px solid #667eea',
                  borderRadius: '8px',
                  padding: '10px 16px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                Export CSV
              </button>
            </div>

            {/* Summary Table */}
            {summary ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #2a2a4a' }}>
                      <th style={{ textAlign: 'left', padding: '10px', color: '#888', fontSize: '13px' }}>Member</th>
                      <th style={{ textAlign: 'center', padding: '10px', color: '#888', fontSize: '13px' }}>Present</th>
                      <th style={{ textAlign: 'center', padding: '10px', color: '#888', fontSize: '13px' }}>Absent</th>
                      <th style={{ textAlign: 'center', padding: '10px', color: '#888', fontSize: '13px' }}>%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.members?.map((m, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #1a1a2e' }}>
                        <td style={{ padding: '10px' }}>
                          <div style={{ fontWeight: '500' }}>{m.name}</div>
                          <div style={{ color: '#666', fontSize: '12px' }}>QR: {m.qrNumber}</div>
                        </td>
                        <td style={{ textAlign: 'center', padding: '10px', color: '#00c853' }}>{m.presentDays}</td>
                        <td style={{ textAlign: 'center', padding: '10px', color: '#ff5252' }}>{m.absentDays}</td>
                        <td style={{ textAlign: 'center', padding: '10px' }}>
                          <span style={{
                            background: m.percentage >= 75 ? '#00c85330' : m.percentage >= 50 ? '#ffa72630' : '#ff525230',
                            color: m.percentage >= 75 ? '#00c853' : m.percentage >= 50 ? '#ffa726' : '#ff5252',
                            padding: '3px 10px',
                            borderRadius: '10px',
                            fontSize: '13px',
                            fontWeight: '600',
                          }}>
                            {m.percentage}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
                Select a month and click Load to see summary
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #2a2a4a' }}>
          <button
            onClick={() => router.push('/group')}
            style={{ background: 'none', border: 'none', color: '#667eea', cursor: 'pointer', fontSize: '15px' }}
          >
            ← Back to Groups
          </button>
          <button
            onClick={handleDeleteGroup}
            style={{
              background: 'none',
              border: '1px solid #ff5252',
              color: '#ff5252',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            Delete Group
          </button>
        </div>
      </div>
    </div>
  );
}
