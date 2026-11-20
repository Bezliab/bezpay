import axios from 'axios';

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 20000,
});

// Normalize every failure into an Error with a human message + status
http.interceptors.response.use(
  (res) => res,
  (err) => {
    const data = err.response?.data;
    const e = new Error(
      data?.message ||
        (err.code === 'ECONNABORTED' ? 'The request timed out. Please try again.' : 'Network error. Check your connection.')
    );
    e.status = err.response?.status;
    e.code = data?.code;
    throw e;
  }
);
