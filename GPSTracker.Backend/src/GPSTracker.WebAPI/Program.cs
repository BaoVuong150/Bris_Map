using GPSTracker.WebAPI.Shared.Infrastructure.Data;
using GPSTracker.WebAPI.Shared.Infrastructure.Extensions;
using GPSTracker.WebAPI.Shared.Infrastructure.Hubs;
using Microsoft.AspNetCore.HttpOverrides;

var builder = WebApplication.CreateBuilder(args);

// Cấu hình giải mã IP thật của Client khi chạy sau Load Balancer của Render
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

// 1. Cấu hình các dịch vụ qua Extension Methods (Giúp Program.cs sạch sẽ)
builder.Services.AddDatabaseConfiguration(builder.Configuration);
builder.Services.AddRedisConfiguration(builder.Configuration); // Thêm Redis
builder.Services.AddIdentityConfiguration();
builder.Services.AddJwtAuthentication(builder.Configuration);
builder.Services.AddRateLimitingConfiguration();
builder.Services.AddExceptionHandlingConfiguration(); // Lưới lọc lỗi tập trung
builder.Services.AddCorsConfiguration();
builder.Services.AddApplicationServices(builder.Configuration); // Đăng ký các Business Services (Friendships, v.v...)

builder.Services.AddControllers();

var app = builder.Build();

app.UseForwardedHeaders(); // BẮT BUỘC ĐẶT ĐẦU TIÊN để đọc IP thật

// 4. Tự động chạy Migration và Seed data giả lập
try
{
    await DbSeeder.SeedAsync(app.Services);
}
catch (Exception ex)
{
    Console.WriteLine($"Seeding failed: {ex.Message}");
}

if (app.Environment.IsDevelopment())
{
    // Môi trường Dev (Đã tắt Scalar, test qua Postman)
}

app.UseCors("AllowFrontend"); // BẮT BUỘC ĐẶT TRƯỚC RateLimiter và Authentication

app.UseRateLimiter(); // Đặt sau CORS để lỗi 429 vẫn có Header CORS trả về Frontend

app.UseExceptionHandler(); // Đặt ngay đầu Pipeline (sau các middleware cấu hình cơ bản) để bắt mọi lỗi ở bên dưới

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// [SIGNALR]: Mở ĐÚNG 1 ĐƯỜNG ỐNG DUY NHẤT (/hubs/bris) để tiết kiệm Pin cho thiết bị
app.MapHub<AppHub>("/hubs/bris");

app.Run();
