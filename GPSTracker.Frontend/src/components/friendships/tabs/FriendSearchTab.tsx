import React from 'react';
import type { FriendshipDto, UserDto } from '../../../api/friendshipApi';

interface FriendSearchTabProps {
  searchResults: UserDto[];
  friends: FriendshipDto[];
  requests: FriendshipDto[];
  onCancelRequest: (userId: string) => void;
  onAcceptRequest: (userId: string) => void;
  onSendRequest: (userId: string) => void;
}

const FriendSearchTab: React.FC<FriendSearchTabProps> = ({ 
  searchResults, 
  friends, 
  requests, 
  onCancelRequest, 
  onAcceptRequest, 
  onSendRequest 
}) => {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-[#e4e6eb] font-bold text-[17px] px-2 pt-2">Search Results</h3>
      {searchResults.length === 0 ? (
        <div className="text-center text-[#b0b3b8] p-4 text-[15px]">No users found.</div>
      ) : (
        searchResults.map(user => {
          const isFriend = friends.some(f => f.userId === user.id);
          return (
            <div key={user.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-[#3a3b3c] transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white font-bold text-lg">
                  {user.displayName.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col">
                  <span className="text-[#e4e6eb] font-semibold text-[15px]">{user.displayName}</span>
                  <span className="text-[#b0b3b8] text-[13px]">@{user.username}</span>
                </div>
              </div>
              {(() => {
                const status = user.friendshipStatus;
                const isRequester = user.isRequester;

                if (status === 3) {
                  return <span className="text-[#e41e3f] text-sm font-semibold px-2">Blocked</span>;
                }
                if (isFriend) {
                  return <span className="text-[#b0b3b8] text-sm font-semibold px-2">Friends</span>;
                }
                
                // Trạng thái chờ xác nhận
                if (status === 0) {
                  if (isRequester) {
                    return <button onClick={() => onCancelRequest(user.id)} title="Click to cancel" className="bg-[#4e4f50] hover:bg-[#5a5b5c] text-[#e4e6eb] px-3 py-1.5 rounded-lg font-semibold text-sm transition-colors cursor-pointer">Sent</button>;
                  } else {
                    const isStillPending = requests.some(r => r.userId === user.id);
                    if (isStillPending) {
                      return <button onClick={() => onAcceptRequest(user.id)} className="bg-[#0866ff] hover:bg-[#1877f2] text-white px-3 py-1.5 rounded-lg font-semibold transition-colors text-sm">Accept</button>;
                    }
                  }
                }
                
                return (
                  <button 
                    onClick={() => onSendRequest(user.id)}
                    className="bg-[#0866ff]/20 hover:bg-[#0866ff]/30 text-[#0866ff] px-3 py-1.5 rounded-lg font-semibold transition-colors text-sm"
                  >
                    Add Friend
                  </button>
                );
              })()}
            </div>
          );
        })
      )}
    </div>
  );
};

export default FriendSearchTab;
