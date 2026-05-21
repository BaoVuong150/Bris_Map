using GPSTracker.WebAPI.Modules.Identity.Application.DTOs;
using GPSTracker.WebAPI.Modules.Identity.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace GPSTracker.WebAPI.Modules.Identity.Presentation.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(IAuthService authService) : ControllerBase
{

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequestDto request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var result = await authService.RegisterAsync(request);
        if (!result.IsSuccess || result.Data == null)
        {
            return BadRequest(new { message = result.ErrorMessage });
        }

        // Đính kèm Refresh Token vào HttpOnly Cookie
        AppendRefreshTokenCookie(result.RefreshToken);

        return Ok(result.Data);
    }

    [HttpPost("login")]
    [EnableRateLimiting("login_policy")]
    public async Task<IActionResult> Login([FromBody] LoginRequestDto request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var result = await authService.LoginAsync(request);

        if (!result.IsSuccess || result.Data == null)
        {
            return Unauthorized(new { message = result.ErrorMessage });
        }

        // Đính kèm Refresh Token vào HttpOnly Cookie
        AppendRefreshTokenCookie(result.RefreshToken);

        return Ok(result.Data);
    }

    [HttpPost("refresh-token")]
    [EnableRateLimiting("login_policy")] // Tránh Brute-force Refresh
    public async Task<IActionResult> RefreshToken()
    {
        // Lấy Refresh Token từ HttpOnly Cookie (KHÔNG lấy từ Body để chống JS đọc)
        var incomingRefreshToken = Request.Cookies["refreshToken"];

        if (string.IsNullOrEmpty(incomingRefreshToken)) return Unauthorized(new { message = "Refresh token is missing." });

        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown_ip";

        var result = await authService.RefreshTokenAsync(incomingRefreshToken, ipAddress);

        if (!result.IsSuccess || result.Data == null)
        {
            return Unauthorized(new { message = result.ErrorMessage });
        }

        AppendRefreshTokenCookie(result.RefreshToken);

        return Ok(result.Data);
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        var incomingRefreshToken = Request.Cookies["refreshToken"];
        
        // Không quan tâm Request có truyền Access Token hay không (xóa [Authorize]), 
        // miễn là có Cookie Refresh Token là ta cho xóa ở Redis
        if (!string.IsNullOrEmpty(incomingRefreshToken))
        {
            await authService.LogoutAsync(incomingRefreshToken);
        }

        // Xóa Cookie
        DeleteRefreshTokenCookie();

        return Ok(new { message = "Logged out successfully." });
    }

    private void AppendRefreshTokenCookie(string token)
    {
        Response.Cookies.Append("refreshToken", token, new CookieOptions
        {
            HttpOnly = true,
            Secure = true, // Bắt buộc bằng True khi dùng SameSiteMode.None
            SameSite = SameSiteMode.None, // Bắt buộc để Frontend khác Domain (Vercel) gửi được Cookie
            Expires = DateTime.UtcNow.AddDays(7),
            Path = "/api/auth/refresh-token"
        });
    }

    private void DeleteRefreshTokenCookie()
    {
        Response.Cookies.Delete("refreshToken", new CookieOptions { 
            Path = "/api/auth/refresh-token",
            Secure = true,
            SameSite = SameSiteMode.None
        });
    }
}
