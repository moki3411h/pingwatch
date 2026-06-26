import api from './api';

export const list = (page = 1) => api.get(`/api/incidents?page=${page}`);
export const resolve = (id) => api.patch(`/api/incidents/${id}/resolve`);
