import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MailIcon, ArrowLeftIcon } from 'lucide-react';
import { toast } from 'react-toastify';
import emailjs from '@emailjs/browser';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Vui lòng nhập email!');
      return;
    }

    try {
      setLoading(true);
      
      // Gửi email thực sự qua EmailJS
      await emailjs.send(
        'service_7hviquf',         // Service ID
        'template_t2qp24q',        // Template ID
        {
          message: '123456',       // Mật khẩu mới (có thể random)
          to_email: email,
        },
        'GsC_SfspwKG_NMrmN'        // Public Key
      );

      toast.success('Mật khẩu mới đã được gửi về email của bạn!');
      navigate('/login');
    } catch (error: any) {
      console.error('Lỗi gửi email:', error);
      toast.error('Có lỗi xảy ra! Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-orange-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="Logo" className="h-12 mx-auto mb-4" />
          <h2 className="text-2xl font-bold">Quên mật khẩu</h2>
          <p className="text-gray-600">Nhập email của bạn để nhận mật khẩu mới</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="Nhập email của bạn"
                required
              />
              <MailIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 text-white py-2 px-4 rounded-lg hover:bg-orange-600 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? 'Đang xử lý...' : 'Gửi mật khẩu mới'}
          </button>

          <div className="text-center">
            <Link
              to="/login"
              className="inline-flex items-center text-sm text-orange-500 hover:text-orange-600"
            >
              <ArrowLeftIcon className="h-4 w-4 mr-1" />
              Quay lại đăng nhập
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword; 