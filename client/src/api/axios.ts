import axios from 'axios';
import { TOKEN_KEY } from '../utils/constants';

const API_PREFIX = '/api/v1';
const rawBaseURL = import.meta.env.VITE_API_BASE_URL?.trim();

const baseURL = (() => {
  const resolvedBaseURL = rawBaseURL && rawBaseURL.length > 0 ? rawBaseURL.replace(/\/+$/, '') : API_PREFIX;

  return resolvedBaseURL.endsWith(API_PREFIX) ? resolvedBaseURL : `${resolvedBaseURL}${API_PREFIX}`;
})();

export const api = axios.create({
  baseURL,
  withCredentials: false,
});

api.interceptors.request.use((config) => {
  const storedToken = localStorage.getItem(TOKEN_KEY);
  if (storedToken) {
    config.headers.Authorization = `Bearer ${storedToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message ?? error.message ?? 'Request failed';
    return Promise.reject(new Error(message));
  }
);
