import React, { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';

interface BlockedUser {
  userId: string;
  displayName: string;
  status: string;
}

interface BlockedUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const BlockedUsersModal: React.FC<BlockedUsersModalProps> = ({ isOpen, onClose }) => {
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchBlockedUsers = async () => {
    try {
      setLoading(true);
      const response = await axiosClient.get('/Friendships/blocked');
      setBlockedUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch blocked users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchBlockedUsers();
    }
  }, [isOpen]);

  const handleUnblock = async (userId: string) => {
    try {
      await axiosClient.post(`/Friendships/unblock/${userId}`);
      setBlockedUsers(prev => prev.filter(u => u.userId !== userId));
    } catch (error) {
      console.error('Failed to unblock user:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#242526] w-full max-w-md rounded-xl shadow-2xl border border-[#393a3b] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#393a3b]">
          <h2 className="text-xl font-bold text-[#e4e6eb]">Blocked Users</h2>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#3a3b3c] flex items-center justify-center text-[#b0b3b8] hover:bg-[#4e4f50] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="text-center text-[#b0b3b8] py-4">Loading...</div>
          ) : blockedUsers.length === 0 ? (
            <div className="text-center text-[#b0b3b8] py-8">
              <svg className="w-12 h-12 mx-auto mb-3 text-[#3a3b3c]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
              You haven't blocked anyone.
            </div>
          ) : (
            <div className="space-y-3">
              {blockedUsers.map(user => (
                <div key={user.userId} className="flex items-center justify-between p-3 bg-[#3a3b3c]/30 rounded-lg border border-[#393a3b]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white font-bold">
                      {user.displayName?.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-[#e4e6eb] font-semibold">{user.displayName}</span>
                  </div>
                  <button 
                    onClick={() => handleUnblock(user.userId)}
                    className="px-4 py-1.5 bg-[#3a3b3c] hover:bg-[#4e4f50] text-[#e4e6eb] text-sm font-medium rounded-md transition-colors"
                  >
                    Unblock
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BlockedUsersModal;
