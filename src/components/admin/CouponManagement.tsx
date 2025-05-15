import React, { useState, useEffect } from 'react';
import { PlusIcon, SearchIcon, EditIcon, TrashIcon, TicketIcon } from 'lucide-react';
import api from '../../api/axios';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface Coupon {
  coupon_id: string;
  code: string;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  valid_from: string;
  valid_to: string;
  max_uses: number;
  uses_count: number;
  min_order_amount: number;
  is_active: boolean;
}

const CouponManagement = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    discount_type: 'percent',
    discount_value: 0,
    valid_from: '',
    valid_to: '',
    max_uses: 0,
    min_order_amount: 0
  });

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      const response = await api.get<Coupon[]>('/coupons');
      setCoupons(response.data);
    } catch (error) {
      console.error('Error fetching coupons:', error);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/coupons', formData);
      setIsCreateModalOpen(false);
      fetchCoupons();
      setFormData({
        code: '',
        discount_type: 'percent',
        discount_value: 0,
        valid_from: '',
        valid_to: '',
        max_uses: 0,
        min_order_amount: 0
      });
    } catch (error) {
      console.error('Error creating coupon:', error);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCoupon) return;
    try {
      await api.put(`/coupons/${selectedCoupon.coupon_id}`, formData);
      setIsEditModalOpen(false);
      fetchCoupons();
    } catch (error) {
      console.error('Error updating coupon:', error);
    }
  };

  const handleDelete = async (couponId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa coupon này?')) return;
    try {
      await api.delete(`/coupons/${couponId}`);
      fetchCoupons();
    } catch (error) {
      console.error('Error deleting coupon:', error);
    }
  };

  const filteredCoupons = coupons.filter(coupon => 
    coupon.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Quản lý mã giảm giá</h1>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center gap-2"
        >
          <PlusIcon className="h-5 w-5" />
          Tạo mã giảm giá
        </button>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm flex gap-4">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Tìm kiếm mã giảm giá..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
          <SearchIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredCoupons.map((coupon) => (
          <div key={coupon.coupon_id} className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TicketIcon className="h-5 w-5 text-orange-500" />
                <span className="font-medium">{coupon.code}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSelectedCoupon(coupon);
                    setFormData({
                      code: coupon.code,
                      discount_type: coupon.discount_type,
                      discount_value: coupon.discount_value,
                      valid_from: coupon.valid_from,
                      valid_to: coupon.valid_to,
                      max_uses: coupon.max_uses,
                      min_order_amount: coupon.min_order_amount
                    });
                    setIsEditModalOpen(true);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <EditIcon className="h-5 w-5 text-gray-500" />
                </button>
                <button
                  onClick={() => handleDelete(coupon.coupon_id)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <TrashIcon className="h-5 w-5 text-red-500" />
                </button>
              </div>
            </div>
            <div className="mt-4 space-y-2 text-sm text-gray-600">
              <div>Loại giảm giá: {coupon.discount_type === 'percent' ? 'Phần trăm' : 'Cố định'}</div>
              <div>Giá trị: {coupon.discount_type === 'percent' ? `${coupon.discount_value}%` : `${coupon.discount_value.toLocaleString()}đ`}</div>
              <div>Đơn tối thiểu: {coupon.min_order_amount.toLocaleString()}đ</div>
              <div>Hiệu lực: {format(new Date(coupon.valid_from), 'dd/MM/yyyy', { locale: vi })} - {format(new Date(coupon.valid_to), 'dd/MM/yyyy', { locale: vi })}</div>
              <div>Đã sử dụng: {coupon.uses_count}/{coupon.max_uses}</div>
              <div>Trạng thái: <span className={coupon.is_active ? 'text-green-600' : 'text-red-600'}>{coupon.is_active ? 'Đang hoạt động' : 'Đã tắt'}</span></div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <h2 className="text-lg font-medium mb-4">Tạo mã giảm giá</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Mã giảm giá</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Loại giảm giá</label>
                <select
                  value={formData.discount_type}
                  onChange={(e) => setFormData({ ...formData, discount_type: e.target.value as 'percent' | 'fixed' })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                  required
                >
                  <option value="percent">Phần trăm</option>
                  <option value="fixed">Cố định</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Giá trị giảm giá</label>
                <input
                  type="number"
                  value={formData.discount_value}
                  onChange={(e) => setFormData({ ...formData, discount_value: Number(e.target.value) })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Đơn tối thiểu</label>
                <input
                  type="number"
                  value={formData.min_order_amount}
                  onChange={(e) => setFormData({ ...formData, min_order_amount: Number(e.target.value) })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Số lần sử dụng tối đa</label>
                <input
                  type="number"
                  value={formData.max_uses}
                  onChange={(e) => setFormData({ ...formData, max_uses: Number(e.target.value) })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Ngày bắt đầu</label>
                <input
                  type="date"
                  value={formData.valid_from}
                  onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Ngày kết thúc</label>
                <input
                  type="date"
                  value={formData.valid_to}
                  onChange={(e) => setFormData({ ...formData, valid_to: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                >
                  Tạo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && selectedCoupon && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <h2 className="text-lg font-medium mb-4">Chỉnh sửa mã giảm giá</h2>
            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Mã giảm giá</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Loại giảm giá</label>
                <select
                  value={formData.discount_type}
                  onChange={(e) => setFormData({ ...formData, discount_type: e.target.value as 'percent' | 'fixed' })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                  required
                >
                  <option value="percent">Phần trăm</option>
                  <option value="fixed">Cố định</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Giá trị giảm giá</label>
                <input
                  type="number"
                  value={formData.discount_value}
                  onChange={(e) => setFormData({ ...formData, discount_value: Number(e.target.value) })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Đơn tối thiểu</label>
                <input
                  type="number"
                  value={formData.min_order_amount}
                  onChange={(e) => setFormData({ ...formData, min_order_amount: Number(e.target.value) })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Số lần sử dụng tối đa</label>
                <input
                  type="number"
                  value={formData.max_uses}
                  onChange={(e) => setFormData({ ...formData, max_uses: Number(e.target.value) })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Ngày bắt đầu</label>
                <input
                  type="date"
                  value={formData.valid_from}
                  onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Ngày kết thúc</label>
                <input
                  type="date"
                  value={formData.valid_to}
                  onChange={(e) => setFormData({ ...formData, valid_to: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                >
                  Cập nhật
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CouponManagement; 