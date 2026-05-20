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
public class UsersController(UserManager<User> userManager) : ControllerBase
{

    [HttpGet("search")]
    public async Task<IActionResult> SearchUsers([FromQuery] string query, [FromServices] AppDbContext context)
    {
        if (string.IsNullOrWhiteSpace(query))
            return Ok(new List<object>());

        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        var users = await userManager.Users
            .Where(u => u.Id != currentUserId && (u.DisplayName!.ToLower().Contains(query.ToLower()) || u.UserName!.ToLower().Contains(query.ToLower()) || u.Email!.ToLower().Contains(query.ToLower())))
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
}
