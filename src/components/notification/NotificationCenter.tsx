import React, { useEffect, useState } from 'react';
import axios from '../../api/axios';
import { BellIcon, AlertCircleIcon, CheckCircleIcon, ClockIcon, Package2Icon } from 'lucide-react';
import { Dialog } from '@headlessui/react';
import NotificationDetailModal from './NotificationDetailModal';
import { useNotifications } from './NotificationContext';

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

const NotificationCenter = () => {
  const { notifications } = useNotifications();
  const [selected, setSelected] = useState<Notification | null>(null);
  const [showBadge, setShowBadge] = useState(false);

  // Lấy user từ localStorage
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleMarkAllAsRead = async () => {
    try {
      await axios.patch('/notifications/mark-all-read');
      setShowBadge(false);
      window.dispatchEvent(new Event('notifications-updated'));
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const handleOpenDetail = async (notification: Notification) => {
    try {
      if (!notification.read_at && notification.status !== 'read') {
        await axios.patch<{ message: string }>(`/notifications/${notification.notification_id}/mark-read`);
        window.dispatchEvent(new Event('notifications-updated'));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
    setSelected(notification);
  };

  // Khi đóng modal, refetch lại danh sách để đồng bộ với chuông
  const handleCloseModal = () => {
    setSelected(null);
    window.dispatchEvent(new Event('notifications-updated'));
  };

  return <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <div className="relative">
            <BellIcon className="h-6 w-6 text-orange-500" />
            {showBadge && <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full"></span>}
          </div>
          Thông báo
        </h1>
        <button onClick={handleMarkAllAsRead} className="text-orange-500 text-sm hover:text-orange-600">
          Đánh dấu tất cả đã đọc
        </button>
      </div>
      <div className="bg-white rounded-lg shadow-sm divide-y">
        {notifications.length === 0 && <div className="p-6 text-center text-gray-500">Không có thông báo nào.</div>}
        {notifications.map(notification => {
          const isRead = !!notification.read_at || notification.status === 'read';
          const Icon = iconMap[notification.type || 'order'] || Package2Icon;
          return (
            <div key={notification.notification_id} className={`p-4 flex gap-4 ${isRead ? 'bg-white' : 'bg-orange-50'} cursor-pointer hover:bg-gray-50`} onClick={() => setSelected(notification)}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isRead ? 'bg-gray-100' : 'bg-orange-100'}`}>
                <Icon className={`h-5 w-5 ${isRead ? 'text-gray-600' : 'text-orange-500'}`} />
              </div>
              <div className="flex-1">
                <div className="font-medium">{notification.title}</div>
                {notification.content && <div className="text-sm text-gray-600 mt-1">{notification.content}</div>}
                <div className="text-sm text-gray-500 mt-1">{notification.sent_at ? new Date(notification.sent_at).toLocaleString() : ''}</div>
              </div>
            </div>
          );
        })}
      </div>
      <NotificationDetailModal open={!!selected} notification={selected} onClose={handleCloseModal} />
    </div>;
};

export default NotificationCenter;