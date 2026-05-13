using GPSTracker.WebAPI.Modules.Identity.Application.DTOs;
using GPSTracker.WebAPI.Modules.Identity.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using System.Security.Cryptography;

namespace GPSTracker.WebAPI.Modules.Identity.Application.Services;

public class AuthService
{
    private readonly UserManager<User> _userManager;
    private readonly JwtTokenService _jwtTokenService;
    private readonly ILogger<AuthService> _logger;

    public AuthService(UserManager<User> userManager, JwtTokenService jwtTokenService, ILogger<AuthService> logger)
    {
        _userManager = userManager;
        _jwtTokenService = jwtTokenService;
        _logger = logger;
    }

    public async Task<(bool IsSuccess, string ErrorMessage)> RegisterAsync(RegisterRequestDto request)
    {
        var existingUser = await _userManager.FindByEmailAsync(request.Email) ?? await _userManager.FindByNameAsync(request.Username);
        if (existingUser != null)
        {
            return (false, "Username or Email already exists.");
        }

        var user = new User
        {
            UserName = request.Username,
            Email = request.Email,
            DisplayName = request.DisplayName
        };

        var result = await _userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
        {
            var errors = string.Join(", ", result.Errors.Select(e => e.Description));
            return (false, errors);
        }

        return (true, string.Empty);
    }

    public async Task<(bool IsSuccess, AuthResponseDto? Data, string ErrorMessage)> LoginAsync(LoginRequestDto request)
    {
        var user = await _userManager.FindByEmailAsync(request.UsernameOrEmail) ?? await _userManager.FindByNameAsync(request.UsernameOrEmail);
        if (user == null) return (false, null, "Invalid credentials.");

        var isPasswordValid = await _userManager.CheckPasswordAsync(user, request.Password);
        if (!isPasswordValid) return (false, null, "Invalid credentials.");

        var token = _jwtTokenService.GenerateToken(user);
        var refreshToken = _jwtTokenService.GenerateRefreshToken();
        var hashedRefreshToken = _jwtTokenService.HashToken(refreshToken);
        var expiryDate = DateTime.UtcNow.AddDays(7).ToString("O");
        var tokenValue = $"{expiryDate}|{hashedRefreshToken}"; // Expiry đứng trước để Fail-fast

        // Lưu HASHED Refresh Token + Expiry vào bảng AspNetUserTokens
        await _userManager.SetAuthenticationTokenAsync(user, "GPSTracker", "RefreshToken", tokenValue);

        user.LastSeenAt = DateTime.UtcNow;
        await _userManager.UpdateAsync(user);

        return (true, new AuthResponseDto
        {
            Token = token,
            RefreshToken = refreshToken,
            Username = user.UserName ?? string.Empty,
            Email = user.Email ?? string.Empty,
            DisplayName = user.DisplayName
        }, string.Empty);
    }

    public async Task<(bool IsSuccess, AuthResponseDto? Data, string ErrorMessage)> RefreshTokenAsync(string token, string refreshToken, string ipAddress)
    {
        var principal = _jwtTokenService.GetPrincipalFromExpiredToken(token);
        if (principal == null) return (false, null, "Invalid access token.");

        var username = principal.Identity?.Name;
        if (username == null) return (false, null, "Invalid access token.");

        var user = await _userManager.FindByNameAsync(username);
        if (user == null || await _userManager.IsLockedOutAsync(user)) return (false, null, "User is inactive or locked out.");

        var storedValue = await _userManager.GetAuthenticationTokenAsync(user, "GPSTracker", "RefreshToken");
        if (string.IsNullOrEmpty(storedValue)) return (false, null, "Invalid refresh token session.");

        var parts = storedValue.Split('|');
        if (parts.Length != 2) return (false, null, "Corrupted refresh token data.");

        var expiryString = parts[0];
        var storedHash = parts[1];

        // 1. Kiểm tra Expiry Date
        if (DateTime.TryParse(expiryString, out var expiryDate) && expiryDate < DateTime.UtcNow)
        {
            await _userManager.RemoveAuthenticationTokenAsync(user, "GPSTracker", "RefreshToken");
            return (false, null, "Refresh token expired. Please login again.");
        }

        // 2. Kiểm tra tính toàn vẹn bằng SHA-256 Hash + FixedTimeEquals để chống Timing Attack
        var incomingHash = _jwtTokenService.HashToken(refreshToken);
        bool isValid = CryptographicOperations.FixedTimeEquals(
            Convert.FromBase64String(incomingHash),
            Convert.FromBase64String(storedHash)
        );

        if (!isValid)
        {
            _logger.LogWarning("SECURITY ALERT: Refresh Token Reuse detected for user {Username} at {IP}", username, ipAddress);
            await _userManager.RemoveAuthenticationTokenAsync(user, "GPSTracker", "RefreshToken");
            return (false, null, "Invalid refresh token. All sessions revoked for security.");
        }

        // Nếu hợp lệ, sinh cặp token mới (Rotation)
        var newToken = _jwtTokenService.GenerateToken(user);
        var newRefreshToken = _jwtTokenService.GenerateRefreshToken();
        var newHashedToken = _jwtTokenService.HashToken(newRefreshToken);
        var newExpiry = DateTime.UtcNow.AddDays(7).ToString("O");

        await _userManager.SetAuthenticationTokenAsync(user, "GPSTracker", "RefreshToken", $"{newExpiry}|{newHashedToken}");

        return (true, new AuthResponseDto
        {
            Token = newToken,
            RefreshToken = newRefreshToken,
            Username = user.UserName ?? string.Empty,
            Email = user.Email ?? string.Empty,
            DisplayName = user.DisplayName
        }, string.Empty);
    }

    public async Task<(bool IsSuccess, string ErrorMessage)> LogoutAsync(string username)
    {
        var user = await _userManager.FindByNameAsync(username);
        if (user == null) return (false, "User not found.");

        await _userManager.RemoveAuthenticationTokenAsync(user, "GPSTracker", "RefreshToken");
        return (true, string.Empty);
    }
}
