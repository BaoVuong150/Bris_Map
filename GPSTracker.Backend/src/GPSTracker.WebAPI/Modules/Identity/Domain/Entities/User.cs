using Microsoft.AspNetCore.Identity;

namespace GPSTracker.WebAPI.Modules.Identity.Domain.Entities;

public class User : IdentityUser
{
    public string DisplayName { get; set; } = string.Empty;
    public DateTime? LastSeenAt { get; set; }
}
