import React, { useEffect, useState } from 'react';
import { MapPinIcon, XIcon } from 'lucide-react';
import { getProvinces, getDistrictsByProvinceCode, getWardsByDistrictCode } from 'sub-vn';

interface Address {
  address_id?: string;
  label: string;
  name: string;
  phone: string;
  street: string;
  ward: string;
  district: string;
  city: string;
  is_default: boolean;
  type: 'delivery' | 'pickup';
}
interface AddAddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (address: Address) => void;
  editingAddress?: Address | null;
  type: 'delivery' | 'pickup';
  setType: (type: 'delivery' | 'pickup') => void;
}
const AddAddressModal = ({
  isOpen,
  onClose,
  onSave,
  editingAddress,
  type,
  setType
}: AddAddressModalProps) => {
  const [formData, setFormData] = useState<Address>({
    label: '',
    name: '',
    phone: '',
    street: '',
    ward: '',
    district: '',
    city: '',
    is_default: false,
    type: 'delivery'
  });

  // Lấy danh sách tỉnh/thành, quận/huyện, phường/xã
  const provinces = getProvinces();
  const selectedProvince = provinces.find((p: any) => p.name === formData.city);
  const selectedProvinceCode = selectedProvince?.code || '';
  const districts = selectedProvince ? getDistrictsByProvinceCode(selectedProvince.code) : [];
  const selectedDistrict = districts.find((d: any) => d.name === formData.district);
  const selectedDistrictCode = selectedDistrict?.code || '';
  const wards = selectedDistrict ? getWardsByDistrictCode(selectedDistrict.code) : [];
  const selectedWard = wards.find((w: any) => w.name === formData.ward);
  const selectedWardCode = selectedWard?.code || '';

  useEffect(() => {
    if (editingAddress) {
      setFormData(editingAddress);
    } else {
      setFormData({
        label: '',
        name: '',
        phone: '',
        street: '',
        ward: '',
        district: '',
        city: '',
        is_default: false,
        type: 'delivery'
      });
    }
  }, [editingAddress]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Kiểm tra các trường bắt buộc
    if (!formData.label || !formData.name || !formData.phone || !formData.street || !formData.city || !formData.district || !formData.ward) {
      alert('Vui lòng điền đầy đủ thông tin địa chỉ');
      return;
    }
    // Kiểm tra số điện thoại hợp lệ
    const phoneRegex = /^[0-9]{10,11}$/;
    if (!phoneRegex.test(formData.phone)) {
      alert('Số điện thoại không hợp lệ');
      return;
    }
    onSave({ ...formData, type });
  };
  if (!isOpen) return null;
  return <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium flex items-center gap-2">
            <MapPinIcon className="h-5 w-5 text-orange-500" />
            {editingAddress ? 'Chỉnh sửa địa chỉ' : 'Thêm địa chỉ mới'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
            <XIcon className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-4 items-center">
            <label className="flex items-center gap-1">
              <input type="radio" checked={type === 'delivery'} onChange={() => setType('delivery')} />
              Địa chỉ giao hàng
            </label>
            <label className="flex items-center gap-1">
              <input type="radio" checked={type === 'pickup'} onChange={() => setType('pickup')} />
              Địa chỉ lấy hàng
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nhãn địa chỉ
            </label>
            <input type="text" value={formData.label} onChange={e => setFormData({
            ...formData,
            label: e.target.value
          })} placeholder="VD: Nhà riêng, Công ty..." className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {type === 'delivery' ? 'Họ tên người nhận' : 'Họ tên người gửi'}
            </label>
            <input type="text" value={formData.name} onChange={e => setFormData({
            ...formData,
            name: e.target.value
          })} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Số điện thoại
            </label>
            <input type="tel" value={formData.phone} onChange={e => setFormData({
            ...formData,
            phone: e.target.value
          })} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Địa chỉ chi tiết (Số nhà, tên đường)
            </label>
            <input type="text" value={formData.street} onChange={e => setFormData({
            ...formData,
            street: e.target.value
          })} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500" placeholder="Số nhà, tên đường..." />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <select value={selectedWardCode} onChange={e => setFormData({
              ...formData,
              ward: wards.find((w: any) => w.code === e.target.value)?.name || ''
            })} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500" disabled={!formData.district}>
              <option value="">Phường/Xã</option>
              {wards.map((ward: any) => <option key={ward.code} value={ward.code}>{ward.name}</option>)}
            </select>
            <select value={selectedDistrictCode} onChange={e => {
              const districtName = districts.find((d: any) => d.code === e.target.value)?.name || '';
              setFormData({
                ...formData,
                district: districtName,
                ward: ''
              });
            }} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500" disabled={!formData.city}>
              <option value="">Quận/Huyện</option>
              {districts.map((district: any) => <option key={district.code} value={district.code}>{district.name}</option>)}
            </select>
            <select value={selectedProvinceCode} onChange={e => {
              const provinceName = provinces.find((p: any) => p.code === e.target.value)?.name || '';
              setFormData({
                ...formData,
                city: provinceName,
                district: '',
                ward: ''
              });
            }} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500">
              <option value="">Tỉnh/Thành phố</option>
              {provinces.map((province: any) => <option key={province.code} value={province.code}>{province.name}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="default" checked={formData.is_default} onChange={e => setFormData({
            ...formData,
            is_default: e.target.checked
          })} className="rounded" />
            <label htmlFor="default" className="text-sm">
              Đặt làm địa chỉ mặc định
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg hover:bg-gray-50">
              Hủy
            </button>
            <button type="submit" className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600">
              {editingAddress ? 'Cập nhật' : 'Lưu địa chỉ'}
            </button>
          </div>
        </form>
      </div>
    </div>;
};
export default AddAddressModal;