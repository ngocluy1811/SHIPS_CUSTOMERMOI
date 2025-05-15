import React, { useEffect, useRef, useState } from 'react';
import axios from '../../api/axios';
import { BellIcon, AlertCircleIcon, CheckCircleIcon, ClockIcon, Package2Icon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import NotificationDetailModal from './NotificationDetailModal';

interface Notification {
  notification_id: string;
  title: string;
  content?: string;
  type?: string;
  read_at?: string | null;
  sent_at?: string;
  status?: string;
}

const iconMap: Record<string, any> = {
  order: Package2Icon,
  alert: AlertCircleIcon,
  success: CheckCircleIcon,
  reminder: ClockIcon,
};

interface NotificationDropdownProps {
  notifications: Notification[];
  unreadCount: number;
  onClose?: () => void;
  onViewAll?: () => void;
}

const NotificationDropdown = ({ notifications, unreadCount, onClose, onViewAll }: NotificationDropdownProps) => {
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<Notification | null>(null);

  useEffect(() => {
    // Đóng dropdown khi click ra ngoài
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose && onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
    // eslint-disable-next-line
  }, []);

  const handleToggleRead = async (id: string, read: boolean) => {
    try {
      await axios.patch(`/notifications/${id}/mark-${read ? 'unread' : 'read'}`);
      window.dispatchEvent(new Event('notifications-updated'));
    } catch {
      setError('Không thể cập nhật trạng thái thông báo.');
    }
  };

  const handleOpenDetail = async (notification: Notification) => {
    try {
      if (!notification.read_at) {
        await axios.patch(`/notifications/${notification.notification_id}/mark-read`);
        window.dispatchEvent(new Event('notifications-updated'));
      }
    } catch {}
    setSelected(notification);
  };

  const handleCloseModal = () => {
    setSelected(null);
    window.dispatchEvent(new Event('notifications-updated'));
  };

  return (
    <div ref={dropdownRef} className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg z-50 border divide-y">
      <div className="flex items-center justify-between px-4 py-3">
        <span className="font-semibold text-lg flex items-center gap-2">
          <BellIcon className="h-5 w-5 text-orange-500" /> Thông báo
        </span>
        {unreadCount > 0 && (
          <span className="bg-orange-500 text-white text-xs rounded-full px-2 py-0.5">{unreadCount}</span>
        )}
      </div>
      <div className="max-h-96 overflow-y-auto">
        {error ? <div className="p-4 text-center text-red-500">{error}</div> :
          (!Array.isArray(notifications) || notifications.length === 0) ? <div className="p-4 text-center text-gray-500">Không có thông báo nào.</div> :
            notifications.map(notification => {
              const isRead = !!notification.read_at || notification.status === 'read';
              const Icon = iconMap[notification.type || 'order'] || Package2Icon;
              return (
                <div key={notification.notification_id} className={`flex gap-3 px-4 py-3 cursor-pointer hover:bg-orange-50 ${isRead ? '' : 'bg-orange-50'}`}
                  onClick={() => handleOpenDetail(notification)}>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center ${isRead ? 'bg-gray-100' : 'bg-orange-100'}`}>
                    <Icon className={`h-5 w-5 ${isRead ? 'text-gray-600' : 'text-orange-500'}`} />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm line-clamp-1">{notification.title}</div>
                    {notification.content && <div className="text-xs text-gray-600 mt-0.5 line-clamp-2">{notification.content}</div>}
                    <div className="text-xs text-gray-400 mt-0.5">{notification.sent_at ? new Date(notification.sent_at).toLocaleString() : ''}</div>
                  </div>
                  {!isRead && <span className="w-2 h-2 bg-orange-500 rounded-full mt-2"></span>}
                </div>
              );
            })}
      </div>
      <div className="px-4 py-2 text-center">
        <button className="text-orange-500 hover:underline" onClick={onViewAll}>Xem tất cả</button>
      </div>
      <NotificationDetailModal open={!!selected} notification={selected} onClose={handleCloseModal} />
    </div>
  );
};

export default NotificationDropdown; 