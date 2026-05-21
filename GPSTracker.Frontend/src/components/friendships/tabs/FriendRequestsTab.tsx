import React from 'react';
import type { FriendshipDto } from '../../../api/friendshipApi';

interface FriendRequestsTabProps {
  requests: FriendshipDto[];
  onAcceptRequest: (userId: string) => void;
  onRejectRequest: (userId: string) => void;
}

const FriendRequestsTab: React.FC<FriendRequestsTabProps> = ({ requests, onAcceptRequest, onRejectRequest }) => {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-[#e4e6eb] font-bold text-[17px] px-2 pt-2">Friend Requests <span className="text-[#e41e3f]">{requests.length}</span></h3>
      {requests.length === 0 ? (
        <div className="text-center text-[#b0b3b8] p-4 text-[15px]">No pending requests.</div>
      ) : (
        requests.map(req => (
          <div key={req.userId} className="flex flex-col p-3 rounded-xl hover:bg-[#3a3b3c] transition-colors gap-3">
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white font-bold text-2xl">
                {req.displayName.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col">
                <span className="text-[#e4e6eb] font-semibold text-[17px]">{req.displayName}</span>
                <span className="text-[#b0b3b8] text-[13px]">Sent you a request</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => onAcceptRequest(req.userId)}
                className="flex-1 bg-[#0866ff] hover:bg-[#1877f2] text-white font-semibold py-2 rounded-lg transition-colors"
              >
                Confirm
              </button>
              <button 
                onClick={() => onRejectRequest(req.userId)}
                className="flex-1 bg-[#4e4f50] hover:bg-[#5a5b5c] text-[#e4e6eb] font-semibold py-2 rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default FriendRequestsTab;
