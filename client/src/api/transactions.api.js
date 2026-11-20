import { http } from './http';

export const initiateTransaction = (payload) => http.post('/transactions/initiate', payload).then((r) => r.data.data);
export const getTransaction = (reference) => http.get(`/transactions/${reference}`).then((r) => r.data.data);
