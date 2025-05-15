import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchIcon, UserIcon, BellIcon, LogOutIcon, KeyIcon } from 'lucide-react';
import { useAuth } from './auth/AuthContext';
import NotificationDropdown from './notification/NotificationDropdown';
import OrderSearchBox from './common/OrderSearchBox';

const Header = ({ notifications, unreadCount, fetchNotifications }: { notifications: any[], unreadCount: number, fetchNotifications: () => void }) => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [notifOpen, setNotifOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const notifBtnRef = useRef<HTMLButtonElement>(null);
  const notifDropdownRef = useRef<HTMLDivElement>(null);
  const accountDropdownRef = useRef<HTMLDivElement>(null);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        notifDropdownRef.current &&
        !notifDropdownRef.current.contains(event.target as Node) &&
        notifBtnRef.current &&
        !notifBtnRef.current.contains(event.target as Node)
      ) {
        setNotifOpen(false);
      }
      if (
        accountDropdownRef.current &&
        !accountDropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (notifOpen) {
      fetchNotifications();
      window.dispatchEvent(new Event('notifications-opened'));
    }
  }, [notifOpen]);

  const handleBellClick = () => {
    fetchNotifications();
    setNotifOpen(v => !v);
  };

  const handleDropdownViewAll = () => {
    setNotifOpen(false);
    navigate('/notifications');
  };

  return <header className="bg-white shadow-sm px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center max-w-2xl flex-1">
          <img src="/logo-shipvn.png" alt="Logo" className="h-10 w-10 rounded-full border border-orange-200 shadow-sm mr-4 bg-white" />
          <div className="relative flex-1">
            <OrderSearchBox
              onSelect={(orderId: string) => navigate(`/orders/${orderId}`)}
              placeholder="Nhập mã đơn vận, tên người nhận, số điện thoại người nhận..."
            />
          </div>
        </div>
        <div className="flex items-center space-x-4 ml-4">
          <div className="relative">
            <button ref={notifBtnRef} className="relative" onClick={handleBellClick}>
              <BellIcon className="h-6 w-6 text-gray-600" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs rounded-full px-1.5 py-0.5">{unreadCount}</span>
              )}
            </button>
            {notifOpen && (
              <div ref={notifDropdownRef} className="absolute right-0 z-50">
                <NotificationDropdown notifications={notifications} unreadCount={unreadCount} onClose={() => setNotifOpen(false)} onViewAll={handleDropdownViewAll} />
              </div>
            )}
          </div>
          <div className="relative" ref={accountDropdownRef}>
            <button onClick={() => setDropdownOpen(v => !v)} className="flex items-center space-x-2 hover:bg-gray-100 p-2 rounded-lg">
            <UserIcon className="h-6 w-6 text-gray-600" />
            <span className="text-sm font-medium">Tài khoản</span>
          </button>
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white border rounded-lg shadow-lg z-50">
                <button onClick={() => { setDropdownOpen(false); navigate('/profile'); }} className="w-full flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100">
                  <UserIcon className="h-5 w-5 mr-2" /> Xem thông tin tài khoản
                </button>
                <button onClick={() => { setDropdownOpen(false); navigate('/change-password'); }} className="w-full flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100">
                  <KeyIcon className="h-5 w-5 mr-2" /> Đổi mật khẩu
                </button>
                <button onClick={() => { setDropdownOpen(false); logout(); }} className="w-full flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100 border-t">
                  <LogOutIcon className="h-5 w-5 mr-2" /> Đăng xuất
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>;
};
export default Header;