import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package2Icon, TruckIcon, CheckCircleIcon, XCircleIcon, PauseCircleIcon, ClockIcon, CalendarIcon, DownloadIcon, SearchIcon } from 'lucide-react';
import DateRangePickerModal from './modals/DateRangePickerModal';
import axios from '../api/axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import * as XLSX from 'xlsx';

const Dashboard = () => {
  const navigate = useNavigate();
  const [trackingCode, setTrackingCode] = useState('');
  const [dateRange, setDateRange] = useState('month'); // month, year, custom
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [customDateRange, setCustomDateRange] = useState({
    start: null as Date | null,
    end: null as Date | null
  });
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Thêm state cho phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 6; // Số đơn hàng mỗi trang

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await axios.get('/orders');
        setOrders(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        setError('Không thể tải dữ liệu đơn hàng.');
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  // Helper: lấy ngày tạo đơn (ISO hoặc dạng khác)
  function parseOrderDate(order: any): Date {
    if (order.created_at) return new Date(order.created_at);
    if (order.time) return new Date(order.time);
    return new Date();
  }

  // Helper: kiểm tra đơn thuộc khoảng thời gian
  function isOrderInRange(order: any) {
    const d = parseOrderDate(order);
    const now = new Date();
    if (dateRange === 'month') {
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }
    if (dateRange === 'year') {
      return d.getFullYear() === now.getFullYear();
    }
    if (dateRange === 'custom' && customDateRange.start && customDateRange.end) {
      const start = new Date(customDateRange.start);
      start.setHours(0, 0, 0, 0);
      const end = new Date(customDateRange.end);
      end.setHours(23, 59, 59, 999);
      return d >= start && d <= end;
    }
    return true;
  }

  const filteredOrders = orders.filter(order => {
    const inRange = isOrderInRange(order);
    if (inRange) {
      console.log('Order:', order.order_id, 'created_at:', order.created_at, 'Date:', parseOrderDate(order));
    }
    return inRange;
  });

  // Lọc đơn đã giao thành công
  const deliveredOrders = filteredOrders.filter(order => order.status === 'delivered' || order.status === 'Đã giao');

  // Tính toán phân trang
  const totalPages = Math.ceil(deliveredOrders.length / ordersPerPage);
  const startIndex = (currentPage - 1) * ordersPerPage;
  const endIndex = startIndex + ordersPerPage;
  const currentOrders = deliveredOrders.slice(startIndex, endIndex);

  // Tính tổng chi phí vận chuyển thực tế (dùng trường total_fee)
  const totalShippingCost = deliveredOrders.reduce((sum, order) => sum + (order.total_fee || 0), 0);
  const totalOrderValue = filteredOrders
    .filter(o =>
      (o.status === 'pending' || o.status === 'created' ||
       o.status === 'preparing' || o.status === 'Đang chuẩn bị' ||
       o.status === 'delivering' || o.status === 'Đang giao' ||
       o.status === 'delivered' || o.status === 'Đã giao') &&
      o.status !== 'cancelled' && o.status !== 'Đã hủy'
    )
    .reduce((sum, o) => sum + (o.order_value || o.total_amount || 0), 0);

  // Tính toán thống kê COD tuần này
  const codStats = {
    failedFirst: filteredOrders.filter(o => o.status === 'failed_first' || o.status === 'Giao thất bại lần đầu').length,
    failedCreate: filteredOrders.filter(o => o.status === 'failed_create' || o.status === 'Tạo đơn vận thất bại').length,
    collected: filteredOrders
      .filter(o => o.status === 'delivered' || o.status === 'Đã giao')
      .reduce((sum, o) => sum + (o.order_value || o.total_amount || 0), 0),
    notCollected: filteredOrders
      .filter(o => o.status === 'preparing' || o.status === 'Đang chuẩn bị' || o.status === 'delivering' || o.status === 'Đang giao' || o.status === 'pending' || o.status === 'Chờ xử lý')
      .reduce((sum, o) => sum + (o.order_value || o.total_amount || 0), 0),
  };

  // Thống kê tổng quan tuần này
  const weekStats = {
    created: filteredOrders.filter(o => o.status === 'created' || o.status === 'pending').length,
    delivering: filteredOrders.filter(o => o.status === 'delivering' || o.status === 'Đang giao').length,
    returned: filteredOrders.filter(o => o.status === 'returned' || o.status === 'Đã trả lại').length,
    preparing: filteredOrders.filter(o => o.status === 'preparing' || o.status === 'Đang chuẩn bị').length,
    cancelled: filteredOrders.filter(o => o.status === 'cancelled' || o.status === 'Đã hủy').length,
    held: filteredOrders.filter(o => o.status === 'held' || o.status === 'Giữ lại').length,
    delivered: filteredOrders.filter(o => o.status === 'delivered' || o.status === 'Đã giao').length,
  };

  const handleDateRangeApply = (startDate: Date, endDate: Date) => {
    setCustomDateRange({
      start: startDate,
      end: endDate
    });
    setDateRange('custom');
  };

  const handleTrackOrder = () => {
    if (trackingCode) {
      navigate(`/orders/tracking?code=${trackingCode}`);
    }
  };

  const handleExportExcel = () => {
    if (!deliveredOrders.length) {
      alert('Không có đơn hàng nào để xuất!');
      return;
    }
    const data = deliveredOrders.map(order => ({
      'Mã đơn': order.order_id,
      'Ngày tạo': parseOrderDate(order).toLocaleString('vi-VN'),
      'Trạng thái': order.status,
      'Chi phí': order.total_fee,
      'COD': order.cod_amount,
      'Đã thu COD': order.cod_collected ? 'Có' : 'Không',
      'Người nhận': order.receiver_name,
      'SĐT người nhận': order.receiver_phone,
      'Địa chỉ nhận': order.receiver_address,
      'Người gửi': order.sender_name,
      'SĐT người gửi': order.sender_phone,
      'Địa chỉ gửi': order.sender_address,
      ...order
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Đơn hàng');
    XLSX.writeFile(wb, 'don_hang.xlsx');
  };

  // Chuẩn bị dữ liệu cho biểu đồ
  function getChartData() {
    if (dateRange === 'month' || dateRange === 'custom') {
      const map: Record<string, number> = {};
      deliveredOrders.forEach(order => {
        const d = parseOrderDate(order);
        const label = d.toLocaleDateString('vi-VN');
        map[label] = (map[label] || 0) + (order.total_fee || 0);
      });
      return Object.entries(map).map(([label, total]) => ({ label, total }));
    } else if (dateRange === 'year') {
      const map: Record<string, number> = {};
      deliveredOrders.forEach(order => {
        const d = parseOrderDate(order);
        const label = `${d.getMonth() + 1}/${d.getFullYear()}`;
        map[label] = (map[label] || 0) + (order.total_fee || 0);
      });
      return Object.entries(map).map(([label, total]) => ({ label, total }));
    }
    return [];
  }
  const chartData = getChartData();

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <div className="flex space-x-4">
        <button onClick={() => navigate('/orders/new')} className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600">
          ĐƠN HÀNG MỚI
        </button>
        <div className="flex-1 relative">
          <input
            type="text"
            value={trackingCode}
            onChange={e => setTrackingCode(e.target.value)}
            placeholder="Nhập mã vận đơn để theo dõi..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
          <SearchIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          <button onClick={handleTrackOrder} className="absolute right-2 top-2 px-4 py-1 bg-orange-500 text-white rounded hover:bg-orange-600">
            Theo dõi
          </button>
        </div>
        <button onClick={handleExportExcel} className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center gap-2">
          <DownloadIcon className="h-5 w-5" />
          XUẤT EXCEL
        </button>
      </div>
      {/* Total Cost Analysis */}
      <div className="bg-white rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold">Tổng chi phí vận chuyển</h2>
          <div className="flex gap-2">
            <button onClick={() => setDateRange('month')} className={`px-4 py-2 rounded-lg text-sm ${dateRange === 'month' ? 'bg-orange-50 text-orange-600' : 'hover:bg-gray-50'}`}>
              Tháng này
            </button>
            <button onClick={() => setDateRange('year')} className={`px-4 py-2 rounded-lg text-sm ${dateRange === 'year' ? 'bg-orange-50 text-orange-600' : 'hover:bg-gray-50'}`}>
              Năm nay
            </button>
            <button onClick={() => setIsDatePickerOpen(true)} className={`px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2 ${dateRange === 'custom' ? 'bg-orange-50 text-orange-600 border-orange-500' : ''}`}>
              <CalendarIcon className="h-4 w-4" />
              {dateRange === 'custom' && customDateRange.start && customDateRange.end ? `${customDateRange.start.toLocaleDateString()} - ${customDateRange.end.toLocaleDateString()}` : 'Tùy chọn'}
            </button>
          </div>
        </div>
        {loading ? (
          <div className="text-gray-500">Đang tải dữ liệu...</div>
        ) : error ? (
          <div className="text-red-500">{error}</div>
        ) : (
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold">
              {totalShippingCost.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}
            </span>
          </div>
        )}
      </div>
      {/* Total Order Value */}
      <div className="bg-white rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold">Tổng giá trị đơn hàng</h2>
        </div>
        <div className="flex items-end gap-2">
          <span className="text-3xl font-bold">
            {totalOrderValue.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}
          </span>
        </div>
      </div>
      <div className="bg-white rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">COD tuần này</h2>
        <div className="grid grid-cols-4 gap-4">
          {[
            {
              icon: Package2Icon,
              title: 'Giao thất bại lần đầu',
              value: codStats.failedFirst + ' đơn'
            },
            {
              icon: TruckIcon,
              title: 'Tạo đơn vận thất bại',
              value: codStats.failedCreate + ' đơn'
            },
            {
              icon: CheckCircleIcon,
              title: 'Đã thu tiền',
              value: codStats.collected.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })
            },
            {
              icon: XCircleIcon,
              title: 'Chưa lấy tiền',
              value: codStats.notCollected.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })
            }
          ].map((item, index) => (
            <div key={index} className="p-4 border rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <item.icon className="h-5 w-5 text-gray-600" />
                <span className="text-sm text-gray-600">{item.title}</span>
              </div>
              <p className="text-lg font-semibold">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Tổng quan tuần này</h2>
        <div className="grid grid-cols-6 gap-4">
          {[
            {
              icon: Package2Icon,
              title: 'Mới tạo và chờ lấy',
              value: weekStats.created
            },
            {
              icon: TruckIcon,
              title: 'Đang giao',
              value: weekStats.delivering
            },
            {
              icon: ClockIcon,
              title: 'Đơn trả lại',
              value: weekStats.returned
            },
            {
              icon: PauseCircleIcon,
              title: 'Đơn đang chuẩn bị',
              value: weekStats.preparing
            },
            {
              icon: XCircleIcon,
              title: 'Đơn bị hủy',
              value: weekStats.cancelled
            },
            {
              icon: CheckCircleIcon,
              title: 'Đơn đã giao thành công',
              value: weekStats.delivered
            }
          ].map((item, index) => (
            <div key={index} className="p-4 border rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <item.icon className="h-5 w-5 text-gray-600" />
                <span className="text-sm text-gray-600">{item.title}</span>
              </div>
              <p className="text-lg font-semibold">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-lg p-6 mb-6">
        <h3 className="font-semibold mb-4">Biểu đồ chi phí vận chuyển</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="total" fill="#ff9800" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {/* Bảng chi tiết các đơn hàng với phân trang */}
      <div className="bg-white rounded-lg p-6">
        <h3 className="font-semibold mb-4">Chi tiết chi phí từng đơn</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left">Mã đơn</th>
                <th className="px-4 py-2 text-left">Ngày tạo</th>
                <th className="px-4 py-2 text-right">Chi phí</th>
                <th className="px-4 py-2 text-left">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {currentOrders.map(order => (
                <tr key={order.order_id} className="border-b">
                  <td className="px-4 py-2">{order.order_id}</td>
                  <td className="px-4 py-2">{parseOrderDate(order).toLocaleString('vi-VN')}</td>
                  <td className="px-4 py-2 text-right">{(order.total_fee || 0).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}</td>
                  <td className="px-4 py-2">{order.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Phân trang */}
        {deliveredOrders.length > 0 && (
          <div className="flex justify-between items-center mt-4">
            <div className="text-sm text-gray-600">
              Hiển thị {startIndex + 1}-{Math.min(endIndex, deliveredOrders.length)} của {deliveredOrders.length} đơn hàng
            </div>
            <div className="flex gap-2">
              <button
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm disabled:opacity-50"
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
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm disabled:opacity-50"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>
      <DateRangePickerModal isOpen={isDatePickerOpen} onClose={() => setIsDatePickerOpen(false)} onApply={handleDateRangeApply} />
    </div>
  );
};

export default Dashboard;