using GPSTracker.WebAPI.Shared.Infrastructure.Data;
using GPSTracker.WebAPI.Shared.Infrastructure.Extensions;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

// 1. Cấu hình các dịch vụ qua Extension Methods (Giúp Program.cs sạch sẽ)
builder.Services.AddDatabaseConfiguration(builder.Configuration);
builder.Services.AddIdentityConfiguration();
builder.Services.AddJwtAuthentication(builder.Configuration);
builder.Services.AddRateLimitingConfiguration();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddOpenApi();

var app = builder.Build();

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
    app.MapOpenApi();
    app.MapScalarApiReference();
}

app.UseRateLimiter(); // Phải đặt trước Authentication/Authorization

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
