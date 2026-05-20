import React, { useEffect, useState, useRef } from 'react';
import { useChatStore } from '../../stores/useChatStore';
import { useAuthStore } from '../../stores/useAuthStore';
import axiosClient from '../../api/axiosClient';
import * as signalR from '@microsoft/signalr';

interface ChatWindowProps {
  hubConnection: signalR.HubConnection | null;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ hubConnection }) => {
  const { isChatOpen, activeChatUserId, activeChatUserName, messages, closeChat, setMessages, addMessage } = useChatStore();
  const user = useAuthStore(state => state.user);
  
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load chat history when opening chat
  useEffect(() => {
    if (isChatOpen && activeChatUserId) {
      const fetchHistory = async () => {
        try {
          const res = await axiosClient.get(`/messages/${activeChatUserId}`);
          setMessages(res.data);
        } catch (error) {
          console.error("Failed to load chat history", error);
        }
      };
      fetchHistory();
    }
  }, [isChatOpen, activeChatUserId, setMessages]);

  if (!isChatOpen || !activeChatUserId) return null;

  const handleSend = async () => {
    if (!inputValue.trim() || !hubConnection) return;

    try {
      // Đẩy qua SignalR thay vì REST API để nó realtime nhất có thể
      await hubConnection.invoke("SendMessage", activeChatUserId, inputValue);
      
      // Tự động add tin nhắn vào UI (Optimistic UI update)
      addMessage({
        id: Date.now().toString(), // fake ID tạm thời
        senderId: user?.id || '',
        receiverId: activeChatUserId,
        content: inputValue,
        sentAt: new Date().toISOString()
      });
      
      setInputValue('');
    } catch (err) {
      console.error("Lỗi gửi tin nhắn", err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed bottom-4 right-20 w-[340px] h-[450px] bg-[#242526] border border-[#393a3b] rounded-t-xl rounded-bl-xl shadow-2xl flex flex-col z-[2000] overflow-hidden animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#393a3b] bg-[#3a3b3c]/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
            {activeChatUserName?.charAt(0).toUpperCase()}
          </div>
          <span className="text-[#e4e6eb] font-semibold text-[15px]">{activeChatUserName}</span>
        </div>
        <button onClick={closeChat} className="text-[#b0b3b8] hover:text-[#e4e6eb] transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>

      {/* Messages Body */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-[#18191a]">
        {messages.map((msg, idx) => {
          const isMe = msg.senderId === user?.id;
          return (
            <div key={msg.id || idx} className={`flex flex-col max-w-[75%] ${isMe ? 'self-end items-end' : 'self-start items-start'}`}>
              <div className={`px-3 py-2 rounded-2xl ${isMe ? 'bg-[#0866ff] text-white rounded-tr-sm' : 'bg-[#3a3b3c] text-[#e4e6eb] rounded-tl-sm'}`}>
                <p className="text-[14px] leading-tight break-words">{msg.content}</p>
              </div>
              <span className="text-[10px] text-[#b0b3b8] mt-1 px-1">
                {new Date(msg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Footer */}
      <div className="p-3 bg-[#242526] border-t border-[#393a3b] flex gap-2 items-end">
        <textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Nhắn tin..."
          className="flex-1 bg-[#3a3b3c] text-[#e4e6eb] rounded-2xl px-3 py-2 text-[14px] outline-none resize-none max-h-[80px] min-h-[40px] placeholder-[#b0b3b8]"
          rows={1}
        />
        <button 
          onClick={handleSend}
          disabled={!inputValue.trim()}
          className="w-10 h-10 rounded-full flex items-center justify-center bg-transparent hover:bg-[#3a3b3c] transition-colors disabled:opacity-50"
        >
          <svg className="w-5 h-5 text-[#0866ff]" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path></svg>
        </button>
      </div>
    </div>
  );
};

export default ChatWindow;
