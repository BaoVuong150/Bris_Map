import { create } from 'zustand';

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  sentAt: string;
}

interface ChatState {
  isChatOpen: boolean;
  activeChatUserId: string | null;
  activeChatUserName: string | null;
  messages: ChatMessage[];
  
  openChat: (userId: string, userName: string) => void;
  closeChat: () => void;
  setMessages: (messages: ChatMessage[]) => void;
  addMessage: (message: ChatMessage) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  isChatOpen: false,
  activeChatUserId: null,
  activeChatUserName: null,
  messages: [],

  openChat: (userId, userName) => set({ 
    isChatOpen: true, 
    activeChatUserId: userId, 
    activeChatUserName: userName 
  }),
  
  closeChat: () => set({ 
    isChatOpen: false, 
    activeChatUserId: null, 
    activeChatUserName: null,
    messages: [] 
  }),

  setMessages: (newMessages) => set({ messages: newMessages }),

  addMessage: (message) => set((state) => ({ 
    messages: [...state.messages, message] 
  }))
}));
