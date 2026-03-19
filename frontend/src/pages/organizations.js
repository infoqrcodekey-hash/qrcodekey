// ============================================
// pages/organizations.js - Organization List & Create
// ============================================

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { orgAPI } from '../lib/api';
import Link from 'next/link';
import LanguageSwitcher from '../components/LanguageSwitcher';
import PasswordInput from '../components/PasswordInput';
import toast from 'react-hot-toast';

const orgTypes = [
  { id: 'school', icon: '🏫', label: 'School' },
  { id: 'hospital', icon: '🏥', label: 'Hospital' },
  { id: 'office', icon: '🏢', label: 'Office' },
  { id: 'company', icon: '🏭', label: 'Company' },
  { id: 'other', icon: '🏛️', label: 'Other' },
];

export default function Organizations() {
  const { user, isLoggedIn } = useAuth();
  const { t } = useLanguage();
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: '', type: 'school', description: '', sharedPassword: '',
    address: '', phone: '', email: ''
  });

  useEffect(() => {
    if (isLoggedIn) fetchOrgs();
  }, [isLoggedIn]);

  const fetchOrgs = async () => {
    try {
      const { data } = await orgAPI.getAll();
      setOrgs(data.data || []);
    } catch (err) {
      toast.error(t('error'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.name || !form.sharedPassword) {
      toast.error(t('requiredFields'));
      return;
    }
    if (form.sharedPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setCreating(true);
    try {
      await orgAPI.create(form);
      toast.success(t('orgCreated'));
      setShowCreate(false);
      setForm({ name: '', type: 'school', description: '', sharedPassword: '', address: '', phone: '', email: '' });
      fetchOrgs();
    } catch (err) {
      toast.error(err.response?.data?.message || t('error'));
    } finally {
      setCreating(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-5">
        <div className="card p-8 text-center max-w-sm">
          <span className="text-5xl block mb-4">🔒</span>
          <h2 className="font-bold text-lg text-gray-200 mb-2">{t('loginRequired')}</h2>
          <p className="text-xs text-gray-400 mb-5">{t('loginToGenerate')}</p>
          <Link href="/login" className="btn-primary inline-block">{t('login')} →</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-50 bg-[rgba(10,10,30,0.85)] backdrop-blur-xl border-b border-[rgba(99,102,241,0.15)] px-5 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-gray-400 hover:text-white text-sm">←</Link>
            <div className="font-bold text-sm text-gray-200">{t('organizations')}</div>
          </div>
          <LanguageSwitcher />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-5 pt-6">
        {/* Header Section */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-black gradient-text">{t('organizations')}</h1>
            <p className="text-xs text-gray-500">{t('manageOrgs')}</p>
          </div>
          <button onClick={() => setShowCreate(!showCreate)} className="btn-primary text-sm px-4">
            {showCreate ? '✕' : '➕'} {showCreate ? t('cancel') : t('create')}
          </button>
        </div>

        {/* Create Form */}
        {showCreate && (
          <div className="card p-5 mb-6 animate-fadeIn space-y-4">
            <h3 className="font-bold text-sm text-indigo-400">🏢 {t('createOrg')}</h3>

            <div>
              <label className="label">{t('orgName')} *</label>
              <input type="text" className="input-field" placeholder={t('orgNamePlaceholder')}
                value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
            </div>

            <div>
              <label className="label">{t('orgType')} *</label>
              <div className="flex flex-wrap gap-2">
                {orgTypes.map(ot => (
                  <button key={ot.id} type="button" onClick={() => setForm({...form, type: ot.id})}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      form.type === ot.id
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white'
                        : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                    }`}>
                    {ot.icon} {ot.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">{t('description')}</label>
              <textarea className="input-field resize-none" rows={2} placeholder={t('orgDescription')}
                value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
            </div>

            <div>
              <label className="label">🔐 {t('sharedPassword')} *</label>
              <PasswordInput value={form.sharedPassword}
                onChange={val => setForm({...form, sharedPassword: val})}
                placeholder={t('sharedPasswordHelp')} showStrength={true} />
              <p className="text-[10px] text-gray-600 mt-1">{t('sharedPasswordNote')}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">{t('phone')}</label>
                <input type="tel" className="input-field" placeholder="+91 XXXXXXXXXX"
                  value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
              </div>
              <div>
                <label className="label">{t('email')}</label>
                <input type="email" className="input-field" placeholder="org@example.com"
                  value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
              </div>
            </div>

            <button onClick={handleCreate} disabled={creating} className="btn-primary w-full">
              {creating ? '⏳ Creating...' : '✅ ' + t('createOrg')}
            </button>
          </div>
        )}

        {/* Organization List */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="card p-5 animate-pulse">
                <div className="h-4 bg-white/10 rounded w-3/4 mb-2" />
                <div className="h-3 bg-white/5 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : orgs.length === 0 ? (
          <div className="card p-8 text-center">
            <span className="text-5xl block mb-4">🏢</span>
            <h3 className="font-bold text-gray-300 mb-2">{t('noOrgs')}</h3>
            <p className="text-xs text-gray-500 mb-4">{t('noOrgsDesc')}</p>
            <button onClick={() => setShowCreate(true)} className="btn-primary text-sm">
              ➕ {t('createOrg')}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {orgs.map(org => {
              const typeInfo = orgTypes.find(ot => ot.id === org.type) || orgTypes[4];
              return (
                <Link key={org._id} href={`/organization/${org._id}`}>
                  <div className="card p-4 hover:border-indigo-500/30 transition-all cursor-pointer">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/10 border border-indigo-500/20 flex items-center justify-center text-xl">
                        {typeInfo.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm text-gray-200 truncate">{org.name}</div>
                        <div className="text-[10px] text-gray-500">{typeInfo.label}</div>
                      </div>
                      <span className="text-gray-600 text-sm">→</span>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-gray-500">
                      <span>📁 {org.groupCount || 0} {t('groups')}</span>
                      <span>👥 {org.memberCount || 0} {t('members')}</span>
                      <span className="truncate max-w-[120px]">🔑 {org.inviteCode}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Shared Dashboard Access */}
        <div className="card p-4 mt-6 text-center">
          <Link href="/shared-dashboard" className="text-xs text-indigo-400 font-semibold hover:text-indigo-300">
            🔗 {t('accessSharedDashboard')}
          </Link>
        </div>
      </main>
    </div>
  );
}
