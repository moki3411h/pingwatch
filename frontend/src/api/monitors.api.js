import api from './api';

export const list = () => api.get('/api/monitors');
export const create = (data) => api.post('/api/monitors', data);
export const getById = (id) => api.get(`/api/monitors/${id}`);
export const update = (id, data) => api.patch(`/api/monitors/${id}`, data);
export const remove = (id) => api.delete(`/api/monitors/${id}`);
export const getPings = (id, limit = 50) =>
  api.get(`/api/monitors/${id}/pings?limit=${limit}`);
