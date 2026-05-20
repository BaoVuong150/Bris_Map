import React, { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useLocationStore } from '../../stores/useLocationStore';
import { useChatStore } from '../../stores/useChatStore';
import { useFriendshipStore } from '../../stores/useFriendshipStore';
import FriendsSidebar from '../friendships/FriendsSidebar';
import BlockedUsersModal from '../friendships/BlockedUsersModal';

const TopNavbar: React.FC = () => {
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);
  const connectionStatus = useLocationStore(state => state.connectionStatus);
  const unreadMessagesCount = useChatStore(state => state.messages.filter(m => !m.isRead).length);
  const pendingRequestsCount = useFriendshipStore(state => state.pendingRequestsCount);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isFriendsSidebarOpen, setIsFriendsSidebarOpen] = useState(false);
  const [isBlockedModalOpen, setIsBlockedModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
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
          {/* Inactive Tab (Chat Messages) */}
          <div 
            onClick={() => alert("Chọn một người bạn từ danh sách để bắt đầu Chat!")}
            className="w-[110px] h-12 flex items-center justify-center rounded-lg hover:bg-[#3a3b3c] cursor-pointer transition-colors relative" 
            title="Messages"
          >
            <svg className="w-7 h-7 text-[#b0b3b8]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
            {unreadMessagesCount > 0 && (
              <div className="absolute top-2 right-8 w-4 h-4 bg-[#e41e3f] rounded-full border border-[#242526] flex items-center justify-center text-white text-[10px] font-bold">
                {unreadMessagesCount}
              </div> 
            )}
          </div>
        </div>

        {/* Right: Actions & Profile */}
        <div className="flex items-center justify-end gap-3 w-1/4 pr-1">
          <div className="relative ml-1" ref={menuRef}>
            {/* Nút Avatar */}
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
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
                  {/* Dòng 2: Cài đặt */}
                  <div className="flex items-center gap-3 p-2 hover:bg-[#3a3b3c] cursor-pointer rounded-lg transition-colors">
                    <div className="w-9 h-9 rounded-full bg-[#3a3b3c] flex items-center justify-center">
                      <svg className="w-5 h-5 text-[#e4e6eb]" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"></path></svg>
                    </div>
                    <span className="text-[#e4e6eb] font-medium text-[15px]">Settings & privacy</span>
                    <svg className="w-5 h-5 text-[#b0b3b8] ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
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
