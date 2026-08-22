import { apiClient } from './apiClient';

export const ngoService = {
  getProfile: async () => {
    return apiClient.get('/ngos/me');
  },

  updateProfile: async (data) => {
    return apiClient.patch('/ngos/me', data);
  },

  getCapacity: async () => {
    return apiClient.get('/ngos/me/capacity');
  },

  updateCapacity: async (dayOfWeek, maximumCapacity, status = 'ACTIVE') => {
    return apiClient.put('/ngos/me/capacity', {
      day_of_week: dayOfWeek,
      maximum_capacity: parseInt(maximumCapacity, 10),
      status,
    });
  },

  listRequests: async () => {
    return apiClient.get('/ngo/requests');
  },

  getRequestDetail: async (requestId) => {
    return apiClient.get(`/ngo/requests/${requestId}`);
  },

  acceptRequest: async (requestId) => {
    return apiClient.post(`/ngo/requests/${requestId}/accept`);
  },

  declineRequest: async (requestId, declineReason = '') => {
    return apiClient.post(`/ngo/requests/${requestId}/decline`, { decline_reason: declineReason });
  }
};
