using GPSTracker.WebAPI.Modules.Messages.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace GPSTracker.WebAPI.Modules.Messages.Presentation.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class MessagesController(IMessageService messageService) : ControllerBase
{
    [HttpGet("{friendId}")]
    public async Task<IActionResult> GetChatHistory(string friendId, [FromQuery] int limit = 50)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null) return Unauthorized();

        var messages = await messageService.GetChatHistoryAsync(userId, friendId, limit);

        return Ok(messages);
    }

    [HttpGet("unread-count")]
    public async Task<IActionResult> GetUnreadCount()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null) return Unauthorized();

        var count = await messageService.GetTotalUnreadCountAsync(userId);
        return Ok(new { TotalUnreadCount = count });
    }

    [HttpGet("conversations")]
    public async Task<IActionResult> GetRecentConversations()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null) return Unauthorized();

        var conversations = await messageService.GetRecentConversationsAsync(userId);
        return Ok(conversations);
    }
}
