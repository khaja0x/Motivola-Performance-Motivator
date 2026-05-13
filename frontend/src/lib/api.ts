import axios from 'axios';
import Cookies from 'js-cookie';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const getToken = () => {
    if (typeof window === 'undefined') return Cookies.get('token');
    
    const pathname = window.location.pathname;
    const parts = pathname.split('/');
    
    // 1. Strict Tenant Scoping: If we are in a tenant-specific route /[slug]/...
    // The slug is the first part of the path (parts[1])
    if (parts.length >= 2 && parts[1] && parts[1] !== 'login' && parts[1] !== 'register') {
        const slug = parts[1];
        const scopedToken = Cookies.get(`token_${slug}`);
        if (scopedToken) return scopedToken;
        
        // If we are on a tenant route but have no scoped token, 
        // DO NOT fallback to a global token as it might belong to another company.
        return null;
    }
    
    // 2. Generic Token: Used for public pages or global settings (if any)
    return Cookies.get('token');
};

// Request interceptor to add the bearer token
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors (like 401)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
        // Only clear the SPECIFIC token for this workspace
        const parts = window.location.pathname.split('/');
        if (parts.length >= 2 && parts[1]) {
            Cookies.remove(`token_${parts[1]}`);
        }
        Cookies.remove('token');
        
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
            window.location.href = '/login';
        }
    }
    return Promise.reject(error);
  }
);

export default api;
