using GPSTracker.WebAPI.Modules.Tracking.Application.Interfaces;
using StackExchange.Redis;
using System.Text.Json;
using Microsoft.Extensions.Logging;

namespace GPSTracker.WebAPI.Modules.Tracking.Application.Services;

public class RedisTrackingService(IConnectionMultiplexer redis, ILogger<RedisTrackingService> logger) : IRedisTrackingService
{
    private readonly IDatabase _db = redis.GetDatabase();

    public async Task AddConnectionAsync(string userId, string connectionId)
    {
        try
        {
            var key = $"User:{userId}:Connections";
            await _db.SetAddAsync(key, connectionId);
            await _db.KeyExpireAsync(key, TimeSpan.FromDays(1));
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "[Redis] Lỗi khi AddConnectionAsync cho user {UserId}", userId);
        }
    }

    public async Task RemoveConnectionAsync(string userId, string connectionId)
    {
        try
        {
            var key = $"User:{userId}:Connections";
            await _db.SetRemoveAsync(key, connectionId);
            
            if (await _db.SetLengthAsync(key) == 0)
            {
                await _db.KeyDeleteAsync(key);
            }
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "[Redis] Lỗi khi RemoveConnectionAsync cho user {UserId}", userId);
        }
    }

    public async Task<List<string>> GetConnectionsAsync(string userId)
    {
        try
        {
            var key = $"User:{userId}:Connections";
            var connections = await _db.SetMembersAsync(key);
            return connections.Select(c => c.ToString()).ToList();
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "[Redis] Lỗi khi GetConnectionsAsync cho user {UserId}", userId);
            return new List<string>(); // Trả về list rỗng thay vì crash
        }
    }

    public async Task UpdateLocationAsync(string userId, double latitude, double longitude, double speed, double heading)
    {
        try
        {
            var key = $"User:{userId}:Location";
            var data = new
            {
                Lat = latitude,
                Lng = longitude,
                Speed = speed,
                Heading = heading,
                Timestamp = DateTime.UtcNow
            };

            var json = JsonSerializer.Serialize(data);
            await _db.StringSetAsync(key, json, TimeSpan.FromMinutes(1));
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "[Redis] Lỗi khi UpdateLocationAsync cho user {UserId}", userId);
        }
    }

    public async Task<string?> GetLastLocationAsync(string userId)
    {
        try
        {
            var key = $"User:{userId}:Location";
            var value = await _db.StringGetAsync(key);
            return value.HasValue ? value.ToString() : null;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "[Redis] Lỗi khi GetLastLocationAsync cho user {UserId}", userId);
            return null;
        }
    }

    public async Task<bool> CanUpdateLocationAsync(string userId, int intervalSeconds = 2)
    {
        try
        {
            var key = $"User:{userId}:RateLimit";
            // SetNX: Chỉ thành công (trả về true) nếu Key chưa tồn tại
            return await _db.StringSetAsync(key, "1", TimeSpan.FromSeconds(intervalSeconds), When.NotExists);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "[Redis] Lỗi RateLimit cho user {UserId}, tạm thời cho phép pass.", userId);
            // Fallback: nếu Redis lỗi, ta vẫn cho phép update để hệ thống tiếp tục chạy
            return true; 
        }
    }
    public async Task<bool> CheckRateLimitAsync(string userId, string action, int intervalSeconds)
    {
        try
        {
            var key = $"User:{userId}:RateLimit:{action}";
            return await _db.StringSetAsync(key, "1", TimeSpan.FromSeconds(intervalSeconds), When.NotExists);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "[Redis] Lỗi RateLimit cho action {Action} của user {UserId}.", action, userId);
            return true;
        }
    }

    public async Task SetGhostModeAsync(string userId, bool isGhostMode)
    {
        try
        {
            var key = $"User:{userId}:GhostMode";
            if (isGhostMode)
            {
                await _db.StringSetAsync(key, "1", TimeSpan.FromDays(7));
            }
            else
            {
                await _db.KeyDeleteAsync(key);
            }
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "[Redis] Lỗi SetGhostModeAsync cho user {UserId}", userId);
        }
    }

    public async Task<bool> GetGhostModeAsync(string userId)
    {
        try
        {
            var key = $"User:{userId}:GhostMode";
            return await _db.KeyExistsAsync(key);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "[Redis] Lỗi GetGhostModeAsync cho user {UserId}", userId);
            return false;
        }
    }
}
