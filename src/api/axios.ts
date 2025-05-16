import axios from 'axios';
import { toast } from 'react-toastify';

const instance = axios.create({
  // baseURL: 'https://ships-backendmoi-k6ob.onrender.com/api',
   baseURL: 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

instance.interceptors.request.use((config: any) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers = config.headers || {};
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

instance.interceptors.response.use(
  response => response,
  error => {
    if (
      error.response &&
      error.response.status === 403 &&
      error.response.data?.error?.includes('bị khóa')
    ) {
      localStorage.removeItem('token');
      toast.error(error.response.data.error);
      window.location.href = '/login';
    }
    if (
      error.response &&
      error.response.status === 401
    ) {
      localStorage.removeItem('token');
      toast.error('Phiên đăng nhập hết hạn, vui lòng đăng nhập lại!');
    }
    return Promise.reject(error);
  }
);

export default instance;