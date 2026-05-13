using GPSTracker.WebAPI.Modules.Identity.Application.DTOs;

namespace GPSTracker.WebAPI.Modules.Identity.Application.Services;

public interface IAuthService
{
    Task<(bool IsSuccess, AuthResponseDto? Data, string RefreshToken, string ErrorMessage)> RegisterAsync(RegisterRequestDto request);
    Task<(bool IsSuccess, AuthResponseDto? Data, string RefreshToken, string ErrorMessage)> LoginAsync(LoginRequestDto request);
    Task<(bool IsSuccess, AuthResponseDto? Data, string RefreshToken, string ErrorMessage)> RefreshTokenAsync(string token, string refreshToken, string ipAddress);
    Task<(bool IsSuccess, string ErrorMessage)> LogoutAsync(string username);
}
