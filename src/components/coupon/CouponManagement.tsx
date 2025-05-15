import React, { useState, useEffect } from 'react';
import { TicketIcon, SearchIcon } from 'lucide-react';
import CouponUseModal from '../modals/CouponUseModal';
import api from '../../api/axios';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useAuth } from '../auth/AuthContext';

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

interface UserCoupon {
  usercoupon_id: string;
  user_id: string;
  coupon_id: string;
  status?: string;
  coupon: Coupon;
}

const CouponManagement = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCoupon, setSelectedCoupon] = useState<null | Coupon>(null);
  const [userCoupons, setUserCoupons] = useState<UserCoupon[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (user?.user_id) {
      console.log('Current user_id:', user.user_id);
      fetchUserCoupons();
    }
  }, [user]);

  // Refetch coupon khi có notification realtime
  useEffect(() => {
    const handleUpdate = () => {
      if (user?.user_id) fetchUserCoupons();
    };
    window.addEventListener('notifications-updated', handleUpdate);
    return () => window.removeEventListener('notifications-updated', handleUpdate);
  }, [user]);

  const fetchUserCoupons = async () => {
    try {
      const response = await api.get<UserCoupon[]>(`/user-coupons?user_id=${user.user_id}`);
      console.log('User coupons from API:', response.data);
      setUserCoupons(response.data);
    } catch (error) {
      console.error('Error fetching user coupons:', error);
    }
  };

  const filteredCoupons = userCoupons
    .filter(uc => uc.coupon && uc.coupon.code.toLowerCase().includes(searchQuery.toLowerCase()))
    .map(uc => uc.coupon);

  const getCouponStatus = (coupon: Coupon) => {
    if (!coupon.is_active) return 'Đã tắt';
    if (new Date(coupon.valid_from) > new Date()) return 'Sắp có hiệu lực';
    if (new Date(coupon.valid_to) < new Date()) return 'Đã hết hạn';
    if (coupon.uses_count >= coupon.max_uses) return 'Đã hết lượt sử dụng';
    return 'Có thể sử dụng';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Có thể sử dụng':
        return 'bg-green-100 text-green-600';
      case 'Sắp có hiệu lực':
        return 'bg-yellow-100 text-yellow-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Mã giảm giá của tôi</h1>
      </div>
      <div className="bg-white p-4 rounded-lg shadow-sm flex gap-4">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Tìm kiếm mã giảm giá..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
          <SearchIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {userCoupons
          .filter(uc => uc.coupon && uc.coupon.code.toLowerCase().includes(searchQuery.toLowerCase()))
          .map(uc => {
            const coupon = uc.coupon;
            const status = getCouponStatus(coupon);
            return (
              <div key={uc.usercoupon_id} className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <TicketIcon className="h-5 w-5 text-orange-500" />
                  <span className="font-medium">{coupon.code}</span>
                </div>
                <div className="space-y-2 text-sm text-gray-600">
                  <div>
                    Giảm: {coupon.discount_type === 'percent'
                      ? `${coupon.discount_value}%`
                      : `${coupon.discount_value.toLocaleString()}đ`}
                  </div>
                  <div>Đơn tối thiểu: {coupon.min_order_amount.toLocaleString()}đ</div>
                  <div>Hết hạn: {format(new Date(coupon.valid_to), 'dd/MM/yyyy', { locale: vi })}</div>
                </div>
                <div className="mt-4">
                  <span className={`px-2 py-1 rounded text-xs ${getStatusColor(status)}`}>{status}</span>
                </div>
                {status === 'Có thể sử dụng' && (
                  <button
                    onClick={() => setSelectedCoupon(coupon)}
                    className="mt-4 w-full px-4 py-2 border border-orange-500 text-orange-500 rounded hover:bg-orange-50"
                  >
                    Sử dụng ngay
                  </button>
                )}
              </div>
            );
          })}
      </div>
      {selectedCoupon && (
        <CouponUseModal
          isOpen={!!selectedCoupon}
          onClose={() => setSelectedCoupon(null)}
          coupon={{
            code: selectedCoupon.code,
            desc: `Giảm ${selectedCoupon.discount_type === 'percent' 
              ? `${selectedCoupon.discount_value}%` 
              : `${selectedCoupon.discount_value.toLocaleString()}đ`} cho đơn hàng`,
            value: selectedCoupon.discount_type === 'percent' 
              ? `${selectedCoupon.discount_value}%` 
              : `${selectedCoupon.discount_value.toLocaleString()}đ`
          }}
        />
      )}
    </div>
  );
};

export default CouponManagement;