using System.Security.Claims;
using GPSTracker.WebAPI.Modules.Identity.Domain.Entities;

namespace GPSTracker.WebAPI.Modules.Identity.Application.Services;

public interface IJwtTokenService
{
    string GenerateToken(User user);
    string GenerateRefreshToken();
    string HashToken(string token);
}
