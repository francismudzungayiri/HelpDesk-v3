import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5001/api',
});

// Add a request interceptor to include the token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // A 401 means the session is missing or expired (not a permission problem): sign in again.
    const isSignIn = String(error.config?.url || '').includes('/auth/login');
    if (error.response?.status === 401 && !isSignIn && localStorage.getItem('token')) {
      localStorage.removeItem('token');
      if (!['/login', '/register'].includes(window.location.pathname)) {
        window.location.href = '/login?session=ended';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
