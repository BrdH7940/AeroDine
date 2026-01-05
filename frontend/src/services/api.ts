import axios from 'axios';
import { apiConfig } from '../config/api.config';

/**
 * Axios instance configured with base URL from environment
 */
export const apiClient = axios.create({
  baseURL: apiConfig.baseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor for adding auth tokens, etc.
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle common errors (401, 403, etc.)
    if (error.response?.status === 401) {
      // Handle unauthorized - clear token, redirect to login
      localStorage.removeItem('token');
      // You can add redirect logic here if needed
    }
    return Promise.reject(error);
  }
);

export default apiClient;

