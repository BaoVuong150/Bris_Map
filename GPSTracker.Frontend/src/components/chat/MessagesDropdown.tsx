import React, { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';
import { useChatStore } from '../../stores/useChatStore';

interface ConversationDto {
  partnerId: string;
  partnerName: string;
  lastMessage: string | null;
  lastMessageTime: string;
  unreadCount: number;
}

interface MessagesDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const MessagesDropdown: React.FC<MessagesDropdownProps> = ({ isOpen, onClose }) => {
  const [conversations, setConversations] = useState<ConversationDto[]>([]);
  const [loading, setLoading] = useState(false);
  const openChat = useChatStore(state => state.openChat);

  useEffect(() => {
    if (isOpen) {
      fetchConversations();
    }
  }, [isOpen]);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const response = await axiosClient.get('/messages/conversations');
      setConversations(response.data);
    } catch (error) {
      console.error("Failed to fetch conversations", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute right-0 mt-2 w-[360px] bg-[#242526] border border-[#393a3b] rounded-xl shadow-2xl py-2 z-[1001] max-h-[500px] flex flex-col">
      <div className="px-4 py-3 flex items-center justify-between">
        <h2 className="text-[#e4e6eb] font-bold text-xl">Chats</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-2">
        {loading ? (
          <div className="flex justify-center p-4">
            <div className="w-6 h-6 border-2 border-[#0866ff] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center text-[#b0b3b8] p-4 text-[15px]">Chưa có đoạn chat nào.</div>
        ) : (
          conversations.map(conv => (
            <div 
              key={conv.partnerId} 
              onClick={() => {
                openChat(conv.partnerId, conv.partnerName);
                onClose();
              }}
              className="flex items-center gap-3 p-2 hover:bg-[#3a3b3c] cursor-pointer rounded-xl transition-colors"
            >
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-xl flex-shrink-0 relative">
                {conv.partnerName.charAt(0).toUpperCase()}
                {/* Unread Badge (Thay cho Status Online Dot) */}
                {conv.unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-red-500 rounded-full border-2 border-[#242526] flex items-center justify-center text-white text-[11px] font-bold px-1">
                    {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                  </div>
                )}
              </div>
              <div className="flex flex-col flex-1 overflow-hidden">
                <div className="flex justify-between items-center">
                  <span className={`font-semibold text-[15px] truncate ${conv.unreadCount > 0 ? 'text-white' : 'text-[#e4e6eb]'}`}>
                    {conv.partnerName}
                  </span>
                  <span className={`text-[12px] whitespace-nowrap ml-2 ${conv.unreadCount > 0 ? 'text-[#0866ff] font-semibold' : 'text-[#b0b3b8]'}`}>
                    {formatTime(conv.lastMessageTime)}
                  </span>
                </div>
                <span className={`text-[13px] truncate ${conv.unreadCount > 0 ? 'text-white font-semibold' : 'text-[#b0b3b8]'}`}>
                  {conv.lastMessage || "Hình ảnh/Tệp đính kèm"}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MessagesDropdown;
