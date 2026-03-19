// ============================================
// pages/organization/[id].js - Organization Detail
// ============================================

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { orgAPI } from '../../lib/api';
import Link from 'next/link';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import toast from 'react-hot-toast';

const groupTypes = [
  { id: 'classroom', icon: '📚', label: 'Classroom' },
  { id: 'department', icon: '🏬', label: 'Department' },
  { id: 'ward', icon: '🏥', label: 'Ward' },
  { id: 'team', icon: '👥', label: 'Team' },
  { id: 'section', icon: '📋', label: 'Section' },
  { id: 'other', icon: '📂', label: 'Other' },
];

export default function OrganizationDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuth();
  const { t } = useLanguage();

  const [org, setOrg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [creating, setCreating] = useState(false);
  const [groupForm, setGroupForm] = useState({ name: '', type: 'classroom', description: '' });
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (id) fetchOrg();
  }, [id]);

  const fetchOrg = async () => {
    try {
      const { data } = await orgAPI.getOne(id);
      setOrg(data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load');
      router.push('/organizations');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupForm.name) { toast.error(t('requiredFields')); return; }
    setCreating(true);
    try {
      await orgAPI.createGroup(id, groupForm);
      toast.success(t('groupCreated'));
      setShowCreateGroup(false);
      setGroupForm({ name: '', type: 'classroom', description: '' });
      fetchOrg();
    } catch (err) {
      toast.error(err.response?.data?.message || t('error'));
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteGroup = async (groupId, groupName) => {
    if (!confirm(`Delete group "${groupName}"?`)) return;
    try {
      await orgAPI.deleteGroup(groupId);
      toast.success('Group removed');
      fetchOrg();
    } catch (err) {
      toast.error(err.response?.data?.message || t('error'));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!org) return null;

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-50 bg-[rgba(10,10,30,0.85)] backdrop-blur-xl border-b border-[rgba(99,102,241,0.15)] px-5 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/organizations" className="text-gray-400 hover:text-white text-sm">←</Link>
            <div className="font-bold text-sm text-gray-200 truncate max-w-[200px]">{org.name}</div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowSettings(!showSettings)} className="p-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white text-xs">⚙️</button>
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-5 pt-6">
        {/* Org Header Card */}
        <div className="card p-5 mb-5">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/30 to-purple-500/20 border border-indigo-500/20 flex items-center justify-center text-2xl">
              {org.type === 'school' ? '🏫' : org.type === 'hospital' ? '🏥' : org.type === 'office' ? '🏢' : org.type === 'company' ? '🏭' : '🏛️'}
            </div>
            <div className="flex-1">
              <h1 className="text-lg font-black gradient-text">{org.name}</h1>
              <p className="text-[10px] text-gray-500 mt-0.5">{org.description || org.type}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-white/5 rounded-xl p-2">
              <div className="text-lg font-black text-indigo-400">{org.groups?.length || 0}</div>
              <div className="text-[9px] text-gray-500 uppercase tracking-wider">{t('groups')}</div>
            </div>
            <div className="bg-white/5 rounded-xl p-2">
              <div className="text-lg font-black text-green-400">
                {org.groups?.reduce((sum, g) => sum + (g.memberCount || 0), 0) || 0}
              </div>
              <div className="text-[9px] text-gray-500 uppercase tracking-wider">{t('members')}</div>
            </div>
            <div className="bg-white/5 rounded-xl p-2">
              <div className="text-xs font-mono text-purple-400 mt-1">{org.inviteCode}</div>
              <div className="text-[9px] text-gray-500 uppercase tracking-wider">{t('inviteCode')}</div>
            </div>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="card p-4 mb-5 animate-fadeIn">
            <h3 className="font-bold text-sm text-gray-300 mb-3">⚙️ {t('orgSettings')}</h3>
            <div className="space-y-2 text-xs text-gray-400">
              <div className="flex justify-between">
                <span>{t('inviteCode')}</span>
                <span className="font-mono text-indigo-400 select-all">{org.inviteCode}</span>
              </div>
              <div className="flex justify-between">
                <span>{t('owner')}</span>
                <span className="text-gray-300">{org.owner?.name || '-'}</span>
              </div>
              {org.phone && <div className="flex justify-between"><span>{t('phone')}</span><span>{org.phone}</span></div>}
              {org.email && <div className="flex justify-between"><span>{t('email')}</span><span>{org.email}</span></div>}
            </div>
            <p className="text-[10px] text-gray-600 mt-3">{t('shareInviteCode')}</p>
          </div>
        )}

        {/* Create Group Button */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-sm text-gray-300">📁 {t('groups')}</h2>
          <button onClick={() => setShowCreateGroup(!showCreateGroup)} className="text-xs text-indigo-400 font-semibold hover:text-indigo-300">
            {showCreateGroup ? '✕ ' + t('cancel') : '➕ ' + t('addGroup')}
          </button>
        </div>

        {/* Create Group Form */}
        {showCreateGroup && (
          <div className="card p-4 mb-4 animate-fadeIn space-y-3">
            <div>
              <label className="label">{t('groupName')} *</label>
              <input type="text" className="input-field" placeholder={t('groupNamePlaceholder')}
                value={groupForm.name} onChange={e => setGroupForm({...groupForm, name: e.target.value})} />
            </div>
            <div>
              <label className="label">{t('groupType')}</label>
              <div className="flex flex-wrap gap-1.5">
                {groupTypes.map(gt => (
                  <button key={gt.id} type="button" onClick={() => setGroupForm({...groupForm, type: gt.id})}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all ${
                      groupForm.type === gt.id
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white'
                        : 'bg-white/5 text-gray-400 border border-white/10'
                    }`}>
                    {gt.icon} {gt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">{t('description')}</label>
              <input type="text" className="input-field" placeholder={t('groupDescription')}
                value={groupForm.description} onChange={e => setGroupForm({...groupForm, description: e.target.value})} />
            </div>
            <button onClick={handleCreateGroup} disabled={creating} className="btn-primary w-full text-sm">
              {creating ? '⏳...' : '✅ ' + t('createGroup')}
            </button>
          </div>
        )}

        {/* Groups List */}
        {(!org.groups || org.groups.length === 0) ? (
          <div className="card p-8 text-center">
            <span className="text-4xl block mb-3">📁</span>
            <h3 className="font-bold text-gray-300 text-sm mb-1">{t('noGroups')}</h3>
            <p className="text-[10px] text-gray-500">{t('noGroupsDesc')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {org.groups.map(group => {
              const gt = groupTypes.find(g => g.id === group.type) || groupTypes[5];
              return (
                <div key={group._id} className="card p-3 hover:border-indigo-500/20 transition-all">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-base shrink-0">
                      {gt.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link href={`/group/${group._id}`}>
                        <span className="font-bold text-sm text-gray-200 hover:text-indigo-400 cursor-pointer truncate block">
                          {group.name || '(No Name)'}
                        </span>
                      </Link>
                      <div className="flex gap-2 text-[10px] text-gray-500">
                        <span>👥 {group.memberCount || 0}</span>
                        <span>{gt.label}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Link href={`/attendance/${group._id}`}>
                        <span className="p-1.5 rounded-lg bg-green-500/10 text-green-400 text-xs cursor-pointer hover:bg-green-500/20">📋</span>
                      </Link>
                      <Link href={`/group/${group._id}`}>
                        <span className="p-1.5 rounded-lg bg-white/5 text-gray-400 text-xs cursor-pointer hover:bg-white/10">→</span>
                      </Link>
                      <button onClick={() => handleDeleteGroup(group._id, group.name || 'this group')}
                        className="p-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs hover:bg-red-500/20">🗑</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
