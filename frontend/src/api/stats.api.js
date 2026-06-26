import api from './api';

export const getStats = (monitorId) => api.get(`/api/stats/${monitorId}`);
