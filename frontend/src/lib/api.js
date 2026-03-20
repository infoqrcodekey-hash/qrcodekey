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
  getMyOrgs: () => api.get('/org'),                                    // Alias for getAll
  getOne: (id) => api.get(`/org/${id}`),
  getOrg: (id) => api.get(`/org/${id}`),                               // Alias for getOne
  update: (id, data) => api.put(`/org/${id}`, data),
  delete: (id) => api.delete(`/org/${id}`),
  sharedAccess: (data) => api.post('/org/shared/access', data),
  // Groups
  createGroup: (orgId, data) => api.post(`/org/${orgId}/groups`, data),
  getGroups: (orgId) => api.get(`/org/${orgId}/groups`),               // Get all groups in org
  getGroup: (groupId) => api.get(`/org/groups/${groupId}`),
  updateGroup: (groupId, data) => api.put(`/org/groups/${groupId}`, data),
  deleteGroup: (groupId) => api.delete(`/org/groups/${groupId}`),
  // Members
  getMembers: (orgId, groupId) => api.get(`/org/groups/${groupId}/members`),  // Get group members
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

// ============================================
// LEAVE APIs
// ============================================
export const leaveAPI = {
  apply: (data) => api.post('/leave/apply', data),
  review: (leaveId, data) => api.put(`/leave/${leaveId}/review`, data),
  cancel: (leaveId) => api.put(`/leave/${leaveId}/cancel`),
  getOrgLeaves: (orgId, params = '') => api.get(`/leave/org/${orgId}${params ? '?' + params : ''}`),
  getMemberLeaves: (memberId) => api.get(`/leave/member/${memberId}`),
  getBalance: (memberId, year) => api.get(`/leave/balance/${memberId}?year=${year || new Date().getFullYear()}`),
  getSummary: (orgId) => api.get(`/leave/summary/${orgId}`),
};

// ============================================
// HOLIDAY APIs
// ============================================
export const holidayAPI = {
  add: (data) => api.post('/holidays', data),
  getAll: (orgId, year) => api.get(`/holidays/${orgId}${year ? '?year=' + year : ''}`),
  getUpcoming: (orgId) => api.get(`/holidays/upcoming/${orgId}`),
  isHoliday: (orgId, date) => api.get(`/holidays/check/${orgId}?date=${date}`),
  update: (id, data) => api.put(`/holidays/${id}`, data),
  delete: (id) => api.delete(`/holidays/${id}`),
};

// ============================================
// AUDIT LOG APIs
// ============================================
export const auditAPI = {
  getLogs: (orgId, params = '') => api.get(`/audit/${orgId}${params ? '?' + params : ''}`),
  getSummary: (orgId, days = 30) => api.get(`/audit/${orgId}/summary?days=${days}`),
};

// ============================================
// VISITOR APIs
// ============================================
export const visitorAPI = {
  register: (data) => api.post('/visitors', data),
  checkIn: (id, data) => api.put(`/visitors/${id}/check-in`, data),
  checkOut: (id, data) => api.put(`/visitors/${id}/check-out`, data),
  getToday: (orgId) => api.get(`/visitors/today/${orgId}`),
  getHistory: (orgId, params = '') => api.get(`/visitors/history/${orgId}${params ? '?' + params : ''}`),
  scanQR: (data) => api.post('/visitors/scan', data),
};

// ============================================
// SHIFT APIs
// ============================================
export const shiftAPI = {
  create: (data) => api.post('/shifts', data),
  getAll: (orgId) => api.get(`/shifts/${orgId}`),
  update: (id, data) => api.put(`/shifts/${id}`, data),
  delete: (id) => api.delete(`/shifts/${id}`),
  logOvertime: (data) => api.post('/shifts/overtime', data),
  getOvertime: (orgId, params = '') => api.get(`/shifts/overtime/${orgId}${params ? '?' + params : ''}`),
  reviewOvertime: (id, data) => api.put(`/shifts/overtime/${id}/review`, data),
};

// ============================================
// REPORT APIs
// ============================================
export const reportAPI = {
  getMonthly: (orgId, month, year, groupId) => api.get(`/reports/monthly/${orgId}?month=${month}&year=${year}${groupId ? '&groupId=' + groupId : ''}`),
  getSummary: (orgId, startDate, endDate) => api.get(`/reports/summary/${orgId}?startDate=${startDate}&endDate=${endDate}`),
  getMemberReport: (memberId, startDate, endDate) => api.get(`/reports/member/${memberId}?startDate=${startDate}&endDate=${endDate}`),
};

export default api;
