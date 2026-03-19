// ============================================
// pages/group/[id].js - Group Detail & Member Management
// ============================================

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { orgAPI } from '../../lib/api';
import Link from 'next/link';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import toast from 'react-hot-toast';

const roleLabels = {
  student: '🎓 Student', teacher: '👨‍🏫 Teacher', staff: '👔 Staff',
  patient: '🏥 Patient', employee: '💼 Employee', visitor: '🚶 Visitor', other: '👤 Other'
};

export default function GroupDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { t } = useLanguage();

  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [adding, setAdding] = useState(false);
  const [memberForm, setMemberForm] = useState({ name: '', rollNumber: '', email: '', phone: '', role: 'student' });
  const [bulkText, setBulkText] = useState('');
  const [editingMember, setEditingMember] = useState(null);

  useEffect(() => {
    if (id) fetchGroup();
  }, [id]);

  const fetchGroup = async () => {
    try {
      const { data } = await orgAPI.getGroup(id);
      setGroup(data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load');
      router.push('/organizations');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!memberForm.name) { toast.error(t('requiredFields')); return; }
    setAdding(true);
    try {
      await orgAPI.addMember(id, memberForm);
      toast.success(t('memberAdded'));
      setShowAddMember(false);
      setMemberForm({ name: '', rollNumber: '', email: '', phone: '', role: 'student' });
      fetchGroup();
    } catch (err) {
      toast.error(err.response?.data?.message || t('error'));
    } finally {
      setAdding(false);
    }
  };

  const handleBulkAdd = async () => {
    const lines = bulkText.trim().split('\n').filter(l => l.trim());
    if (lines.length === 0) { toast.error('Enter at least one member'); return; }

    const members = lines.map((line, i) => {
      const parts = line.split(',').map(s => s.trim());
      return {
        name: parts[0] || `Member ${i + 1}`,
        rollNumber: parts[1] || '',
        email: parts[2] || '',
        phone: parts[3] || '',
        role: 'student'
      };
    });

    setAdding(true);
    try {
      const { data } = await orgAPI.addMembers(id, { members });
      toast.success(data.message);
      setShowBulkAdd(false);
      setBulkText('');
      fetchGroup();
    } catch (err) {
      toast.error(err.response?.data?.message || t('error'));
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveMember = async (memberId, memberName) => {
    if (!confirm(`Remove "${memberName}"?`)) return;
    try {
      await orgAPI.removeMember(memberId);
      toast.success('Member removed');
      fetchGroup();
    } catch (err) {
      toast.error(err.response?.data?.message || t('error'));
    }
  };

  const handleUpdateMember = async () => {
    if (!editingMember) return;
    try {
      await orgAPI.updateMember(editingMember._id, editingMember);
      toast.success('Member updated');
      setEditingMember(null);
      fetchGroup();
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

  if (!group) return null;

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-50 bg-[rgba(10,10,30,0.85)] backdrop-blur-xl border-b border-[rgba(99,102,241,0.15)] px-5 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="text-gray-400 hover:text-white text-sm">←</button>
            <div className="font-bold text-sm text-gray-200 truncate max-w-[200px]">{group.name}</div>
          </div>
          <LanguageSwitcher />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-5 pt-6">
        {/* Group Header */}
        <div className="card p-5 mb-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-lg font-black gradient-text">{group.name}</h1>
              <p className="text-[10px] text-gray-500">{group.organization?.name} • {group.type}</p>
            </div>
            <Link href={`/attendance/${group._id}`}>
              <span className="btn-primary text-xs px-3 py-1.5 cursor-pointer">📋 {t('attendance')}</span>
            </Link>
          </div>

          {/* QR Code for Attendance */}
          {group.qrImage && (
            <div className="bg-white/5 rounded-xl p-4 text-center border border-white/10">
              <p className="text-[10px] text-gray-500 mb-2">{t('attendanceQR')}</p>
              <img src={group.qrImage} alt="QR Code" className="w-32 h-32 mx-auto rounded-lg" />
              <p className="text-[10px] text-gray-600 mt-2 font-mono">{group.qrCode}</p>
              <p className="text-[10px] text-indigo-400 mt-1">{t('scanToMarkAttendance')}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 mt-3 text-center">
            <div className="bg-white/5 rounded-xl p-2">
              <div className="text-xl font-black text-indigo-400">{group.members?.length || 0}</div>
              <div className="text-[9px] text-gray-500 uppercase tracking-wider">{t('members')}</div>
            </div>
            <div className="bg-white/5 rounded-xl p-2">
              <div className="text-xl font-black text-green-400">{group.members?.filter(m => m.isActive).length || 0}</div>
              <div className="text-[9px] text-gray-500 uppercase tracking-wider">{t('active')}</div>
            </div>
          </div>
        </div>

        {/* Member Actions */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-sm text-gray-300">👥 {t('members')}</h2>
          <div className="flex gap-2">
            <button onClick={() => { setShowBulkAdd(!showBulkAdd); setShowAddMember(false); }}
              className="text-[10px] text-purple-400 font-semibold hover:text-purple-300">
              {showBulkAdd ? '✕' : '📋'} {t('bulkAdd')}
            </button>
            <button onClick={() => { setShowAddMember(!showAddMember); setShowBulkAdd(false); }}
              className="text-[10px] text-indigo-400 font-semibold hover:text-indigo-300">
              {showAddMember ? '✕' : '➕'} {t('addMember')}
            </button>
          </div>
        </div>

        {/* Add Single Member Form */}
        {showAddMember && (
          <div className="card p-4 mb-4 animate-fadeIn space-y-3">
            <div>
              <label className="label">{t('memberName')} *</label>
              <input type="text" className="input-field" placeholder={t('memberNamePlaceholder')}
                value={memberForm.name} onChange={e => setMemberForm({...memberForm, name: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">{t('rollNumber')}</label>
                <input type="text" className="input-field" placeholder="001"
                  value={memberForm.rollNumber} onChange={e => setMemberForm({...memberForm, rollNumber: e.target.value})} />
              </div>
              <div>
                <label className="label">{t('role')}</label>
                <select className="input-field" value={memberForm.role}
                  onChange={e => setMemberForm({...memberForm, role: e.target.value})}>
                  {Object.entries(roleLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">{t('phone')}</label>
                <input type="tel" className="input-field" placeholder="+91..."
                  value={memberForm.phone} onChange={e => setMemberForm({...memberForm, phone: e.target.value})} />
              </div>
              <div>
                <label className="label">{t('email')}</label>
                <input type="email" className="input-field" placeholder="name@..."
                  value={memberForm.email} onChange={e => setMemberForm({...memberForm, email: e.target.value})} />
              </div>
            </div>
            <button onClick={handleAddMember} disabled={adding} className="btn-primary w-full text-sm">
              {adding ? '⏳...' : '✅ ' + t('addMember')}
            </button>
          </div>
        )}

        {/* Bulk Add Form */}
        {showBulkAdd && (
          <div className="card p-4 mb-4 animate-fadeIn space-y-3">
            <p className="text-[10px] text-gray-500">{t('bulkAddHelp')}</p>
            <textarea className="input-field resize-none font-mono text-[11px]" rows={6}
              placeholder={"Rahul Sharma, 001, rahul@email.com, 9876543210\nPriya Patel, 002, priya@email.com\nAmit Kumar, 003"}
              value={bulkText} onChange={e => setBulkText(e.target.value)} />
            <button onClick={handleBulkAdd} disabled={adding} className="btn-primary w-full text-sm">
              {adding ? '⏳...' : '📋 ' + t('addAll')}
            </button>
          </div>
        )}

        {/* Edit Member Modal */}
        {editingMember && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/60 backdrop-blur-sm">
            <div className="card p-5 w-full max-w-sm space-y-3 animate-fadeIn">
              <h3 className="font-bold text-sm text-gray-300">✏️ {t('editMember')}</h3>
              <input type="text" className="input-field" value={editingMember.name}
                onChange={e => setEditingMember({...editingMember, name: e.target.value})} />
              <div className="grid grid-cols-2 gap-3">
                <input type="text" className="input-field" placeholder={t('rollNumber')} value={editingMember.rollNumber || ''}
                  onChange={e => setEditingMember({...editingMember, rollNumber: e.target.value})} />
                <select className="input-field" value={editingMember.role}
                  onChange={e => setEditingMember({...editingMember, role: e.target.value})}>
                  {Object.entries(roleLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditingMember(null)} className="flex-1 py-2 rounded-xl bg-white/5 text-gray-400 text-xs">{t('cancel')}</button>
                <button onClick={handleUpdateMember} className="flex-1 btn-primary text-sm">✅ {t('save')}</button>
              </div>
            </div>
          </div>
        )}

        {/* Members List */}
        {(!group.members || group.members.length === 0) ? (
          <div className="card p-8 text-center">
            <span className="text-4xl block mb-3">👥</span>
            <h3 className="font-bold text-gray-300 text-sm mb-1">{t('noMembers')}</h3>
            <p className="text-[10px] text-gray-500">{t('noMembersDesc')}</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {group.members.map((member, idx) => (
              <div key={member._id} className="card p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500/30 to-purple-500/20 border border-indigo-500/20 flex items-center justify-center text-xs font-bold text-indigo-400">
                  {member.rollNumber || (idx + 1)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-xs text-gray-200 truncate">{member.name}</div>
                  <div className="text-[10px] text-gray-500">
                    {roleLabels[member.role] || member.role}
                    {member.phone && ` • ${member.phone}`}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setEditingMember({...member})}
                    className="p-1 rounded-lg bg-white/5 text-gray-400 text-[10px] hover:bg-white/10">✏️</button>
                  <button onClick={() => handleRemoveMember(member._id, member.name)}
                    className="p-1 rounded-lg bg-red-500/10 text-red-400 text-[10px] hover:bg-red-500/20">🗑</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
