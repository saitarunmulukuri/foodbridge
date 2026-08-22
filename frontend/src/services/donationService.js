import { apiClient } from './apiClient';

export const donationService = {
  createDonation: async (donationData) => {
    return apiClient.post('/donations', donationData);
  },

  listMyDonations: async () => {
    return apiClient.get('/donations');
  },

  getDonationDetail: async (donationId) => {
    return apiClient.get(`/donations/${donationId}`);
  },

  submitDonation: async (donationId) => {
    return apiClient.post(`/donations/${donationId}/submit`);
  }
};
