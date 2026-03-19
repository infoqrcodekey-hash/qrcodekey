// ============================================
// pages/bulk-qr-attendance.js - Bulk QR Generation for Groups
// ============================================

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useAuth } from '../context/AuthContext';
import { orgAPI, attendanceScanAPI } from '../lib/api';

export default function BulkQRAttendance() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [orgs, setOrgs] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState('');
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [members, setMembers] = useState([]);
  const [qrResults, setQrResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch orgs
  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }

    const fetchOrgs = async () => {
      try {
        const res = await orgAPI.getMyOrgs();
        setOrgs(res.data.data || []);
      } catch (err) { setError('Failed to load organizations'); }
      setLoading(false);
    };
    fetchOrgs();
  }, [user, authLoading, router]);

  // Fetch groups when org changes
  useEffect(() => {
    if (!selectedOrg) return;
    const fetchGroups = async () => {
      try {
        const res = await orgAPI.getGroups(selectedOrg);
        setGroups(res.data.data || []);
      } catch (err) { setError('Failed to load groups'); }
    };
    fetchGroups();
  }, [selectedOrg]);

  // Fetch members when group changes
  useEffect(() => {
    if (!selectedGroup || !selectedOrg) return;
    const fetchMembers = async () => {
      try {
        const res = await orgAPI.getMembers(selectedOrg, selectedGroup);
        setMembers(res.data.data || []);
      } catch (err) { setError('Failed to load members'); }
    };
    fetchMembers();
  }, [selectedGroup, selectedOrg]);

  // Generate QR codes
  const handleGenerate = async () => {
    if (!selectedGroup) return;
    setGenerating(true);
    setError('');
    setSuccess('');
    try {
      const res = await attendanceScanAPI.bulkGenerateQR(selectedGroup);
      setQrResults(res.data.data || []);
      setSuccess(`Generated QR codes for ${res.data.data?.length || 0} members!`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate QR codes');
    }
    setGenerating(false);
  };

  // Print QR sheet
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    const groupName = groups.find(g => g._id === selectedGroup)?.name || 'Group';
    const orgName = orgs.find(o => o._id === selectedOrg)?.name || 'Organization';

    printWindow.document.write(`
      <html><head><title>QR Codes - ${groupName}</title>
      <style>
        body { font-family: Arial; padding: 20px; }
        h1 { text-align: center; margin-bottom: 5px; }
        h2 { text-align: center; color: #666; margin-top: 0; }
        .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 20px; }
        .card { border: 1px solid #ddd; padding: 15px; text-align: center; border-radius: 8px; page-break-inside: avoid; }
        .card img { width: 150px; height: 150px; }
        .card h3 { margin: 8px 0 2px; font-size: 14px; }
        .card p { margin: 2px 0; font-size: 11px; color: #666; }
        @media print { .no-print { display: none; } }
      </style></head><body>
      <h1>${orgName}</h1>
      <h2>${groupName} - QR Code Sheet</h2>
      <div class="grid">
        ${qrResults.map(m => `
          <div class="card">
            <img src="${m.qrImageUrl}" alt="QR" />
            <h3>${m.name}</h3>
            <p>Roll: ${m.rollNumber || '-'}</p>
            <p>${m.qrId}</p>
          </div>
        `).join('')}
      </div>
      <script>window.print();</script>
      </body></html>
    `);
    printWindow.document.close();
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <>
      <Head><title>Bulk QR Generator - QRcodeKey</title></Head>
      <div className="min-h-screen bg-[#0a0a1a] text-white p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => router.back()} className="text-gray-400 hover:text-white">&larr; Back</button>
            <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Bulk QR Generator
            </h1>
            <div></div>
          </div>

          {/* Selection */}
          <div className="bg-white/5 backdrop-blur rounded-xl p-6 mb-6">
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Organization</label>
                <select
                  value={selectedOrg}
                  onChange={(e) => { setSelectedOrg(e.target.value); setSelectedGroup(''); setQrResults([]); }}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white"
                >
                  <option value="" className="bg-gray-900">Select Organization</option>
                  {orgs.map(o => <option key={o._id} value={o._id} className="bg-gray-900">{o.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Group / Class</label>
                <select
                  value={selectedGroup}
                  onChange={(e) => { setSelectedGroup(e.target.value); setQrResults([]); }}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white"
                  disabled={!selectedOrg}
                >
                  <option value="" className="bg-gray-900">Select Group</option>
                  {groups.map(g => <option key={g._id} value={g._id} className="bg-gray-900">{g.name} ({g.type})</option>)}
                </select>
              </div>
            </div>

            {selectedGroup && (
              <div className="flex gap-3">
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl font-bold hover:opacity-90 transition disabled:opacity-50"
                >
                  {generating ? 'Generating...' : `Generate QR for ${members.length} Members`}
                </button>
              </div>
            )}
          </div>

          {error && <div className="bg-red-900/30 border border-red-500/30 rounded-xl p-4 mb-6 text-red-400">{error}</div>}
          {success && <div className="bg-green-900/30 border border-green-500/30 rounded-xl p-4 mb-6 text-green-400">{success}</div>}

          {/* QR Results Grid */}
          {qrResults.length > 0 && (
            <>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold">Generated QR Codes ({qrResults.length})</h2>
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition text-sm"
                >
                  🖨 Print QR Sheet
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {qrResults.map((m, i) => (
                  <div key={i} className="bg-white/5 backdrop-blur rounded-xl p-4 text-center">
                    <img src={m.qrImageUrl} alt={m.name} className="w-32 h-32 mx-auto mb-3 rounded-lg" />
                    <p className="font-semibold text-sm">{m.name}</p>
                    <p className="text-xs text-gray-400">{m.rollNumber || '-'}</p>
                    <p className="text-xs text-indigo-400 mt-1">{m.qrId}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
