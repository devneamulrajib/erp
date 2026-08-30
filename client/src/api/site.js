import api from './axios';

export const getSites = () => api.get('/sites');
export const deleteSite = (id) => api.delete(`/sites/${id}`);