import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import NotificationDropdown from './notification/NotificationDropdown';
import { useState, useEffect } from 'react';
import { BellIcon } from 'lucide-react';
import axios from '../api/axios';
import { NotificationContext } from './notification/NotificationContext';

declare global {
  interface Window {
    socket?: any;
  }
}

const Layout: React.FC<{
  children: React.ReactNode;
}> = ({
  children
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Hàm fetch notifications
  const fetchNotifications = async () => {
    try {
      const res = await axios.get('/notifications');
      const data = res.data as any;
      const notiArr = Array.isArray(data.data) ? data.data : [];
      setNotifications(notiArr);
      const unread = notiArr.filter((n: any) => !(n.read_at || n.status === 'read')).length;
      setUnreadCount(unread);
    } catch {}
  };

  useEffect(() => {
    // Lắng nghe sự kiện cập nhật thông báo để cập nhật badge
    const handler = () => fetchNotifications();
    handler(); // fetch lần đầu
    window.addEventListener('notifications-updated', handler);
    // Nếu có socket, lắng nghe sự kiện realtime
    if (window.socket) {
      window.socket.on('new-notification', handler);
    }
    return () => {
      window.removeEventListener('notifications-updated', handler);
      if (window.socket) {
        window.socket.off('new-notification', handler);
      }
    };
  }, []);

  // Khi click chuông, luôn fetch lại danh sách mới nhất
  const handleBellClick = () => {
    fetchNotifications();
    setShowDropdown(!showDropdown);
  };

  return (
    <NotificationContext.Provider value={{ notifications }}>
      <div className="flex min-h-screen bg-gray-100">
        <Sidebar />
        <div className="flex-1">
          <Header notifications={notifications} unreadCount={unreadCount} fetchNotifications={fetchNotifications} />
          <main className="p-6">{children}</main>
        </div>
      </div>
    </NotificationContext.Provider>
  );
};
export default Layout;