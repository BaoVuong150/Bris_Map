using GPSTracker.WebAPI.Modules.Identity.Application.DTOs;
using GPSTracker.WebAPI.Modules.Identity.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using System.Security.Cryptography;

namespace GPSTracker.WebAPI.Modules.Identity.Application.Services;

public class AuthService(UserManager<User> userManager, IJwtTokenService jwtTokenService, ILogger<AuthService> logger) : IAuthService
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

    public async Task<(bool IsSuccess, AuthResponseDto? Data, string RefreshToken, string ErrorMessage)> RefreshTokenAsync(string token, string refreshToken, string ipAddress)
    {
        var principal = jwtTokenService.GetPrincipalFromExpiredToken(token);
        if (principal == null) return (false, null, string.Empty, "Invalid access token.");

        var username = principal.Identity?.Name;
        if (username == null) return (false, null, string.Empty, "Invalid access token.");

        var user = await userManager.FindByNameAsync(username);
        if (user == null || await userManager.IsLockedOutAsync(user)) return (false, null, string.Empty, "User is inactive or locked out.");

        var storedValue = await userManager.GetAuthenticationTokenAsync(user, "GPSTracker", "RefreshToken");
        if (string.IsNullOrEmpty(storedValue)) return (false, null, string.Empty, "Invalid refresh token session.");

        var parts = storedValue.Split('|');
        if (parts.Length != 2) return (false, null, string.Empty, "Corrupted refresh token data.");

        var expiryString = parts[0];
        var storedHash = parts[1];

        // 1. Kiểm tra Expiry Date
        if (DateTime.TryParse(expiryString, out var expiryDate) && expiryDate < DateTime.UtcNow)
        {
            await userManager.RemoveAuthenticationTokenAsync(user, "GPSTracker", "RefreshToken");
            return (false, null, string.Empty, "Refresh token expired. Please login again.");
        }

        // 2. Kiểm tra tính toàn vẹn bằng SHA-256 Hash + FixedTimeEquals để chống Timing Attack
        var incomingHash = jwtTokenService.HashToken(refreshToken);
        bool isValid = CryptographicOperations.FixedTimeEquals(
            Convert.FromBase64String(incomingHash),
            Convert.FromBase64String(storedHash)
        );

        if (!isValid)
        {
            logger.LogWarning("SECURITY ALERT: Refresh Token Reuse detected for user {Username} at {IP}", username, ipAddress);
            await userManager.RemoveAuthenticationTokenAsync(user, "GPSTracker", "RefreshToken");
            return (false, null, string.Empty, "Invalid refresh token. All sessions revoked for security.");
        }

        // Nếu hợp lệ, sinh cặp token mới (Rotation)
        var (data, newRefreshToken) = await GenerateUserTokensAsync(user);

        return (true, data, newRefreshToken, string.Empty);
    }

    public async Task<(bool IsSuccess, string ErrorMessage)> LogoutAsync(string username)
    {
        var user = await userManager.FindByNameAsync(username);
        if (user == null) return (false, "User not found.");

        await userManager.RemoveAuthenticationTokenAsync(user, "GPSTracker", "RefreshToken");
        return (true, string.Empty);
    }

    // --- HELPER METHOD ĐỂ TÁI SỬ DỤNG CHO REGISTER, LOGIN, REFRESH ---
    private async Task<(AuthResponseDto Data, string RefreshToken)> GenerateUserTokensAsync(User user)
    {
        var token = jwtTokenService.GenerateToken(user);
        var refreshToken = jwtTokenService.GenerateRefreshToken();
        var hashedRefreshToken = jwtTokenService.HashToken(refreshToken);
        var expiryDate = DateTime.UtcNow.AddDays(7).ToString("O");
        var tokenValue = $"{expiryDate}|{hashedRefreshToken}"; // Expiry đứng trước để Fail-fast

        // Lưu HASHED Refresh Token + Expiry vào bảng AspNetUserTokens
        await userManager.SetAuthenticationTokenAsync(user, "GPSTracker", "RefreshToken", tokenValue);

        user.LastSeenAt = DateTime.UtcNow;
        await userManager.UpdateAsync(user);

        var data = new AuthResponseDto
        {
            Token = token,
            Username = user.UserName ?? string.Empty,
            Email = user.Email ?? string.Empty,
            DisplayName = user.DisplayName
        };

        return (data, refreshToken);
    }
}
