using GPSTracker.WebAPI.Modules.Friendships.Domain.Entities;

namespace GPSTracker.WebAPI.Modules.Friendships.Application.DTOs;

public class FriendshipDto
{
    public string UserId { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public FriendshipStatus Status { get; set; }
}
