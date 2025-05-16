import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Modal from 'react-modal';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import NewOrder from './components/orders/NewOrder';
import OrderList from './components/orders/OrderList';
import OrderHistory from './components/orders/OrderHistory';
import OrderTracking from './components/orders/OrderTracking';
import OrderDetail from './components/orders/OrderDetail';
import OrderEdit from './components/orders/OrderEdit';
import AddressManagement from './components/address/AddressManagement';
import Support from './components/support/Support';
import CouponManagement from './components/coupon/CouponManagement';
import NotificationCenter from './components/notification/NotificationCenter';
import NotificationListener from './components/notification/NotificationListener';
import OrderRealtimeListener from './components/notification/OrderRealtimeListener';
import { AuthProvider } from './components/auth/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Home from './pages/Home';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import VerifyOtp from './pages/auth/VerifyOtp';
import Profile from './pages/account/Profile';
import ChangePassword from './pages/account/ChangePassword';
import PaymentSuccess from './pages/PaymentSuccess';
import ForgotPassword from './pages/auth/ForgotPassword';
import axios from './api/axios';


// Tạo một component wrapper để giữ socket connection
const SocketWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      <NotificationListener />
      {children}
    </>
  );
};

export function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!JSON.parse(localStorage.getItem('user') || '{}')?.user_id);
  const [lockedMsg, setLockedMsg] = useState<string | null>(null);

  useEffect(() => {
    const handler = () => {
      setIsAuthenticated(!!JSON.parse(localStorage.getItem('user') || '{}')?.user_id);
    };
    window.addEventListener('storage', handler);
    window.addEventListener('auth-changed', handler);
    return () => {
      window.removeEventListener('storage', handler);
      window.removeEventListener('auth-changed', handler);
    };
  }, []);

  // Polling kiểm tra khoá tài khoản
  useEffect(() => {
    const interval = setInterval(async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        await axios.get('/users/me');
      } catch (e: any) {
        if (
          e?.response?.status === 403 &&
          e?.response?.data?.error?.includes('bị khóa')
        ) {
          setLockedMsg(e.response.data.error);
          toast.error(e.response.data.error); // Hiện toast ngay khi bị khoá
        }
      }
    }, 1000); // 1 giây kiểm tra 1 lần
    return () => clearInterval(interval);
  }, []);

  // Interceptor cho mọi API (nếu chưa có)
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      response => response,
      error => {
        if (
          error.response &&
          error.response.status === 403 &&
          error.response.data?.error?.includes('bị khóa')
        ) {
          setLockedMsg(error.response.data.error);
        }
        return Promise.reject(error);
      }
    );
    return () => axios.interceptors.response.eject(interceptor);
  }, []);

  // Thêm đoạn này để lắng nghe message từ popup thanh toán
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.status === 'success') {
        toast.success(event.data.message || 'Tạo đơn hàng và thanh toán thành công!');
        setTimeout(() => {
          if (window.location.pathname === '/dashboard') {
            window.location.reload();
          } else {
            window.location.href = '/dashboard';
          }
        }, 1500);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
      <Modal
        isOpen={!!lockedMsg}
        ariaHideApp={false}
        style={{ content: { maxWidth: 400, margin: 'auto', textAlign: 'center' } }}
      >
        <h2>Tài khoản bị khóa</h2>
        <p>{lockedMsg}</p>
        <button
          onClick={() => {
            localStorage.removeItem('token');
            setLockedMsg(null);
            window.location.href = '/login';
          }}
          style={{ marginTop: 20, padding: '8px 24px', background: '#DF8B17', color: '#fff', border: 'none', borderRadius: 4 }}
        >
          OK
        </button>
      </Modal>
      <BrowserRouter>
        {isAuthenticated && <NotificationListener />}
        {isAuthenticated && <OrderRealtimeListener />}
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify-otp" element={<VerifyOtp />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/payment-success" element={<PaymentSuccess />} />
            {/* Protected routes */}
            <Route path="/*" element={
              <ProtectedRoute>
                <Layout>
                  <Routes>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/orders/new" element={<NewOrder />} />
                    <Route path="/orders" element={<OrderList />} />
                    <Route path="/orders/history" element={<OrderHistory />} />
                    <Route path="/orders/tracking" element={<OrderTracking />} />
                    <Route path="/orders/:id" element={<OrderDetail />} />
                    <Route path="/orders/edit/:order_id" element={<OrderEdit />} />
                    <Route path="/address" element={<AddressManagement />} />
                    <Route path="/support" element={<Support />} />
                    <Route path="/coupons" element={<CouponManagement />} />
                    <Route path="/notifications" element={<NotificationCenter />} />                    <Route path="/profile" element={<Profile />} />
                    <Route path="/change-password" element={<ChangePassword />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            } />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </>
  );
}

export default App;