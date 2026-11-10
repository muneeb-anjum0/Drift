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
    if (!axios.isAxiosError(error)) {
      return Promise.reject(error);
    }

    const serverMessage = error.response?.data?.message;
    if (typeof serverMessage === 'string' && serverMessage.trim()) {
      return Promise.reject(new Error(serverMessage));
    }

    const status = error.response?.status;
    const message = status === 400 ? 'The request could not be processed. Check the information you entered.'
      : status === 401 ? 'Your session has expired, or your sign-in details are incorrect.'
      : status === 403 ? 'Access denied. Check your permissions or open Drift at its configured address.'
      : status === 404 ? 'The requested item could not be found.'
      : status === 409 ? 'This conflicts with something already saved. Refresh and try again.'
      : status === 429 ? 'Too many requests. Please wait a moment and try again.'
      : status && status >= 500 ? 'The server is having trouble. Please try again shortly.'
      : 'Could not reach Drift. Check your connection and whether its services are running.';
    return Promise.reject(new Error(message));
  }
);
