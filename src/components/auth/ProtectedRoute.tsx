import React, { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, loading, user } = useAuth();
  const [unauthorized, setUnauthorized] = React.useState(false);

  React.useEffect(() => {
    if (user && ['admin', 'staff', 'shipper'].includes(user.role)) {
      setUnauthorized(true);
    } else {
      setUnauthorized(false);
    }
  }, [user]);

  if (loading) return <div className="flex items-center justify-center min-h-screen text-lg">Đang xác thực...</div>;
  if (!isAuthenticated || unauthorized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="bg-white p-8 rounded shadow text-center">
          <div className="text-2xl font-bold mb-2 text-orange-500">Đăng nhập</div>
          {unauthorized ? (
            <>
              <div className="text-red-600 font-semibold mb-4">Bạn không có quyền đăng nhập, vui lòng đăng ký</div>
              <button
                className="mt-2 px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition"
                onClick={() => window.location.href = '/'}
              >
                Trở về trang chủ
              </button>
            </>
          ) : null}
          {/* Có thể render form login ở đây nếu muốn */}
        </div>
      </div>
    );
  }
  // Luôn trả về một React element hợp lệ
  return <>{children}</>;
};

export default ProtectedRoute;