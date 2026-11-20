import { http } from './http';

export const getBanks = () => http.get('/banks').then((r) => r.data.data);
export const resolveAccount = (payload) => http.post('/resolve-account', payload).then((r) => r.data.data);
