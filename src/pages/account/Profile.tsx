import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../../api/axios';
import { toast } from 'react-toastify';
import { UserIcon, MailIcon, PhoneIcon, MapPinIcon } from 'lucide-react';

const Profile = () => {
  const [user, setUser] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    address: ''
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await axios.get('/users/me');
      setUser(response.data as typeof user);
    } catch (error: any) {
      toast.error('Không thể tải thông tin người dùng');
      if (error.response?.status === 401) {
        navigate('/login');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.put('/users/me', user);
      toast.success('Cập nhật thông tin thành công!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Cập nhật thất bại. Vui lòng thử lại!');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUser(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="max-w-xl mx-auto p-8 bg-white rounded-2xl shadow-lg mt-8">
      <div className="flex flex-col items-center mb-8">
        <div className="w-24 h-24 rounded-full bg-orange-100 flex items-center justify-center border-4 border-orange-200 shadow">
          <UserIcon className="h-16 w-16 text-orange-500" />
        </div>
        <h1 className="text-2xl font-bold mt-4">Thông tin cá nhân</h1>
        <p className="text-gray-500">Quản lý và cập nhật thông tin tài khoản của bạn</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên</label>
          <div className="relative">
            <input
              type="text"
              name="fullName"
              value={user.fullName}
              onChange={handleChange}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white"
              required
            />
            <UserIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <div className="relative">
            <input
              type="email"
              name="email"
              value={user.email}
              disabled
              className="w-full pl-10 pr-4 py-2 border rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
            />
            <MailIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
          <div className="relative">
            <input
              type="tel"
              name="phoneNumber"
              value={user.phoneNumber}
              onChange={handleChange}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white"
              required
            />
            <PhoneIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ</label>
          <div className="relative">
            <input
              type="text"
              name="address"
              value={user.address}
              onChange={handleChange}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white"
              required
            />
            <MapPinIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
        </div>
        <div className="flex justify-end space-x-4 mt-8">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-gradient-to-r from-orange-400 to-orange-500 text-white rounded-lg shadow hover:from-orange-500 hover:to-orange-600 font-semibold transition disabled:opacity-50"
          >
            {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Profile; 