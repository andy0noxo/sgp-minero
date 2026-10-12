const API_BASE_URL = (import.meta.env.VITE_API_URL || '/api/v1').replace(/\/$/, '');

let accessToken = null;

export function setAccessToken(token) {
  accessToken = token;
}

export function clearAccessToken() {
  accessToken = null;
}

async function request(path, options = {}, canRefresh = true) {
  const headers = new Headers(options.headers);
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });
  const payload = await response.json().catch(() => ({}));

  if (response.status === 401 && canRefresh && path !== '/auth/refresh/') {
    try {
      const refreshed = await request('/auth/refresh/', { method: 'POST' }, false);
      setAccessToken(refreshed.data.access);
      return request(path, options, false);
    } catch {
      clearAccessToken();
    }
  }

  if (!response.ok) {
    const error = new Error(payload.error?.message || 'No fue posible completar la solicitud.');
    error.status = response.status;
    error.code = payload.error?.code;
    error.details = payload.error?.details;
    throw error;
  }
  return payload;
}

export function login(identifier, password) {
  return request('/auth/login/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
  });
}

export function refreshToken() {
  return request('/auth/refresh/', { method: 'POST' });
}

export function logout() {
  return request('/auth/logout/', { method: 'POST' }, false);
}

export function getCurrentUser() {
  return request('/auth/me/');
}

export function getUploadHeaders(file) {
  const formData = new FormData();
  formData.append('file', file);
  return request('/uploads/headers/', { method: 'POST', body: formData });
}

export function processUpload(file, mapping) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('mapping', JSON.stringify(mapping));
  return request('/uploads/process/', { method: 'POST', body: formData });
}

export function getUploadHistory(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  return request(`/uploads/history/?${params.toString()}`);
}

export function getUploadDetail(batchId) {
  return request(`/uploads/history/${batchId}/`);
}

export function importMasterPeople(file) {
  const formData = new FormData();
  formData.append('file', file);
  return request('/master-persons/import/', { method: 'POST', body: formData });
}

export function getMasterPeople(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  return request(`/master-persons/?${params.toString()}`);
}

export function getDashboardRecords(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  return request(`/dashboard/records/?${params.toString()}`);
}
