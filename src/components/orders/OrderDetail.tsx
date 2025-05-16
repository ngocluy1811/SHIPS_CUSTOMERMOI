import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Package2Icon, TruckIcon, MapPinIcon, PhoneIcon, ClockIcon, DollarSignIcon, PrinterIcon, ShareIcon, MessageCircleIcon, AlertTriangleIcon, StarIcon, CheckCircleIcon, XIcon, TagIcon, BadgeCheckIcon, MailIcon } from 'lucide-react';
import ShipperLocationMap from './ShipperLocationMap';
import ShipperChat from '../chat/ShipperChat';
import RatingModal from '../modals/RatingModal';
import axios from '../../api/axios';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { QRCodeSVG } from 'qrcode.react';
import { io, Socket } from 'socket.io-client';
import Modal from "../modals/Modal";

interface TrackingData {
  tracking_id: string;
  order_id: string;
  shipper_id: string;
  status: 'active' | 'inactive';
  location?: {
    lat: number;
    lng: number;
  };
  smart_suggestion?: string;
  created_at: string;
}

const ShipperInfo = ({ orderId }: { orderId: string }) => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const shipperLocation = {
    lat: 21.028511,
    lng: 105.804817
  };
  const destination = {
    lat: 21.035771,
    lng: 105.813809
  };
  const shipper = {
    name: 'Nguyễn Văn C',
    phone: '0912345678',
    avatar: 'https://randomuser.me/api/portraits/men/1.jpg',
    status: 'online' as const
  };
  return <div className="bg-white rounded-lg shadow-sm space-y-4">
      <div className="p-6">
        <h2 className="font-medium flex items-center gap-2">
          <TruckIcon className="h-5 w-5 text-orange-500" />
          Thông tin shipper
        </h2>
        <div className="mt-4 space-y-4">
          <div className="flex items-center gap-3">
            <img src={shipper.avatar} alt={shipper.name} className="w-12 h-12 rounded-full" />
            <div>
              <div className="font-medium">{shipper.name}</div>
              <div className="flex items-center gap-2 text-gray-600">
                <PhoneIcon className="h-4 w-4" />
                <span>{shipper.phone}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {/*
            <button onClick={() => setIsChatOpen(true)} className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center justify-center gap-2">
              <MessageCircleIcon className="h-4 w-4" />
              Chat với shipper
            </button>
            <button className="px-4 py-2 text-red-500 border border-red-500 rounded-lg hover:bg-red-50 flex items-center gap-2">
              <AlertTriangleIcon className="h-4 w-4" />
              Báo cáo
            </button>
            */}
          </div>
        </div>
      </div>
      <div className="p-6 border-t">
        <h3 className="font-medium mb-4">Vị trí shipper</h3>
        <ShipperLocationMap
          shipperLocation={{ lat: 10.98, lng: 106.75 }}
          deliveryAddress={{}}
          shipperPhone={shipper.phone}
          onOpenChat={() => setIsChatOpen(true)}
        />
      </div>
      {isChatOpen && <ShipperChat isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} shipper={shipper} orderId={orderId} />}
    </div>;
};

const DeliveryHistory = ({ history = [], customLastActiveIndex }: { history: any[], customLastActiveIndex?: number }) => {
  // Luôn bắt đầu bằng 'Chờ xử lý' (chấm cam xoay xoay)
  let steps = history;
  const isCancelledTimeline = steps.length === 2 && steps[1]?.status === 'Đã hủy';
  
  // Tạo bước đầu tiên nếu chưa có
  const firstStep = {
    status: 'Chờ xử lý',
    label: 'Chờ xử lý',
    time: steps[0]?.time || '',
    active: steps[0]?.active || false,
    description: 'Đơn hàng đang chờ xác nhận',
    icon: (
      <svg className="w-5 h-5 text-orange-400 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
      </svg>
    )
  };

  if (!steps.length || steps[0]?.status !== 'Chờ xử lý') {
    steps = [firstStep, ...steps];
  } else {
    steps = [{ ...firstStep, ...steps[0] }, ...steps.slice(1)];
  }

  // Tìm bước active cuối cùng
  let lastActiveIndex = typeof customLastActiveIndex === 'number' ? customLastActiveIndex : -1;
  if (lastActiveIndex === -1) {
    steps.forEach((s, idx) => { if (s.active) lastActiveIndex = idx; });
  }

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm">
      <h2 className="font-medium flex items-center gap-2 mb-6">
        <ClockIcon className="h-5 w-5 text-orange-500" />
        Lịch sử vận chuyển
      </h2>
      <div className="flex flex-col gap-0 relative">
        {/* Đường dọc liền mạch nối các bước */}
        {steps.length > 1 && (
          <div className="absolute left-7 top-6 bottom-6 w-2 z-0 flex flex-col items-center">
            <div 
              className="flex-1 w-1 mx-auto" 
              style={{ 
                background: `linear-gradient(to bottom, 
                  #ff9800 ${lastActiveIndex >= 0 ? ((lastActiveIndex + 1) / steps.length) * 100 : 0}%, 
                  #E0E0E0 ${lastActiveIndex >= 0 ? ((lastActiveIndex + 1) / steps.length) * 100 : 0}%)`,
                borderRadius: 8 
              }} 
            />
              </div>
        )}

        {steps.map((h, index) => {
          const isDone = index <= lastActiveIndex;
          const isActive = index === lastActiveIndex;
          
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
                {index < steps.length - 1 && (
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
                      fill={isCancelledTimeline ? '#E0E0E0' : (index < lastActiveIndex ? '#ff9800' : '#E0E0E0')} 
                    />
                    <polygon 
                      points="9,36 18,28 0,28" 
                      fill={isCancelledTimeline ? '#E0E0E0' : (index < lastActiveIndex ? '#ff9800' : '#E0E0E0')} 
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
                    {new Date(h.time).toLocaleString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric'
                    })}
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
  );
};

interface OrderDetailProps {
  orderData?: any;
  forcePrinting?: boolean;
}
const OrderDetail: React.FC<OrderDetailProps> = ({ orderData, forcePrinting }) => {
  const { id: paramId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(orderData || null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [orderItems, setOrderItems] = useState<any[]>(orderData?.order_items || []);
  const printRef = React.useRef<HTMLDivElement>(null);
  const [showWatermark, setShowWatermark] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const [isTrackingActive, setIsTrackingActive] = useState(false);
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [shipperLocation, setShipperLocation] = useState<{ lat: number; lng: number } | null>(null);
  const claimedFetchedRef = useRef(false);
  const [showViewRating, setShowViewRating] = useState(false);

  // Map phương thức thanh toán
  const paymentMethodMap: { [key: string]: string } = {
    COD: 'Thanh toán khi nhận hàng',
    BANK: 'Chuyển khoản ngân hàng',
    WALLET: 'Ví điện tử',
    CASH: 'Tiền mặt',
    CREDIT: 'Thẻ tín dụng',
    DEBIT: 'Thẻ ghi nợ',
    MOMO: 'Ví MoMo',
    VNPAY: 'VNPay',
    ZALOPAY: 'ZaloPay',
    SHOPEEPAY: 'Ví ShopeePay',
    VISA: 'Thẻ Visa',
    MASTERCARD: 'Thẻ Mastercard',
    JCB: 'Thẻ JCB',
    AMEX: 'Thẻ American Express'
  };

  // Map trạng thái thanh toán
  const paymentStatusMap: { [key: string]: string } = {
    PENDING: 'Chờ thanh toán',
    PAID: 'Đã thanh toán',
    FAILED: 'Thanh toán thất bại',
    REFUNDED: 'Đã hoàn tiền',
    PARTIALLY_PAID: 'Thanh toán một phần',
    CANCELLED: 'Đã hủy'
  };

  // Đưa fetchOrder ra ngoài để có thể gọi lại
  const fetchOrder = useCallback(async () => {
    try {
      const res = await axios.get(`/orders/${paramId}`);
      console.log('Fetched order after claim:', res.data);
      if (res.data && typeof res.data === 'object') {
        setOrder({ ...res.data }); // ép React re-render
      } else {
        setOrder(res.data);
      }
        const orderData = res.data as any;
        // Lấy tên và SĐT người gửi
        if (orderData?.customer_id) {
          try {
            const userRes = await axios.get(`/users/public/${orderData.customer_id}`);
            const userData = userRes.data as any;
            setCustomerName(userData.fullName || orderData.customer_id);
            setCustomerPhone(userData.phoneNumber || '');
          } catch {
            setCustomerName(orderData.customer_id);
            setCustomerPhone('');
          }
        }
      // Lấy tên và SĐT người nhận nếu không có trong delivery_address_full hoặc delivery_address
      let delivery = orderData?.delivery_address_full || orderData?.delivery_address || {};
      if ((!delivery.name || !delivery.phone) && orderData?.receiver_id) {
          try {
            const userRes = await axios.get(`/users/public/${orderData.receiver_id}`);
            const userData = userRes.data as any;
            setReceiverName(userData.fullName || orderData.receiver_id);
            setReceiverPhone(userData.phoneNumber || '');
          } catch {
            setReceiverName(orderData.receiver_id);
            setReceiverPhone('');
          }
      } else {
        setReceiverName(delivery.name || '');
        setReceiverPhone(delivery.phone || '');
        }
        // Lấy thông tin hàng hóa nếu có
        if (orderData?.order_items && Array.isArray(orderData.order_items) && orderData.order_items.length > 0) {
          setOrderItems(orderData.order_items);
        } else {
          // Nếu không có, gọi API lấy order items riêng
          try {
            const itemsRes = await axios.get(`/orderitems/${orderData.order_id}`);
            setOrderItems(Array.isArray(itemsRes.data) ? itemsRes.data : []);
          } catch {
            setOrderItems([]);
          }
        }
      } catch {
        setOrder(null);
      }
    }, [paramId]);

  useEffect(() => {
    if (!orderData) fetchOrder();
  }, [paramId, orderData, fetchOrder]);

  useEffect(() => {
    if (order) {
      setOrderItems(order.order_items || []);
      if (order.customerName) setCustomerName(order.customerName);
      if (order.customerPhone) setCustomerPhone(order.customerPhone);
      if (order.receiverName) setReceiverName(order.receiverName);
      if (order.receiverPhone) setReceiverPhone(order.receiverPhone);
    }
  }, [order]);

  useEffect(() => {
    console.log('Initializing socket connection...');
    const socket = io('https://ships-backendmoi-k6ob.onrender.com', {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });
  
    socketRef.current = socket;
  
    socket.on('connect', () => {
      console.log('Socket connected successfully');
      if (order?.order_id) {
        console.log('Joining room:', order.order_id);
        socket.emit('join_order_room', order.order_id);
      }
    });
  
    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });
  
    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      toast.error('Kết nối realtime bị mất. Đang thử kết nối lại...');
    });
  
    socket.on('order_status_updated', (data) => {
      console.log('Received order_status_updated:', data);
      if (data.order_id === (order?.order_id || paramId)) {
        toast.info('Đơn hàng đã được cập nhật!', {
          position: "top-right",
          autoClose: 3000,
        });
    fetchOrder();
      }
    });
  
   // Lắng nghe sự kiện order_claimed
const handleOrderClaimed = async (data: any) => {
  console.log('Received order_claimed event:', data); // Log sự kiện
  const orderId = order?.order_id || paramId;
  const receivedOrderId = data.orderId?.startsWith('order_') ? data.orderId : `order_${data.orderId}`;
  console.log('Comparing order IDs:', { receivedOrderId, orderId }); // Log so sánh

  if (receivedOrderId === orderId) {
    toast.info(
      <div>
        <b>Đơn hàng {data.orderId}</b> đã được nhận bởi shipper <b>{data.shipperName || 'một shipper'}</b>
      </div>,
      {
        position: "top-right",
        autoClose: 3000,
      }
    );

    // Retry logic để đảm bảo dữ liệu được cập nhật
    let retries = 3;
    const retryDelay = 500; // Delay 500ms giữa các lần retry

    const attemptFetchOrder = async () => {
      console.log('Calling fetchOrder for order_claimed...'); // Log gọi fetchOrder
      const previousOrder = { ...order }; // Lưu dữ liệu hiện tại để so sánh
      await fetchOrder();
      console.log('Previous order:', previousOrder);
      console.log('New order after fetch:', order);

      // Kiểm tra xem dữ liệu có thay đổi không (ví dụ: shipper có được gán chưa)
      if (retries > 0 && (!order.shipper && !order.shipper_info && previousOrder.status === order.status)) {
        retries -= 1;
        console.log(`Data not updated, retrying... (${retries} attempts left)`);
        setTimeout(attemptFetchOrder, retryDelay);
      } else if (retries === 0) {
        console.log('Max retries reached, data not updated.');
      }
    };

    // Gọi fetchOrder với delay ban đầu
    setTimeout(attemptFetchOrder, 500);
  } else {
    console.log('Order IDs do not match, skipping fetchOrder');
  }
};
socketRef.current.on('order_claimed', handleOrderClaimed);
  
    return () => {
      console.log('Cleaning up socket connection...');
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      socketRef.current?.off('order_claimed', handleOrderClaimed);
    };
  }, [order?.order_id, paramId, fetchOrder]);

  useEffect(() => {
    if (socketRef.current?.connected && order?.order_id) {
      socketRef.current.emit('join_order_room', order.order_id);
      
      // Listen for tracking updates
      socketRef.current.on('shipper_tracking_updated', (data) => {
        if (data.order_id === order.order_id) {
          setIsTrackingActive(data.is_tracking_active);
          if (!data.is_tracking_active) {
            setShowTrackingModal(false);
          }
        }
      });

      // Listen for location updates
      socketRef.current.on('shipper_location_updated', (data) => {
        if (data.order_id === order.order_id) {
          setShipperLocation(data.location);
        }
      });

      // Check initial tracking status
      checkTrackingStatus();
    }
  }, [order?.order_id]);

  useEffect(() => {
    if (showTrackingModal && order?.order_id) {
      checkTrackingStatus();
    }
  }, [showTrackingModal, order?.order_id]);

  useEffect(() => {
    claimedFetchedRef.current = true;
  }, [paramId]);

  const handleRatingSubmit = async (ratingData: any) => {
    try {
      await axios.post('/ratings', {
        order_id: order.order_id,
        rating: ratingData.ratings.overall,
        ratings: ratingData.ratings,
        comment: ratingData.comment,
        tags: ratingData.tags,
        images: ratingData.images,
      });
    setIsRatingModalOpen(false);
      toast.success('Cảm ơn bạn đã tin tưởng và đánh giá chúng tôi!', { position: 'top-right', autoClose: 3000 });
      await fetchOrder();
      setShowViewRating(true);
    } catch (err) {
      toast.error('Gửi đánh giá thất bại!');
    }
  };

  const handlePrintPDF = async () => {
    setShowWatermark(true);
    setIsPrinting(true);
    setTimeout(async () => {
      if (!printRef.current) return;
      const canvas = await html2canvas(printRef.current, { scale: 2, backgroundColor: '#fff', useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      pdf.addImage(imgData, 'PNG', 5, 5, pageWidth-10, 0);
      pdf.save(`order_${paramId}.pdf`);
      setShowWatermark(false);
      setIsPrinting(false);
      toast.success('Đã xuất file PDF đơn hàng!', { position: 'top-right', autoClose: 2000 });
    }, 300);
  };

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        toast.success('Đã copy liên kết đơn hàng vào clipboard!', { position: 'top-right', autoClose: 2000 });
      });
    } else {
      // fallback cho trình duyệt cũ
      const textarea = document.createElement('textarea');
      textarea.value = url;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      toast.success('Đã copy liên kết đơn hàng vào clipboard!', { position: 'top-right', autoClose: 2000 });
    }
  };

  // Sau khi lấy order từ API, xác định trạng thái hiển thị
  const getDisplayStatus = (order: any) => {
    if ((order?.shipper || order?.shipper_info) && (order?.status === 'Chờ xử lý' || order?.status === 'pending')) {
      return 'Đang chuẩn bị';
    }
    if (order?.status === 'delivering') return 'Đang giao';
    return order?.status;
  };

  // Thay thế mọi chỗ dùng order.status bằng displayStatus
  const displayStatus = getDisplayStatus(order);

  const renderShipperSection = () => {
    if (!order) return null;
    if (displayStatus === 'Chờ xử lý' || displayStatus === 'pending') {
      return null;
    }
    const shipper = order.shipper_info || order.shipper;
    if (!shipper) return null;

    // Chỉ override UI khi đã giao thành công
    if (displayStatus === 'Đã giao' || displayStatus === 'delivered') {
      const isPreparing = displayStatus === 'Đang chuẩn bị' || displayStatus === 'delivered';
      const isRated = !!order.rating;
      return (
        <div className="flex flex-col gap-2 mt-6 bg-white rounded-xl shadow-lg p-6 border border-green-300 max-w-xl mx-auto relative overflow-hidden">
          <div className="mb-3 flex items-center justify-center">
            <span className="inline-flex items-center px-3 py-1 rounded-full border border-green-300 bg-green-100 text-green-700 font-semibold text-base gap-2 animate-pulse">
              <CheckCircleIcon className="w-5 h-5 animate-spin text-green-500" />
              Đơn hàng đã được giao thành công
            </span>
                      </div>
          <div className="flex items-center gap-4 justify-center">
            {shipper.avatar ? (
              <img src={shipper.avatar} alt={shipper.name || shipper.fullName || 'Shipper'} className="w-20 h-20 rounded-full object-cover border-4 shadow border-green-200" />
            ) : (
              <div className="w-20 h-20 rounded-full flex items-center justify-center text-gray-500 font-bold text-3xl border-4 shadow bg-green-50 border-green-200">
                {(shipper.name && shipper.name[0]) || (shipper.fullName && shipper.fullName[0]) || 'S'}
                    </div>
            )}
            <div className="ml-4">
              <div className="font-bold text-xl flex items-center gap-2 text-green-700">
                <TruckIcon className="h-5 w-5 text-green-500" />
                {shipper.name || shipper.fullName || 'Không rõ tên'}
                  </div>
              <div className="text-base mt-1 flex items-center gap-2 text-green-600">
                <PhoneIcon className="h-4 w-4 text-green-400" />
                {shipper.phone || 'Chưa có số điện thoại'}
              </div>
              {shipper.email && (
                <div className="flex items-center gap-2 text-base mt-1 text-gray-600">
                  <MailIcon className="w-5 h-5 text-orange-400" />
                  {shipper.email}
                </div>
              )}
               {shipper.vehicle_info?.plate_number && (
                <div className={`text-base mt-1 ${isPreparing ? 'text-orange-500' : 'text-gray-600'}`}>Biển số: {shipper.vehicle_info.plate_number}</div>
              )}
              {shipper.vehicleType && (
                <div className="flex items-center gap-2 text-base mt-1 text-gray-600">
                  <TruckIcon className="w-5 h-5 text-orange-400" />
                  Loại xe: {shipper.vehicleType}
                </div>
              )}
              {shipper.vehicleNumber && (
                <div className="flex items-center gap-2 text-base mt-1 text-gray-600">
                  <TagIcon className="w-5 h-5 text-orange-400" />
                  Biển số: {shipper.vehicleNumber}
                </div>
              )}
              {!shipper.vehicleNumber && shipper.vehicle_info?.plate_number && (
                <div className="flex items-center gap-2 text-base mt-1 text-gray-600">
                  <TagIcon className="w-5 h-5 text-orange-400" />
                  Biển số: {shipper.vehicle_info.plate_number}
                </div>
              )}
              {shipper.citizenId && (
                <div className="flex items-center gap-2 text-base mt-1 text-gray-600">
                  <BadgeCheckIcon className="w-5 h-5 text-orange-400" />
                  CCCD: {shipper.citizenId}
                </div>
              )}
            </div>
          </div>
          <div className="absolute left-0 right-0 bottom-0 h-2 overflow-hidden">
            <div className="w-full h-full animate-gradient-x bg-gradient-to-r from-green-200 via-green-400 to-green-200 bg-[length:200%_100%]" style={{backgroundSize:'200% 100%'}}></div>
          </div>
          <style>{`
            @keyframes gradient-x {
              0% { background-position: 200% 0; }
              100% { background-position: -200% 0; }
            }
            .animate-gradient-x {
              animation: gradient-x 2s linear infinite;
            }
          `}</style>
          <div className="flex gap-2 mt-4 w-full justify-center">
            {!isRated && (
              <button
                onClick={() => setIsRatingModalOpen(true)}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-2 rounded flex items-center justify-center gap-2 animate-pulse"
              >
                <CheckCircleIcon className="h-5 w-5 animate-spin text-white" />
                Đánh giá shipper
              </button>
            )}
            {isRated && (
              <>
                <div className="flex-1 p-3 bg-green-50 text-green-600 rounded-lg text-center font-semibold">
                  Bạn đã đánh giá shipper này
                </div>
                <button
                  className="flex-1 bg-green-100 hover:bg-green-200 text-green-700 font-semibold py-2 rounded flex items-center justify-center gap-2 border border-green-300 mt-2"
                  onClick={() => setShowViewRating(true)}
                >
                  Xem đánh giá của bạn
                </button>
              </>
            )}
          </div>
          {/* Modal xem lại đánh giá */}
          {showViewRating && order.rating && (
            <RatingModal
              isOpen={showViewRating}
              onClose={() => setShowViewRating(false)}
              readOnly={true}
              rating={order.rating}
              comment={order.rating_comment}
              tags={order.rating_tags}
              images={order.rating_images}
              shipperName={order.shipper?.name || order.shipper_info?.name || ''}
              shipperAvatar={order.shipper?.avatar || order.shipper_info?.avatar || ''}
            />
          )}
        </div>
      );
    }
    // Đang giao: hiện đầy đủ thông tin shipper và các nút
    if ((displayStatus === 'Đang giao' || displayStatus === 'delivering' || displayStatus === 'Đang chuẩn bị' || displayStatus === 'preparing'|| displayStatus === 'Đã giao' || displayStatus === 'delivered') && shipper) {
      // Xác định màu sắc theo trạng thái
      const isPreparing = displayStatus === 'Đang chuẩn bị' || displayStatus === 'preparing';
      return (
        <div className={`flex flex-col gap-2 mt-6 bg-white rounded-xl shadow-lg p-6 border max-w-xl mx-auto relative overflow-hidden ${isPreparing ? 'border-orange-300' : 'border-blue-200'}`}>
          <div className="mb-3 flex items-center justify-center">
            <span className={`inline-flex items-center px-3 py-1 rounded-full border font-semibold text-base gap-2 animate-pulse ${isPreparing ? 'bg-orange-100 border-orange-300 text-orange-700' : 'bg-blue-100 border-blue-300 text-blue-700'}`}>
              <svg className={`w-5 h-5 animate-spin ${isPreparing ? 'text-orange-500' : 'text-blue-500'}`} fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>
              {isPreparing ? 'Đơn hàng đang được chuẩn bị để giao cho shipper' : 'Đơn hàng đã được shipper lấy và đang đi giao'}
            </span>
          </div>
          <div className="flex items-center gap-4 justify-center">
            {shipper.avatar ? (
              <img src={shipper.avatar} alt={shipper.name || shipper.fullName || 'Shipper'} className={`w-20 h-20 rounded-full object-cover border-4 shadow ${isPreparing ? 'border-orange-200' : 'border-blue-200'}`} />
            ) : (
              <div className={`w-20 h-20 rounded-full flex items-center justify-center text-gray-500 font-bold text-3xl border-4 shadow ${isPreparing ? 'bg-orange-50 border-orange-200' : 'bg-gray-200 border-blue-200'}`}>
                {(shipper.name && shipper.name[0]) || (shipper.fullName && shipper.fullName[0]) || 'S'}
              </div>
            )}
            <div className="ml-4">
              <div className={`font-bold text-xl flex items-center gap-2 ${isPreparing ? 'text-orange-700' : 'text-gray-900'}`}> 
                <TruckIcon className={`h-5 w-5 ${isPreparing ? 'text-orange-500' : 'text-blue-500'}`} />
                {shipper.name || shipper.fullName || 'Không rõ tên'}
              </div>
              <div className={`text-base mt-1 flex items-center gap-2 ${isPreparing ? 'text-orange-600' : 'text-gray-700'}`}>
                <PhoneIcon className={`h-4 w-4 ${isPreparing ? 'text-orange-400' : 'text-gray-500'}`} />
                {shipper.phone || 'Chưa có số điện thoại'}
              </div>
              {shipper.email && (
                <div className={`text-base mt-1 flex items-center gap-2 ${isPreparing ? 'text-orange-500' : 'text-gray-600'}`}>
                  <MailIcon className="w-5 h-5 text-orange-400" />
                  {shipper.email}
                </div>
              )}
              {shipper.vehicle_info?.plate_number && (
                <div className={`text-base mt-1 ${isPreparing ? 'text-orange-500' : 'text-gray-600'}`}>Biển số: {shipper.vehicle_info.plate_number}</div>
              )}
              {shipper.vehicleType && (
                <div className="flex items-center gap-2 text-base mt-1 text-gray-600">
                  <TruckIcon className="w-5 h-5 text-orange-400" />
                  Loại xe: {shipper.vehicleType}
                </div>
              )}
              {shipper.vehicleNumber && (
                <div className="flex items-center gap-2 text-base mt-1 text-gray-600">
                  <TagIcon className="w-5 h-5 text-orange-400" />
                  Biển số: {shipper.vehicleNumber}
                </div>
              )}
              {!shipper.vehicleNumber && shipper.vehicle_info?.plate_number && (
                <div className="flex items-center gap-2 text-base mt-1 text-gray-600">
                  <TagIcon className="w-5 h-5 text-orange-400" />
                  Biển số: {shipper.vehicle_info.plate_number}
                </div>
              )}
              {shipper.citizenId && (
                <div className="flex items-center gap-2 text-base mt-1 text-gray-600">
                  <BadgeCheckIcon className="w-5 h-5 text-orange-400" />
                  CCCD: {shipper.citizenId}
                </div>
              )}
            </div>
          </div>
          <div className="absolute left-0 right-0 bottom-0 h-2 overflow-hidden">
            <div className={`w-full h-full animate-gradient-x ${isPreparing ? 'bg-gradient-to-r from-orange-200 via-orange-400 to-orange-200' : 'bg-gradient-to-r from-blue-300 via-blue-500 to-blue-300'} bg-[length:200%_100%]`} style={{backgroundSize:'200% 100%'}}></div>
          </div>
          <style>{`
            @keyframes gradient-x {
              0% { background-position: 200% 0; }
              100% { background-position: -200% 0; }
            }
            .animate-gradient-x {
              animation: gradient-x 2s linear infinite;
            }
          `}</style>
          <div className="flex gap-2 mt-4 w-full justify-center">
            {!(isPreparing) && (
              <>
                <button
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-2 rounded flex items-center justify-center"
                  type="button"
                  onClick={() => window.open(`tel:${shipper.phone || shipper.fullName || ''}`)}
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a2 2 0 011.94 1.515l.516 2.064a2 2 0 01-.45 1.958l-1.27 1.27a16.001 16.001 0 006.586 6.586l1.27-1.27a2 2 0 011.958-.45l2.064.516A2 2 0 0121 18.72V21a2 2 0 01-2 2h-1C9.163 23 1 14.837 1 5V4a2 2 0 012-2z" /></svg>
                  Gọi shipper
                </button>
                <button
                  onClick={() => setShowTrackingModal(true)}
                  className="flex-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center justify-center gap-2 px-4 py-2 font-semibold"
                >
                  <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 12.414a2 2 0 010-2.828l4.243-4.243M7.05 7.05l4.243 4.243a2 2 0 010 2.828l-4.243 4.243" /></svg>
                  Xem trực tiếp shipper
                </button>
                <button
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 rounded flex items-center justify-center"
                  type="button"
                  onClick={() => setIsChatOpen(true)}
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
                      Chat với shipper
                    </button>
              </>
            )}
          </div>
          {/* Tracking Modal */}
          {showTrackingModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl p-10 max-w-5xl w-full mx-4 min-h-[700px] border-2 border-orange-400 shadow-xl flex flex-col">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-semibold">Theo dõi shipper</h3>
                  <button
                    onClick={() => setShowTrackingModal(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <XIcon className="h-7 w-7" />
                    </button>
                  </div>
                <div className="flex-1 flex flex-col space-y-6">
                  <div className="flex-1">
                    <ShipperLocationMap
                      shipperLocation={isTrackingActive && shipperLocation ? shipperLocation : null}
                      deliveryAddress={order?.delivery_address_full || order?.delivery_address || {}}
                      deliveryDate={order?.pickup_time || order?.pickup_time_suggestion}
                      shipperPhone={order.shipper_info?.phone || order.shipper?.phone || ''}
                      onOpenChat={() => setIsChatOpen(true)}
                    />
                </div>
                  {!isTrackingActive && (
                    <div className="text-center text-gray-600 py-4">
                      <div className="mb-4">Shipper chưa bật bắt đầu chỉ đường tới đơn hàng này</div>
              </div>
                  )}
              </div>
            </div>
            </div>
          )}
        </div>
      );
    }
    switch (order.status) {
      case 'Chờ xử lý':
        return <div className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="font-medium flex items-center gap-2 mb-4">
              <TruckIcon className="h-5 w-5 text-orange-500" />
              Thông tin đơn hàng
            </h2>
            <div className="text-center text-gray-500 py-4">
              Đơn hàng đang chờ xác nhận và chưa được phân công cho shipper
            </div>
          </div>;
      case 'Đã giao':
        const shipperDone = order.shipper_info || order.shipper || {};
        return (
          <div className="space-y-4">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h2 className="font-medium flex items-center gap-2 mb-4">
                <TruckIcon className="h-5 w-5 text-orange-500" />
                Thông tin shipper
              </h2>
              
              <div className="flex items-center gap-4 justify-center">
                {shipperDone.avatar ? (
                  <img src={shipperDone.avatar} alt={shipperDone.name || shipperDone.fullName || 'Shipper'} className="w-20 h-20 rounded-full object-cover border-4 shadow border-green-200" />
                ) : (
                  <div className="w-20 h-20 rounded-full flex items-center justify-center text-gray-500 font-bold text-3xl border-4 shadow bg-green-50 border-green-200">
                    {(shipperDone.name && shipperDone.name[0]) || (shipperDone.fullName && shipperDone.fullName[0]) || 'S'}
                  </div>
                )}
                <div className="ml-4">
                  <div className="font-bold text-xl flex items-center gap-2 text-green-700">
                    <TruckIcon className="h-5 w-5 text-green-500" />
                    {shipperDone.name || shipperDone.fullName || 'Không rõ tên'}
                </div>
                  <div className="flex items-center gap-2 text-base mt-1 text-green-600">
                    <PhoneIcon className="h-4 w-4 text-green-400" />
                    {shipperDone.phone || 'Chưa có số điện thoại'}
              </div>
                  {shipperDone.email && (
                    <div className="flex items-center gap-2 text-base mt-1 text-gray-600">
                      <MailIcon className="w-5 h-5 text-orange-400" />
                      {shipperDone.email}
                    </div>
                  )}
                  {shipperDone.vehicleType && (
                    <div className="flex items-center gap-2 text-base mt-1 text-gray-600">
                      <TruckIcon className="w-5 h-5 text-orange-400" />
                      Loại xe: {shipperDone.vehicleType}
                    </div>
                  )}
                  {shipperDone.vehicleNumber && (
                    <div className="flex items-center gap-2 text-base mt-1 text-gray-600">
                      <TagIcon className="w-5 h-5 text-orange-400" />
                      Biển số: {shipperDone.vehicleNumber}
                    </div>
                  )}
                  {shipperDone.citizenId && (
                    <div className="flex items-center gap-2 text-base mt-1 text-gray-600">
                      <BadgeCheckIcon className="w-5 h-5 text-orange-400" />
                      CCCD: {shipperDone.citizenId}
                    </div>
                  )}
                </div>
              </div>
              {!order.isRated && (
                <button onClick={() => setIsRatingModalOpen(true)} className="mt-4 w-full px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center justify-center gap-2">
                  <StarIcon className="h-5 w-5" />
                  Đánh giá shipper
                </button>
              )}
              {order.isRated && (
                <div className="mt-4 p-3 bg-green-50 text-green-600 rounded-lg text-center">
                  Bạn đã đánh giá shipper này
            </div>
              )}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  // Add function to check tracking status
  const checkTrackingStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get<TrackingData>(`/trackings/${order.order_id}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const tracking = response.data;
      console.log('Tracking API response:', tracking);
      setIsTrackingActive(tracking?.status === 'active');
      if (tracking?.location) {
        setShipperLocation(tracking.location);
      }
    } catch (error) {
      setIsTrackingActive(false);
    }
  };

  if (order === null) {
    return <div className="max-w-5xl mx-auto text-center text-gray-500 py-12">Không tìm thấy đơn hàng hoặc đang tải dữ liệu...</div>;
  }
  // Lấy thông tin phí chuẩn nhất, fallback hợp lý
  const cost = order?.cost_details && Object.keys(order.cost_details).length > 0
    ? order.cost_details
    : {
        total_fee: order?.total_fee ?? 0,
        shipping_fee: order?.shipping_fee ?? 0,
        service_fee: order?.service_fee ?? 0,
        discount: order?.discount ?? 0,
        coupon_discount: order?.coupon_discount ?? 0,
        additional_fees: order?.additional_fees ?? {},
        distance_fee: order?.distance_fee ?? 0,
        packing_fee: order?.packing_fee ?? 0,
        surcharge: order?.surcharge ?? 0
      };
  const delivery = order?.delivery_address || {};
  const sender = order?.pickup_address_full || order?.pickup_address || {};
  const receiverDisplayName = delivery.name || receiverName || '';
  const receiverDisplayPhone = delivery.phone || receiverPhone || '';
  // Thứ tự các dòng phí cần hiển thị (bỏ distance_fee)
  const feeOrder = [
    'over_weight_fee',
    'shipping_fee',
    'service_fee',
    'packing_fee',
    'surcharge',
    'platform_fee',
    'overtime_fee',
    'waiting_fee',
    'discount'
  ];

  // Tìm số KM từ label hoặc từ order
  let km = 0;
  if (cost.distance_fee && typeof cost.distance_fee.label === 'string') {
    const match = cost.distance_fee.label.match(/([\d\.]+)\s*km/);
    if (match) km = parseFloat(match[1]);
  }
  if (!km && order?.distance) km = Number(order.distance);

  // Tính lại tiền khoảng cách
  const distanceFee = Math.round(km * 1000);

  let customHistory = null;
  let customLastActiveIndex = undefined;
  if (displayStatus === 'Đã hủy' || displayStatus === 'cancelled') {
    customHistory = [
      {
        status: 'Chờ xử lý',
        label: 'Chờ xử lý',
        time: order?.created_at || '',
        active: false,
        description: 'Đơn hàng đang chờ xác nhận',
        icon: <svg className="w-5 h-5 text-orange-400 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>
      },
      {
        status: 'Đã hủy',
        label: 'Đã hủy',
        time: order?.updated_at || '',
        active: true,
        description: 'Đơn hàng đã bị hủy',
        icon: <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"/><path fill="currentColor" d="M15 9l-6 6M9 9l6 6" className="opacity-75"/></svg>
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
      icon: <svg className="w-5 h-5 text-yellow-500" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"/><path fill="currentColor" d="M12 6v6l4 2" className="opacity-75"/></svg>
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
        icon: <svg className="w-5 h-5 text-orange-400 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>
      },
      {
        status: 'Đang chuẩn bị',
        label: 'Đang chuẩn bị',
        time: order?.updated_at || '',
        active: true,
        description: 'Đơn hàng đang được chuẩn bị để giao cho shipper',
        icon: <svg className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>
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
        icon: <svg className="w-5 h-5 text-orange-400 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>
      },
      {
        status: 'Đang chuẩn bị',
        label: 'Đang chuẩn bị',
        time: order?.timeline?.find((x:any)=>x.status==='Đang chuẩn bị')?.time || '',
        active: false,
        description: 'Đơn hàng đang được chuẩn bị để giao cho shipper',
        icon: <svg className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>
      },
      {
        status: 'Đang giao',
        label: 'Đang giao',
        time: order?.updated_at || order?.timeline?.find((x:any)=>x.status==='Đang giao')?.time || '',
        active: true,
        description: 'Shipper đang giao hàng',
        icon: <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>
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
        icon: <svg className="w-5 h-5 text-orange-400 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>
      },
      {
        status: 'Đang chuẩn bị',
        label: 'Đang chuẩn bị',
        time: order?.timeline?.find((x:any)=>x.status==='Đang chuẩn bị')?.time || '',
        active: false,
        description: 'Đơn hàng đang được chuẩn bị để giao cho shipper',
        icon: <svg className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>
      },
      {
        status: 'Đang giao',
        label: 'Đang giao',
        time: order?.timeline?.find((x:any)=>x.status==='Đang giao')?.time || '',
        active: false,
        description: 'Shipper đang giao hàng',
        icon: <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>
      },
      {
        status: 'Đã giao thành công',
        label: 'Đã giao thành công',
        time: order?.updated_at || order?.timeline?.find((x:any)=>x.status==='Đã giao thành công')?.time || '',
        active: true,
        description: 'Đơn hàng đã được giao thành công',
        icon: <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M9 12l2 2 4-4"></path></svg>
      }
    ];
    customLastActiveIndex = 3;
  }

  // Sửa hàm handleUpdateStatus để có kiểu rõ ràng
  const handleUpdateStatus = async (newStatus: string) => {
    try {
      const response = await axios.put(`/orders/${order.order_id}/status`, { status: newStatus });
      if (response.data) {
        toast.success('Cập nhật trạng thái thành công!', {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
        await fetchOrder();
      }
    } catch (err) {
      toast.error('Cập nhật trạng thái thất bại!', {
        position: "top-right",
        autoClose: 3000,
      });
      console.error('Error updating status:', err);
    }
  };

  return (
    <>
      <div className="max-w-5xl mx-auto space-y-6 print:bg-white print:shadow-none print:border-none" ref={printRef} style={{position: 'relative', background: '#fff', borderRadius: 18, boxShadow: '0 4px 32px 0 rgba(0,0,0,0.10)', border: '2px solid #ff9800', padding: 24, overflow: 'hidden', minHeight: (isPrinting || forcePrinting) ? '1000px' : undefined}}>
        {/* Logo watermark chìm căn giữa, chỉ hiển thị khi in */}
         {(isPrinting || forcePrinting) && (
          <img
            src="/logo-shipvn.png"
            alt="logo watermark"
            style={{
              position: 'absolute',
              left: '50%',
              top: '30%',
              width: '100%', // Giảm kích thước logo để vừa trang A4
              maxWidth: '2500px', // Giới hạn chiều rộng tối đa
              maxHeight: '2500px', // Giới hạn chiều cao tối đa
              opacity: 0.08, // Giảm độ mờ để logo nhạt hơn, không che khuất nội dung
              transform: 'translate(-50%, -50%)', // Căn giữa chính xác
              pointerEvents: 'none', // Không cho phép tương tác với logo
              zIndex: 0, // Đặt phía sau nội dung chính
              objectFit: 'contain', // Đảm bảo logo không bị méo
            }}
          />
        )}
      <div className="flex justify-between items-center">
          <div style={{ width: '100%' }}>
            {(isPrinting || forcePrinting) ? (
              <h1 style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 28, margin: 0, padding: 0, color: '#ff9800', letterSpacing: 2, textShadow: '0 2px 8px #ff980033' }}>
                BIÊN LAI CHI TIẾT ĐẶT HÀNG
              </h1>
            ) : (
              <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: '#ff9800' }}>
            <Package2Icon className="h-6 w-6 text-orange-500" />
                Chi tiết đơn hàng #{paramId}
          </h1>
            )}
            <p className="text-gray-500" style={isPrinting || forcePrinting ? { textAlign: 'center' } : {}}>
              {order?.updated_at ?
                `Cập nhật lần cuối: ${new Date(order.updated_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })} ${new Date(order.updated_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })}`
                : ''}
            </p>
        </div>
          <div className="flex gap-2" style={{ display: (isPrinting || forcePrinting) ? 'none' : undefined }}>
            <button className="px-3 py-1 border rounded-md hover:bg-gray-50 flex items-center gap-2 text-base" onClick={handlePrintPDF}>
            <PrinterIcon className="h-5 w-5" />
            In đơn hàng
          </button>
            <button className="px-3 py-1 border rounded-md hover:bg-gray-50 flex items-center gap-2 text-base" onClick={handleShare}>
            <ShareIcon className="h-5 w-5" />
            Chia sẻ
          </button>
            {/* Ẩn nút Chỉnh sửa nếu trạng thái là Đang chuẩn bị, Đang giao, Giao thành công */}
            {!(displayStatus === 'Đang chuẩn bị' || displayStatus === 'preparing' || displayStatus === 'Đang giao' || displayStatus === 'Giao thành công' || displayStatus === 'Đã giao' || displayStatus === 'delivered') && (
            <button
              className="px-3 py-1 border rounded-md hover:bg-gray-50 flex items-center gap-2 text-base"
              onClick={() => navigate(`/orders/edit/${paramId}`)}
            >
              Chỉnh sửa
            </button>
            )}
        </div>
      </div>
        <div className="bg-white rounded-xl shadow p-6 border border-orange-100 mb-2" style={{marginTop: 12}}>
        <div className="flex justify-between items-center">
          {(order?.timeline && Array.isArray(order.timeline)) ? order.timeline.map((step: any, index: number) => (
            <div key={index} className={`flex-1 relative ${index !== 0 ? 'pl-6' : ''} text-center`}>
                <div className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center ${step.active ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-400'}`} style={{boxShadow: step.active ? '0 2px 8px #ff980033' : undefined}}>
                <step.icon className="h-5 w-5" />
              </div>
              <div className="mt-2">
                <div className={`font-medium ${step.active ? 'text-gray-900' : 'text-gray-400'}`}>{step.label}</div>
                <div className="text-sm text-gray-500">{step.time}</div>
              </div>
              {index < order.timeline.length - 1 && <div className={`absolute top-5 left-[60%] w-[calc(100%-60%)] h-0.5 ${step.active ? 'bg-orange-500' : 'bg-gray-200'}`} />}
            </div>
          )) : null}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-6">
          <div className="bg-orange-50 rounded-xl p-6 border border-orange-200 space-y-4">
            <h2 className="font-medium flex items-center gap-2 text-orange-600">
            <Package2Icon className="h-5 w-5 text-orange-500" />
            Thông tin người gửi
          </h2>
          <div className="space-y-2">
              <div className="flex items-center gap-2 text-gray-700">
              <span className="font-medium">{sender.name}</span>
            </div>
              <div className="flex items-center gap-2 text-gray-700">
              <PhoneIcon className="h-4 w-4" />
              <span>{sender.phone}</span>
            </div>
            {sender.email && (
              <div className="flex items-center gap-2 text-gray-600">
                <span>Email:</span>
                <span>{sender.email}</span>
              </div>
            )}
              <div className="flex items-center gap-2 text-gray-700">
              <MapPinIcon className="h-4 w-4" />
              <span>{[sender.street, sender.ward, sender.district, sender.city].filter(Boolean).join(', ')}</span>
            </div>
            {sender.note && (
              <div className="flex items-center gap-2 text-gray-600">
                <span>Ghi chú:</span>
                <span>{sender.note}</span>
          </div>
            )}
        </div>
        </div>
          <div className="bg-orange-50 rounded-xl p-6 border border-orange-200 space-y-4">
            <h2 className="font-medium flex items-center gap-2 text-orange-600">
            <TruckIcon className="h-5 w-5 text-orange-500" />
            Thông tin người nhận
          </h2>
          <div className="space-y-2">
              <div className="flex items-center gap-2 text-gray-700">
                <span className="font-medium">{delivery.name}</span>
            </div>
              <div className="flex items-center gap-2 text-gray-700">
              <PhoneIcon className="h-4 w-4" />
                <span>{delivery.phone}</span>
            </div>
            {delivery.email && (
              <div className="flex items-center gap-2 text-gray-600">
                <span>Email:</span>
                <span>{delivery.email}</span>
              </div>
            )}
              <div className="flex items-center gap-2 text-gray-700">
              <MapPinIcon className="h-4 w-4" />
              <span>{[delivery.street, delivery.ward, delivery.district, delivery.city].filter(Boolean).join(', ')}</span>
            </div>
            {delivery.note && (
              <div className="flex items-center gap-2 text-gray-600">
                <span>Ghi chú:</span>
                <span>{delivery.note}</span>
              </div>
            )}
          </div>
        </div>
      </div>
        <div className="bg-white rounded-xl p-6 shadow border border-orange-100 space-y-4">
          <h2 className="font-medium flex items-center gap-2 text-orange-600">
          <Package2Icon className="h-5 w-5 text-orange-500" />
          Thông tin hàng hóa
        </h2>
        <div className="grid grid-cols-3 gap-6">
          {orderItems.length > 0 ? orderItems.map((item, idx) => (
              <div key={item.orderitem_id || idx} className="space-y-2 border-b pb-2 border-orange-100">
              <div className="text-sm text-gray-500">Loại hàng hóa</div>
                <div className="font-semibold text-gray-800">{item.item_type}</div>
              <div className="text-sm text-gray-500">Mô tả</div>
              <div>{item.description}</div>
              <div className="text-sm text-gray-500">Số lượng</div>
              <div>{item.quantity}</div>
            </div>
          )) : <div>Không có thông tin hàng hóa</div>}
          <div className="space-y-2">
            <div className="text-sm text-gray-500">Trọng lượng</div>
              <div className="font-semibold text-gray-800">{order?.weight ? order.weight + ' kg' : ''}</div>
          </div>
          <div className="space-y-2">
            <div className="text-sm text-gray-500">Kích thước</div>
              <div className="font-semibold text-gray-800">{order?.dimensions || ''}</div>
          </div>
          <div className="space-y-2">
            <div className="text-sm text-gray-500">Giá trị hàng hóa</div>
              <div className="font-semibold text-gray-800">{
                order?.order_value && order.order_value > 0
                  ? order.order_value.toLocaleString() + 'đ'
                  : (orderItems && orderItems.length > 0 && orderItems[0].value
                      ? orderItems.reduce((sum, item) => sum + (item.value || 0), 0).toLocaleString() + 'đ'
                      : '')
              }</div>
          </div>
          <div className="space-y-2">
            <div className="text-sm text-gray-500">Dịch vụ vận chuyển</div>
              <div className="font-semibold text-gray-800">{order?.service_type || ''}</div>
          </div>
          <div className="space-y-2">
              <div className="text-sm text-gray-500">Thời gian lấy hàng</div>
              <div className="font-semibold text-gray-800">
                {order?.pickup_time_suggestion
                  ? new Date(order.pickup_time_suggestion).toLocaleString()
                  : order?.pickup_time
                    ? new Date(order.pickup_time).toLocaleString()
                    : order?.estimate_time
                      ? new Date(order.estimate_time).toLocaleString()
                      : ''}
          </div>
        </div>
      </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow border border-orange-200 space-y-4">
          <h2 className="font-medium flex items-center gap-2 text-orange-600">
          <DollarSignIcon className="h-5 w-5 text-orange-500" />
          Thông tin thanh toán
        </h2>
        <div className="space-y-2">
            {/* Phí ship theo khoảng cách (luôn đúng chuẩn KM*1000đ) */}
            {km > 0 && (
              <div className="flex justify-between py-1 border-b border-dashed border-orange-100">
                <span className="text-gray-700 font-medium">{cost.distance_fee.label || 'Phí ship theo khoảng cách'}</span>
                <span className="text-gray-900 font-semibold">
                  {distanceFee.toLocaleString()}đ
              </span>
            </div>
          )}
            {/* Các dòng phí khác */}
            {cost && feeOrder.map(key => {
              const fee = cost[key];
              if (!fee) return null;
              let label = '';
              let value = 0;
              if (fee && typeof fee === 'object' && 'label' in fee && 'value' in fee) {
                label = fee.label;
                value = typeof fee.value === 'number' ? fee.value : 0;
              } else {
                const labelMap: Record<string, string> = {
                  over_weight_fee: 'Phí vượt cản',
                  shipping_fee: 'Cước phí giao hàng',
                  service_fee: 'Phí dịch vụ vận chuyển',
                  packing_fee: 'Phí đóng gói',
                  surcharge: 'Phụ thu',
                  platform_fee: 'Phí nền tảng',
                  overtime_fee: 'Phí ngoài giờ',
                  waiting_fee: 'Phí chờ',
                  discount: 'Giảm giá',
                };
                label = labelMap[key] || key;
                value = typeof fee === 'number' ? fee : 0;
              }
              // Ẩn dòng 0đ, trừ discount luôn hiển thị
              if (key !== 'discount' && (!value || value === 0)) return null;
              return (
                <div className="flex justify-between py-1 border-b border-dashed border-orange-50" key={key}>
                  <span className="text-gray-700 font-medium">{label}</span>
                  <span className={key === 'discount' ? 'text-green-600 font-semibold' : 'text-gray-900 font-semibold'}>
                    {value > 0 || key === 'discount' ? (key === 'discount' ? '-' : '') : ''}
                    {Math.abs(value).toLocaleString()}đ
                  </span>
          </div>
              );
            })}
          {/* Tổng tiền thanh toán */}
            <div className="flex justify-between py-2 border-t-2 border-orange-300 font-bold mt-2" style={{fontSize: 22}}>
              <span>Tổng thanh toán:</span>
              <span className="text-orange-500 text-2xl" style={{textShadow: '0 2px 8px #ff980033'}}>
                {cost?.total_fee?.value !== undefined
                  ? cost.total_fee.value.toLocaleString()
                  : '0'}đ
              </span>
          </div>
            {/* Phương thức thanh toán */}
            {order?.payment_method && (
              <div className="flex justify-between py-1">
                <span className="text-gray-600">Phương thức thanh toán:</span>
                <span className="font-semibold text-orange-600">
                  {(() => {
                    const map: Record<string, string> = {
                      COD: 'Thanh toán khi nhận hàng',
                      BANK: 'Chuyển khoản ngân hàng',
                      WALLET: 'Ví điện tử',
                      CASH: 'Tiền mặt',
                      CREDIT: 'Thẻ tín dụng',
                      DEBIT: 'Thẻ ghi nợ',
                      MOMO: 'Ví MoMo',
                      VNPAY: 'VNPay',
                      ZALOPAY: 'ZaloPay',
                      SHOPEEPAY: 'Ví ShopeePay',
                      VISA: 'Thẻ Visa',
                      MASTERCARD: 'Thẻ Mastercard',
                      JCB: 'Thẻ JCB',
                      AMEX: 'Thẻ American Express'
                    };
                    return map[String(order.payment_method)] || order.payment_method;
                  })()}
                </span>
        </div>
            )}
            {/* Trạng thái thanh toán */}
            {order?.payment_status && (
              <div className="flex justify-between py-1">
                <span className="text-gray-600">Trạng thái thanh toán:</span>
                <span className={`font-semibold px-3 py-1 rounded-full ${order.payment_status === 'PAID' ? 'bg-green-100 text-green-700' : order.payment_status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                  {(() => {
                    const map: Record<string, string> = {
                      PENDING: 'Chờ thanh toán',
                      PAID: 'Đã thanh toán',
                      FAILED: 'Thanh toán thất bại',
                      REFUNDED: 'Đã hoàn tiền',
                      PARTIALLY_PAID: 'Thanh toán một phần',
                      CANCELLED: 'Đã hủy'
                    };
                    return map[String(order.payment_status)] || order.payment_status;
                  })()}
              </span>
      </div>
          )}
          </div>
        </div>
        {(isPrinting || forcePrinting) && order && order.order_id && (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 32 }}>
        <QRCodeSVG
          value={order.order_id}
          size={200}
          level="H"
          includeMargin={true}
          bgColor="#fff"
          fgColor="#000"
        />
        <div style={{ fontSize: 24, marginTop: 16, color: '#222', fontWeight: 700 }}>
          Mã đơn: {order.order_id}
        </div>
      </div>
    )}
        {!(isPrinting || forcePrinting) && renderShipperSection()}
        {!(isPrinting || forcePrinting) && (
          <DeliveryHistory history={customHistory || order?.timeline || []} customLastActiveIndex={typeof customLastActiveIndex === 'number' ? customLastActiveIndex : undefined} />
        )}
        {((order?.status === 'Đã giao' || order?.status === 'delivered') && !order?.rating && !forcePrinting && isRatingModalOpen) && (
          <RatingModal
            isOpen={isRatingModalOpen}
            onClose={() => setIsRatingModalOpen(false)}
            onSubmit={handleRatingSubmit}
            shipperName={order.shipper?.name || order.shipper_info?.name || ''}
            shipperAvatar={order.shipper?.avatar || order.shipper_info?.avatar || ''}
          />
        )}
        {order && order.order_id && (
          <div className={"qr-print-block print:block"} style={{ minHeight: (isPrinting || forcePrinting) ? '1200px' : undefined, height: (isPrinting || forcePrinting) ? '1200px' : undefined, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: (isPrinting || forcePrinting) ? 'flex-end' : 'flex-start', padding: 0 }}>
            <QRCodeSVG
              value={order.order_id}
              size={(isPrinting || forcePrinting) ? 480 : 360}
              level="H"
              includeMargin={true}
              bgColor="#fff"
              fgColor="#000"
            />
            <div style={{ fontSize: (isPrinting || forcePrinting) ? 28 : 20, marginTop: (isPrinting || forcePrinting) ? 32 : 20, color: (isPrinting || forcePrinting) ? '#222' : '#666', fontWeight: 700 }}>
              Mã đơn: {order.order_id}
            </div>
          </div>
        )}
        {isChatOpen && order && (
          <ShipperChat
            isOpen={isChatOpen}
            onClose={() => setIsChatOpen(false)}
            shipper={order.shipper_info || order.shipper}
            orderId={order.order_id && order.order_id.startsWith('order_') ? order.order_id : `order_${order.order_id || order._id || order.id}`}
          />
        )}
        <style>{`
          @media print {
            .qr-print-block { display: flex !important; }
          }
        `}</style>
        </div>
      </>
    );
};

export default OrderDetail;
export { DeliveryHistory };