import { create } from 'zustand';
import axios from 'axios';
import axiosClient from '../api/axiosClient';

// Helper tập trung xử lý Token Header (Tránh viết lặp code)
const applyToken = (token: string | null) => {
  if (token) {
    axiosClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete axiosClient.defaults.headers.common['Authorization'];
  }
};

let isSilentAuthRunning = false; // Ngăn chặn Race Condition khi StrictMode render 2 lần

interface User {
  id: string;
  userName: string;
  email: string;
  displayName: string;
}

interface AuthState {
  accessToken: string | null;
  user: User | null;
  isInitializing: boolean;
  
  setAuth: (token: string, userData: User) => void;
  setAccessToken: (token: string | null) => void;
  logout: () => Promise<void>;
  silentAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  isInitializing: true,

  setAuth: (token, userData) => {
    set({ accessToken: token, user: userData });
    applyToken(token);
  },

  setAccessToken: (token) => {
    set({ accessToken: token });
    applyToken(token);
  },

  silentAuth: async () => {
    if (isSilentAuthRunning) return;
    isSilentAuthRunning = true;

    try {
      const res = await axiosClient.post('/auth/refresh-token');
      set({
        accessToken: res.data.token,
        user: {
          id: res.data.id,
          userName: res.data.username,
          email: res.data.email,
          displayName: res.data.displayName
        },
        isInitializing: false
      });
      applyToken(res.data.token);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        // Hết session -> Xóa sạch sẽ
        set({ isInitializing: false, accessToken: null, user: null });
        applyToken(null);
      } else {
        // Lỗi mạng hoặc Server sập -> Cứ nhả Loading ra để xài App, không bắt login
        console.error("Silent Auth failed (Network/Server):", error);
        set({ isInitializing: false });
      }
    } finally {
      isSilentAuthRunning = false;
    }
  },

  logout: async () => {
    try {
      await axiosClient.post('/auth/logout');
    } catch (error) {
      console.error("Lỗi khi đăng xuất trên server", error);
    } finally {
      set({ accessToken: null, user: null });
      applyToken(null);
      window.location.href = '/login'; // Chuyển trang cứng (Hợp lý nhất cho Interceptor)
    }
  }
}));
