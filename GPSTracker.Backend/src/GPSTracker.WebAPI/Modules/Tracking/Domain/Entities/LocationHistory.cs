using GPSTracker.WebAPI.Modules.Identity.Domain.Entities;
using NetTopologySuite.Geometries;

namespace GPSTracker.WebAPI.Modules.Tracking.Domain.Entities;

public class LocationHistory
{
    public int Id { get; set; }
    
    public string UserId { get; set; } = null!;
    public User User { get; set; } = null!;

    // Cột lưu trữ tọa độ theo chuẩn PostGIS Geometry
    public Point Location { get; set; } = null!;

    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}
