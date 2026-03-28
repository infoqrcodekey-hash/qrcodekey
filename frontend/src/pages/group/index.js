// ----------------------------------------------- 
// pages/group/index.js - Group Attendance List
// -----------------------------------------------
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../context/AuthContext';
import { groupAttendanceAPI } from '../../lib/api';

export default function GroupList() {
  const router = useRouter();
  const { user } = useAuth();
  const [adminGroups, setAdminGroups] = useState([]);
  const [memberGroups, setMemberGroups] = useState([]);
  const [loading, setLoading] = useState(true);  

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const res = await groupAttendanceAPI.getMyGroups();
      if (res.data.success) {
        setAdminGroups(res.data.data.adminGroups || []);
        setMemberGroups(res.data.data.memberGroups || []);
      }
    } catch (err) {
      console.error('Error fetching groups:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#fff', fontSize: '18px' }}>Loading groups...</div>
      </div>
    );
  }

  const cardStyle = {
    background: '#1a1a2e',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '12px',
    cursor: 'pointer',
    border: '1px solid #2a2a4a',
    transition: 'border-color 0.2s',
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', padding: '20px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>Group Attendance</h1>
            <p style={{ color: '#888', margin: '5px 0 0' }}>Manage your attendance groups</p>
          </div>
          <button
            onClick={() => router.push('/group/create')}
            style={{
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            + Create Group
          </button>
        </div>

        {/* Admin Groups */}
        {adminGroups.length > 0 && (
          <div style={{ marginBottom: '30px' }}>
            <h2 style={{ fontSize: '20px', color: '#667eea', marginBottom: '15px' }}>
              My Groups (Admin)
            </h2>
            {adminGroups.map(group => (
              <div
                key={group._id}
                style={cardStyle}
                onClick={() => router.push(`/group/${group._id}`)}
                onMouseOver={e => e.currentTarget.style.borderColor = '#667eea'}
                onMouseOut={e => e.currentTarget.style.borderColor = '#2a2a4a'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 5px' }}>{group.name}</h3>
                    <p style={{ color: '#888', margin: 0, fontSize: '14px' }}>
                      {group.category} • {group.members?.length || 0} members
                    </p>
                    <p style={{ color: '#666', margin: '4px 0 0', fontSize: '13px' }}>
                      {group.fixedAddress?.address}
                    </p>
                  </div>
                  <div style={{
                    background: group.attendanceEnabled ? '#00c853' : '#ff5252',
                    color: '#fff',
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontSize: '13px',
                    fontWeight: '600',
                  }}>
                    {group.attendanceEnabled ? 'ACTIVE' : 'OFF'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Member Groups */}
        {memberGroups.length > 0 && (
          <div style={{ marginBottom: '30px' }}>
            <h2 style={{ fontSize: '20px', color: '#764ba2', marginBottom: '15px' }}>
              Groups I Belong To
            </h2>
            {memberGroups.map(group => {
              const myMember = group.members?.find(m => m.user === user?._id || m.user?._id === user?._id);
              return (
                <div key={group._id} style={{ ...cardStyle, cursor: 'default' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 5px' }}>{group.name}</h3>
                      <p style={{ color: '#888', margin: 0, fontSize: '14px' }}>
                        {group.category} • Admin: {group.adminName}
                      </p>
                    </div>
                    <div style={{
                      background: myMember?.isPresent ? '#00c853' : '#555',
                      color: '#fff',
                      padding: '6px 14px',
                      borderRadius: '20px',
                      fontSize: '13px',
                      fontWeight: '600',
                    }}>
                      {myMember?.isPresent ? 'PRESENT' : 'ABSENT'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {adminGroups.length === 0 && memberGroups.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: '60px', marginBottom: '20px' }}>📋</div>
            <h2 style={{ fontSize: '22px', marginBottom: '10px' }}>No Groups Yet</h2>
            <p style={{ color: '#888', marginBottom: '20px' }}>Create your first attendance group to get started</p>
            <button
              onClick={() => router.push('/group/create')}
              style={{
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                padding: '14px 28px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              + Create Group
            </button>
          </div>
        )}

        {/* Back to Dashboard */}
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button
            onClick={() => router.push('/dashboard')}
            style={{ background: 'none', border: 'none', color: '#667eea', cursor: 'pointer', fontSize: '15px' }}
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
