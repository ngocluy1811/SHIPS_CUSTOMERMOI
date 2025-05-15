import React, { useState } from 'react';
import { MapPinIcon, TruckIcon, CheckCircleIcon, Package2Icon, SearchIcon, WarehouseIcon, XCircleIcon, ClockIcon } from 'lucide-react';
import axios from '../../api/axios';

const OrderTracking = () => {
  const [trackingCode, setTrackingCode] = useState('');
  const [order, setOrder] = useState<any>(null);
  const [tracking, setTracking] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!trackingCode) return;
    setLoading(true);
    setError('');
    setOrder(null);
    setTracking(null);
    try {
      // Lấy thông tin đơn hàng
      const orderRes = await axios.get(`/orders/${trackingCode}`);
      setOrder(orderRes.data);
      // Lấy tracking (nếu có)
      try {
        const trackingRes = await axios.get(`/trackings/${trackingCode}`);
        setTracking(trackingRes.data);
      } catch (err: any) {
        if (err?.response?.status === 404) {
          setTracking({ status: 'inactive' });
        } else {
          setTracking(null);
        }
      }
    } catch (err: any) {
      setError('Không tìm thấy đơn hàng hoặc có lỗi xảy ra!');
    } finally {
      setLoading(false);
    }
  };

  function formatDate(dateStr: string) {
    if (!dateStr) return '---';
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN');
  }

  function getEstimatedDeliveryDate(order: any) {
    // Các trạng thái cần cộng ngày dự kiến giao
    const processingStatuses = [
      'pending', 'processing', 'delivering', 'Chờ xử lý', 'Đang chuẩn bị', 'Đang giao'
    ];
    if (processingStatuses.includes(order.status)) {
      let days = 2;
      if (order.distance !== undefined) {
        days = order.distance <= 30 ? 2 : 3;
      }
      // Ưu tiên ngày lấy hàng, fallback về created_at
      const baseDate = order.estimate_time ? new Date(order.estimate_time) : (order.created_at ? new Date(order.created_at) : new Date());
      const estimated = new Date(baseDate);
      estimated.setDate(baseDate.getDate() + days);
      return formatDate(estimated.toISOString());
    }
    // Các trạng thái khác giữ nguyên
    if (order.estimated_delivery_date) return formatDate(order.estimated_delivery_date);
    return '---';
  }

  // Logic customHistory giống OrderDetail
  let customHistory = null;
  let customLastActiveIndex: number = 0;
  if (order) {
    const displayStatus = order.status;
    if (displayStatus === 'Đã hủy' || displayStatus === 'cancelled') {
      customHistory = [
        {
          status: 'Chờ xử lý',
          label: 'Chờ xử lý',
          time: order?.created_at || '',
          active: false,
          description: 'Đơn hàng đang chờ xác nhận',
          icon: <ClockIcon className="w-5 h-5 text-orange-400 animate-spin" />
        },
        {
          status: 'Đã hủy',
          label: 'Đã hủy',
          time: order?.updated_at || '',
          active: true,
          description: 'Đơn hàng đã bị hủy',
          icon: <XCircleIcon className="w-5 h-5 text-red-500" />
        }
      ];
      customLastActiveIndex = 1;
    } else if (displayStatus === 'Chờ xử lý' || displayStatus === 'pending') {
      customHistory = [{
        status: 'Chờ xử lý',
        label: 'Chờ xử lý',
        time: order?.created_at || '',
        active: true,
        description: 'Đơn hàng đang chờ xác nhận',
        icon: <ClockIcon className="w-5 h-5 text-orange-400 animate-spin" />
      }];
      customLastActiveIndex = 0;
    } else if (displayStatus === 'Đang chuẩn bị' || displayStatus === 'preparing') {
      customHistory = [
        {
          status: 'Chờ xử lý',
          label: 'Chờ xử lý',
          time: order?.created_at || '',
          active: false,
          description: 'Đơn hàng đang chờ xác nhận',
          icon: <ClockIcon className="w-5 h-5 text-orange-400 animate-spin" />
        },
        {
          status: 'Đang chuẩn bị',
          label: 'Đang chuẩn bị',
          time: order?.updated_at || '',
          active: true,
          description: 'Đơn hàng đang được chuẩn bị để giao cho shipper',
          icon: <Package2Icon className="w-5 h-5 text-orange-500" />
        }
      ];
      customLastActiveIndex = 1;
    } else if (displayStatus === 'Đang giao' || displayStatus === 'delivering') {
      customHistory = [
        {
          status: 'Chờ xử lý',
          label: 'Chờ xử lý',
          time: order?.created_at || '',
          active: false,
          description: 'Đơn hàng đang chờ xác nhận',
          icon: <ClockIcon className="w-5 h-5 text-orange-400 animate-spin" />
        },
        {
          status: 'Đang chuẩn bị',
          label: 'Đang chuẩn bị',
          time: order?.timeline?.find((x:any)=>x.status==='Đang chuẩn bị')?.time || '',
          active: false,
          description: 'Đơn hàng đang được chuẩn bị để giao cho shipper',
          icon: <Package2Icon className="w-5 h-5 text-orange-500" />
        },
        {
          status: 'Đang giao',
          label: 'Đang giao',
          time: order?.updated_at || order?.timeline?.find((x:any)=>x.status==='Đang giao')?.time || '',
          active: true,
          description: 'Shipper đang giao hàng',
          icon: <TruckIcon className="w-5 h-5 text-blue-500 animate-bounce" />
        }
      ];
      customLastActiveIndex = 2;
    } else if (displayStatus === 'Đã giao' || displayStatus === 'delivered') {
      customHistory = [
        {
          status: 'Chờ xử lý',
          label: 'Chờ xử lý',
          time: order?.created_at || '',
          active: false,
          description: 'Đơn hàng đang chờ xác nhận',
          icon: <ClockIcon className="w-5 h-5 text-orange-400 animate-spin" />
        },
        {
          status: 'Đang chuẩn bị',
          label: 'Đang chuẩn bị',
          time: order?.timeline?.find((x:any)=>x.status==='Đang chuẩn bị')?.time || '',
          active: false,
          description: 'Đơn hàng đang được chuẩn bị để giao cho shipper',
          icon: <Package2Icon className="w-5 h-5 text-orange-500" />
        },
        {
          status: 'Đang giao',
          label: 'Đang giao',
          time: order?.timeline?.find((x:any)=>x.status==='Đang giao')?.time || '',
          active: false,
          description: 'Shipper đang giao hàng',
          icon: <TruckIcon className="w-5 h-5 text-blue-500 animate-bounce" />
        },
        {
          status: 'Đã giao thành công',
          label: 'Đã giao thành công',
          time: order?.updated_at || order?.timeline?.find((x:any)=>x.status==='Đã giao thành công')?.time || '',
          active: true,
          description: 'Đơn hàng đã được giao thành công',
          icon: <CheckCircleIcon className="w-5 h-5 text-green-500 animate-pulse" />
        }
      ];
      customLastActiveIndex = 3;
    }
  }

  return <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-6">Theo dõi đơn hàng</h2>
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <input type="text" placeholder="Nhập mã đơn hàng của bạn" value={trackingCode} onChange={e => setTrackingCode(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500" />
            <SearchIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
          <button onClick={handleSearch} className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600">
            Tra cứu
          </button>
        </div>
        {loading && <div>Đang tải dữ liệu...</div>}
        {error && <div className="text-red-500">{error}</div>}
        {order && (
          <div className="space-y-6">
            {/* Order Summary */}
            <div className="p-4 bg-orange-50 rounded-lg">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-gray-600">Mã đơn hàng</div>
                  <div className="font-medium">{order.order_id}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Trạng thái</div>
                  <div className="font-medium text-green-600">{order.status}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">
                    {order.status === 'delivered' || order.status === 'Đã giao'
                      ? 'Ngày giao thành công'
                      : order.status === 'cancelled' || order.status === 'Đã hủy'
                        ? 'Ngày hủy'
                        : 'Dự kiến giao'}
                  </div>
                  <div className="font-medium">
                    {order.status === 'delivered' || order.status === 'Đã giao'
                      ? (order.delivered_at ? formatDate(order.delivered_at) : '---')
                      : order.status === 'cancelled' || order.status === 'Đã hủy'
                        ? (order.updated_at ? formatDate(order.updated_at) : '---')
                        : getEstimatedDeliveryDate(order)}
                  </div>
                </div>
              </div>
              {/* Ngày lấy hàng */}
              {order.estimate_time && (
                <div>
                  <div className="text-sm text-gray-600">Ngày lấy hàng</div>
                  <div className="font-medium">{formatDate(order.estimate_time)}</div>
                </div>
              )}
            </div>
            {/* Current Location */}
            {tracking && tracking.current_location && (
            <div className="p-4 border border-orange-200 rounded-lg bg-orange-50">
              <div className="flex items-center gap-3 text-orange-600">
                <WarehouseIcon className="h-5 w-5" />
                <span className="font-medium">Vị trí hiện tại</span>
              </div>
              <div className="mt-2 pl-8">
                  <div className="font-medium">{tracking.current_location.name || '---'}</div>
                  <div className="text-sm text-gray-600">{tracking.current_location.address || ''}</div>
                </div>
              </div>
            )}
            {/* Timeline - custom UI đẹp */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h2 className="font-medium flex items-center gap-2 mb-6">
                <ClockIcon className="h-5 w-5 text-orange-500" />
                Lịch sử vận chuyển
              </h2>
              <div className="flex flex-col gap-0 relative">
                {/* Đường dọc liền mạch nối các bước */}
                {(customHistory || order.timeline)?.length > 1 && (
                  <div className="absolute left-7 top-6 bottom-6 w-2 z-0 flex flex-col items-center">
                    <div 
                      className="flex-1 w-1 mx-auto" 
                      style={{ 
                        background: `linear-gradient(to bottom, 
                          #ff9800 ${customLastActiveIndex >= 0 ? ((customLastActiveIndex + 1) / (customHistory?.length || order.timeline.length)) * 100 : 0}%, 
                          #E0E0E0 ${customLastActiveIndex >= 0 ? ((customLastActiveIndex + 1) / (customHistory?.length || order.timeline.length)) * 100 : 0}%)`,
                        borderRadius: 8 
                      }} 
                    />
                  </div>
                )}
                {(customHistory || order.timeline || []).map((h: any, index: number) => {
                  const isDone = index <= customLastActiveIndex;
                  const isActive = index === customLastActiveIndex;
                  return (
                    <div key={index} className="flex items-center gap-4 relative min-h-[56px] z-10">
                      {/* Dot + Icon */}
                      <div className="flex flex-col items-center relative z-10">
                        <div 
                          className={`w-7 h-7 rounded-full flex items-center justify-center border-4 transition-all duration-200 
                            ${index === 0 
                              ? (isDone ? 'bg-orange-100 border-orange-400' : 'bg-orange-50 border-orange-200')
                              : isDone 
                                ? 'bg-blue-100 border-blue-400 hover:border-orange-500 cursor-pointer' 
                                : 'bg-gray-100 border-gray-300'
                            }`}
                          style={{ 
                            boxShadow: isActive ? '0 0 0 4px #ff980033' : undefined,
                            transform: isActive ? 'scale(1.1)' : 'scale(1)'
                          }}
                          title={h.status || h.label}
                        >
                          {h.icon ? h.icon : (
                            index === 0 ? null : (
                              <span className={`w-4 h-4 rounded-full block ${isDone ? 'bg-blue-500' : 'bg-gray-400'}`}></span>
                            )
                          )}
                        </div>
                        {/* Arrow đầu mũi tên lớn, animate động */}
                        {index < (customHistory?.length || order.timeline?.length || 0) - 1 && (
                          <svg 
                            width="18" 
                            height="36" 
                            viewBox="0 0 18 36" 
                            fill="none" 
                            xmlns="http://www.w3.org/2000/svg" 
                            className={`mt-[-2px] ${isActive ? 'animate-bounce' : ''}`}
                          >
                            <rect 
                              x="7.5" 
                              y="0" 
                              width="3" 
                              height="28" 
                              rx="1.5" 
                              fill={index < customLastActiveIndex ? '#ff9800' : '#E0E0E0'} 
                            />
                            <polygon 
                              points="9,36 18,28 0,28" 
                              fill={index < customLastActiveIndex ? '#ff9800' : '#E0E0E0'} 
                            />
                          </svg>
                        )}
                      </div>
                      {/* Content */}
                      <div className="flex-1">
                        <div 
                          className={`font-semibold text-base transition-colors duration-200
                            ${index === 0 
                              ? (isDone ? 'text-orange-700' : 'text-orange-500')
                              : isDone 
                                ? 'text-blue-700' 
                                : 'text-gray-400'
                            }`}
                        >
                          {h.status || h.label}
                        </div>
                        {h.time && (
                          <div className="text-sm text-gray-400">
                            {formatDate(h.time)}
            </div>
                        )}
                        {h.description && (
                          <div className="text-sm text-gray-500 mt-1">
                            {h.description}
                    </div>
                        )}
                    </div>
                    </div>
                  );
                })}
                  </div>
            </div>
            {/* Nếu không có tracking active */}
            {tracking && tracking.status === 'inactive' && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700 text-center">
                <span>Shipper chưa bắt đầu giao hoặc chưa có tracking cho đơn này.</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>;
};

export default OrderTracking;