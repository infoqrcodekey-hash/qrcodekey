// -----------------------------------------------
// pages/group/index.js - Group Attendance List
// -----------------------------------------------
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../context/AuthContext';
import { groupAttendanceAPI } from '../../lib/api';
import { useGroupT } from '../../lib/groupTranslations';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';

export default function GroupList() {
  const router = useRouter();
  const { user } = useAuth();
  const { gt } = useGroupT();
  const [adminGroups, setAdminGroups] = useState([]);
  const [memberGroups, setMemberGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => { fetchGroups(); }, []);

  const fetchGroups = async () => {
    try {
      const res = await groupAttendanceAPI.getMyGroups();
      if (res.data?.success) {
        setAdminGroups(res.data.data?.adminGroups || []);
        setMemberGroups(res.data.data?.memberGroups || []);
      }
    } catch (err) {
      console.error('Error fetching groups:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (groupId, groupName) => {
    if (!confirm(gt('deleteGroupConfirm', { name: groupName }))) return;
    setDeleting(groupId);
    try {
      await groupAttendanceAPI.deleteGroup(groupId);
      setAdminGroups(prev => prev.filter(g => g._id !== groupId));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete group');
    }
    setDeleting(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-950 to-black flex items-center justify-center">
        <div className="text-white text-lg animate-pulse">{gt('loadingGroups')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-950 to-black text-white px-4 py-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{gt('groupAttendance')}</h1>
          <p className="text-sm text-gray-400 mt-1">{gt('manageGroups')}</p>
        </div>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <button
            onClick={() => router.push('/group/create')}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold text-sm transition-all">
            {gt('createBtn')}
          </button>
        </div>
      </div>

      {/* Admin Groups */}
      {adminGroups.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-indigo-400 mb-3">{gt('myGroupsAdmin')}</h2>
          <div className="space-y-3">
            {adminGroups.map(group => (
              <div key={group._id} className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:border-indigo-500/50 transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex-1 cursor-pointer" onClick={() => router.push('/group/' + group._id)}>
                    <h3 className="text-base font-semibold">{group.name}</h3>
                    <p className="text-sm text-gray-400 mt-1">
                      {group.category} &bull; {group.members?.length || 0} {gt('membersCount')}
                    </p>
                    {group.fixedAddress?.address && (
                      <p className="text-xs text-gray-500 mt-1">{group.fixedAddress.address}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      group.attendanceEnabled
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}>
                      {group.attendanceEnabled ? gt('activeStatus') : gt('offStatus')}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(group._id, group.name); }}
                      disabled={deleting === group._id}
                      className="p-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-transparent hover:border-red-500/30 transition-all disabled:opacity-50"
                      title={gt('deleteGroupBtn')}>
                      {deleting === group._id ? (
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Member Groups */}
      {memberGroups.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-purple-400 mb-3">{gt('groupsBelongTo')}</h2>
          <div className="space-y-3">
            {memberGroups.map(group => {
              const myMember = group.members?.find(m => m.user === user?._id || m.user?._id === user?._id);
              return (
                <div key={group._id} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-base font-semibold">{group.name}</h3>
                      <p className="text-sm text-gray-400 mt-1">
                        {group.category} &bull; Admin: {group.adminName}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      myMember?.isPresent
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                    }`}>
                      {myMember?.isPresent ? gt('presentStatus') : gt('absentStatus')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {adminGroups.length === 0 && memberGroups.length === 0 && (
        <div className="text-center py-16">
          <div className="text-6xl mb-5">ð</div>
          <h2 className="text-xl font-semibold mb-2">{gt('noGroupsYet')}</h2>
          <p className="text-gray-400 mb-6">{gt('createFirstGroup')}</p>
          <button
            onClick={() => router.push('/group/create')}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold transition-all">
            {gt('createGroup')}
          </button>
        </div>
      )}

      {/* Back */}
      <div className="text-center mt-6">
        <button
          onClick={() => router.push('/dashboard')}
          className="text-indigo-400 hover:text-indigo-300 text-sm transition-colors">
          {gt('backToDashboard')}
        </button>
      </div>
    </div>
  );
}
