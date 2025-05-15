import React, { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen text-lg">Đang xác thực...</div>;
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  // Luôn trả về một React element hợp lệ
  return <>{children}</>;
};

export default ProtectedRoute;