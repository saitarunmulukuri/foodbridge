import { apiClient } from './apiClient';

export const decisionEngineService = {
  runEngine: async (donationId, topN = 5) => {
    return apiClient.post('/decision-engine/run', { donation_id: donationId, top_n: topN });
  }
};
