import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { UserIcon, KeyIcon, LogInIcon } from 'lucide-react';
import { useAuth } from '../../components/auth/AuthContext';
import axios from '../../api/axios';
import { toast } from 'react-toastify';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Trong JSX:
<ToastContainer />
const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  useEffect(() => {
    const msg = localStorage.getItem('lockedMsg');
    if (msg) {
      toast.error(msg);
      localStorage.removeItem('lockedMsg');
    }
  }, []);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password); // Gọi context login, context sẽ tự lưu token/user/navigate
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Đăng nhập thất bại. Vui lòng thử lại!';
      setError(msg);
      // Nếu tài khoản chưa kích hoạt, chuyển sang verify-otp
      if (msg.includes('chưa được kích hoạt')) {
        setTimeout(() => window.location.href = '/verify-otp', 1000);
    }
    } finally {
      setLoading(false);
    }
  };

  return <div className="min-h-screen bg-orange-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <div className="text-center mb-8">
          <img src="https://ship.com.vn/images/logo.png" alt="Logo" className="h-12 mx-auto mb-4" />
          <h2 className="text-2xl font-bold">Đăng nhập</h2>
          <p className="text-gray-600">Đăng nhập để quản lý đơn hàng của bạn</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <div className="text-red-600 mb-2 text-center">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <div className="relative">
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500" required />
              <UserIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mật khẩu
            </label>
            <div className="relative">
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500" required />
              <KeyIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input type="checkbox" className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-gray-300 rounded" />
              <label className="ml-2 block text-sm text-gray-700">
                Ghi nhớ đăng nhập
              </label>
            </div>
            <Link to="/forgot-password" className="text-sm text-orange-500 hover:text-orange-600">
              Quên mật khẩu?
            </Link>
          </div>
          <button type="submit" disabled={loading} className="w-full bg-orange-500 text-white py-2 px-4 rounded-lg hover:bg-orange-600 flex items-center justify-center gap-2 disabled:opacity-50">
            <LogInIcon className="h-5 w-5" />
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Chưa có tài khoản?{' '}
            <Link to="/register" className="text-orange-500 hover:text-orange-600 font-medium">
              Đăng ký ngay
            </Link>
          </p>
        </div>
      </div>
    </div>;
};
export default Login;