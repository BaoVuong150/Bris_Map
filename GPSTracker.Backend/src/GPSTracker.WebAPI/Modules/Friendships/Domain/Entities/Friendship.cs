using GPSTracker.WebAPI.Modules.Identity.Domain.Entities;

namespace GPSTracker.WebAPI.Modules.Friendships.Domain.Entities;

public class Friendship
{
    public int Id { get; set; }
    
    public string RequesterId { get; set; } = null!;
    public User Requester { get; set; } = null!;

    public string ReceiverId { get; set; } = null!;
    public User Receiver { get; set; } = null!;

    public FriendshipStatus Status { get; set; } = FriendshipStatus.Pending;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}
