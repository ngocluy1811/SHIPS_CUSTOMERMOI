import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from '../../api/axios';
import { toast } from 'react-toastify';

const VerifyOtp = () => {
  const [otp, setOtp] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendDisabled, setResendDisabled] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Lấy email từ state khi chuyển từ trang đăng ký
    if (location.state?.email) {
      setEmail(location.state.email);
    } else {
      // Nếu không có email, quay lại trang đăng ký
      navigate('/register');
    }
  }, [location.state, navigate]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendDisabled && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (countdown === 0) {
      setResendDisabled(false);
      setCountdown(60);
    }
    return () => clearInterval(timer);
  }, [resendDisabled, countdown]);

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post('/users/verify-otp', { email, otp });
      toast.success('Xác thực thành công! Vui lòng đăng nhập.');
      navigate('/login');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Xác thực thất bại. Vui lòng thử lại!');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setResendDisabled(true);
    try {
      await axios.post('/users/resend-otp', { email });
      toast.success('Đã gửi lại mã OTP!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Gửi lại mã thất bại. Vui lòng thử lại!');
      setResendDisabled(false);
    }
  };

  return (
    <div className="min-h-screen bg-orange-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold">Xác thực Email</h2>
          <p className="text-gray-600 mt-2">
            Chúng tôi đã gửi mã xác thực đến email {email}
          </p>
        </div>

        <form onSubmit={handleVerifyOtp} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mã xác thực (OTP)
            </label>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              placeholder="Nhập mã xác thực"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 text-white py-2 px-4 rounded-lg hover:bg-orange-600 disabled:opacity-50"
          >
            {loading ? 'Đang xác thực...' : 'Xác thực'}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={resendDisabled}
              className="text-orange-500 hover:text-orange-600 disabled:opacity-50"
            >
              {resendDisabled
                ? `Gửi lại sau ${countdown}s`
                : 'Gửi lại mã xác thực'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VerifyOtp; 