using System.Security.Claims;
using GPSTracker.WebAPI.Modules.Friendships.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GPSTracker.WebAPI.Modules.Friendships.Presentation.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class FriendshipsController(IFriendshipService friendshipService) : ControllerBase
{
    private string GetUserId() => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    [HttpPost("request/{receiverId}")]
    public async Task<IActionResult> SendRequest(string receiverId)
    {
        var result = await friendshipService.SendFriendRequestAsync(GetUserId(), receiverId);
        if (!result.IsSuccess) return BadRequest(new { message = result.Message });
        return Ok(new { message = result.Message });
    }

    [HttpPost("accept/{requesterId}")]
    public async Task<IActionResult> AcceptRequest(string requesterId)
    {
        var result = await friendshipService.AcceptFriendRequestAsync(GetUserId(), requesterId);
        if (!result.IsSuccess) return BadRequest(new { message = result.Message });
        return Ok(new { message = result.Message });
    }

    [HttpPost("reject/{requesterId}")]
    public async Task<IActionResult> RejectRequest(string requesterId)
    {
        var result = await friendshipService.RejectFriendRequestAsync(GetUserId(), requesterId);
        if (!result.IsSuccess) return BadRequest(new { message = result.Message });
        return Ok(new { message = result.Message });
    }

    [HttpPost("cancel/{receiverId}")]
    public async Task<IActionResult> CancelRequest(string receiverId)
    {
        var result = await friendshipService.CancelFriendRequestAsync(GetUserId(), receiverId);
        if (!result.IsSuccess) return BadRequest(new { message = result.Message });
        return Ok(new { message = result.Message });
    }

    [HttpPost("block/{blockedId}")]
    public async Task<IActionResult> BlockUser(string blockedId)
    {
        var result = await friendshipService.BlockUserAsync(GetUserId(), blockedId);
        if (!result.IsSuccess) return BadRequest(new { message = result.Message });
        return Ok(new { message = result.Message });
    }

    [HttpPost("unblock/{blockedId}")]
    public async Task<IActionResult> UnblockUser(string blockedId)
    {
        var result = await friendshipService.UnblockUserAsync(GetUserId(), blockedId);
        if (!result.IsSuccess) return BadRequest(new { message = result.Message });
        return Ok(new { message = result.Message });
    }

    [HttpDelete("remove/{friendId}")]
    public async Task<IActionResult> RemoveFriend(string friendId)
    {
        var result = await friendshipService.RemoveFriendAsync(GetUserId(), friendId);
        if (!result.IsSuccess) return BadRequest(new { message = result.Message });
        return Ok(new { message = result.Message });
    }

    [HttpGet]
    public async Task<IActionResult> GetFriends()
    {
        var friends = await friendshipService.GetFriendsAsync(GetUserId());
        return Ok(friends);
    }

    [HttpGet("pending")]
    public async Task<IActionResult> GetPendingRequests()
    {
        var requests = await friendshipService.GetPendingRequestsAsync(GetUserId());
        return Ok(requests);
    }

    [HttpGet("blocked")]
    public async Task<IActionResult> GetBlockedUsers()
    {
        var blockedUsers = await friendshipService.GetBlockedUsersAsync(GetUserId());
        return Ok(blockedUsers);
    }
}
