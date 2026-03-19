// ============================================
// pages/teams.js - Teams Management
// ============================================
// Team banao, invite karo, members dekho, shared QR codes

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import Link from 'next/link';
import Head from 'next/head';
import toast from 'react-hot-toast';
import api from '../lib/api';
import LanguageSwitcher from '../components/LanguageSwitcher';

export default function TeamsPage() {
  const { isLoggedIn, user } = useAuth();
  const { t } = useLanguage();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('my-teams'); // my-teams | create | join
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teamQRCodes, setTeamQRCodes] = useState([]);
  const [qrLoading, setQrLoading] = useState(false);

  // Create form
  const [createForm, setCreateForm] = useState({ name: '', description: '' });
  const [creating, setCreating] = useState(false);

  // Join form
  const [inviteCode, setInviteCode] = useState('');
  const [joining, setJoining] = useState(false);

  const loadTeams = useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      setLoading(true);
      const res = await api.get('/teams/my');
      setTeams(res.data.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || t('error'));
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn, t]);

  useEffect(() => { loadTeams(); }, [loadTeams]);

  const loadTeamQRCodes = async (teamId) => {
    setQrLoading(true);
    try {
      const res = await api.get(`/teams/${teamId}/qr-codes`);
      setTeamQRCodes(res.data.data || []);
    } catch (err) {
      toast.error(t('error'));
    } finally {
      setQrLoading(false);
    }
  };

  const handleSelectTeam = (team) => {
    setSelectedTeam(team);
    loadTeamQRCodes(team._id);
    setTab('team-detail');
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!createForm.name) return toast.error(t('teamName'));
    setCreating(true);
    try {
      const res = await api.post('/teams/create', createForm);
      if (res.data.success) {
        toast.success(t('success'));
        setCreateForm({ name: '', description: '' });
        await loadTeams();
        setTab('my-teams');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || t('error'));
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!inviteCode) return toast.error(t('inviteCode'));
    setJoining(true);
    try {
      const res = await api.post('/teams/join', { inviteCode });
      if (res.data.success) {
        toast.success(res.data.message);
        setInviteCode('');
        await loadTeams();
        setTab('my-teams');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || t('error'));
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async (teamId) => {
    if (!window.confirm(t('leaveTeam'))) return;
    try {
      await api.post(`/teams/${teamId}/leave`);
      toast.success(t('success'));
      setTab('my-teams');
      setSelectedTeam(null);
      await loadTeams();
    } catch (err) {
      toast.error(err.response?.data?.message || t('error'));
    }
  };

  const copyInviteCode = (code) => {
    navigator.clipboard.writeText(code).then(() => toast.success(t('success')));
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-5">
        <div className="card p-8 text-center max-w-sm">
          <span className="text-5xl block mb-4">🔒</span>
          <Link href="/login" className="btn-primary inline-block">{t('login')} →</Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head><title>{t('teams')} | QR Tracker</title></Head>
      <div className="min-h-screen pb-24">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-[rgba(10,10,30,0.85)] backdrop-blur-xl border-b border-[rgba(99,102,241,0.15)] px-5 py-3">
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              {tab === 'team-detail' ? (
                <button onClick={() => { setTab('my-teams'); setSelectedTeam(null); }} className="text-gray-400 hover:text-white text-sm">←</button>
              ) : (
                <Link href="/dashboard" className="text-gray-400 hover:text-white text-sm">←</Link>
              )}
              <div>
                <div className="font-bold text-sm text-gray-200">
                  {tab === 'team-detail' ? selectedTeam?.name : `👥 ${t('teams')}`}
                </div>
                <div className="text-[10px] text-gray-500">
                  {tab === 'team-detail' ? `${selectedTeam?.members?.length || 0} ${t('members')}` : `${teams.length} ${t('teams')}`}
                </div>
              </div>
            </div>
            <LanguageSwitcher />
          </div>
        </header>

        <main className="max-w-lg mx-auto px-5 pt-4">
          {/* ─── TEAM DETAIL ─── */}
          {tab === 'team-detail' && selectedTeam && (
            <div className="space-y-4 animate-fadeIn">
              {/* Team card */}
              <div className="card p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="font-black text-lg gradient-text">{selectedTeam.name}</h2>
                    {selectedTeam.description && <p className="text-xs text-gray-500 mt-0.5">{selectedTeam.description}</p>}
                  </div>
                  <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">
                    {selectedTeam.owner?._id === user?.id ? 'OWNER' : 'MEMBER'}
                  </span>
                </div>

                {/* Invite Code */}
                {selectedTeam.inviteCode && (
                  <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 mb-4">
                    <div className="text-[10px] text-green-400 font-bold mb-1">🔗 {t('inviteCode')}</div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-green-300 flex-1">{selectedTeam.inviteCode}</span>
                      <button onClick={() => copyInviteCode(selectedTeam.inviteCode)}
                        className="text-[10px] bg-green-500/20 border border-green-500/30 text-green-400 px-2 py-1 rounded-lg">
                        {t('copy')}
                      </button>
                    </div>
                  </div>
                )}

                {/* Members */}
                <div className="mb-4">
                  <div className="text-xs font-bold text-gray-400 mb-2">👤 {t('members')} ({selectedTeam.members?.length})</div>
                  <div className="space-y-2">
                    {selectedTeam.members?.map((m, i) => (
                      <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-white/3 border border-white/5">
                        <div>
                          <div className="text-xs font-bold text-gray-200">{m.user?.name || t('user')}</div>
                          <div className="text-[10px] text-gray-500">{m.user?.email || ''}</div>
                        </div>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          m.role === 'admin' ? 'bg-yellow-500/15 text-yellow-400' : 'bg-white/5 text-gray-500'
                        }`}>{m.role === 'admin' ? t('admin') : t('member')}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Leave button (non-owner) */}
                {selectedTeam.owner?._id !== user?.id && (
                  <button onClick={() => handleLeave(selectedTeam._id)}
                    className="w-full py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold hover:bg-red-500/20">
                    🚪 {t('leaveTeam')}
                  </button>
                )}
              </div>

              {/* Team QR Codes */}
              <div className="card p-4">
                <div className="text-xs font-bold text-gray-400 mb-3">📱 {t('teamQRCodes')}</div>
                {qrLoading ? (
                  <div className="text-center py-6">
                    <div className="animate-spin text-2xl">⏳</div>
                  </div>
                ) : teamQRCodes.length === 0 ? (
                  <div className="text-center py-6 text-xs text-gray-600">{t('noTeamsDesc')}</div>
                ) : (
                  <div className="space-y-2">
                    {teamQRCodes.slice(0, 10).map((qr) => (
                      <div key={qr.qrId} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/3 border border-white/5">
                        {qr.qrImageUrl && (
                          <div className="bg-white rounded p-0.5 flex-shrink-0">
                            {/* eslint-disable-next-line */}
                            <img src={qr.qrImageUrl} alt={qr.qrId} className="w-10 h-10" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-mono text-xs text-indigo-300 truncate">{qr.qrId}</div>
                          <div className="text-[10px] text-gray-500">
                            👤 {qr.owner?.name} • {qr.totalScans || 0} scans
                          </div>
                        </div>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                          qr.isActive ? 'bg-green-500/15 text-green-400' : 'bg-yellow-500/15 text-yellow-400'
                        }`}>{qr.isActive ? t('active') : t('inactive')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── MY TEAMS ─── */}
          {tab === 'my-teams' && (
            <div className="space-y-4 animate-fadeIn">
              {/* Action tabs */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'my-teams', label: `👥 ${t('myTeams')}` },
                  { id: 'create', label: `➕ ${t('createTeam')}` },
                  { id: 'join', label: `🔗 ${t('joinTeam')}` },
                ].map(tabItem => (
                  <button key={tabItem.id} onClick={() => setTab(tabItem.id)}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      tab === tabItem.id ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' : 'bg-white/3 text-gray-500 border-white/5'
                    }`}>
                    {tabItem.label}
                  </button>
                ))}
              </div>

              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin text-3xl mb-3">⏳</div>
                  <div className="text-sm text-gray-500">{t('loading')}...</div>
                </div>
              ) : teams.length === 0 ? (
                <div className="card p-8 text-center">
                  <span className="text-5xl block mb-3">👥</span>
                  <p className="text-sm text-gray-400 mb-4">{t('noTeams')}</p>
                  <p className="text-xs text-gray-600 mb-4">{t('noTeamsDesc')}</p>
                  <div className="flex gap-2 justify-center">
                    <button onClick={() => setTab('create')} className="btn-primary text-sm px-4 py-2">➕ {t('createTeam')}</button>
                    <button onClick={() => setTab('join')} className="btn-secondary text-sm px-4 py-2">🔗 {t('joinTeam')}</button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {teams.map((team) => (
                    <button key={team._id} onClick={() => handleSelectTeam(team)}
                      className="w-full card p-4 text-left hover:border-indigo-500/30 transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-bold text-sm text-gray-200">{team.name}</div>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          team.owner?._id === user?.id ? 'bg-yellow-500/15 text-yellow-400' : 'bg-indigo-500/15 text-indigo-400'
                        }`}>
                          {team.owner?._id === user?.id ? 'OWNER' : 'MEMBER'}
                        </span>
                      </div>
                      {team.description && <p className="text-[11px] text-gray-500 mb-2">{team.description}</p>}
                      <div className="flex items-center gap-3 text-[10px] text-gray-600">
                        <span>👤 {team.members?.length || 0} {t('members')}</span>
                        <span>•</span>
                        <span className="font-mono">{team.inviteCode}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─── CREATE TEAM ─── */}
          {tab === 'create' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'my-teams', label: `👥 ${t('myTeams')}` },
                  { id: 'create', label: `➕ ${t('createTeam')}` },
                  { id: 'join', label: `🔗 ${t('joinTeam')}` },
                ].map(tabItem => (
                  <button key={tabItem.id} onClick={() => setTab(tabItem.id)}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      tab === tabItem.id ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' : 'bg-white/3 text-gray-500 border-white/5'
                    }`}>
                    {tabItem.label}
                  </button>
                ))}
              </div>
              <form onSubmit={handleCreate} className="card p-5 space-y-4">
                <div>
                  <label className="label">{t('teamName')} *</label>
                  <input type="text" className="input-field" placeholder="e.g., Family Tracking, Office QR"
                    value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} required />
                </div>
                <div>
                  <label className="label">{t('teamDescription')} ({t('optional')})</label>
                  <textarea className="input-field resize-none" rows={2} placeholder={t('placeholder')}
                    value={createForm.description} onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))} maxLength={200} />
                </div>
                <button type="submit" disabled={creating} className="btn-primary w-full flex items-center justify-center gap-2">
                  {creating ? <><span className="animate-spin">⏳</span> {t('creating')}...</> : `➕ ${t('createTeam')}`}
                </button>
              </form>
            </div>
          )}

          {/* ─── JOIN TEAM ─── */}
          {tab === 'join' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'my-teams', label: `👥 ${t('myTeams')}` },
                  { id: 'create', label: `➕ ${t('createTeam')}` },
                  { id: 'join', label: `🔗 ${t('joinTeam')}` },
                ].map(tabItem => (
                  <button key={tabItem.id} onClick={() => setTab(tabItem.id)}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      tab === tabItem.id ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' : 'bg-white/3 text-gray-500 border-white/5'
                    }`}>
                    {tabItem.label}
                  </button>
                ))}
              </div>
              <form onSubmit={handleJoin} className="card p-5 space-y-4">
                <div className="text-center mb-2">
                  <span className="text-3xl block mb-2">🔗</span>
                  <p className="text-xs text-gray-500">{t('enterInviteCode')}</p>
                </div>
                <div>
                  <label className="label">{t('inviteCode')}</label>
                  <input type="text" className="input-field uppercase font-mono tracking-widest text-center text-lg"
                    placeholder="TEAM-XXXXXXXX"
                    value={inviteCode} onChange={e => setInviteCode(e.target.value.toUpperCase())} required />
                </div>
                <button type="submit" disabled={joining} className="btn-primary w-full flex items-center justify-center gap-2">
                  {joining ? <><span className="animate-spin">⏳</span> {t('joining')}...</> : `🔗 ${t('joinTeam')}`}
                </button>
              </form>
            </div>
          )}
        </main>

        {/* Bottom Nav */}
        <nav className="fixed bottom-0 inset-x-0 z-50 bg-[rgba(10,10,30,0.92)] backdrop-blur-xl border-t border-[rgba(99,102,241,0.12)] py-2 px-4">
          <div className="max-w-lg mx-auto flex justify-around">
            {[
              { icon: '🏠', label: t('home'), href: '/' },
              { icon: '➕', label: t('generate'), href: '/generate' },
              { icon: '👥', label: t('teams'), href: '/teams' },
              { icon: '📋', label: t('dashboard'), href: '/dashboard' },
            ].map((item, i) => (
              <Link key={i} href={item.href} className={`nav-item ${item.href === '/teams' ? 'text-indigo-400 bg-indigo-500/10' : 'text-gray-500'}`}>
                <span className="text-lg">{item.icon}</span>
                <span className="text-[10px] font-semibold">{item.label}</span>
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </>
  );
}
