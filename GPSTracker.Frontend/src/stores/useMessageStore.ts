import { create } from 'zustand';
import axiosClient from '../api/axiosClient';

interface MessageState {
  totalUnreadCount: number;
  setTotalUnreadCount: (count: number) => void;
  fetchTotalUnreadCount: () => Promise<void>;
  decreaseUnreadCount: (amount: number) => void;
}

export const useMessageStore = create<MessageState>((set, get) => ({
  totalUnreadCount: 0,
  
  setTotalUnreadCount: (count) => set({ totalUnreadCount: count }),
  
  fetchTotalUnreadCount: async () => {
    try {
      const response = await axiosClient.get('/messages/unread-count');
      set({ totalUnreadCount: response.data.totalUnreadCount });
    } catch (error) {
      console.error("Failed to fetch total unread count:", error);
    }
  },

  decreaseUnreadCount: (amount) => {
    const current = get().totalUnreadCount;
    set({ totalUnreadCount: Math.max(0, current - amount) });
  }
}));
