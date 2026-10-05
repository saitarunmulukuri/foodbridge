/**
 * FoodBridge Centralized API Client
 * Manages HTTP requests, JWT token authorization headers, and error normalization.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

export const getStoredToken = () => {
  return localStorage.getItem('foodbridge_token');
};

export const setStoredToken = (token) => {
  if (token) {
    localStorage.setItem('foodbridge_token', token);
  } else {
    localStorage.removeItem('foodbridge_token');
  }
};

export const getStoredUser = () => {
  const userJson = localStorage.getItem('foodbridge_user');
  if (!userJson) return null;
  try {
    return JSON.parse(userJson);
  } catch {
    return null;
  }
};

export const setStoredUser = (user) => {
  if (user) {
    localStorage.setItem('foodbridge_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('foodbridge_user');
  }
};

export async function request(endpoint, options = {}) {
  const token = getStoredToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  try {
    const response = await fetch(url, config);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      let detailMsg = '';
      const details = data?.error?.details || data?.details;
      if (details && typeof details === 'object') {
        const values = Object.values(details);
        if (values.length > 0) {
          const first = values[0];
          detailMsg = Array.isArray(first) ? first[0] : (typeof first === 'string' ? first : JSON.stringify(first));
        }
      }
      const errorMessage =
        detailMsg ||
        data?.message ||
        data?.error?.message ||
        (typeof data?.error === 'string' ? data.error : null) ||
        `Request failed with status ${response.status}`;
      const error = new Error(errorMessage);
      error.status = response.status;
      error.data = data;
      throw error;
    }



    return data;
  } catch (err) {
    if (!err.status) {
      err.message = err.message || 'Network error — please check if backend is running at ' + API_BASE_URL;
    }
    throw err;
  }
}

export const apiClient = {
  get: (endpoint, options = {}) => request(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options = {}) => request(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) }),
  put: (endpoint, body, options = {}) => request(endpoint, { ...options, method: 'PUT', body: JSON.stringify(body) }),
  patch: (endpoint, body, options = {}) => request(endpoint, { ...options, method: 'PATCH', body: JSON.stringify(body) }),
  delete: (endpoint, options = {}) => request(endpoint, { ...options, method: 'DELETE' }),
};
