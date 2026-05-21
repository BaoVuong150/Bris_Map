using GPSTracker.WebAPI.Modules.Identity.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using GPSTracker.WebAPI.Shared.Infrastructure.Data;

namespace GPSTracker.WebAPI.Modules.Identity.Presentation.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UsersController(UserManager<User> userManager, ILogger<UsersController> logger) : ControllerBase
{

    [HttpGet("search")]
    public async Task<IActionResult> SearchUsers([FromQuery] string query, [FromServices] AppDbContext context)
    {
        if (string.IsNullOrWhiteSpace(query))
            return Ok(new List<object>());

        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        try
        {
            var users = await userManager.Users
                .Where(u => u.Id != currentUserId && 
                            (EF.Functions.ILike(u.DisplayName!, $"%{query}%") || 
                             EF.Functions.ILike(u.UserName!, $"%{query}%") || 
                             EF.Functions.ILike(u.Email!, $"%{query}%")))
                .Take(20)
                .ToListAsync();

            var userIds = users.Select(u => u.Id).ToList();

            var friendships = await context.Friendships
                .Where(f => 
                    (f.RequesterId == currentUserId && userIds.Contains(f.ReceiverId)) ||
                    (f.ReceiverId == currentUserId && userIds.Contains(f.RequesterId)))
                .ToListAsync();

            var result = users
                .Select(u => new
                {
                    User = u,
                    Friendship = friendships.FirstOrDefault(f => f.RequesterId == u.Id || f.ReceiverId == u.Id)
                })
                .Where(x => x.Friendship == null || x.Friendship.Status != GPSTracker.WebAPI.Modules.Friendships.Domain.Entities.FriendshipStatus.Blocked)
                .Select(x => new
                {
                    id = x.User.Id,
                    displayName = x.User.DisplayName,
                    username = x.User.UserName,
                    friendshipStatus = x.Friendship?.Status,
                    isRequester = x.Friendship?.RequesterId == currentUserId
                });

            return Ok(result);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Lỗi xảy ra trong quá trình tìm kiếm user. Query: {Query}, CurrentUserId: {UserId}", query, currentUserId);
            return StatusCode(500, new { message = "Lỗi hệ thống khi tìm kiếm người dùng." });
        }
    }
}
