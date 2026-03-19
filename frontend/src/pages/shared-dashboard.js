// ============================================
// pages/shared-dashboard.js - Public Shared Dashboard
// ============================================

import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { orgAPI } from '../lib/api';
import PasswordInput from '../components/PasswordInput';
import LanguageSwitcher from '../components/LanguageSwitcher';
import toast from 'react-hot-toast';

export default function SharedDashboard() {
  const { t } = useLanguage();
  const [inviteCode, setInviteCode] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [dashboard, setDashboard] = useState(null);

  const handleAccess = async () => {
    if (!inviteCode || !password) { toast.error(t('requiredFields')); return; }
    setLoading(true);
    try {
      const { data } = await orgAPI.sharedAccess({ inviteCode: inviteCode.trim().toUpperCase(), password });
      setDashboard(data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || t('error'));
    } finally {
      setLoading(false);
    }
  };

  // Login Form
  if (!dashboard) {
    return (
      <div className="min-h-screen flex items-center justify-center p-5">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-indigo-600/10 rounded-full blur-[100px]" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-600/10 rounded-full blur-[100px]" />
        </div>

        <div className="card p-6 w-full max-w-sm relative z-10 animate-fadeIn">
          <div className="text-center mb-5">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-indigo-500/30 to-purple-500/20 border border-indigo-500/20 flex items-center justify-center">
              <span className="text-2xl">🔗</span>
            </div>
            <h1 className="font-black text-lg gradient-text">{t('sharedDashboard')}</h1>
            <p className="text-xs text-gray-500">{t('sharedDashboardDesc')}</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="label">{t('inviteCode')}</label>
              <input type="text" className="input-field text-center font-mono tracking-widest uppercase"
                placeholder="ORG-XXXXXX" value={inviteCode}
                onChange={e => setInviteCode(e.target.value)} />
            </div>
            <div>
              <label className="label">🔐 {t('sharedPassword')}</label>
              <PasswordInput value={password} onChange={setPassword}
                placeholder={t('enterOrgPassword')} showStrength={false} />
            </div>
            <button onClick={handleAccess} disabled={loading} className="btn-primary w-full">
              {loading ? '⏳...' : '🔓 ' + t('accessDashboard')}
            </button>
          </div>

          <div className="absolute top-3 right-3"><LanguageSwitcher /></div>
        </div>
      </div>
    );
  }

  // Dashboard View
  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-50 bg-[rgba(10,10,30,0.85)] backdrop-blur-xl border-b border-[rgba(99,102,241,0.15)] px-5 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <div className="font-bold text-sm text-gray-200">{dashboard.orgName}</div>
            <div className="text-[10px] text-gray-500">{t('sharedDashboard')} • {new Date().toLocaleDateString('en-IN')}</div>
          </div>
          <button onClick={() => setDashboard(null)} className="text-xs text-gray-400 hover:text-white">🔒 {t('logout')}</button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-5 pt-6">
        <h1 className="text-xl font-black gradient-text mb-1">{t('todayAttendance')}</h1>
        <p className="text-xs text-gray-500 mb-5">{dashboard.groups?.length || 0} {t('groups')}</p>

        {dashboard.groups?.length === 0 ? (
          <div className="card p-8 text-center">
            <span className="text-4xl block mb-3">📁</span>
            <p className="text-sm text-gray-400">{t('noGroups')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {dashboard.groups.map(group => {
              const att = group.todayAttendance;
              const total = att?.total || group.memberCount || 0;
              const present = att?.present || 0;
              const pct = total > 0 ? Math.round((present / total) * 100) : 0;

              return (
                <div key={group._id} className="card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="font-bold text-sm text-gray-200">{group.name}</div>
                      <div className="text-[10px] text-gray-500">👥 {group.memberCount} {t('members')}</div>
                    </div>
                    <div className={`text-lg font-black ${pct >= 75 ? 'text-green-400' : pct >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {pct}%
                    </div>
                  </div>

                  {att ? (
                    <>
                      <div className="h-2 rounded-full bg-white/5 overflow-hidden mb-2 flex">
                        <div className="bg-green-500 h-full" style={{width: `${(att.present/total)*100}%`}} />
                        <div className="bg-yellow-500 h-full" style={{width: `${((att.late||0)/total)*100}%`}} />
                        <div className="bg-red-500/50 h-full flex-1" />
                      </div>
                      <div className="flex gap-4 text-[10px] text-gray-500">
                        <span>✅ {att.present}</span>
                        <span>❌ {att.absent}</span>
                        <span>⏰ {att.late || 0}</span>
                      </div>
                    </>
                  ) : (
                    <p className="text-[10px] text-gray-600">{t('noAttendanceToday')}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
