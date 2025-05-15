import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserIcon, KeyIcon, MailIcon, PhoneIcon, MapPinIcon } from 'lucide-react';
import axios from '../../api/axios';
import { toast } from 'react-toastify';
import { getProvinces, getDistrictsByProvinceCode, getWardsByDistrictCode } from 'sub-vn';

const Register = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    phoneNumber: '',
    addressDetail: ''
  });
  const [location, setLocation] = useState({
    province: '',
    district: '',
    ward: ''
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const provinces = getProvinces() as any[];
  const districts = location.province ? getDistrictsByProvinceCode(location.province) as any[] : [];
  const wards = location.district ? getWardsByDistrictCode(location.district) as any[] : [];
  const selectedProvince = provinces.find((p: any) => p.code === location.province);
  const selectedDistrict = districts.find((d: any) => d.code === location.district);
  const selectedWard = wards.find((w: any) => w.code === location.ward);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error('Mật khẩu không khớp!');
      return;
    }
    if (!location.province || !location.district || !location.ward) {
      toast.error('Vui lòng chọn đầy đủ Tỉnh/Thành, Quận/Huyện, Phường/Xã!');
      return;
    }
    setLoading(true);
    try {
      // Đăng ký user - thêm trường role: 'customer' theo backend
      await axios.post('/users/register', {
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName,
        phoneNumber: formData.phoneNumber,
        address: `${formData.addressDetail}, ${selectedWard?.name}, ${selectedDistrict?.name}, ${selectedProvince?.name}`,
        role: 'customer'
      });
      toast.success('Đăng ký thành công! Vui lòng kiểm tra email để xác thực.');
      navigate('/verify-otp', { state: { email: formData.email } });
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Đăng ký thất bại. Vui lòng thử lại!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-orange-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <div className="text-center mb-8">
          <img src="/logo-shipvn.png" alt="Logo" className="h-12 mx-auto mb-4" />
          <h2 className="text-2xl font-bold">Đăng ký tài khoản</h2>
          <p className="text-gray-600">Tạo tài khoản để bắt đầu sử dụng dịch vụ</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên</label>
            <div className="relative">
              <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500" required />
              <UserIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <div className="relative">
              <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500" required />
              <MailIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
            <div className="relative">
              <input type="tel" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500" required />
              <PhoneIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ</label>
            <div className="space-y-2">
              <input type="text" name="addressDetail" value={formData.addressDetail} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 mb-2" placeholder="Số nhà, tên đường..." required />
              <select value={location.province} onChange={e => setLocation(prev => ({ ...prev, province: e.target.value, district: '', ward: '' }))} className="w-full p-2 border rounded-lg">
                <option value="">Chọn tỉnh/thành phố</option>
                {provinces.map((province: any) => <option key={province.code} value={province.code}>{province.name}</option>)}
              </select>
              <select value={location.district} onChange={e => setLocation(prev => ({ ...prev, district: e.target.value, ward: '' }))} className="w-full p-2 border rounded-lg" disabled={!location.province}>
                <option value="">Chọn quận/huyện</option>
                {districts.map((district: any) => <option key={district.code} value={district.code}>{district.name}</option>)}
              </select>
              <select value={location.ward} onChange={e => setLocation(prev => ({ ...prev, ward: e.target.value }))} className="w-full p-2 border rounded-lg" disabled={!location.district}>
                <option value="">Chọn phường/xã</option>
                {wards.map((ward: any) => <option key={ward.code} value={ward.code}>{ward.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
            <div className="relative">
              <input type="password" name="password" value={formData.password} onChange={handleChange} className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500" required />
              <KeyIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Xác nhận mật khẩu</label>
            <div className="relative">
              <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500" required />
              <KeyIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
          </div>
          <button type="submit" disabled={loading} className="w-full bg-orange-500 text-white py-2 px-4 rounded-lg hover:bg-orange-600 disabled:opacity-50">
            {loading ? 'Đang đăng ký...' : 'Đăng ký'}
          </button>
        </form>
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Đã có tài khoản?{' '}
            <Link to="/login" className="text-orange-500 hover:text-orange-600 font-medium">
              Đăng nhập
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;