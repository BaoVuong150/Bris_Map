using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;
using GPSTracker.WebAPI.Modules.Tracking.Application.Interfaces;
using GPSTracker.WebAPI.Modules.Friendships.Application.Interfaces;
using GPSTracker.WebAPI.Shared.Infrastructure.Data;
using GPSTracker.WebAPI.Modules.Tracking.Application.DTOs;
using GPSTracker.WebAPI.Modules.Tracking.Domain.Entities;
using NetTopologySuite.Geometries;
using System.Text.Json;

namespace GPSTracker.WebAPI.Shared.Infrastructure.Hubs;

// [Authorize] chặn kết nối nặc danh. Trạm thu phát sóng duy nhất của toàn bộ hệ thống
[Authorize]
public partial class AppHub(
    IRedisTrackingService redisTrackingService,
    IFriendshipService friendshipService,
    GPSTracker.WebAPI.Modules.Messages.Application.Interfaces.IMessageService messageService,
    IServiceScopeFactory scopeFactory) : Hub
{
    // ==========================================
    // 1. QUẢN LÝ VÒNG ĐỜI KẾT NỐI (LIFECYCLE)
    // ==========================================
    public override async Task OnConnectedAsync()
    {
        var userId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId != null)
        {
            Console.WriteLine($"[SignalR] User connected: {userId} (ConnectionId: {Context.ConnectionId})");
            await redisTrackingService.AddConnectionAsync(userId, Context.ConnectionId);
        }
        
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId != null)
        {
            Console.WriteLine($"[SignalR] User disconnected: {userId} (ConnectionId: {Context.ConnectionId})");
            await redisTrackingService.RemoveConnectionAsync(userId, Context.ConnectionId);

            // Xử lý Edge Case: Người dùng bấm F5 (Refresh trình duyệt)
            // Kéo giãn 5 giây để đợi họ kết nối lại trước khi vội vã lưu DB
            _ = Task.Run(async () => 
            {
                // Ngủ đông 5 giây (Grace period)
                await Task.Delay(5000);

                // Sau 5 giây, kiểm tra lại xem họ đã kết nối lại bằng tab khác/F5 chưa
                using var scope = scopeFactory.CreateScope();
                var redisTrackingServiceBackground = scope.ServiceProvider.GetRequiredService<IRedisTrackingService>();
                var remainingConnections = await redisTrackingServiceBackground.GetConnectionsAsync(userId);
                if (remainingConnections.Count == 0)
                {
                    // Thực sự đã cúp máy (Không còn connection nào sau 5s)
                    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

                    var lastLocationJson = await redisTrackingServiceBackground.GetLastLocationAsync(userId);
                    if (!string.IsNullOrEmpty(lastLocationJson))
                    {
                        try
                        {
                            var data = JsonSerializer.Deserialize<JsonElement>(lastLocationJson);
                            var lat = data.GetProperty("Lat").GetDouble();
                            var lng = data.GetProperty("Lng").GetDouble();
                            var timestamp = data.GetProperty("Timestamp").GetDateTime();

                            var history = new LocationHistory
                            {
                                UserId = userId,
                                Location = new Point(lng, lat) { SRID = 4326 },
                                Timestamp = timestamp
                            };
                            dbContext.LocationHistories.Add(history);
                        }
                        catch (Exception ex)
                        {
                            Console.WriteLine($"[AppHub] Lỗi parse JSON khi Disconnect: {ex.Message}");
                        }
                    }

                    var user = await dbContext.Users.FindAsync(userId);
                    if (user != null)
                    {
                        user.LastSeenAt = DateTime.UtcNow;
                    }

                    await dbContext.SaveChangesAsync();
                    Console.WriteLine($"[AppHub] Đã lưu LocationHistory và LastSeenAt cho {userId} sau 5s delay");
                }
                else
                {
                    Console.WriteLine($"[AppHub] Hủy lưu DB cho {userId} vì đã kết nối lại trong 5s (F5 Edge Case)");
                }
            });
        }

        await base.OnDisconnectedAsync(exception);
    }

    // ==========================================
    // 2. NHÁNH TRACKING (Xử lý tọa độ)
    // ==========================================
    public async Task UpdateLocation(double latitude, double longitude, double speed, double heading)
    {
        var userId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null) return;

        // RATE LIMITING (Redis Scale-out Edge Case): Chặn nếu gửi quá nhanh (< 2 giây)
        bool isAllowed = await redisTrackingService.CanUpdateLocationAsync(userId, 2);
        if (!isAllowed)
        {
            return; // Bỏ qua request này (Spam)
        }

        // LỖI ĐA THIẾT BỊ (Multi-device Edge Case):
        // Nếu user đã bật Ghost Mode trên thiết bị A, cấm thiết bị B âm thầm gửi tọa độ lên
        bool isGhostMode = await redisTrackingService.GetGhostModeAsync(userId);
        if (isGhostMode)
        {
            Console.WriteLine($"[AppHub] Chặn tọa độ từ {userId} (Lý do: Đang bật Ghost Mode)");
            return;
        }

        Console.WriteLine($"[AppHub] Tọa độ từ {userId}: Lat={latitude}, Lng={longitude}, Tốc độ={speed}km/h");

        // Lưu tọa độ vào Redis
        await redisTrackingService.UpdateLocationAsync(userId, latitude, longitude, speed, heading);

        // PHÂN QUYỀN BẠN BÈ: Chỉ Broadcast cho những ai là Bạn bè (Accepted)
        var friends = await friendshipService.GetFriendsAsync(userId);
        var friendIds = friends.Select(f => f.UserId).ToList();

        if (friendIds.Any())
        {
            var updateDto = new LocationUpdateDto
            {
                UserId = userId,
                Lat = latitude,
                Lng = longitude,
                Speed = speed,
                Heading = heading,
                Timestamp = DateTime.UtcNow
            };
            await Clients.Users(friendIds).SendAsync("ReceiveLocationUpdate", updateDto);
        }
    }

    public async Task ToggleGhostMode(bool isGhostMode)
    {
        var userId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null) return;

        // CHỐNG SPAM GHOST MODE: Cấm ấn Tắt/Bật liên tục (Giới hạn 2 giây)
        bool canToggle = await redisTrackingService.CheckRateLimitAsync(userId, "GhostToggle", 2);
        if (!canToggle)
        {
            Console.WriteLine($"[AppHub] Chặn {userId} đổi Ghost Mode liên tục (Spam)");
            return;
        }

        Console.WriteLine($"[AppHub] User {userId} bật/tắt Ghost Mode: {isGhostMode}");

        // LƯU TRẠNG THÁI (Late Joiner Edge Case): Cần lưu lại để người vào sau còn biết
        await redisTrackingService.SetGhostModeAsync(userId, isGhostMode);

        // PHÂN QUYỀN BẠN BÈ: Chỉ Broadcast cho những ai là Bạn bè (Accepted)
        var friends = await friendshipService.GetFriendsAsync(userId);
        var friendIds = friends.Select(f => f.UserId).ToList();

        if (friendIds.Any())
        {
            var toggleDto = new GhostModeToggleDto
            {
                UserId = userId,
                IsGhostMode = isGhostMode,
                Timestamp = DateTime.UtcNow
            };
            await Clients.Users(friendIds).SendAsync("ReceiveGhostModeToggle", toggleDto);
        }
    }

    // ==========================================
    // 3. NHÁNH CHAT (Xử lý tin nhắn)
    // ==========================================
    public async Task SendMessage(string receiverId, string content)
    {
        var senderId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
        if (senderId == null) return;

        // Kiểm tra xem 2 người có phải là bạn không
        var friends = await friendshipService.GetFriendsAsync(senderId);
        if (!friends.Any(f => f.UserId == receiverId))
        {
            Console.WriteLine($"[AppHub] Chặn gửi tin nhắn từ {senderId} tới {receiverId} vì chưa kết bạn");
            return;
        }

        // Lưu tin nhắn vào Database
        var message = await messageService.SendMessageAsync(senderId, receiverId, content);

        // Phát tin nhắn sang máy người nhận (Real-time)
        await Clients.User(receiverId).SendAsync("ReceiveMessage", message);
        
        // (Tùy chọn) Gửi lại cho chính người gửi để update UI (hoặc UI tự fake message)
        // await Clients.Caller.SendAsync("ReceiveMessage", message);
    }
}
