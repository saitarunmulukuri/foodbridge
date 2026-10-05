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

  updateCapacity: async (dayOfWeekOrDate, maximumCapacity, status = 'ACTIVE') => {
    const payload = {
      maximum_capacity: parseInt(maximumCapacity, 10),
      status,
    };
    if (dayOfWeekOrDate && /^\d{4}-\d{2}-\d{2}$/.test(dayOfWeekOrDate)) {
      payload.date = dayOfWeekOrDate;
    } else if (dayOfWeekOrDate) {
      payload.day_of_week = dayOfWeekOrDate.toUpperCase();
      payload.date = new Date().toISOString().split('T')[0];
    } else {
      payload.date = new Date().toISOString().split('T')[0];
    }
    return apiClient.put('/ngos/me/capacity', payload);
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
