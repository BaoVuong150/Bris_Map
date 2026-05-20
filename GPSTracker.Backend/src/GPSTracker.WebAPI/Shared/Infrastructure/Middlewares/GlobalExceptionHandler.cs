using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace GPSTracker.WebAPI.Shared.Infrastructure.Middlewares;

public class GlobalExceptionHandler : IExceptionHandler
{
    private readonly ILogger<GlobalExceptionHandler> _logger;

    public GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger)
    {
        _logger = logger;
    }

    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        // 1. Log lỗi hệ thống để sếp đọc (Log này sẽ ghi ra Console hoặc File Log)
        _logger.LogError(exception, "❌ Exception occurred: {Message}", exception.Message);

        // 2. Format lỗi thành chuẩn ProblemDetails JSON
        var problemDetails = new ProblemDetails
        {
            Status = StatusCodes.Status500InternalServerError,
            Title = "Lỗi Máy Chủ Nội Bộ (Internal Server Error)",
            Detail = "Một lỗi máy chủ vừa xảy ra. Đội ngũ kỹ thuật đã được thông báo."
        };

        // Nếu đây là môi trường Development, ta có thể nhét thêm StackTrace để dễ debug
        // Nhưng hiện tại để bảo mật tuyệt đối, ta giấu luôn.

        httpContext.Response.StatusCode = problemDetails.Status.Value;

        // Trả về JSON chuẩn của RFC 7807 (Problem Details)
        await httpContext.Response.WriteAsJsonAsync(problemDetails, cancellationToken);

        // Trả về true báo hiệu lỗi đã được chặn và xử lý, không văng HTML ra nữa
        return true; 
    }
}
