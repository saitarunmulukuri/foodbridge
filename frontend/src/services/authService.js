import { apiClient } from './apiClient';

export const authService = {
  login: async (email, password) => {
    return apiClient.post('/auth/login', { email, password });
  },

  register: async (payload) => {
    return apiClient.post('/auth/register', payload);
  },

  googleLogin: async (credential) => {
    return apiClient.post('/auth/google', { credential });
  },

  checkHealth: async () => {
    return apiClient.get('/health');
  }
};
