import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor - attach token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken });
          localStorage.setItem('accessToken', data.accessToken);
          localStorage.setItem('refreshToken', data.refreshToken);
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
          return api(originalRequest);
        }
      } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  refresh: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
  getMe: () => api.get('/auth/me'),
};

// Needs
export const needsAPI = {
  create: (data) => api.post('/needs', data),
  list: (params) => api.get('/needs', { params }),
  get: (id) => api.get(`/needs/${id}`),
  update: (id, data) => api.put(`/needs/${id}`, data),
  delete: (id) => api.delete(`/needs/${id}`),
  bulkUpload: (formData) => api.post('/needs/bulk-upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  heatmap: () => api.get('/needs/heatmap'),
};

// Volunteers
export const volunteersAPI = {
  createProfile: (data) => api.post('/volunteers/profile', data),
  list: (params) => api.get('/volunteers', { params }),
  get: (id) => api.get(`/volunteers/${id}`),
  updateAvailability: (id, data) => api.put(`/volunteers/${id}/availability`, data),
  getTasks: (id, params) => api.get(`/volunteers/${id}/tasks`, { params }),
};

// Matching
export const matchingAPI = {
  run: (data) => api.post('/matching/run', data),
  suggestions: (needId) => api.get(`/matching/suggestions/${needId}`),
  assign: (data) => api.post('/matching/assign', data),
  accept: (taskId) => api.post(`/matching/accept/${taskId}`),
  complete: (taskId) => api.post(`/matching/complete/${taskId}`),
};

// Analytics
export const analyticsAPI = {
  summary: () => api.get('/analytics/summary'),
  trends: (params) => api.get('/analytics/trends', { params }),
  coverageGaps: () => api.get('/analytics/coverage-gaps'),
  topNeeds: () => api.get('/analytics/top-needs'),
};

// Organizations
export const orgsAPI = {
  create: (data) => api.post('/orgs', data),
  list: () => api.get('/orgs'),
  get: (id) => api.get(`/orgs/${id}`),
  getNeeds: (id) => api.get(`/orgs/${id}/needs`),
  regenerateKey: (id) => api.post(`/orgs/${id}/regenerate-key`),
};

// Notifications
export const notificationsAPI = {
  list: () => api.get('/notifications'),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
};

export default api;
