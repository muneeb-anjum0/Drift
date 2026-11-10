import axios from 'axios';

const API_PREFIX = '/api/v1';
const rawBaseURL = import.meta.env.VITE_API_BASE_URL?.trim();

const baseURL = (() => {
  const resolvedBaseURL = rawBaseURL && rawBaseURL.length > 0 ? rawBaseURL.replace(/\/+$/, '') : API_PREFIX;

  return resolvedBaseURL.endsWith(API_PREFIX) ? resolvedBaseURL : `${resolvedBaseURL}${API_PREFIX}`;
})();

export const api = axios.create({
  baseURL,
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message ?? error.message ?? 'Request failed';
    return Promise.reject(new Error(message));
  }
);
