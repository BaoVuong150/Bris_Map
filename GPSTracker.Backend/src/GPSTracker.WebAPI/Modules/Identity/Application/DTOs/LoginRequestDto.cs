namespace GPSTracker.WebAPI.Modules.Identity.Application.DTOs;

public class LoginRequestDto
{
    public string UsernameOrEmail { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}
