using GPSTracker.WebAPI.Modules.Identity.Application.DTOs;
using GPSTracker.WebAPI.Modules.Identity.Application.Services;
using GPSTracker.WebAPI.Modules.Identity.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using System.Security.Cryptography;

namespace GPSTracker.WebAPI.Modules.Identity.Presentation.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly AuthService _authService;

    public AuthController(AuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequestDto request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var result = await _authService.RegisterAsync(request);
        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.ErrorMessage });
        }

        return Ok(new { message = "User registered successfully." });
    }

    [HttpPost("login")]
    [EnableRateLimiting("login_policy")]
    public async Task<IActionResult> Login([FromBody] LoginRequestDto request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var result = await _authService.LoginAsync(request);

        if (!result.IsSuccess || result.Data == null)
        {
            return Unauthorized(new { message = result.ErrorMessage });
        }

        // Đính kèm Refresh Token vào HttpOnly Cookie
        Response.Cookies.Append("refreshToken", result.Data.RefreshToken, new CookieOptions
        {
            HttpOnly = true,
            Secure = true, // Yêu cầu HTTPS ở Production
            SameSite = SameSiteMode.Strict,
            Expires = DateTime.UtcNow.AddDays(7),
            Path = "/api/auth/refresh-token"
        });

        return Ok(result.Data);
    }

    [HttpPost("refresh-token")]
    [EnableRateLimiting("login_policy")] // Tránh Brute-force Refresh
    public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenRequestDto request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        // Lấy Refresh Token từ request body hoặc HttpOnly Cookie
        var incomingRefreshToken = request.RefreshToken;
        if (string.IsNullOrEmpty(incomingRefreshToken))
        {
            incomingRefreshToken = Request.Cookies["refreshToken"];
        }

        if (string.IsNullOrEmpty(incomingRefreshToken)) return Unauthorized("Refresh token is missing.");

        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown_ip";

        var result = await _authService.RefreshTokenAsync(request.Token, incomingRefreshToken, ipAddress);

        if (!result.IsSuccess || result.Data == null)
        {
            return Unauthorized(result.ErrorMessage);
        }

        Response.Cookies.Append("refreshToken", result.Data.RefreshToken, new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.Strict,
            Expires = DateTime.UtcNow.AddDays(7),
            Path = "/api/auth/refresh-token"
        });

        return Ok(result.Data);
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        // Yêu cầu token hợp lệ mới được đăng xuất (Sẽ thêm Authorization Attribute sau)
        var username = User.Identity?.Name;
        if (username == null) return Unauthorized();

        var result = await _authService.LogoutAsync(username);

        if (!result.IsSuccess)
        {
            return Unauthorized();
        }

        // Xóa Cookie (Phải truyền Path trùng với lúc tạo)
        Response.Cookies.Delete("refreshToken", new CookieOptions { Path = "/api/auth/refresh-token" });

        return Ok(new { message = "Logged out successfully." });
    }
}
