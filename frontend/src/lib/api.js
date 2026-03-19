// ============================================
// lib/api.js - API Client
// ============================================
// Main tool for communicating with backend
// Token is automatically added to headers

import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// ====== Axios Instance ======
const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ====== Request Interceptor: Add Token ======
api.interceptors.request.use(
  (config) => {
    // Only runs in browser
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('qr_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ====== Response Interceptor: Handle Errors ======
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // 401 = Token expired → Logout
      if (error.response.status === 401) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('qr_token');
          localStorage.removeItem('qr_user');
          // Redirect to login page (if not already there)
          if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login';
          }
        }
      }
    }
    return Promise.reject(error);
  }
);

// ============================================
// AUTH APIs
// ============================================
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/me', data),
  changePassword: (data) => api.put('/auth/change-password', data),
  logout: () => api.post('/auth/logout'),
  deleteAccount: (data) => api.delete('/auth/me', { data }),
  exportMyData: () => api.get('/auth/me/export'),
};

// ============================================
// QR CODE APIs
// ============================================
export const qrAPI = {
  generate: (data) => api.post('/qr/generate', data),
  generateCustom: (data) => api.post('/qr/generate-custom', data),
  bulkGenerate: (data) => api.post('/qr/bulk-generate', data),
  getMyQRCodes: (page = 1) => api.get(`/qr/my-codes?page=${page}`),
  getQRCode: (qrId) => api.get(`/qr/${qrId}`),
  activate: (qrId, data) => api.put(`/qr/${qrId}/activate`, data),
  deactivate: (qrId) => api.put(`/qr/${qrId}/deactivate`),
  delete: (qrId) => api.delete(`/qr/${qrId}`),
  downloadUrl: (qrId) => `${API_URL}/qr/${qrId}/download`,
};

// ============================================
// TEAMS APIs
// ============================================
export const teamAPI = {
  create: (data) => api.post('/teams/create', data),
  getMyTeams: () => api.get('/teams/my'),
  getTeam: (teamId) => api.get(`/teams/${teamId}`),
  join: (inviteCode) => api.post('/teams/join', { inviteCode }),
  leave: (teamId) => api.post(`/teams/${teamId}/leave`),
  removeMember: (teamId, userId) => api.delete(`/teams/${teamId}/members/${userId}`),
  getTeamQRCodes: (teamId) => api.get(`/teams/${teamId}/qr-codes`),
  delete: (teamId) => api.delete(`/teams/${teamId}`),
};

// ============================================
// TRACKING APIs
// ============================================
export const trackAPI = {
  getScanInfo: (qrId) => api.get(`/track/scan-info/${qrId}`),
  submitScan: (qrId, locationData) => api.post(`/track/scan/${qrId}`, locationData),
  viewLocations: (data) => api.post('/track/view', data),
};

// ============================================
// ADMIN APIs
// ============================================
export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  getUsers: (page = 1, search = '') => api.get(`/admin/users?page=${page}&search=${search}`),
  deactivateUser: (id) => api.put(`/admin/users/${id}/deactivate`),
  getAllQRCodes: (page = 1) => api.get(`/admin/qr-codes?page=${page}`),
  deleteQR: (qrId) => api.delete(`/admin/qr/${qrId}`),
};

// ============================================
// ANALYTICS APIs
// ============================================
export const analyticsAPI = {
  getDashboard: () => api.get('/analytics/dashboard'),
};

// ============================================
// ORGANIZATION APIs
// ============================================
export const orgAPI = {
  create: (data) => api.post('/org', data),
  getAll: () => api.get('/org'),
  getOne: (id) => api.get(`/org/${id}`),
  update: (id, data) => api.put(`/org/${id}`, data),
  delete: (id) => api.delete(`/org/${id}`),
  sharedAccess: (data) => api.post('/org/shared/access', data),
  // Groups
  createGroup: (orgId, data) => api.post(`/org/${orgId}/groups`, data),
  getGroup: (groupId) => api.get(`/org/groups/${groupId}`),
  updateGroup: (groupId, data) => api.put(`/org/groups/${groupId}`, data),
  deleteGroup: (groupId) => api.delete(`/org/groups/${groupId}`),
  // Members
  addMember: (groupId, data) => api.post(`/org/groups/${groupId}/members`, data),
  addMembers: (groupId, data) => api.post(`/org/groups/${groupId}/members/bulk`, data),
  updateMember: (memberId, data) => api.put(`/org/members/${memberId}`, data),
  removeMember: (memberId) => api.delete(`/org/members/${memberId}`),
  // Attendance
  getGroupForScan: (groupId) => api.get(`/org/attendance/scan/${groupId}`),
  markAttendance: (groupId, data) => api.post(`/org/attendance/mark/${groupId}`, data),
  getAttendance: (groupId, date) => api.get(`/org/attendance/${groupId}${date ? `?date=${date}` : ''}`),
  updateAttendance: (groupId, data) => api.put(`/org/attendance/${groupId}`, data),
  lockAttendance: (groupId, data) => api.post(`/org/attendance/${groupId}/lock`, data),
  getReport: (groupId, startDate, endDate) => api.get(`/org/attendance/${groupId}/report?startDate=${startDate}&endDate=${endDate}`),
};

// ====== Attendance Scan API (New System) ======
export const attendanceScanAPI = {
  // Scan QR for clock-in/out
  scan: (data) => api.post('/attendance-scan/scan', data),

  // Get attendance dashboard
  getDashboard: (orgId) => api.get(`/attendance-scan/dashboard/${orgId}`),

  // Get member attendance history
  getMemberHistory: (memberId, startDate, endDate) =>
    api.get(`/attendance-scan/member/${memberId}/history?startDate=${startDate}&endDate=${endDate}`),

  // Viewer access (parent/manager)
  viewerAccess: (data) => api.post('/attendance-scan/viewer-access', data),

  // Verify with QR ID + group password
  verify: (data) => api.post('/attendance-scan/verify', data),

  // Generate temp password
  generateTempPassword: (data) => api.post('/attendance-scan/temp-password', data),

  // Bulk generate QR codes
  bulkGenerateQR: (groupId) => api.post(`/attendance-scan/bulk-qr/${groupId}`),

  // Get group attendance today
  getGroupToday: (groupId) => api.get(`/attendance-scan/group/${groupId}/today`),

  // Export report
  exportReport: (groupId, startDate, endDate) =>
    api.get(`/attendance-scan/export/${groupId}?startDate=${startDate}&endDate=${endDate}`, { responseType: 'blob' }),

  // Update org GPS location
  updateOrgLocation: (orgId, data) => api.put(`/attendance-scan/org/${orgId}/location`, data),

  // Set group master password
  setGroupPassword: (groupId, data) => api.put(`/attendance-scan/group/${groupId}/password`, data),
};

export default api;
