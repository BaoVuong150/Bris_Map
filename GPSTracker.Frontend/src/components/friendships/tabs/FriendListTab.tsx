import React from 'react';
import type { FriendshipDto } from '../../../api/friendshipApi';
import { useChatStore } from '../../../stores/useChatStore';

interface FriendListTabProps {
  friends: FriendshipDto[];
  onRemoveFriend: (userId: string) => void;
  onBlockUser: (userId: string) => void;
  onClose: () => void;
}

const FriendListTab: React.FC<FriendListTabProps> = ({ friends, onRemoveFriend, onBlockUser, onClose }) => {
  const openChat = useChatStore(state => state.openChat);

  if (friends.length === 0) {
    return <div className="text-center text-[#b0b3b8] p-4 text-[15px]">You have no friends yet. Search to add some!</div>;
  }

  return (
    <div className="flex flex-col gap-1">
      {friends.map(friend => (
        <div key={friend.userId} className="flex items-center justify-between p-2 rounded-xl hover:bg-[#3a3b3c] transition-colors group">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-lg">
              {friend.displayName.charAt(0).toUpperCase()}
            </div>
            <span className="text-[#e4e6eb] font-semibold text-[15px]">{friend.displayName}</span>
          </div>
          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
            <button 
              onClick={() => {
                openChat(friend.userId, friend.displayName);
                onClose();
              }}
              className="p-2 rounded-full hover:bg-[#4e4f50] transition-all"
              title="Chat"
            >
              <svg className="w-5 h-5 text-[#0866ff]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3c5.5 0 10 3.58 10 8s-4.5 8-10 8c-1.24 0-2.43-.18-3.53-.5C5.55 21 2 21 2 21c2.33-2.33 2.7-3.9 2.75-4.5C3.05 15.07 2 13.13 2 11c0-4.42 4.5-8 10-8z"></path></svg>
            </button>
            <button 
              onClick={() => onRemoveFriend(friend.userId)}
              className="p-2 rounded-full hover:bg-[#4e4f50] transition-all"
              title="Unfriend"
            >
              <svg className="w-5 h-5 text-[#e41e3f]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            </button>
            <button 
              onClick={() => onBlockUser(friend.userId)}
              className="p-2 rounded-full hover:bg-[#4e4f50] transition-all"
              title="Block User"
            >
              <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path></svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default FriendListTab;
