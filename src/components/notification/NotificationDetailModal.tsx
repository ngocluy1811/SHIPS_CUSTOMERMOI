import React from 'react';
import { Dialog } from '@headlessui/react';

interface NotificationDetailModalProps {
  open: boolean;
  notification: {
    title: string;
    content?: string;
    sent_at?: string;
  } | null;
  onClose: () => void;
}

const NotificationDetailModal = ({ open, notification, onClose }: NotificationDetailModalProps) => (
  <Dialog open={open} onClose={onClose} className="fixed z-50 inset-0 overflow-y-auto">
    <div className="flex items-center justify-center min-h-screen px-4">
      <div className="fixed inset-0 bg-black opacity-30" aria-hidden="true" />
      <div className="relative bg-white rounded-lg max-w-lg w-full mx-auto p-6 z-10">
        <Dialog.Title className="text-lg font-bold mb-2">{notification?.title}</Dialog.Title>
        <div className="text-gray-700 mb-4">{notification?.content}</div>
        <div className="text-sm text-gray-500 mb-4">{notification?.sent_at ? new Date(notification.sent_at).toLocaleString() : ''}</div>
        <button onClick={onClose} className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600">Đóng</button>
      </div>
    </div>
  </Dialog>
);

export default NotificationDetailModal; 