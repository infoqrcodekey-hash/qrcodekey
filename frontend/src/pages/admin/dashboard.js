import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import { toast } from 'react-hot-toast';

export default function AdminDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [subStats, setSubStats] = useState(null);
  const [notifStats, setNotifStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/dashboard');
      return;
    }
    fetchAllData();
  }, [user]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [statsRes, subRes, notifRes, usersRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/subscription-stats'),
        api.get('/admin/notification-stats'),
        api.get('/admin/users')
      ]);
      setStats(statsRes.data);
      setSubStats(subRes.data);
      setNotifStats(notifRes.data);
      setUsers(usersRes.data.users || usersRes.data);
    } catch (err) {
      toast.error('Failed to load admin data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBlockUser = async (userId, isBlocked) => {
    try {
      await api.put(\`/admin/users/\${userId}/block\`);
      toast.success(isBlocked ? 'User unblocked' : 'User blocked');
      fetchAllData();
    } catch (err) {
      toast.error('Failed to update user');
    }
  };

  const filteredUsers = users.filter(u =>
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Layout>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <div className="spinner"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head><title>Admin Dashboard - QRCodeKey</title></Head>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>Admin Dashboard</h1>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '30px', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>
          {['overview', 'users', 'subscriptions', 'notifications'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '8px 20px',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: activeTab === tab ? 'bold' : 'normal',
                backgroundColor: activeTab === tab ? '#4F46E5' : '#f3f4f6',
                color: activeTab === tab ? '#fff' : '#374151',
                textTransform: 'capitalize'
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '30px' }}>
              <StatCard title="Total Users" value={stats?.totalUsers || 0} color="#4F46E5" />
              <StatCard title="Total QR Codes" value={stats?.totalQRCodes || 0} color="#059669" />
              <StatCard title="Active Subscriptions" value={subStats?.activeSubscriptions || 0} color="#D97706" />
              <StatCard title="Monthly Revenue" value={\`$\${(subStats?.monthlyRevenue || 0).toFixed(2)}\`} color="#DC2626" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
              <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <h3 style={{ marginBottom: '15px', fontWeight: '600' }}>Plan Breakdown</h3>
                {subStats?.planBreakdown ? (
                  <div>
                    <PlanBar label="Starter" count={subStats.planBreakdown.starter || 0} total={subStats.activeSubscriptions || 1} color="#60A5FA" />
                    <PlanBar label="Pro" count={subStats.planBreakdown.pro || 0} total={subStats.activeSubscriptions || 1} color="#F59E0B" />
                    <PlanBar label="Unlimited" count={subStats.planBreakdown.unlimited || 0} total={subStats.activeSubscriptions || 1} color="#10B981" />
                  </div>
                ) : <p>No subscription data</p>}
              </div>
              <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <h3 style={{ marginBottom: '15px', fontWeight: '600' }}>Notification Stats</h3>
                <p><strong>Total Sent:</strong> {notifStats?.totalNotifications || 0}</p>
                <p><strong>Today:</strong> {notifStats?.todayCount || 0}</p>
                <p><strong>This Month:</strong> {notifStats?.monthCount || 0}</p>
                <p><strong>Usage:</strong> {notifStats?.totalUsed || 0} / {notifStats?.totalLimit || 0}</p>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div>
            <input
              type="text"
              placeholder="Search users by name or email..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '10px 15px', marginBottom: '20px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px' }}
            />
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <thead>
                  <tr style={{ background: '#f9fafb' }}>
                    <th style={thStyle}>Name</th>
                    <th style={thStyle}>Email</th>
                    <th style={thStyle}>Plan</th>
                    <th style={thStyle}>QR Codes</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => (
                    <tr key={u._id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={tdStyle}>{u.name || 'N/A'}</td>
                      <td style={tdStyle}>{u.email}</td>
                      <td style={tdStyle}><span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '12px', background: u.plan === 'free' ? '#f3f4f6' : '#dbeafe', color: u.plan === 'free' ? '#6b7280' : '#1d4ed8' }}>{u.plan || 'free'}</span></td>
                      <td style={tdStyle}>{u.qrCount || 0}</td>
                      <td style={tdStyle}><span style={{ color: u.isBlocked ? '#DC2626' : '#059669', fontWeight: '600' }}>{u.isBlocked ? 'Blocked' : 'Active'}</span></td>
                      <td style={tdStyle}>
                        <button
                          onClick={() => handleBlockUser(u._id, u.isBlocked)}
                          style={{ padding: '4px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '12px', backgroundColor: u.isBlocked ? '#DEF7EC' : '#FDE8E8', color: u.isBlocked ? '#03543F' : '#9B1C1C' }}
                        >
                          {u.isBlocked ? 'Unblock' : 'Block'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Subscriptions Tab */}
        {activeTab === 'subscriptions' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
            <StatCard title="Active Subscriptions" value={subStats?.activeSubscriptions || 0} color="#4F46E5" />
            <StatCard title="Monthly Revenue" value={\`$\${(subStats?.monthlyRevenue || 0).toFixed(2)}\`} color="#059669" />
            <StatCard title="Starter Plans" value={subStats?.planBreakdown?.starter || 0} color="#60A5FA" />
            <StatCard title="Pro Plans" value={subStats?.planBreakdown?.pro || 0} color="#F59E0B" />
            <StatCard title="Unlimited Plans" value={subStats?.planBreakdown?.unlimited || 0} color="#10B981" />
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
            <StatCard title="Total Notifications" value={notifStats?.totalNotifications || 0} color="#4F46E5" />
            <StatCard title="Sent Today" value={notifStats?.todayCount || 0} color="#059669" />
            <StatCard title="This Month" value={notifStats?.monthCount || 0} color="#D97706" />
            <StatCard title="Total Usage" value={\`\${notifStats?.totalUsed || 0}/\${notifStats?.totalLimit || 0}\`} color="#DC2626" />
          </div>
        )}
      </div>
    </Layout>
  );
}

function StatCard({ title, value, color }) {
  return (
    <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderLeft: \`4px solid \${color}\` }}>
      <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '5px' }}>{title}</p>
      <p style={{ fontSize: '28px', fontWeight: 'bold', color }}>{value}</p>
    </div>
  );
}

function PlanBar({ label, count, total, color }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontSize: '14px' }}>{label}</span>
        <span style={{ fontSize: '14px', fontWeight: '600' }}>{count}</span>
      </div>
      <div style={{ background: '#e5e7eb', borderRadius: '4px', height: '8px' }}>
        <div style={{ background: color, borderRadius: '4px', height: '8px', width: \`\${pct}%\`, transition: 'width 0.3s' }}></div>
      </div>
    </div>
  );
}

const thStyle = { padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' };
const tdStyle = { padding: '12px 16px', fontSize: '14px' };
