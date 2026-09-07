// frontend/src/services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`📤 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log(`📥 API Response: ${response.status} ${response.config.url}`);
    return response.data; // Return only data
  },
  (error) => {
    console.error('❌ API Error:', error.response?.data || error.message);
    return Promise.reject(error.response?.data || { message: error.message });
  }
);

export const uploadApi = {
  upload: (file, onProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress,
    });
  },
  getConfig: () => api.get('/upload/config'),
};

export const scansApi = {
  list: (params = {}) => api.get('/scans', { params }),
  get: (id) => api.get(`/scans/${id}`),
  delete: (id) => api.delete(`/scans/${id}`),
  getStats: () => api.get('/scans/stats'),
};

export const threatsApi = {
  list: () => api.get('/threats'),
  get: (type) => api.get(`/threats/${type}`),
};

export default api;