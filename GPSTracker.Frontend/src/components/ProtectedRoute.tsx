import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const accessToken = useAuthStore(state => state.accessToken);

  // Nếu không có Token trên RAM -> Tức là chưa đăng nhập hoặc Token đã chết
  // Đá văng ra màn hình Login ngay lập tức!
  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  // Có Token -> Cho phép truy cập (Render ra giao diện bên trong)
  return <>{children}</>;
};

export default ProtectedRoute;
