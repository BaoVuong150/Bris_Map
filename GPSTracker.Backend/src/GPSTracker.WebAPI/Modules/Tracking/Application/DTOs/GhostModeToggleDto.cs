namespace GPSTracker.WebAPI.Modules.Tracking.Application.DTOs;

public class GhostModeToggleDto
{
    public string UserId { get; set; } = null!;
    public bool IsGhostMode { get; set; }
    public DateTime Timestamp { get; set; }
}
