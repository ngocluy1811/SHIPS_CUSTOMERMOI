import React, { useEffect, useState } from 'react';
import axios from '../../api/axios';
import { Package2Icon, SearchIcon, CalendarIcon, TruckIcon, CheckCircleIcon, XCircleIcon, ArrowDownIcon, ArrowUpIcon } from 'lucide-react';
import * as XLSX from 'xlsx';

// Định nghĩa lại type OrderUI giống OrderList
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
  completeDate?: string;
  cancelledDate?: string;
  cost_details?: any;
}

const OrderHistory = () => {
  const [sortBy, setSortBy] = useState<'time' | 'status'>('time');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [orders, setOrders] = useState<OrderUI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [filterByMonth, setFilterByMonth] = useState(true);
  const [monthYearOptions, setMonthYearOptions] = useState<{label: string, value: string}[]>([]);
  const [selectedMonthYear, setSelectedMonthYear] = useState('all');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [filterOrderId, setFilterOrderId] = useState('');
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterTime, setFilterTime] = useState('');
  const [filterCompleteDate, setFilterCompleteDate] = useState('');
  const [filterTotalFee, setFilterTotalFee] = useState('');
  const [filterOrderValue, setFilterOrderValue] = useState('');
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await axios.get('/orders');
        const ordersRaw = Array.isArray(res.data) ? res.data : [];
        // Lấy tất cả customer_id duy nhất
        const customerIds = Array.from(new Set(ordersRaw.map((order: any) => order.customer_id)));
        // Gọi song song API lấy user info
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
        // Map lại orders để hiển thị tên khách hàng
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
          completeDate: order.completed_at ? new Date(order.completed_at).toLocaleString('vi-VN') : (order.delivered_at ? new Date(order.delivered_at).toLocaleString('vi-VN') : ''),
          cancelledDate: order.cancelled_at ? new Date(order.cancelled_at).toLocaleString('vi-VN') : (order.updated_at && order.status === 'cancelled' ? new Date(order.updated_at).toLocaleString('vi-VN') : ''),
          cost_details: order.cost_details
        }));
        setOrders(mapped);
        // Tạo danh sách tháng/năm đủ 12 tháng cho mỗi năm trong dữ liệu
        let minYear = 9999, maxYear = 0;
        mapped.forEach(order => {
          if (order.time) {
            const d = parseVNDate(order.time);
            if (!isNaN(d.getTime())) {
              const y = d.getFullYear();
              if (y < minYear) minYear = y;
              if (y > maxYear) maxYear = y;
            }
          }
        });
        const options: {label: string, value: string}[] = [];
        if (minYear <= maxYear && minYear !== 9999) {
          for (let y = maxYear; y >= minYear; y--) {
            for (let m = 12; m >= 1; m--) {
              options.push({
                label: `Tháng ${m} năm ${y}`,
                value: `${m}/${y}`
              });
            }
          }
        }
        setMonthYearOptions([{label: 'Tất cả', value: 'all'}, ...options]);
      } catch (err) {
        setError('Không thể tải lịch sử đơn hàng.');
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  // Hàm parse ngày robust
  function parseVNDate(str: string): Date {
    // Có giờ phút giây
    const match = str.match(/(\d{1,2}):(\d{1,2}):(\d{1,2}) (\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (match) {
      const [, h, m, s, d, mo, y] = match;
      return new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(m), Number(s));
    }
    // Chỉ ngày tháng năm
    const match2 = str.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (match2) {
      const [, d, mo, y] = match2;
      return new Date(Number(y), Number(mo) - 1, Number(d));
    }
    return new Date(str);
  }

  // Lọc nâng cao
  const advancedFilteredOrders = [...orders]
    .filter(order => (order.status === 'Đã giao' || order.status === 'Đã hủy'))
    .filter(order =>
      (order.id.toLowerCase().includes(search.toLowerCase()) ||
        order.customer.toLowerCase().includes(search.toLowerCase()))
    )
    .filter(order => {
      if (filterOrderId && !order.id.toLowerCase().includes(filterOrderId.toLowerCase())) return false;
      if (filterCustomer && !order.customer.toLowerCase().includes(filterCustomer.toLowerCase())) return false;
      if (filterStatus && !order.status.toLowerCase().includes(filterStatus.toLowerCase())) return false;
      if (filterTime && !(order.time || '').toLowerCase().includes(filterTime.toLowerCase())) return false;
      if (filterCompleteDate && !(order.completeDate || order.cancelledDate || '').toLowerCase().includes(filterCompleteDate.toLowerCase())) return false;
      if (filterTotalFee) {
        const feeValue = order.cost_details?.total_fee?.value;
        if (!isNaN(Number(filterTotalFee))) {
          if (Number(filterTotalFee) !== feeValue) return false;
        } else {
          if (!(feeValue !== undefined ? feeValue.toLocaleString('vi-VN') : '').includes(filterTotalFee)) return false;
        }
      }
      if (filterOrderValue && !(order.value !== undefined ? order.value.toLocaleString('vi-VN') : '').includes(filterOrderValue)) return false;
      return true;
    })
    .filter(order => {
      // Filter theo tháng/năm nếu không phải 'Tất cả'
      if (selectedMonthYear === 'all') return true;
      if (!order.time) return false;
      const d = parseVNDate(order.time);
      if (isNaN(d.getTime())) return false;
      const [m, y] = selectedMonthYear.split('/').map(Number);
      return d.getMonth() + 1 === m && d.getFullYear() === y;
    })
    .filter(order => {
      // Filter theo khoảng ngày nếu có fromDate/toDate
      if (!fromDate && !toDate) return true;
      if (!order.time) return false;
      const d = parseVNDate(order.time);
      if (isNaN(d.getTime())) return false;
      let valid = true;
      if (fromDate) {
        const from = new Date(fromDate);
        from.setHours(0,0,0,0);
        valid = valid && d >= from;
      }
      if (toDate) {
        const to = new Date(toDate);
        to.setHours(23,59,59,999);
        valid = valid && d <= to;
      }
      return valid;
    });

  // Phân trang
  const indexOfLastItem = currentPage * pageSize;
  const indexOfFirstItem = indexOfLastItem - pageSize;
  const currentItems = advancedFilteredOrders.slice(indexOfFirstItem, pageSize === 99999 ? undefined : indexOfLastItem);
  const totalPages = pageSize === 99999 ? 1 : Math.ceil(advancedFilteredOrders.length / pageSize);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  const handleMonthChange = (months: number) => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() + months);
    setCurrentMonth(newDate);
    setCurrentPage(1);
  };

  const handleExportReport = () => {
    const reportData = currentItems.map(order => ({
      'Mã đơn': order.id,
      'Khách hàng': order.customer,
      'Trạng thái': order.status,
      'Ngày tạo': order.time,
      'Ngày hoàn thành': order.completeDate || '--',
      'Giá trị': order.value ? order.value.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' }) : '--'
    }));

    const ws = XLSX.utils.json_to_sheet(reportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Lịch sử đơn hàng');
    
    const fileName = `lich_su_don_hang_${currentMonth.getMonth() + 1}_${currentMonth.getFullYear()}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const toggleSort = (type: 'time' | 'status') => {
    if (sortBy === type) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(type);
      setSortOrder('desc');
    }
  };

  function mapOrderStatus(status: string) {
    switch (status) {
      case 'pending': return 'Chờ xử lý';
      case 'delivered': return 'Đã giao';
      case 'cancelled': return 'Đã hủy';
      default: return status;
    }
  }

  return <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Lịch sử đơn hàng</h1>
        <div className="flex gap-2 items-center">
          <select
            value={selectedMonthYear}
            onChange={e => setSelectedMonthYear(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          >
            {monthYearOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <input
            type="date"
            value={fromDate}
            onChange={e => setFromDate(e.target.value)}
            className="px-2 py-2 border rounded-lg text-sm"
            placeholder="Từ ngày"
          />
          <span>-</span>
          <input
            type="date"
            value={toDate}
            onChange={e => setToDate(e.target.value)}
            className="px-2 py-2 border rounded-lg text-sm"
            placeholder="Đến ngày"
          />
          <button 
            onClick={handleExportReport}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            Xuất báo cáo
          </button>
        </div>
      </div>
      {/* Stats */}
      <div className="grid grid-cols-4 gap-6">
        {[{
        icon: Package2Icon,
        label: 'Tổng đơn hàng',
        value: orders.length,
        trend: '+0%',
        trendUp: true
      }, {
        icon: TruckIcon,
        label: 'Đã giao thành công',
        value: orders.filter(o => o.status === 'Đã giao').length,
        trend: '+0%',
        trendUp: true
      }, {
        icon: XCircleIcon,
        label: 'Đã hủy',
        value: orders.filter(o => o.status === 'Đã hủy').length,
        trend: '-0%',
        trendUp: false
      }, {
        icon: CheckCircleIcon,
        label: 'Tỷ lệ thành công',
        value: orders.length ? ((orders.filter(o => o.status === 'Đã giao').length / orders.length) * 100).toFixed(1) + '%' : '0%',
        trend: '+0%',
        trendUp: true
      }].map((stat, index) => <div key={index} className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center gap-2 text-gray-600 mb-4">
              <stat.icon className="h-5 w-5" />
              <span>{stat.label}</span>
            </div>
            <div className="flex items-end justify-between">
              <span className="text-2xl font-bold">{stat.value}</span>
              <div className={`flex items-center gap-1 text-sm ${stat.trendUp ? 'text-green-600' : 'text-red-600'}`}>
                {stat.trendUp ? <ArrowUpIcon className="h-4 w-4" /> : <ArrowDownIcon className="h-4 w-4" />}
                {stat.trend}
              </div>
            </div>
          </div>)}
      </div>
      {/* Search and Filter */}
      <div className="bg-white p-4 rounded-lg shadow-sm flex gap-4">
        <div className="flex-1 relative">
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm kiếm theo mã đơn, khách hàng..." className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500" />
          <SearchIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
        </div>
        <button onClick={() => toggleSort('status')} className={`px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2 ${sortBy === 'status' ? 'bg-orange-50 text-orange-600' : ''}`}>
          Trạng thái
          {sortBy === 'status' && (sortOrder === 'desc' ? <ArrowDownIcon className="h-4 w-4" /> : <ArrowUpIcon className="h-4 w-4" />)}
        </button>
        <button onClick={() => toggleSort('time')} className={`px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2 ${sortBy === 'time' ? 'bg-orange-50 text-orange-600' : ''}`}>
          Thời gian
          {sortBy === 'time' && (sortOrder === 'desc' ? <ArrowDownIcon className="h-4 w-4" /> : <ArrowUpIcon className="h-4 w-4" />)}
        </button>
      </div>
      {/* History List */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b">
          <h3 className="font-medium">Chi tiết đơn hàng</h3>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-500">Đang tải dữ liệu...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">{error}</div>
        ) : (
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">Mã đơn</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">Khách hàng</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">Trạng thái</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">Ngày tạo</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">{`Ngày hoàn thành / Ngày hủy`}</th>
              <th className="px-6 py-3 text-right text-sm font-medium text-gray-600">Tổng tiền</th>
              <th className="px-6 py-3 text-right text-sm font-medium text-gray-600">Giá trị</th>
            </tr>
            <tr>
              <th className="px-6 py-2"><input type="text" value={filterOrderId} onChange={e => setFilterOrderId(e.target.value)} placeholder="Lọc mã đơn" className="w-full border rounded px-2 py-1" /></th>
              <th className="px-6 py-2"><input type="text" value={filterCustomer} onChange={e => setFilterCustomer(e.target.value)} placeholder="Lọc khách hàng" className="w-full border rounded px-2 py-1" /></th>
              <th className="px-6 py-2"><input type="text" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} placeholder="Lọc trạng thái" className="w-full border rounded px-2 py-1" /></th>
              <th className="px-6 py-2"><input type="text" value={filterTime} onChange={e => setFilterTime(e.target.value)} placeholder="Lọc ngày tạo" className="w-full border rounded px-2 py-1" /></th>
              <th className="px-6 py-2"><input type="text" value={filterCompleteDate} onChange={e => setFilterCompleteDate(e.target.value)} placeholder="Lọc ngày hoàn thành/hủy" className="w-full border rounded px-2 py-1" /></th>
              <th className="px-6 py-2"><input type="text" value={filterTotalFee} onChange={e => setFilterTotalFee(e.target.value)} placeholder="Lọc tổng tiền" className="w-full border rounded px-2 py-1 text-right" /></th>
              <th className="px-6 py-2"><input type="text" value={filterOrderValue} onChange={e => setFilterOrderValue(e.target.value)} placeholder="Lọc giá trị" className="w-full border rounded px-2 py-1 text-right" /></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {currentItems.map((order, index) => <tr key={index}>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <Package2Icon className="h-5 w-5 text-orange-500" />
                    <span className="font-medium">{order.id}</span>
                  </div>
                </td>
                <td className="px-6 py-4">{order.customer}</td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${order.status === 'Đã giao' ? 'bg-green-100 text-green-600' : order.status === 'Đã hủy' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'}`}>{order.status}</span>
                </td>
                <td className="px-6 py-4 text-gray-600">{order.time}</td>
                <td className="px-6 py-4 text-gray-600">{order.status === 'Đã giao' ? order.completeDate : order.cancelledDate || '--'}</td>
                <td className="px-6 py-4 text-right font-medium">{order.cost_details?.total_fee?.value !== undefined ? order.cost_details.total_fee.value.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' }) : '--'}</td>
                <td className="px-6 py-4 text-right font-medium">{order.value !== undefined ? order.value.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' }) : '--'}</td>
              </tr>)}
            {/* Dòng tổng kết */}
            <tr className="font-bold bg-orange-50">
              <td className="px-6 py-4" colSpan={5}>Tổng cộng</td>
              <td className="px-6 py-4 text-right">{currentItems.reduce((sum, o) => sum + (o.cost_details?.total_fee?.value || 0), 0).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}</td>
              <td className="px-6 py-4 text-right">{currentItems.reduce((sum, o) => sum + (o.value || 0), 0).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}</td>
            </tr>
          </tbody>
        </table>
        )}
        {/* Pagination */}
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
    </div>;
};
export default OrderHistory;