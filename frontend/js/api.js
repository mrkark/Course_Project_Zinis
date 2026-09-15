// frontend/js/api.js
// Простой fetch-клиент без внешних зависимостей (axios больше не используется).

const API_BASE = '/api';

async function request(method, url, body, opts = {}) {
  const isFormData = body instanceof FormData;
  const res = await fetch(API_BASE + url, {
    method,
    credentials: 'include', // обязательно для JWT-cookie
    headers: isFormData ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : (isFormData ? body : JSON.stringify(body)),
    signal: opts.signal,
  });

  let data = null;
  try { data = await res.json(); } catch (_) { /* пустой ответ (например, файл) */ }

  if (!res.ok) {
    const error = new Error((data && (data.error || data.message)) || `HTTP ${res.status}`);
    error.status = res.status;
    error.payload = data;
    throw error;
  }
  return data;
}

const api = {
  get: (url, opts) => request('GET', url, undefined, opts),
  post: (url, body, opts) => request('POST', url, body, opts),
  patch: (url, body, opts) => request('PATCH', url, body, opts),
  delete: (url, opts) => request('DELETE', url, undefined, opts),
};

const authApi = {
  me: () => api.get('/auth/me'),
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (email, password) => api.post('/auth/register', { email, password }),
  logout: () => api.post('/auth/logout'),
};

const uploadApi = {
  upload: async (file, onProgress) => {
    const formData = new FormData();
    formData.append('file', file);

    // XHR используется только здесь, чтобы получить прогресс загрузки —
    // fetch пока не даёт progress-события на upload.
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', API_BASE + '/upload');
      xhr.withCredentials = true;
      xhr.upload.onprogress = (e) => {
        if (onProgress && e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        let data = null;
        try { data = JSON.parse(xhr.responseText); } catch (_) {}
        if (xhr.status >= 200 && xhr.status < 300) resolve(data);
        else {
          const err = new Error((data && (data.error || data.message)) || `HTTP ${xhr.status}`);
          err.status = xhr.status;
          reject(err);
        }
      };
      xhr.onerror = () => reject(new Error('Сетевая ошибка при загрузке файла'));
      xhr.send(formData);
    });
  },
  getConfig: () => api.get('/upload/config'),
};

const scansApi = {
  list: (params = {}) => api.get('/scans' + toQuery(params)),
  get: (id) => api.get(`/scans/${id}`),
  delete: (id) => api.delete(`/scans/${id}`),
  getStats: () => api.get('/scans/stats'),
  exportListUrl: (params = {}) => API_BASE + '/scans/export' + toQuery(params),
  exportScanUrl: (id, format) => `${API_BASE}/scans/${id}/export${toQuery({ format })}`,
};

const threatsApi = {
  list: () => api.get('/threats'),
  get: (type) => api.get(`/threats/${type}`),
};

const sandboxApi = {
  samples: () => api.get('/sandbox/samples'),
  createSample: (name, content) => api.post('/sandbox/samples', { name, content }),
  saveRun: (payload) => api.post('/sandbox/runs', payload),
  runs: () => api.get('/sandbox/runs'),
};

const adminApi = {
  status: () => api.get('/admin/status'),
  users: () => api.get('/admin/users'),
  setBlocked: (id, blocked) => api.patch(`/admin/users/${id}/block`, { blocked }),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
};

function toQuery(params) {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') usp.set(k, v);
  });
  const s = usp.toString();
  return s ? `?${s}` : '';
}
