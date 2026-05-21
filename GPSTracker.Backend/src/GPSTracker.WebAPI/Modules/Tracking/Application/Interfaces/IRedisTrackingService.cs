namespace GPSTracker.WebAPI.Modules.Tracking.Application.Interfaces;

public interface IRedisTrackingService
{
    // Quản lý Connection
    Task AddConnectionAsync(string userId, string connectionId);
    Task RemoveConnectionAsync(string userId, string connectionId);
    Task<List<string>> GetConnectionsAsync(string userId);
    
    // Quản lý Tọa độ
    Task UpdateLocationAsync(string userId, double latitude, double longitude, double speed, double heading);
    
    // (Tuỳ chọn: Để lấy nhanh vị trí cuối cùng nếu cần)
    Task<string?> GetLastLocationAsync(string userId);

    // Rate Limiting
    Task<bool> CanUpdateLocationAsync(string userId, int intervalSeconds = 2);
    Task<bool> CheckRateLimitAsync(string userId, string action, int intervalSeconds);

    // Ghost Mode State
    Task SetGhostModeAsync(string userId, bool isGhostMode);
    Task<bool> GetGhostModeAsync(string userId);

    // Caching bạn bè để SignalR không cần truy vấn Database liên tục
    Task<List<string>> GetCachedFriendIdsAsync(string userId);
    Task UpdateCachedFriendsAsync(string userId, List<string> friendIds);
}
