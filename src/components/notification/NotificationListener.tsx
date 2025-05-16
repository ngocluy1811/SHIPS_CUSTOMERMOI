/// <reference types="vite/client" />
import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Đảm bảo chỉ có 1 socket duy nhất cho toàn app, kể cả khi NotificationListener bị remount
const getGlobalSocket = (() => {
  let globalSocket: Socket | null = null;
  return (API_URL: string) => {
    if (!globalSocket) {
      globalSocket = io(API_URL, {
        withCredentials: true,
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        autoConnect: true,
        transports: ['websocket', 'polling']
      }) as Socket;
    }
    return globalSocket;
  };
})();

const NotificationListener = () => {
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    const getUserId = () => {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      return user?.user_id;
    };

    const registerSocket = (socket: Socket, user_id: string) => {
      if (user_id && socket) {
        console.log('[SOCKET][REGISTER] user_id:', user_id);
        socket.emit('register', user_id);
        userIdRef.current = user_id;
      }
    };

    // Sửa URL socket cho production
    const SOCKET_URL = 'https://ships-backendmoi-k6ob.onrender.com';
    let user_id = getUserId();
    const socket = getGlobalSocket(SOCKET_URL);

    // Đăng ký các sự kiện chỉ 1 lần duy nhất
    if (!(socket as any)._notificationListenerRegistered) {
      (socket as any)._notificationListenerRegistered = true;
      socket.on('connect', () => {
        user_id = getUserId();
        console.log('[SOCKET][CONNECT]', socket.id);
        if (user_id) {
          registerSocket(socket, user_id);
        }
      });
      socket.on('reconnect', () => {
        user_id = getUserId();
        console.log('[SOCKET][RECONNECT]', socket.id);
        if (user_id) {
          registerSocket(socket, user_id);
        }
      });
      socket.on('disconnect', (reason) => {
        console.log('[SOCKET][DISCONNECT]', reason);
      });
      socket.on('new-notification', (notification) => {
        console.log('[SOCKET][NOTIFICATION]', notification);
        try {
          const audio = new Audio('/notification.mp3');
          audio.play().catch(() => {});
        } catch {}
        if (window.navigator.vibrate) window.navigator.vibrate(300);
        toast.info(
          <div>
            <div className="font-bold">{notification.title}</div>
            <div>{notification.content}</div>
          </div>,
          {
            position: 'top-right',
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
          }
        );
        window.dispatchEvent(new Event('notifications-updated'));
      });
    }

    // Đảm bảo luôn đăng ký lại user_id nếu có thay đổi
    if (user_id && user_id !== userIdRef.current) {
      registerSocket(socket, user_id);
    }

    // Lắng nghe sự thay đổi user_id (login/logout hoặc chuyển user)
    const interval = setInterval(() => {
      const current = getUserId();
      if (current && current !== userIdRef.current) {
        registerSocket(socket, current);
      }
    }, 2000);

    return () => {
      clearInterval(interval);
      // Ngắt kết nối socket khi unmount (logout)
      if (socket && socket.connected) {
        socket.disconnect();
        console.log('[SOCKET][DISCONNECT] on unmount');
      }
    };
  }, []);

  // XÓA ToastContainer ở đây, chỉ trả về null
  return null;
};

export default NotificationListener; 