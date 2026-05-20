using GPSTracker.WebAPI.Modules.Identity.Application.DTOs;
using GPSTracker.WebAPI.Modules.Identity.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using System.Security.Cryptography;

using Microsoft.Extensions.Caching.Distributed;

namespace GPSTracker.WebAPI.Modules.Identity.Application.Services;

public class AuthService(UserManager<User> userManager, IJwtTokenService jwtTokenService, IDistributedCache cache) : IAuthService
{

    public async Task<(bool IsSuccess, AuthResponseDto? Data, string RefreshToken, string ErrorMessage)> RegisterAsync(RegisterRequestDto request)
    {
        var existingUser = await userManager.FindByEmailAsync(request.Email) ?? await userManager.FindByNameAsync(request.Username);
        if (existingUser != null)
        {
            return (false, null, string.Empty, "Username or Email already exists.");
        }

        var user = new User
        {
            UserName = request.Username,
            Email = request.Email,
            DisplayName = request.DisplayName
        };

        var result = await userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
        {
            var errors = string.Join(", ", result.Errors.Select(e => e.Description));
            return (false, null, string.Empty, errors);
        }

        // Tự động sinh Token ngay sau khi đăng ký thành công (Auto-login)
        var (data, refreshToken) = await GenerateUserTokensAsync(user);

        return (true, data, refreshToken, string.Empty);
    }

    public async Task<(bool IsSuccess, AuthResponseDto? Data, string RefreshToken, string ErrorMessage)> LoginAsync(LoginRequestDto request)
    {
        var user = await userManager.FindByEmailAsync(request.UsernameOrEmail) ?? await userManager.FindByNameAsync(request.UsernameOrEmail);
        if (user == null) return (false, null, string.Empty, "Invalid credentials.");

        var isPasswordValid = await userManager.CheckPasswordAsync(user, request.Password);
        if (!isPasswordValid) return (false, null, string.Empty, "Invalid credentials.");

        var (data, refreshToken) = await GenerateUserTokensAsync(user);

        return (true, data, refreshToken, string.Empty);
    }

    public async Task<(bool IsSuccess, AuthResponseDto? Data, string RefreshToken, string ErrorMessage)> RefreshTokenAsync(string refreshToken, string ipAddress)
    {
        var hashedIncomingToken = jwtTokenService.HashToken(refreshToken);
        var cacheKey = $"RT:{hashedIncomingToken}";
        var storedValue = await cache.GetStringAsync(cacheKey);

        if (string.IsNullOrEmpty(storedValue)) return (false, null, string.Empty, "Invalid refresh token session.");

        var parts = storedValue.Split('|');
        if (parts.Length != 2) return (false, null, string.Empty, "Corrupted refresh token data.");

        var expiryString = parts[0];
        var userId = parts[1]; // Lấy UserId từ Redis

        // 1. Kiểm tra Expiry Date
        if (DateTime.TryParse(expiryString, out var expiryDate) && expiryDate < DateTime.UtcNow)
        {
            await cache.RemoveAsync(cacheKey);
            return (false, null, string.Empty, "Refresh token expired. Please login again.");
        }

        var user = await userManager.FindByIdAsync(userId);
        if (user == null || await userManager.IsLockedOutAsync(user)) return (false, null, string.Empty, "User is inactive or locked out.");

        // Nếu hợp lệ, xóa token cũ (Rotation) và sinh cặp token mới
        await cache.RemoveAsync(cacheKey);
        var (data, newRefreshToken) = await GenerateUserTokensAsync(user);

        return (true, data, newRefreshToken, string.Empty);
    }

    public async Task<(bool IsSuccess, string ErrorMessage)> LogoutAsync(string refreshToken)
    {
        if (string.IsNullOrEmpty(refreshToken)) return (true, string.Empty);

        var hashedToken = jwtTokenService.HashToken(refreshToken);
        var cacheKey = $"RT:{hashedToken}";
        await cache.RemoveAsync(cacheKey);

        return (true, string.Empty);
    }

    // --- HELPER METHOD ĐỂ TÁI SỬ DỤNG CHO REGISTER, LOGIN, REFRESH ---
    private async Task<(AuthResponseDto Data, string RefreshToken)> GenerateUserTokensAsync(User user)
    {
        var token = jwtTokenService.GenerateToken(user);
        var refreshToken = jwtTokenService.GenerateRefreshToken();
        var hashedRefreshToken = jwtTokenService.HashToken(refreshToken);
        var expiryDate = DateTime.UtcNow.AddDays(7).ToString("O");

        // Value bây giờ lưu UserId thay vì Hash. Key là Hash của Token.
        var tokenValue = $"{expiryDate}|{user.Id}";

        // Lưu vào Redis (Chỉ thiết bị cầm đúng Refresh Token này mới gửi lên khớp cái Hash này)
        var cacheKey = $"RT:{hashedRefreshToken}";
        await cache.SetStringAsync(cacheKey, tokenValue, new DistributedCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = TimeSpan.FromDays(7)
        });

        // Bỏ lưu Database LastSeenAt đồng bộ ở đây để tăng max ping (1 triệu user/s). 
        // Có thể đẩy LastSeenAt xuống Message Queue (RabbitMQ) sau.

        var data = new AuthResponseDto
        {
            Id = user.Id,
            Token = token,
            Username = user.UserName ?? string.Empty,
            Email = user.Email ?? string.Empty,
            DisplayName = user.DisplayName
        };

        return (data, refreshToken);
    }
}
