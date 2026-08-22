import { apiClient } from './apiClient';

export const volunteerService = {
  getProfile: async () => {
    return apiClient.get('/volunteers/me');
  },

  updateProfile: async (data) => {
    return apiClient.patch('/volunteers/me', data);
  },

  listAssignments: async () => {
    return apiClient.get('/volunteers/assignments');
  },

  getAssignmentDetail: async (assignmentId) => {
    return apiClient.get(`/volunteers/assignments/${assignmentId}`);
  },

  acceptAssignment: async (assignmentId) => {
    return apiClient.post(`/volunteers/assignments/${assignmentId}/accept`);
  },

  declineAssignment: async (assignmentId, reason = '') => {
    return apiClient.post(`/volunteers/assignments/${assignmentId}/decline`, { reason });
  },

  completeDelivery: async (assignmentId) => {
    return apiClient.post(`/volunteers/assignments/${assignmentId}/complete`);
  }
};
