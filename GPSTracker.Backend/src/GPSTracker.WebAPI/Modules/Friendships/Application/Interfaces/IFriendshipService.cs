using GPSTracker.WebAPI.Modules.Friendships.Application.DTOs;

namespace GPSTracker.WebAPI.Modules.Friendships.Application.Interfaces;

public interface IFriendshipService
{
    Task<(bool IsSuccess, string Message)> SendFriendRequestAsync(string requesterId, string receiverId);
    Task<(bool IsSuccess, string Message)> AcceptFriendRequestAsync(string userId, string requesterId);
    Task<(bool IsSuccess, string Message)> RejectFriendRequestAsync(string userId, string requesterId);
    Task<(bool IsSuccess, string Message)> CancelFriendRequestAsync(string requesterId, string receiverId);
    Task<(bool IsSuccess, string Message)> BlockUserAsync(string blockerId, string blockedId);
    Task<(bool IsSuccess, string Message)> UnblockUserAsync(string blockerId, string blockedId);
    Task<(bool IsSuccess, string Message)> RemoveFriendAsync(string userId, string friendId);
    Task<List<FriendshipDto>> GetFriendsAsync(string userId);
    Task<List<FriendshipDto>> GetPendingRequestsAsync(string userId);
    Task<List<FriendshipDto>> GetBlockedUsersAsync(string userId);
}
