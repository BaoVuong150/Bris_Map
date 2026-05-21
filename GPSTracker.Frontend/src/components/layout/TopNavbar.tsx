import React, { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useLocationStore } from '../../stores/useLocationStore';
import { useChatStore } from '../../stores/useChatStore';
import { useFriendshipStore } from '../../stores/useFriendshipStore';
import FriendsSidebar from '../friendships/FriendsSidebar';
import BlockedUsersModal from '../friendships/BlockedUsersModal';
import MessagesDropdown from '../chat/MessagesDropdown';
import { useMessageStore } from '../../stores/useMessageStore';

const TopNavbar: React.FC = () => {
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);
  const connectionStatus = useLocationStore(state => state.connectionStatus);
  const isSharingLocation = useLocationStore(state => state.isSharingLocation);
  const toggleSharing = useLocationStore(state => state.toggleSharing);
  const pendingRequestsCount = useFriendshipStore(state => state.pendingRequestsCount);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isFriendsSidebarOpen, setIsFriendsSidebarOpen] = useState(false);
  const [isBlockedModalOpen, setIsBlockedModalOpen] = useState(false);
  const [showMessageMenu, setShowMessageMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const fetchTotalUnreadCount = useMessageStore(state => state.fetchTotalUnreadCount);
  const totalUnreadCount = useMessageStore(state => state.totalUnreadCount);

  useEffect(() => {
    fetchTotalUnreadCount();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
        setShowMessageMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    await logout();
  };

  return (
    <>
      <header className="absolute top-0 left-0 right-0 z-[1000] w-full h-[56px] bg-[#242526] border-b border-[#393a3b] px-4 flex items-center justify-between shadow-sm">

        {/* Left: Logo & Status */}
        <div className="flex items-center gap-4 w-1/4">
          <div className="flex items-center gap-2 cursor-pointer group">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0866ff] to-[#00c6ff] flex items-center justify-center text-white font-bold text-xl shadow-lg group-hover:scale-105 transition-transform">
              B
            </div>
            <span className="text-[#e4e6eb] font-bold text-[19px] hidden sm:block tracking-wide group-hover:text-white transition-colors">Bris Map</span>
          </div>

          {/* Tín hiệu kết nối */}
          <div className="hidden lg:flex bg-[#3a3b3c]/50 px-3 py-1.5 rounded-full border border-[#393a3b] items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]' : connectionStatus === 'reconnecting' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'}`}></div>
            <span className="text-[#e4e6eb] text-xs font-medium tracking-wide">
              {connectionStatus === 'connected' ? 'Connected' : connectionStatus === 'reconnecting' ? 'Reconnecting...' : 'Offline'}
            </span>
          </div>
        </div>

        {/* Center: Navigation Tabs */}
        <div className="hidden md:flex items-center justify-center h-full flex-1 gap-2">
          {/* Active Tab (Map/Home) */}
          <div className="w-[110px] h-full flex items-center justify-center border-b-[3px] border-[#0866ff] cursor-pointer pt-[3px]">
            <svg className="w-7 h-7 text-[#0866ff]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3l10 9h-3v8h-4v-6H9v6H5v-8H2l10-9z"></path></svg>
          </div>
          {/* Inactive Tab (Friends) */}
          <div
            onClick={() => setIsFriendsSidebarOpen(!isFriendsSidebarOpen)}
            className={`w-[110px] h-12 flex items-center justify-center rounded-lg cursor-pointer transition-colors relative ${isFriendsSidebarOpen ? 'bg-[#3a3b3c] border-b-[3px] border-[#0866ff]' : 'hover:bg-[#3a3b3c]'}`}
          >
            <svg className={`w-7 h-7 ${isFriendsSidebarOpen ? 'text-[#0866ff]' : 'text-[#b0b3b8]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
            {pendingRequestsCount > 0 && (
              <div className="absolute top-1 right-7 w-[18px] h-[18px] bg-[#e41e3f] rounded-full border border-[#242526] flex items-center justify-center text-white text-[10px] font-bold">
                {pendingRequestsCount > 9 ? '9+' : pendingRequestsCount}
              </div>
            )}
          </div>
        </div>

        {/* Right: Actions & Profile */}
        <div className="flex items-center justify-end gap-3 w-1/4 pr-1" ref={menuRef}>
          
          {/* Vùng chứa Nút Message và Dropdown */}
          <div className="relative">
            {/* Nút Message (Messenger) */}
            <button 
              onClick={() => {
                setShowMessageMenu(!showMessageMenu);
                setShowProfileMenu(false);
              }}
              className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-colors focus:outline-none ${showMessageMenu ? 'bg-[#0866ff]/20 text-[#0866ff]' : 'bg-[#3a3b3c] hover:bg-[#4e4f50] text-[#e4e6eb]'}`}
              title="Messages"
            >
              <svg className={`w-5 h-5 ${showMessageMenu ? 'text-[#0866ff]' : 'text-[#e4e6eb]'}`} fill="currentColor" viewBox="0 0 24 24"><path d="M12 3c5.523 0 10 4.22 10 9.428 0 2.827-1.328 5.37-3.418 7.078-.344.281-.555.704-.555 1.149V22a.998.998 0 01-1.488.871l-3.08-1.732a1.442 1.442 0 00-.733-.205c-.244 0-.486.023-.726.068A10.428 10.428 0 0112 21.856C6.477 21.856 2 17.636 2 12.428 2 7.22 6.477 3 12 3z"></path></svg>
              {totalUnreadCount > 0 && (
                <div className="absolute -top-1 -right-1 w-[18px] h-[18px] bg-[#e41e3f] rounded-full border border-[#242526] flex items-center justify-center text-white text-[10px] font-bold">
                  {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
                </div> 
              )}
            </button>

            {/* Hộp thoại Dropdown Messages */}
            <MessagesDropdown isOpen={showMessageMenu} onClose={() => setShowMessageMenu(false)} />
          </div>

          <div className="relative ml-1">
            {/* Nút Avatar */}
            <button
              onClick={() => {
                setShowProfileMenu(!showProfileMenu);
                setShowMessageMenu(false);
              }}
              className="relative cursor-pointer group focus:outline-none"
              title="Account"
            >
              <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold border-2 transition-colors ${showProfileMenu ? 'border-[#0866ff]' : 'border-transparent hover:border-[#3a3b3c]'}`}>
                {user?.displayName?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-[#3a3b3c] rounded-full border-2 border-[#242526] flex items-center justify-center">
                <svg className="w-2 h-2 text-[#e4e6eb]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="4"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </button>

            {/* Menu xổ xuống kiểu Facebook */}
            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-[360px] bg-[#242526] border border-[#393a3b] rounded-xl shadow-2xl py-3 z-[1001]">
                {/* Dòng 1: Tài khoản cá nhân */}
                <div className="px-4 py-2 border-b border-[#393a3b] mx-2 mb-2">
                  <div className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors shadow-sm bg-[#3a3b3c]/50 border border-[#393a3b] hover:bg-[#3a3b3c]">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-lg">
                      {user?.displayName?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="text-[#e4e6eb] font-semibold text-[17px]">{user?.displayName || 'Unknown User'}</span>
                      <span className="text-[#0866ff] text-xs font-medium">Edit your profile</span>
                    </div>
                  </div>
                </div>

                <div className="px-2 text-left">
                  {/* Dòng 2: Chế độ Ẩn danh (Ghost Mode) */}
                  <div
                    onClick={() => {
                      toggleSharing();
                      // Không đóng menu để user có thể bấm nhiều lần nếu thích
                    }}
                    className="flex items-center gap-3 p-2 hover:bg-[#3a3b3c] cursor-pointer rounded-lg transition-colors"
                  >
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${isSharingLocation ? 'bg-blue-600' : 'bg-gray-600'}`}>
                      {isSharingLocation ? (
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                      ) : (
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"></path></svg>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[#e4e6eb] font-medium text-[15px]">Ghost Mode</span>
                      <span className="text-[#b0b3b8] text-[12px]">{isSharingLocation ? 'Đang chia sẻ vị trí' : 'Đang ẩn danh'}</span>
                    </div>
                    {/* Toggle Switch UI */}
                    <div className={`ml-auto relative w-11 h-6 rounded-full transition-colors ${isSharingLocation ? 'bg-blue-600' : 'bg-[#3a3b3c]'}`}>
                      <div className={`absolute top-[2px] left-[2px] w-5 h-5 bg-white rounded-full transition-transform ${isSharingLocation ? 'translate-x-5' : ''}`}></div>
                    </div>
                  </div>

                  {/* Dòng 2.5: Blocked Users */}
                  <div
                    onClick={() => {
                      setShowProfileMenu(false);
                      setIsBlockedModalOpen(true);
                    }}
                    className="flex items-center gap-3 p-2 hover:bg-[#3a3b3c] cursor-pointer rounded-lg transition-colors mt-1"
                  >
                    <div className="w-9 h-9 rounded-full bg-[#3a3b3c] flex items-center justify-center">
                      <svg className="w-5 h-5 text-[#e4e6eb]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path></svg>
                    </div>
                    <span className="text-[#e4e6eb] font-medium text-[15px]">Blocked Users</span>
                  </div>

                  {/* Dòng 3: Đăng xuất */}
                  <div onClick={handleLogout} className="flex items-center gap-3 p-2 hover:bg-[#3a3b3c] cursor-pointer rounded-lg transition-colors mt-1">
                    <div className="w-9 h-9 rounded-full bg-[#3a3b3c] flex items-center justify-center">
                      <svg className="w-5 h-5 text-[#e4e6eb]" fill="currentColor" viewBox="0 0 24 24"><path d="M16 17v-3H9v-4h7V7l5 5-5 5M14 2a2 2 0 012 2v2h-2V4H5v16h9v-2h2v2a2 2 0 01-2 2H5a2 2 0 01-2-2V4a2 2 0 012-2h9z"></path></svg>
                    </div>
                    <span className="text-[#e4e6eb] font-medium text-[15px]">Log Out</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      </header>
      <FriendsSidebar isOpen={isFriendsSidebarOpen} onClose={() => setIsFriendsSidebarOpen(false)} />
      <BlockedUsersModal isOpen={isBlockedModalOpen} onClose={() => setIsBlockedModalOpen(false)} />
    </>
  );
};

export default TopNavbar;
