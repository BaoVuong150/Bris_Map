import React, { useState, useEffect } from 'react';
import { friendshipApi } from '../../api/friendshipApi';
import type { FriendshipDto, UserDto } from '../../api/friendshipApi';
import { useChatStore } from '../../stores/useChatStore';
import { useFriendshipStore } from '../../stores/useFriendshipStore';
import FriendListTab from './tabs/FriendListTab';
import FriendRequestsTab from './tabs/FriendRequestsTab';
import FriendSearchTab from './tabs/FriendSearchTab';
interface FriendsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const FriendsSidebar: React.FC<FriendsSidebarProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'search'>('friends');
  const openChat = useChatStore(state => state.openChat);
  const setPendingRequestsCount = useFriendshipStore(state => state.setPendingRequestsCount);
  const lastUpdateTimestamp = useFriendshipStore(state => state.lastUpdateTimestamp);
  
  const [friends, setFriends] = useState<FriendshipDto[]>([]);
  const [requests, setRequests] = useState<FriendshipDto[]>([]);
  const [searchResults, setSearchResults] = useState<UserDto[]>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, lastUpdateTimestamp]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [fData, rData] = await Promise.all([
        friendshipApi.getFriends(),
        friendshipApi.getPendingRequests()
      ]);
      setFriends(fData);
      setRequests(rData);
      setPendingRequestsCount(rData.length); // Cập nhật lại số đếm lên thanh TopNavbar
      
      // Nếu đang mở tab search thì fetch lại search result để đồng bộ trạng thái thật
      if (activeTab === 'search' && searchQuery.trim()) {
        const results = await friendshipApi.searchUsers(searchQuery.trim());
        setSearchResults(results);
      }
    } catch (error) {
      console.error("Failed to fetch friendships", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const query = searchQuery.trim();
    
    // Nếu xóa trắng ô search, dọn kết quả và quay về tab Friends
    if (!query) {
      setSearchResults([]);
      if (activeTab === 'search') {
        setActiveTab('friends');
      }
      return;
    }

    const abortController = new AbortController();

    // Debounce: Chờ 400ms sau khi ngừng gõ mới gọi API
    const delayDebounceFn = setTimeout(async () => {
      try {
        setLoading(true);
        const results = await friendshipApi.searchUsers(query, abortController.signal);
        setSearchResults(results);
        setActiveTab('search');
      } catch (error: any) {
        if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
          return; // Request bị hủy bởi AbortController, im lặng bỏ qua
        }
        console.error("Search failed", error);
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      }
    }, 400);

    return () => {
      clearTimeout(delayDebounceFn);
      abortController.abort(); // Sát thủ: Hủy Request nếu Component re-render
    };
  }, [searchQuery]);

  const handleSendRequest = async (userId: string) => {
    try {
      await friendshipApi.sendRequest(userId);
      setSearchResults(prev => prev.map(u => u.id === userId ? { ...u, friendshipStatus: 0, isRequester: true } : u));
    } catch (error: any) {
      alert(error.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  const handleCancelRequest = async (userId: string) => {
    try {
      await friendshipApi.cancelRequest(userId);
      // Re-trigger search locally to reflect the updated status if it was from search results
      setSearchResults(prev => prev.map(u => u.id === userId ? { ...u, friendshipStatus: undefined, isRequester: undefined } : u));
    } catch (error: any) {
      alert(error.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  const handleAcceptRequest = async (userId: string) => {
    try {
      await friendshipApi.acceptRequest(userId);
      await fetchData(); // Refresh lists
    } catch (error: any) {
      alert(error.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  const handleRejectRequest = async (userId: string) => {
    try {
      await friendshipApi.rejectRequest(userId);
      await fetchData(); // Refresh lists
    } catch (error: any) {
      alert(error.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  const handleRemoveFriend = async (userId: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn hủy kết bạn?")) return;
    try {
      await friendshipApi.removeFriend(userId);
      await fetchData(); // Refresh lists
      
      // Xóa trạng thái cũ trong kết quả tìm kiếm để tránh bị dính cache (ví dụ: quay lại thành Sent)
      setSearchResults(prev => prev.map(u => u.id === userId ? { ...u, friendshipStatus: undefined, isRequester: undefined } : u));
    } catch (error: any) {
      alert(error.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  const handleBlockUser = async (userId: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn CHẶN người này? Họ sẽ không thể gửi tin nhắn hay kết bạn với bạn nữa.")) return;
    try {
      await friendshipApi.blockUser(userId);
      await fetchData(); // Refresh lists
      setSearchResults(prev => prev.map(u => u.id === userId ? { ...u, friendshipStatus: 3, isRequester: true } : u));
    } catch (error: any) {
      alert(error.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  return (
    <div className={`fixed top-[56px] left-0 h-[calc(100vh-56px)] w-[360px] bg-[#242526] border-r border-[#393a3b] transform transition-transform duration-300 z-[900] flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="p-4 border-b border-[#393a3b] relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-[#3a3b3c] hover:bg-[#4e4f50] transition-colors text-[#b0b3b8]"
          title="Đóng"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
        <h2 className="text-2xl font-bold text-[#e4e6eb] mb-4">Friends</h2>
        
        {/* Search Input */}
        <form onSubmit={(e) => e.preventDefault()} className="flex items-center bg-[#3a3b3c] rounded-full px-3 py-2 w-full h-10 mb-4">
          <svg className="w-4 h-4 text-[#b0b3b8]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users..." 
            className="bg-transparent border-none text-[#e4e6eb] text-[15px] focus:outline-none ml-2 w-full placeholder-[#b0b3b8]" 
          />
          <button type="submit" className="hidden"></button>
        </form>

        {/* Tabs */}
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveTab('friends')}
            className={`flex-1 py-1.5 rounded-full font-semibold text-[15px] transition-colors ${activeTab === 'friends' ? 'bg-[#0866ff]/20 text-[#0866ff]' : 'text-[#b0b3b8] hover:bg-[#3a3b3c]'}`}
          >
            All Friends
          </button>
          <button 
            onClick={() => setActiveTab('requests')}
            className={`flex-1 py-1.5 rounded-full font-semibold text-[15px] transition-colors relative ${activeTab === 'requests' ? 'bg-[#0866ff]/20 text-[#0866ff]' : 'text-[#b0b3b8] hover:bg-[#3a3b3c]'}`}
          >
            Requests
            {requests.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#e41e3f] text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center border-2 border-[#242526]">
                {requests.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
        {loading ? (
          <div className="flex justify-center p-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0866ff]"></div>
          </div>
        ) : (
          <>
            {activeTab === 'friends' && (
              <FriendListTab 
                friends={friends} 
                onRemoveFriend={handleRemoveFriend} 
                onBlockUser={handleBlockUser} 
                onClose={onClose} 
              />
            )}

            {activeTab === 'requests' && (
              <FriendRequestsTab 
                requests={requests} 
                onAcceptRequest={handleAcceptRequest} 
                onRejectRequest={handleRejectRequest} 
              />
            )}

            {activeTab === 'search' && (
              <FriendSearchTab 
                searchResults={searchResults} 
                friends={friends} 
                requests={requests} 
                onCancelRequest={handleCancelRequest} 
                onAcceptRequest={handleAcceptRequest} 
                onSendRequest={handleSendRequest} 
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default FriendsSidebar;
