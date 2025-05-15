import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Package2Icon, SearchIcon, FilterIcon, EyeIcon, PrinterIcon, MoreHorizontalIcon, MapPinIcon, XCircleIcon, MessageCircleIcon, AlertTriangleIcon, StarIcon } from 'lucide-react';
import axios from '../../api/axios';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import OrderDetail from './OrderDetail';
import { io, Socket } from 'socket.io-client';

// Thêm type cho Order
interface OrderUI {
  id: string;
  customer: string;
  phone: string;
  address: string;
  status: string;
  time: string;
  value?: number;
  payment_method?: string;
  created_at?: string;
  shipper_info?: { name?: string; fullName?: string };
  total_fee?: number;
  cost_details?: any;
  order_value?: number;
}

interface OrderActionMenuProps {
  order: OrderUI;
  onClose: () => void;
  onAction: (action: string, order: OrderUI) => void;
  position: { left: number; top: number };
}

const OrderActionMenu = ({
  order,
  onClose,
  onAction,
  position
}: OrderActionMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);
  const isCompletedOrCancelled = order.status === 'Đã hủy' || order.status === 'Đã giao';
  return (
    <div ref={menuRef} className="bg-white rounded-md shadow-lg z-10" style={{ minWidth: 180 }}>
    <div className="py-1" role="menu">
        {isCompletedOrCancelled ? (
          <button onClick={() => onAction('reorder', order)} className="flex items-center px-4 py-2 text-sm text-green-600 hover:bg-gray-100 w-full">
            <Package2Icon className="mr-3 h-5 w-5" />
            Đặt lại đơn hàng
          </button>
        ) : (
          <>
      {order.status === 'Chờ xử lý' && <>
        <button onClick={() => onAction('changeAddress', order)} className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full">
          <MapPinIcon className="mr-3 h-5 w-5" />
          Đổi địa điểm giao
        </button>
              <button onClick={() => onAction('edit', order)} className="flex items-center px-4 py-2 text-sm text-blue-600 hover:bg-gray-100 w-full">
                <StarIcon className="mr-3 h-5 w-5" />
                Chỉnh sửa đơn hàng
        </button>
              <button onClick={() => onAction('cancel', order)} className="flex items-center px-4 py-2 text-sm text-red-600 hover:bg-gray-100 w-full">
                <XCircleIcon className="mr-3 h-5 w-5" />
                Hủy đơn hàng
        </button>
      </>}
          </>
        )}
      </div>
    </div>
  );
};

const SimpleModal = ({ onClose, children }: { onClose: () => void, children: React.ReactNode }) => (
  <div style={{position:'fixed',top:0,left:0,width:'100vw',height:'100vh',background:'rgba(0,0,0,0.3)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center'}}>
    <div style={{background:'#fff',borderRadius:12,padding:32,minWidth:400,maxWidth:600,boxShadow:'0 4px 32px #0002',position:'relative'}}>
      <button onClick={onClose} style={{position:'absolute',top:8,right:12,fontSize:20,color:'#888',background:'none',border:'none',cursor:'pointer'}}>×</button>
      {children}
    </div>
  </div>
);

// Định nghĩa mapOrderStatus phía trên trước khi dùng trong fetchOrders
function mapOrderStatus(status: string) {
  switch (status) {
    case 'pending': return 'Chờ xử lý';
    case 'preparing': return 'Đang chuẩn bị';
    case 'delivering': return 'Đang giao';
    case 'delivered': return 'Đã giao';
    case 'cancelled': return 'Đã hủy';
    default: return status;
  }
}

// Đưa fetchOrders ra ngoài để có thể gọi lại từ nơi khác nếu cần
export const fetchOrders = async (setOrders: any) => {
  const res = await axios.get('/orders');
  const ordersRaw = Array.isArray(res.data) ? res.data : [];
  const customerIds = Array.from(new Set(ordersRaw.map((order: any) => order.customer_id)));
  const shipperIds = Array.from(new Set(ordersRaw.map((order: any) => order.shipper_id).filter(Boolean)));
  const userMap: Record<string, string> = {};
  await Promise.all(customerIds.map(async (id) => {
    try {
      const userRes = await axios.get(`/users/public/${id}`);
      const userData = userRes.data as any;
      userMap[id] = userData?.fullName || 'Không rõ tên';
    } catch {
      userMap[id] = 'Không rõ tên';
    }
  }));
  const shipperMap: Record<string, { name?: string; fullName?: string }> = {};
  await Promise.all(shipperIds.map(async (id) => {
    try {
      const userRes = await axios.get(`/users/public/${id}`);
      const userData = userRes.data as any;
      shipperMap[id] = { name: userData?.name, fullName: userData?.fullName };
    } catch {
      shipperMap[id] = {};
    }
  }));
  const mapped: OrderUI[] = ordersRaw.map((order: any) => ({
    id: order.order_id,
    customer: order.delivery_address?.name || 'Không rõ tên',
    phone: '',
    address: order.delivery_address?.street + ', ' + order.delivery_address?.ward + ', ' + order.delivery_address?.district + ', ' + order.delivery_address?.city,
    status: mapOrderStatus(order.status),
    time: order.created_at ? new Date(order.created_at).toLocaleString('vi-VN') : '',
    value: order.order_value ?? undefined,
    payment_method: order.payment_method ?? undefined,
    created_at: order.created_at ?? undefined,
    shipper_info: order.shipper_id ? (shipperMap[order.shipper_id] || {}) : {},
    total_fee: order.total_fee ?? 0,
    cost_details: order.cost_details,
    order_value: order.order_value ?? 0,
  }));
  setOrders(mapped);
};

const OrderList = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('Tất cả');
  const [showFilters, setShowFilters] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState({
    left: 0,
    top: 0
  });
  const [orders, setOrders] = useState<OrderUI[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filter, setFilter] = useState({
    fromDate: '',
    toDate: '',
    minValue: '',
    maxValue: '',
    paymentMethod: ''
  });
  const [appliedFilter, setAppliedFilter] = useState(filter);
  const [printingOrder, setPrintingOrder] = useState<any>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [showChangeAddressModal, setShowChangeAddressModal] = useState(false);
  const [changingOrder, setChangingOrder] = useState<OrderUI | null>(null);
  const [deliveryAddresses, setDeliveryAddresses] = useState<any[]>([]);
  const [selectedDeliveryAddressId, setSelectedDeliveryAddressId] = useState('');
  const [orderToCancel, setOrderToCancel] = useState<OrderUI | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [orderToReorder, setOrderToReorder] = useState<OrderUI | null>(null);
  const [showReorderModal, setShowReorderModal] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const [filterOrderId, setFilterOrderId] = useState('');
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterAddress, setFilterAddress] = useState('');
  const [filterShipper, setFilterShipper] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterTime, setFilterTime] = useState('');
  const [filterTotalFee, setFilterTotalFee] = useState('');
  const [filterOrderValue, setFilterOrderValue] = useState('');

  useEffect(() => {
    if (location.state?.newOrder) {
      console.log(`Đơn hàng ${location.state.orderId} đã được tạo và đang chờ xử lý`);
    }
  }, [location]);
  useEffect(() => {
    // Fetch orders from backend
    const loadOrders = async () => {
      try {
        await fetchOrders(setOrders);
      } catch (err) {
        setOrders([]);
      }
    };
    loadOrders();
  }, []);

  useEffect(() => {
    console.log('Initializing OrderList socket connection...');
    const socket = io('https://ships-backendmoihehe-1.onrender.com', {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('OrderList: Socket connected successfully');
      // Join a general orders room
      socket.emit('join_orders_room');
    });

    socket.on('disconnect', () => {
      console.log('OrderList: Socket disconnected');
    });

    socket.on('connect_error', (error) => {
      console.error('OrderList: Socket connection error:', error);
      toast.error('Kết nối realtime bị mất. Đang thử kết nối lại...');
    });

    socket.on('order_status_updated', (data) => {
      console.log('OrderList: Received order_status_updated:', data);
      toast.info('Danh sách đơn hàng đã được cập nhật!', {
        position: "top-right",
        autoClose: 3000,
      });
      fetchOrders(setOrders);
    });

    // Lắng nghe sự kiện order_claimed
    socket.on('order_claimed', (data) => {
      console.log('OrderList: Received order_claimed:', data);
      toast.info(
        <div>
          <b>Đơn hàng {data.orderId}</b> đã được nhận bởi shipper <b>{data.shipperName || 'một shipper'}</b>
        </div>,
        {
          position: 'top-right',
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        }
      );
      fetchOrders(setOrders);
    });

    return () => {
      console.log('Cleaning up OrderList socket connection...');
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Reset về trang 1 khi lọc hoặc tìm kiếm
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedStatus]);

  // Lọc nâng cao
  const advancedFilteredOrders = orders.filter(order => {
    if (selectedStatus !== 'Tất cả' && order.status !== selectedStatus) return false;
    if (searchQuery &&
      !order.id.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !order.customer.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !order.phone.includes(searchQuery)
    ) return false;
    // Lọc theo filter từng cột
    if (filterOrderId && !order.id.toLowerCase().includes(filterOrderId.toLowerCase())) return false;
    if (filterCustomer && !order.customer.toLowerCase().includes(filterCustomer.toLowerCase())) return false;
    if (filterAddress && !order.address.toLowerCase().includes(filterAddress.toLowerCase())) return false;
    if (filterShipper && !(order.shipper_info?.fullName || order.shipper_info?.name || '').toLowerCase().includes(filterShipper.toLowerCase())) return false;
    if (filterStatus && !order.status.toLowerCase().includes(filterStatus.toLowerCase())) return false;
    if (filterTime && !(order.time || '').toLowerCase().includes(filterTime.toLowerCase())) return false;
    if (filterTotalFee) {
      const feeValue = order.cost_details?.total_fee?.value;
      if (!isNaN(Number(filterTotalFee))) {
        if (Number(filterTotalFee) !== feeValue) return false;
      } else {
        if (!(feeValue !== undefined ? feeValue.toLocaleString('vi-VN') : '').includes(filterTotalFee)) return false;
      }
    }
    if (filterOrderValue && !(order.order_value !== undefined ? order.order_value.toLocaleString('vi-VN') : '').includes(filterOrderValue)) return false;
    // Lọc theo ngày (ưu tiên dùng order.created_at gốc nếu có)
    if (appliedFilter.fromDate) {
      let orderDate = null;
      if (order.created_at) {
        orderDate = new Date(order.created_at);
      } else if (order.time) {
        // order.time dạng '14:06:10 7/5/2025' => lấy phần ngày
        const parts = order.time.split(' ');
        if (parts.length > 1) {
          const [day, month, year] = parts[1].split('/');
          orderDate = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
        }
      }
      if (orderDate && orderDate < new Date(appliedFilter.fromDate)) return false;
    }
    if (appliedFilter.toDate) {
      let orderDate = null;
      if (order.created_at) {
        orderDate = new Date(order.created_at);
      } else if (order.time) {
        const parts = order.time.split(' ');
        if (parts.length > 1) {
          const [day, month, year] = parts[1].split('/');
          orderDate = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
        }
      }
      if (orderDate && orderDate > new Date(appliedFilter.toDate)) return false;
    }
    // Lọc theo giá trị hàng hóa (nếu có trường value)
    if (appliedFilter.minValue) {
      if (typeof order.value === 'number') {
        if (order.value < Number(appliedFilter.minValue)) return false;
      }
    }
    if (appliedFilter.maxValue) {
      if (typeof order.value === 'number') {
        if (order.value > Number(appliedFilter.maxValue)) return false;
      }
    }
    // Lọc theo phương thức thanh toán (nếu có)
    if (appliedFilter.paymentMethod) {
      if (order.payment_method) {
        if (order.payment_method !== appliedFilter.paymentMethod) return false;
      } else {
        return false;
      }
    }
    return true;
  });

  // Tính toán phân trang mới
  const pagedOrders = advancedFilteredOrders.slice((currentPage - 1) * pageSize, pageSize === 99999 ? undefined : currentPage * pageSize);
  const totalPages = pageSize === 99999 ? 1 : Math.ceil(advancedFilteredOrders.length / pageSize);

  // Tính tổng các trường trên trang hiện tại
  const totalFeePage = pagedOrders.reduce(
    (sum, o) => sum + (o.cost_details?.total_fee?.value || 0),
    0
  );  const totalOrderValuePage = pagedOrders.reduce((sum, o) => sum + (o.order_value || 0), 0);

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'Chờ xử lý':
        return 'bg-yellow-100 text-yellow-600';
      case 'Đang giao':
        return 'bg-blue-100 text-blue-600';
      case 'Đã giao':
        return 'bg-green-100 text-green-600';
      case 'Đã hủy':
        return 'bg-red-100 text-red-600';
      case 'Đang chuẩn bị':
      case 'preparing':
        return 'bg-orange-100 text-orange-600 border border-orange-300 font-semibold flex items-center gap-1';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };
  const handleActionClick = async (action: string, order: OrderUI) => {
    switch (action) {
      case 'reorder':
        setOrderToReorder(order);
        setShowReorderModal(true);
        break;
      case 'cancel':
        setOrderToCancel(order);
        setShowCancelModal(true);
        break;
      case 'changeAddress':
        setChangingOrder(order);
        setShowChangeAddressModal(true);
        break;
      case 'edit':
        navigate(`/orders/edit/${order.id}`);
        break;
      case 'chat':
        // Handle chat
        break;
      case 'report':
        // Handle report
        break;
      case 'rate':
        // Handle rate
        break;
    }
    setActiveMenu(null);
  };
  const handleMoreClick = (e: React.MouseEvent, orderId: string) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPosition({
      left: rect.left + window.scrollX,
      top: rect.bottom + window.scrollY
    });
    setActiveMenu(activeMenu === orderId ? null : orderId);
  };
  const handlePrintOrder = async (orderId: string) => {
    setIsPrinting(true);
    try {
      const res = await axios.get(`/orders/${orderId}`);
      setPrintingOrder(res.data);
      setTimeout(async () => {
        if (!printRef.current) return;
        const canvas = await html2canvas(printRef.current, { scale: 2, backgroundColor: '#fff', useCORS: true });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth();
        pdf.addImage(imgData, 'PNG', 5, 5, pageWidth-10, 0);
        pdf.save(`order_${orderId}.pdf`);
        toast.success('Đã xuất file PDF đơn hàng!', { position: 'top-right', autoClose: 2000 });
        setPrintingOrder(null);
        setIsPrinting(false);
      }, 300);
    } catch {
      toast.error('Không thể in đơn hàng.');
      setIsPrinting(false);
    }
  };

  // Lấy danh sách địa chỉ giao hàng khi mở modal
  useEffect(() => {
    if (showChangeAddressModal) {
      axios.get('/user-addresses').then(res => {
        const data = res.data as any[];
        setDeliveryAddresses(data.filter((a: any) => a.type === 'delivery'));
      });
    }
  }, [showChangeAddressModal]);

  const handleConfirmChangeAddress = async () => {
    const address = deliveryAddresses.find(a => a.address_id === selectedDeliveryAddressId);
    if (!address || !changingOrder) return;
    try {
      const response = await axios.put(`/orders/${changingOrder.id}`, {
        delivery_address_id: address.address_id,
        delivery_address: address
      });
      if (response.data) {
        toast.success('Đã đổi địa điểm giao thành công!', {
          position: "top-right",
          autoClose: 3000,
        });
        setShowChangeAddressModal(false);
        setChangingOrder(null);
        setSelectedDeliveryAddressId('');
        await fetchOrders(setOrders);
      }
    } catch (error) {
      console.error('Error changing address:', error);
      toast.error('Đổi địa điểm giao thất bại!', {
        position: "top-right",
        autoClose: 3000,
      });
    }
  };

  const handleConfirmCancel = async () => {
    if (!orderToCancel) return;
    try {
      const response = await axios.put(`/orders/${orderToCancel.id}`, { status: 'cancelled' });
      if (response.data) {
        toast.success('Đã hủy đơn hàng thành công!', {
          position: "top-right",
          autoClose: 3000,
        });
        setShowCancelModal(false);
        setOrderToCancel(null);
        await fetchOrders(setOrders);
      }
    } catch (error) {
      console.error('Error cancelling order:', error);
      toast.error('Hủy đơn hàng thất bại!', {
        position: "top-right",
        autoClose: 3000,
      });
    }
  };

  const handleConfirmReorder = async () => {
    if (!orderToReorder) return;
    try {
      const response = await axios.put(`/orders/${orderToReorder.id}`, { status: 'pending' });
      if (response.data) {
        toast.success('Đã đặt lại đơn hàng thành công!', {
          position: "top-right",
          autoClose: 3000,
        });
        setShowReorderModal(false);
        setOrderToReorder(null);
        await fetchOrders(setOrders);
      }
    } catch (error) {
      console.error('Error reordering:', error);
      toast.error('Đặt lại đơn hàng thất bại!', {
        position: "top-right",
        autoClose: 3000,
      });
    }
  };

  // Thêm hàm xác định trạng thái hiển thị ngoài list
  const getDisplayStatus = (order: OrderUI) => {
    if ((order.shipper_info && (order.shipper_info.fullName || order.shipper_info.name)) && order.status === 'Chờ xử lý') {
      return 'Đang chuẩn bị';
    }
    return order.status;
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Quản lý đơn hàng</h1>
          <button onClick={() => navigate('/orders/new')} className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center gap-2">
            <Package2Icon className="h-5 w-5" />
            Tạo đơn hàng mới
          </button>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm space-y-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <input type="text" placeholder="Tìm kiếm đơn hàng..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500" />
              <SearchIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
            <button onClick={() => setFilterOpen(v => !v)} className={`px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2 ${filterOpen ? 'bg-orange-50 text-orange-600' : ''}`}>
              <FilterIcon className="h-5 w-5" />
              Bộ lọc
            </button>
          </div>
          {filterOpen && (
            <div className="bg-gray-50 p-4 rounded-lg shadow-md flex flex-wrap gap-4 items-end mt-2">
              <div>
                <label className="block text-xs mb-1">Từ ngày</label>
                <input type="date" className="border rounded px-2 py-1" value={filter.fromDate} onChange={e => setFilter(f => ({ ...f, fromDate: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs mb-1">Đến ngày</label>
                <input type="date" className="border rounded px-2 py-1" value={filter.toDate} onChange={e => setFilter(f => ({ ...f, toDate: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs mb-1">Giá trị hàng hóa từ</label>
                <input type="number" className="border rounded px-2 py-1" value={filter.minValue} onChange={e => setFilter(f => ({ ...f, minValue: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs mb-1">Giá trị hàng hóa đến</label>
                <input type="number" className="border rounded px-2 py-1" value={filter.maxValue} onChange={e => setFilter(f => ({ ...f, maxValue: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs mb-1">Phương thức thanh toán</label>
                <select className="border rounded px-2 py-1" value={filter.paymentMethod} onChange={e => setFilter(f => ({ ...f, paymentMethod: e.target.value }))}>
                  <option value="">Tất cả</option>
                  <option value="COD">Thanh toán khi nhận hàng</option>
                  <option value="MOMO">Ví MoMo</option>
                  <option value="BANK">Chuyển khoản ngân hàng</option>
                  <option value="CASH">Tiền mặt</option>
                  <option value="VNPAY">VNPay</option>
                  <option value="ZALOPAY">ZaloPay</option>
                  <option value="SHOPEEPAY">ShopeePay</option>
                  <option value="VISA">Thẻ Visa</option>
                  <option value="MASTERCARD">Thẻ Mastercard</option>
                  <option value="JCB">Thẻ JCB</option>
                  <option value="AMEX">Thẻ American Express</option>
                </select>
              </div>
              <button className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600" onClick={() => { setAppliedFilter(filter); setFilterOpen(false); setCurrentPage(1); }}>Áp dụng</button>
              <button className="px-4 py-2 border rounded-lg hover:bg-gray-100" onClick={() => { setFilter({ fromDate: '', toDate: '', minValue: '', maxValue: '', paymentMethod: '' }); setAppliedFilter({ fromDate: '', toDate: '', minValue: '', maxValue: '', paymentMethod: '' }); setCurrentPage(1); }}>Đặt lại</button>
            </div>
          )}
          <div className="flex gap-2">
            {['Tất cả', 'Chờ xử lý', 'Đang giao', 'Đã giao', 'Đã hủy'].map(status => <button key={status} onClick={() => setSelectedStatus(status)} className={`px-4 py-2 rounded-lg text-sm font-medium ${selectedStatus === status ? 'bg-orange-50 text-orange-600' : 'text-gray-600 hover:bg-gray-50'}`}>
                  {status}
                </button>)}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Mã đơn</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Khách hàng</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Địa chỉ giao</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Shipper</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Trạng thái</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Thời gian</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-600">Tổng tiền</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-600">Tổng giá trị</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-600">Thao tác</th>
              </tr>
              <tr>
                <th className="px-6 py-2"><input type="text" value={filterOrderId} onChange={e => setFilterOrderId(e.target.value)} placeholder="Lọc mã đơn" className="w-full border rounded px-2 py-1" /></th>
                <th className="px-6 py-2"><input type="text" value={filterCustomer} onChange={e => setFilterCustomer(e.target.value)} placeholder="Lọc khách hàng" className="w-full border rounded px-2 py-1" /></th>
                <th className="px-6 py-2"><input type="text" value={filterAddress} onChange={e => setFilterAddress(e.target.value)} placeholder="Lọc địa chỉ" className="w-full border rounded px-2 py-1" /></th>
                <th className="px-6 py-2"><input type="text" value={filterShipper} onChange={e => setFilterShipper(e.target.value)} placeholder="Lọc shipper" className="w-full border rounded px-2 py-1" /></th>
                <th className="px-6 py-2"><input type="text" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} placeholder="Lọc trạng thái" className="w-full border rounded px-2 py-1" /></th>
                <th className="px-6 py-2"><input type="text" value={filterTime} onChange={e => setFilterTime(e.target.value)} placeholder="Lọc thời gian" className="w-full border rounded px-2 py-1" /></th>
                <th className="px-6 py-2"><input type="text" value={filterTotalFee} onChange={e => setFilterTotalFee(e.target.value)} placeholder="Lọc tổng tiền" className="w-full border rounded px-2 py-1 text-right" /></th>
                <th className="px-6 py-2"><input type="text" value={filterOrderValue} onChange={e => setFilterOrderValue(e.target.value)} placeholder="Lọc tổng giá trị" className="w-full border rounded px-2 py-1 text-right" /></th>
                <th></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {pagedOrders.map((order, index) => {
                const displayStatus = getDisplayStatus(order);
                return (
                  <tr key={index}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span>{order.id}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="font-medium">{order.customer}</div>
                      <div className="text-sm text-gray-500">{order.phone}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-600">{order.address}</div>
                  </td>
                  <td className="px-6 py-4">
                      {order.shipper_info && (order.shipper_info.fullName || order.shipper_info.name) ? (
                        <span className="text-blue-700 font-semibold">{order.shipper_info.fullName || order.shipper_info.name}</span>
                      ) : (
                        <span className="text-gray-400 italic">Chưa có shipper</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${renderStatusBadge(displayStatus)}`}>
                        {displayStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-600">{order.time}</div>
                  </td>
                  <td className="px-6 py-4 text-right">
  {order.cost_details?.total_fee?.value !== undefined
    ? order.cost_details.total_fee.value.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })
    : ''}
</td>
                  <td className="px-6 py-4 text-right">
                    {order.order_value?.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' }) || ''}
                  </td>
                  <td className="px-6 py-4 relative">
                    <div className="flex justify-end items-center gap-2">
                      <button onClick={() => navigate(`/orders/${order.id}`)} className="p-1 hover:bg-gray-100 rounded">
                        <EyeIcon className="h-5 w-5 text-gray-600" />
                      </button>
                        <button className="p-1 hover:bg-gray-100 rounded" onClick={() => handlePrintOrder(order.id)} disabled={isPrinting}>
                        <PrinterIcon className="h-5 w-5 text-gray-600" />
                      </button>
                      <div className="relative">
                        <button onClick={e => handleMoreClick(e, order.id)} className="p-1 hover:bg-gray-100 rounded">
                          <MoreHorizontalIcon className="h-5 w-5 text-gray-600" />
                        </button>
                          {activeMenu === order.id &&
                            <div className="absolute right-0 top-full z-10">
                              <OrderActionMenu order={order} onClose={() => setActiveMenu(null)} onAction={handleActionClick} position={{ left: 0, top: 0 }} />
                            </div>
                          }
                      </div>
                    </div>
                  </td>
                  </tr>
                );
              })}
              <tr className="font-bold bg-orange-50">
                <td className="px-6 py-4" colSpan={6}>Tổng cộng</td>
                <td className="px-6 py-4 text-right">{totalFeePage.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}</td>
                <td className="px-6 py-4 text-right">{totalOrderValuePage.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
          <div className="px-6 py-4 border-t">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Hiển thị {(advancedFilteredOrders.length === 0 ? 0 : (currentPage - 1) * pageSize + 1)}-{Math.min(currentPage * pageSize, advancedFilteredOrders.length)} của {advancedFilteredOrders.length} đơn hàng
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span>Hiển thị:</span>
                <select
                  value={pageSize}
                  onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                  className="border rounded px-2 py-1"
                >
                  {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 99999].map(size => (
                    <option key={size} value={size}>
                      {size === 99999 ? 'Tất cả' : size}
                    </option>
                  ))}
                </select>
                <span>đơn/trang</span>
              </div>
              {totalPages > 1 && (
                <div className="flex gap-2">
                  <button
                    className="px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Trước
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      className={`px-4 py-2 rounded-lg text-sm font-medium ${currentPage === page ? 'bg-orange-50 text-orange-600' : 'border hover:bg-gray-50'}`}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    className="px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages || totalPages === 0}
                  >
                    Sau
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        {printingOrder && (
          <div style={{ position: 'absolute', left: -9999, top: 0 }}>
            <div ref={printRef}>
              <OrderDetail orderData={printingOrder} forcePrinting={true} />
            </div>
          </div>
        )}
        {showChangeAddressModal && (
          <SimpleModal onClose={() => { setShowChangeAddressModal(false); setChangingOrder(null); setSelectedDeliveryAddressId(''); }}>
            <div className="p-6">
              <h2 className="text-lg font-bold mb-4">Đổi địa điểm giao hàng</h2>
              <select value={selectedDeliveryAddressId} onChange={e => setSelectedDeliveryAddressId(e.target.value)} className="w-full p-2 border rounded-lg mb-4">
                <option value="">Chọn địa chỉ giao hàng mới</option>
                {deliveryAddresses.map(addr => (
                  <option key={addr.address_id} value={addr.address_id}>
                    {addr.street}, {addr.ward}, {addr.district}, {addr.city}
                  </option>
                ))}
              </select>
              <div className="flex justify-end gap-2">
                <button onClick={() => { setShowChangeAddressModal(false); setChangingOrder(null); setSelectedDeliveryAddressId(''); }} className="px-4 py-2 border rounded-lg">Hủy</button>
                <button onClick={handleConfirmChangeAddress} className="px-4 py-2 bg-orange-500 text-white rounded-lg" disabled={!selectedDeliveryAddressId}>Xác nhận</button>
              </div>
            </div>
          </SimpleModal>
        )}
        {showCancelModal && (
          <SimpleModal onClose={() => { setShowCancelModal(false); setOrderToCancel(null); }}>
            <div className="p-6">
              <h2 className="text-lg font-bold mb-4 text-red-600">Xác nhận hủy đơn hàng</h2>
              <p>Bạn có chắc chắn muốn <b>hủy</b> đơn hàng <span className="text-orange-600">{orderToCancel?.id}</span> không?</p>
              <div className="flex justify-end gap-2 mt-6">
                <button onClick={() => { setShowCancelModal(false); setOrderToCancel(null); }} className="px-4 py-2 border rounded-lg">Không</button>
                <button onClick={handleConfirmCancel} className="px-4 py-2 bg-red-500 text-white rounded-lg">Hủy đơn</button>
              </div>
            </div>
          </SimpleModal>
        )}
        {showReorderModal && (
          <SimpleModal onClose={() => { setShowReorderModal(false); setOrderToReorder(null); }}>
            <div className="p-6">
              <h2 className="text-lg font-bold mb-4 text-green-600">Xác nhận đặt lại đơn hàng</h2>
              <p>Bạn có chắc chắn muốn <b>đặt lại</b> đơn hàng <span className="text-orange-600">{orderToReorder?.id}</span> không?</p>
              <div className="flex justify-end gap-2 mt-6">
                <button onClick={() => { setShowReorderModal(false); setOrderToReorder(null); }} className="px-4 py-2 border rounded-lg">Không</button>
                <button onClick={handleConfirmReorder} className="px-4 py-2 bg-green-500 text-white rounded-lg">Đặt lại</button>
              </div>
            </div>
          </SimpleModal>
        )}
      </div>
    </>
  );
};
export default OrderList;