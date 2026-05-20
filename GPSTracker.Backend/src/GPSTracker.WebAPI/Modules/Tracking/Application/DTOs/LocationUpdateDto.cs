namespace GPSTracker.WebAPI.Modules.Tracking.Application.DTOs;

public class LocationUpdateDto
{
    public string UserId { get; set; } = null!;
    public double Lat { get; set; }
    public double Lng { get; set; }
    public double Speed { get; set; }
    public double Heading { get; set; }
    public DateTime Timestamp { get; set; }
}
