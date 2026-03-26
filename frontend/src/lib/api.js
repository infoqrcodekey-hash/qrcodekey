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

  // OTP Verification
  sendEmailOTP: (data) => api.post('/auth/send-email-otp', data),
  verifyEmailOTP: (data) => api.post('/auth/verify-email-otp', data),
  sendPhoneOTP: (data) => api.post('/auth/send-phone-otp', data),
  verifyPhoneOTP: (data) => api.post('/auth/verify-phone-otp', data),
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
// GROUP ATTENDANCE APIs (New Module)
// ============================================
export const groupAttendanceAPI = {
  // Group CRUD
  createGroup: (data) => api.post('/group-attendance/create', data),
  getMyGroups: () => api.get('/group-attendance/my-groups'),
  getGroup: (id) => api.get(`/group-attendance/${id}`),
  deleteGroup: (id) => api.delete(`/group-attendance/${id}`),

  // Member management
  addMember: (groupId, data) => api.post(`/group-attendance/${groupId}/add-member`, data),
  removeMember: (groupId, memberId) => api.delete(`/group-attendance/${groupId}/remove-member/${memberId}`),

  // Attendance toggle & scan
  toggleAttendance: (groupId) => api.put(`/group-attendance/${groupId}/toggle`),
  processScan: (groupId, data) => api.post(`/group-attendance/${groupId}/scan`, data),

  // Reports
  getAttendanceSummary: (groupId, month, year) => api.get(`/group-attendance/${groupId}/summary?month=${month}&year=${year}`),
  getMonthlyReport: (groupId, month, year) => api.get(`/group-attendance/${groupId}/monthly-report?month=${month}&year=${year}`),
  exportCSV: (groupId, month, year) => api.get(`/group-attendance/${groupId}/export-csv?month=${month}&year=${year}`, { responseType: 'blob' }),
};

// ============================================
// NOTIFICATION APIs
// ============================================
export const notificationAPI = {
  getAll: (page = 1, unreadOnly = false) => api.get(`/notifications?page=${page}&unreadOnly=${unreadOnly}`),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  getSettings: (orgId) => api.get(`/notifications/settings/${orgId}`),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  sendEmergency: (data) => api.post('/notifications/emergency', data),
  delete: (id) => api.delete(`/notifications/${id}`),
};

export default api;
