import React, { useState, useRef } from 'react';
import axios from '../../api/axios';
import { useAuth } from '../auth/AuthContext';

interface OrderSearchBoxProps {
  onSelect: (orderId: string) => void;
  placeholder?: string;
}

const OrderSearchBox: React.FC<OrderSearchBoxProps> = ({ onSelect, placeholder }) => {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setNotFound(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value) {
      setSuggestions([]);
      setShowDropdown(false);
      setNotFound(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        let url = `/orders/search?q=${encodeURIComponent(value)}`;
        if (user && user.role === 'customer' && (user.user_id || user._id || user.id)) {
          const customerId = user.user_id || user._id || user.id;
          url += `&customer_id=${customerId}`;
        }
        console.log('Search URL:', url);
        const res = await axios.get(url);
        const arr = Array.isArray(res.data) ? res.data : [];
        console.log('Search results:', arr);
        setSuggestions(arr);
        setShowDropdown(true);
        setNotFound(arr.length === 0);
      } catch (error) {
        console.error('Search error:', error);
        setSuggestions([]);
        setShowDropdown(false);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  const handleSelect = (order: any) => {
    setQuery(order.order_id);
    setShowDropdown(false);
    setSuggestions([]);
    onSelect(order.order_id);
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (suggestions.length > 0) {
        handleSelect(suggestions[0]);
      } else if (query.trim()) {
        setLoading(true);
        try {
          let url = `/orders/search?q=${encodeURIComponent(query)}`;
          if (user && user.role === 'customer' && (user.user_id || user._id || user.id)) {
            const customerId = user.user_id || user._id || user.id;
            url += `&customer_id=${customerId}`;
          }
          console.log('Search URL:', url);
          const res = await axios.get(url);
          const arr = Array.isArray(res.data) ? res.data : [];
          console.log('Search results:', arr);
          setSuggestions(arr);
          setShowDropdown(true);
          setNotFound(arr.length === 0);
          if (arr.length === 1) {
            handleSelect(arr[0]);
          }
        } catch (error) {
          console.error('Search error:', error);
          setSuggestions([]);
          setShowDropdown(false);
          setNotFound(true);
        } finally {
          setLoading(false);
        }
      } else {
        setNotFound(true);
      }
    }
  };

  return (
    <div className="relative w-full">
      <input
        type="text"
        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
        placeholder={placeholder || 'Nhập mã đơn, tên người nhận, SĐT, địa chỉ...'}
        value={query}
        onChange={handleChange}
        onFocus={() => query && suggestions.length > 0 && setShowDropdown(true)}
        onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
        onKeyDown={handleKeyDown}
      />
      <span className="absolute left-3 top-2.5 text-gray-400">
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1 0 6.5 6.5a7.5 7.5 0 0 0 10.15 10.15Z"/></svg>
      </span>
      {showDropdown && suggestions.length > 0 && (
        <div className="absolute z-20 left-0 right-0 bg-white border rounded-lg shadow-lg mt-1 max-h-60 overflow-auto">
          {suggestions.map((order, idx) => (
            <div
              key={order.order_id || idx}
              className="px-4 py-2 hover:bg-orange-50 cursor-pointer"
              onMouseDown={() => handleSelect(order)}
            >
              <div className="font-medium text-orange-600">{order.order_id}</div>
              <div className="text-sm text-gray-600">
                Người gửi: {order.sender?.name || order.customer_name || '---'}<br/>
                Người nhận: {order.receiver?.name || order.receiver_name || '---'}<br/>
                SĐT: {order.receiver?.phone || order.sender?.phone || order.receiver_phone || order.sender_phone || '---'}
              </div>
              <div className="text-xs text-gray-400">Địa chỉ: {order.receiver?.address || order.delivery_address?.street || order.address || '---'}</div>
              <div className="text-xs text-gray-400">{order.status}</div>
            </div>
          ))}
        </div>
      )}
      {notFound && (
        <div className="absolute z-20 left-0 right-0 bg-white border rounded-lg shadow-lg mt-1 p-4 text-center text-gray-500">
          Không tìm thấy đơn hàng phù hợp
        </div>
      )}
      {loading && <div className="absolute right-3 top-2.5 text-orange-400 animate-spin">⏳</div>}
    </div>
  );
};

export default OrderSearchBox; 