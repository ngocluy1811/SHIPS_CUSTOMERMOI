import React, { useEffect, useState, createContext, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../../api/axios';

interface AuthContextType {
  isAuthenticated: boolean;
  user: any | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}
const AuthContext = createContext<AuthContextType | null>(null);
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
export const AuthProvider = ({
  children
}: {
  children: React.ReactNode;
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Kiểm tra token và lấy user khi load lại trang
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      Promise.resolve(axios.get('/users/me'))
        .then(res => {
          setUser(res.data);
      setIsAuthenticated(true);
        })
        .catch(() => {
          setUser(null);
          setIsAuthenticated(false);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const res = await axios.post('/users/login', { email, password });
    const data = res.data as any;
    const { token, user } = data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);
    setIsAuthenticated(true);
    navigate('/dashboard');
    // Reload lần 1 thật nhanh
    setTimeout(() => {
      window.location.reload();
      // Reload lần 2 thật nhanh
      setTimeout(() => {
        window.location.reload();
        // Click vào logo 3 lần liên tiếp thật nhanh sau reload lần 2
        setTimeout(() => {
          const logo = document.getElementById('logo-shipvn');
          if (logo) {
            (logo as HTMLElement).click();
            setTimeout(() => {
              (logo as HTMLElement).click();
              setTimeout(() => {
                (logo as HTMLElement).click();
              }, 50); // click lần 3 sau lần 2 chỉ 50ms
            }, 50); // click lần 2 sau lần 1 chỉ 50ms
          }
        }, 100);
      }, 100); // reload lần 2 sau lần 1 chỉ 100ms
    }, 100); // reload lần 1 sau navigate chỉ 100ms
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
    navigate('/login');
    window.location.reload();
  };

  return <AuthContext.Provider value={{
    isAuthenticated,
    user,
    login,
    logout,
    loading
  }}>
      {children}
    </AuthContext.Provider>;
};