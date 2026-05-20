using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using GPSTracker.WebAPI.Modules.Tracking.Application.DTOs;
using GPSTracker.WebAPI.Modules.Tracking.Application.Interfaces;
using GPSTracker.WebAPI.Modules.Friendships.Application.Interfaces;
using System.Text.Json;

namespace GPSTracker.WebAPI.Modules.Tracking.Presentation.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TrackingController(
    IRedisTrackingService redisTrackingService,
    IFriendshipService friendshipService) : ControllerBase
{
    [HttpGet("friends")]
    public async Task<IActionResult> GetFriendsLocations()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null) return Unauthorized();

        // 1. Lấy danh sách bạn bè
        var friends = await friendshipService.GetFriendsAsync(userId);
        
        var result = new List<FriendLocationDto>();

        // 2. Vòng lặp lấy vị trí và trạng thái Ghost Mode từ Redis
        foreach (var friend in friends)
        {
            var isGhostMode = await redisTrackingService.GetGhostModeAsync(friend.UserId);
            var lastLocationJson = await redisTrackingService.GetLastLocationAsync(friend.UserId);

            if (!string.IsNullOrEmpty(lastLocationJson))
            {
                try
                {
                    // Phân tích cú pháp JSON để lấy tọa độ
                    var data = JsonSerializer.Deserialize<JsonElement>(lastLocationJson);
                    result.Add(new FriendLocationDto
                    {
                        UserId = friend.UserId,
                        DisplayName = friend.DisplayName,
                        Lat = data.GetProperty("Lat").GetDouble(),
                        Lng = data.GetProperty("Lng").GetDouble(),
                        Speed = data.GetProperty("Speed").GetDouble(),
                        Heading = data.GetProperty("Heading").GetDouble(),
                        Timestamp = data.GetProperty("Timestamp").GetDateTime(),
                        IsGhostMode = isGhostMode
                    });
                }
                catch (Exception)
                {
                    // Bỏ qua nếu lỗi parse JSON
                }
            }
        }

        return Ok(result);
    }
}
