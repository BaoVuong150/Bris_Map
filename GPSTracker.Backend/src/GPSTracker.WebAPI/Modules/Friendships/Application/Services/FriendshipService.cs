using GPSTracker.WebAPI.Modules.Friendships.Application.DTOs;
using GPSTracker.WebAPI.Modules.Friendships.Application.Interfaces;
using GPSTracker.WebAPI.Modules.Friendships.Domain.Entities;
using GPSTracker.WebAPI.Shared.Infrastructure.Data;
using GPSTracker.WebAPI.Shared.Infrastructure.Hubs;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

using System.Collections.Concurrent;

using GPSTracker.WebAPI.Modules.Tracking.Application.Interfaces;

namespace GPSTracker.WebAPI.Modules.Friendships.Application.Services;

public class FriendshipService(AppDbContext context, IHubContext<AppHub> hubContext, IRedisTrackingService redisTrackingService) : IFriendshipService
{
    // Sử dụng Striped Lock (Mảng 1024 ổ khóa) để chống Memory Leak
    private static readonly SemaphoreSlim[] _locks = Enumerable.Range(0, 1024).Select(_ => new SemaphoreSlim(1, 1)).ToArray();

    public async Task<(bool IsSuccess, string Message)> SendFriendRequestAsync(string requesterId, string receiverId)
    {
        if (requesterId == receiverId) return (false, "You cannot send a friend request to yourself.");

        // Ensure both users exist
        if (!await context.Users.AnyAsync(u => u.Id == requesterId))
            return (false, "Invalid login session.");

        if (!await context.Users.AnyAsync(u => u.Id == receiverId))
            return (false, "User does not exist.");

        var lockKey = string.CompareOrdinal(requesterId, receiverId) < 0 
            ? $"{requesterId}_{receiverId}" 
            : $"{receiverId}_{requesterId}";
        
        // Hashing key để lấy đúng 1 ổ khóa trong 1024 ổ khóa (Không bao giờ rò rỉ bộ nhớ)
        var lockIndex = Math.Abs(lockKey.GetHashCode()) % _locks.Length;
        var semaphore = _locks[lockIndex];
        
        await semaphore.WaitAsync();

        try
        {
            var existing = await context.Friendships
                .FirstOrDefaultAsync(f =>
                    (f.RequesterId == requesterId && f.ReceiverId == receiverId) ||
                    (f.RequesterId == receiverId && f.ReceiverId == requesterId));

        if (existing != null)
        {
            if (existing.Status == FriendshipStatus.Blocked) return (false, "Cannot interact with this user.");
            if (existing.Status == FriendshipStatus.Accepted) return (false, "You are already friends.");
            if (existing.Status == FriendshipStatus.Pending) return (false, "There is already a pending friend request.");
            
            if (existing.Status == FriendshipStatus.Rejected)
            {
                existing.Status = FriendshipStatus.Pending;
                existing.RequesterId = requesterId;
                existing.ReceiverId = receiverId;
                existing.UpdatedAt = DateTime.UtcNow;
                var updateSuccess = await context.SaveChangesAsync() > 0;
                return updateSuccess ? (true, "Friend request sent successfully.") : (false, "Database error.");
            }
        }

        var friendship = new Friendship
        {
            RequesterId = requesterId,
            ReceiverId = receiverId,
            Status = FriendshipStatus.Pending,
            CreatedAt = DateTime.UtcNow
        };

        context.Friendships.Add(friendship);
        var success = await context.SaveChangesAsync() > 0;
        
        if (success)
        {
            // Bắn tín hiệu Real-time qua Tổng đài SignalR đến đúng Người nhận (receiverId)
            await hubContext.Clients.User(receiverId).SendAsync("ReceiveNotification", new
            {
                Type = "FriendRequest",
                FromUserId = requesterId,
                Message = "Có người vừa gửi lời mời kết bạn cho sếp!"
            });
            return (true, "Friend request sent successfully.");
        }
        return (false, "Database error.");
        }
        finally
        {
            semaphore.Release();
        }
    }

    public async Task<(bool IsSuccess, string Message)> AcceptFriendRequestAsync(string userId, string requesterId)
    {
        var friendship = await context.Friendships
            .FirstOrDefaultAsync(f => f.RequesterId == requesterId && f.ReceiverId == userId && f.Status == FriendshipStatus.Pending);

        if (friendship == null) return (false, "Friend request not found.");

        friendship.Status = FriendshipStatus.Accepted;
        friendship.UpdatedAt = DateTime.UtcNow;

        var success = await context.SaveChangesAsync() > 0;

        if (success)
        {
            // Báo cho người gửi biết là sếp đã đồng ý
            await hubContext.Clients.User(requesterId).SendAsync("ReceiveNotification", new
            {
                Type = "FriendAccepted",
                FromUserId = userId,
                Message = "Tuyệt vời, sếp và người đó đã là bạn bè!"
            });

            // Cập nhật lại Redis Cache cho cả 2 người
            await SyncFriendsToRedisAsync(userId);
            await SyncFriendsToRedisAsync(requesterId);

            return (true, "Friend request accepted.");
        }
        
        return (false, "Database error.");
    }

    public async Task<(bool IsSuccess, string Message)> RejectFriendRequestAsync(string userId, string requesterId)
    {
        var friendship = await context.Friendships
            .FirstOrDefaultAsync(f => f.RequesterId == requesterId && f.ReceiverId == userId && f.Status == FriendshipStatus.Pending);

        if (friendship == null) return (false, "Friend request not found.");

        friendship.Status = FriendshipStatus.Rejected;
        friendship.UpdatedAt = DateTime.UtcNow;

        var success = await context.SaveChangesAsync() > 0;
        if (success)
        {
            await hubContext.Clients.User(requesterId).SendAsync("ReceiveNotification", new
            {
                Type = "FriendRejected",
                FromUserId = userId,
                Message = "User has rejected your friend request."
            });
            return (true, "Friend request rejected.");
        }
        return (false, "Database error.");
    }

    public async Task<(bool IsSuccess, string Message)> CancelFriendRequestAsync(string requesterId, string receiverId)
    {
        var friendship = await context.Friendships
            .FirstOrDefaultAsync(f => f.RequesterId == requesterId && f.ReceiverId == receiverId && (f.Status == FriendshipStatus.Pending || f.Status == FriendshipStatus.Rejected));

        if (friendship == null) return (true, "Friend request already handled or does not exist.");

        context.Friendships.Remove(friendship);
        var success = await context.SaveChangesAsync() > 0;
        if (success)
        {
            await hubContext.Clients.User(receiverId).SendAsync("ReceiveNotification", new
            {
                Type = "FriendRequestCanceled",
                FromUserId = requesterId,
                Message = "User has canceled their friend request."
            });
            return (true, "Friend request canceled.");
        }
        return (false, "Database error.");
    }

    public async Task<(bool IsSuccess, string Message)> BlockUserAsync(string blockerId, string blockedId)
    {
        if (blockerId == blockedId) return (false, "You cannot block yourself.");

        if (!await context.Users.AnyAsync(u => u.Id == blockedId))
            return (false, "User does not exist.");

        var existing = await context.Friendships
            .FirstOrDefaultAsync(f =>
                (f.RequesterId == blockerId && f.ReceiverId == blockedId) ||
                (f.RequesterId == blockedId && f.ReceiverId == blockerId));

        if (existing != null)
        {
            if (existing.RequesterId == blockerId && existing.Status == FriendshipStatus.Blocked)
                return (false, "You have already blocked this user.");

            // Update to Blocked
            if (existing.RequesterId != blockerId)
            {
                context.Friendships.Remove(existing);
                var block = new Friendship
                {
                    RequesterId = blockerId,
                    ReceiverId = blockedId,
                    Status = FriendshipStatus.Blocked,
                    CreatedAt = DateTime.UtcNow
                };
                context.Friendships.Add(block);
            }
            else
            {
                existing.Status = FriendshipStatus.Blocked;
                existing.UpdatedAt = DateTime.UtcNow;
            }
        }
        else
        {
            var block = new Friendship
            {
                RequesterId = blockerId,
                ReceiverId = blockedId,
                Status = FriendshipStatus.Blocked,
                CreatedAt = DateTime.UtcNow
            };
            context.Friendships.Add(block);
        }

        var success = await context.SaveChangesAsync() > 0;
        if (success)
        {
            await hubContext.Clients.User(blockedId).SendAsync("ReceiveNotification", new
            {
                Type = "FriendRemoved",
                FromUserId = blockerId,
                Message = "You have been blocked."
            });

            // Cập nhật lại Redis Cache
            await SyncFriendsToRedisAsync(blockerId);
            await SyncFriendsToRedisAsync(blockedId);

            return (true, "User blocked successfully.");
        }
        return (false, "Database error.");
    }

    public async Task<(bool IsSuccess, string Message)> UnblockUserAsync(string blockerId, string blockedId)
    {
        var friendship = await context.Friendships
            .FirstOrDefaultAsync(f => f.RequesterId == blockerId && f.ReceiverId == blockedId && f.Status == FriendshipStatus.Blocked);

        if (friendship == null) return (false, "User is not blocked by you.");

        context.Friendships.Remove(friendship);
        var success = await context.SaveChangesAsync() > 0;
        return success ? (true, "User unblocked successfully.") : (false, "Database error.");
    }

    public async Task<(bool IsSuccess, string Message)> RemoveFriendAsync(string userId, string friendId)
    {
        var existing = await context.Friendships
            .FirstOrDefaultAsync(f =>
                (f.RequesterId == userId && f.ReceiverId == friendId && f.Status == FriendshipStatus.Accepted) ||
                (f.RequesterId == friendId && f.ReceiverId == userId && f.Status == FriendshipStatus.Accepted));

        if (existing == null) return (false, "You are not friends with this user.");

        context.Friendships.Remove(existing);
        var success = await context.SaveChangesAsync() > 0;
        if (success)
        {
            await hubContext.Clients.User(friendId).SendAsync("ReceiveNotification", new
            {
                Type = "FriendRemoved",
                FromUserId = userId,
                Message = "User has removed you from their friend list."
            });

            // Cập nhật lại Redis Cache
            await SyncFriendsToRedisAsync(userId);
            await SyncFriendsToRedisAsync(friendId);

            return (true, "Friend removed successfully.");
        }
        return (false, "Database error.");
    }

    public async Task<List<FriendshipDto>> GetFriendsAsync(string userId)
    {
        var friendships = await context.Friendships
            .Include(f => f.Requester)
            .Include(f => f.Receiver)
            .Where(f => (f.RequesterId == userId || f.ReceiverId == userId) && f.Status == FriendshipStatus.Accepted)
            .ToListAsync();

        return friendships.Select(f =>
        {
            var friend = f.RequesterId == userId ? f.Receiver : f.Requester;
            return new FriendshipDto
            {
                UserId = friend.Id,
                DisplayName = friend.DisplayName,
                Status = f.Status
            };
        }).ToList();
    }

    public async Task<List<FriendshipDto>> GetPendingRequestsAsync(string userId)
    {
        var requests = await context.Friendships
            .Include(f => f.Requester)
            .Where(f => f.ReceiverId == userId && f.Status == FriendshipStatus.Pending)
            .ToListAsync();

        return requests.Select(f => new FriendshipDto
        {
            UserId = f.RequesterId,
            DisplayName = f.Requester.DisplayName,
            Status = f.Status
        }).ToList();
    }

    public async Task<List<FriendshipDto>> GetBlockedUsersAsync(string userId)
    {
        var blockedUsers = await context.Friendships
            .Include(f => f.Receiver)
            .Where(f => f.RequesterId == userId && f.Status == FriendshipStatus.Blocked)
            .ToListAsync();

        return blockedUsers.Select(f => new FriendshipDto
        {
            UserId = f.ReceiverId,
            DisplayName = f.Receiver.DisplayName,
            Status = f.Status
        }).ToList();
    }

    private async Task SyncFriendsToRedisAsync(string userId)
    {
        var friends = await GetFriendsAsync(userId);
        var friendIds = friends.Select(f => f.UserId).ToList();
        await redisTrackingService.UpdateCachedFriendsAsync(userId, friendIds);
    }
}
