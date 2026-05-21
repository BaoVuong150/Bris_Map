using GPSTracker.WebAPI.Modules.Identity.Application.Services;
using GPSTracker.WebAPI.Modules.Identity.Domain.Entities;
using GPSTracker.WebAPI.Modules.Messages.Application.Interfaces;
using GPSTracker.WebAPI.Modules.Messages.Application.Services;
using GPSTracker.WebAPI.Modules.Tracking.Application.Interfaces;
using GPSTracker.WebAPI.Modules.Tracking.Application.Services;
using GPSTracker.WebAPI.Shared.Infrastructure.Data;
using GPSTracker.WebAPI.Shared.Infrastructure.Middlewares;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.RateLimiting;
using System.Threading.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Security.Claims;

namespace GPSTracker.WebAPI.Shared.Infrastructure.Extensions;

public static class DependencyInjection
{
    public static IServiceCollection AddDatabaseConfiguration(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContext<AppDbContext>(options =>
            options.UseNpgsql(
                configuration.GetConnectionString("DefaultConnection"),
                o => o.UseNetTopologySuite()
            ));

        return services;
    }

    public static IServiceCollection AddRedisConfiguration(this IServiceCollection services, IConfiguration configuration)
    {
        var redisConfig = configuration.GetConnectionString("RedisConnection");
        
        services.AddStackExchangeRedisCache(options =>
        {
            options.Configuration = redisConfig;
            options.InstanceName = "GPSTracker_"; // Prefix cho các key trong Redis
        });

        // Inject IConnectionMultiplexer để cho phép thao tác trực tiếp với Redis Data Types (Sets, Hashes)
        if (!string.IsNullOrEmpty(redisConfig))
        {
            services.AddSingleton<StackExchange.Redis.IConnectionMultiplexer>(sp => 
                StackExchange.Redis.ConnectionMultiplexer.Connect(redisConfig));
        }

        return services;
    }

    public static IServiceCollection AddIdentityConfiguration(this IServiceCollection services)
    {
        services.AddIdentityCore<User>(options =>
        {
            options.Password.RequireDigit = true;
            options.Password.RequiredLength = 6;
            options.Password.RequireNonAlphanumeric = false;
            options.Password.RequireUppercase = false;
            options.Password.RequireLowercase = false;
        })
        .AddEntityFrameworkStores<AppDbContext>()
        .AddDefaultTokenProviders();

        return services;
    }

    public static IServiceCollection AddJwtAuthentication(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddScoped<IJwtTokenService, JwtTokenService>();
        services.AddScoped<IAuthService, AuthService>();

        var jwtSettings = configuration.GetSection("JwtSettings");
        var secretKey = jwtSettings["SecretKey"] ?? throw new InvalidOperationException("Jwt SecretKey is missing");

        services.AddAuthentication(options =>
        {
            options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
            options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
        })
        .AddJwtBearer(options =>
        {
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = jwtSettings["Issuer"],
                ValidAudience = jwtSettings["Audience"],
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey))
            };

            // [SIGNALR AUTH]: Bắt buộc phải có để đọc Access Token từ QueryString (Vì WebSocket không có Header)
            options.Events = new JwtBearerEvents
            {
                OnMessageReceived = context =>
                {
                    var accessToken = context.Request.Query["access_token"];

                    // Nếu request là gửi tới Hub (WebSocket) thì lấy Token từ URL
                    var path = context.HttpContext.Request.Path;
                    if (!string.IsNullOrEmpty(accessToken) &&
                        (path.StartsWithSegments("/hubs")))
                    {
                        context.Token = accessToken;
                    }
                    return Task.CompletedTask;
                }
            };
        });

        return services;
    }

    public static IServiceCollection AddRateLimitingConfiguration(this IServiceCollection services)
    {
        services.AddRateLimiter(options =>
        {
            options.AddPolicy("login_policy", context =>
            {
                var ipAddress = context.Connection.RemoteIpAddress?.ToString() ?? "unknown_ip";
                return RateLimitPartition.GetFixedWindowLimiter(ipAddress, _ => new FixedWindowRateLimiterOptions
                {
                    Window = TimeSpan.FromMinutes(1),
                    PermitLimit = 150,
                    QueueLimit = 0,
                    QueueProcessingOrder = QueueProcessingOrder.OldestFirst
                });
            });

            // Chính sách dành cho các API sau khi đã đăng nhập (Rate limit theo UserId)
            options.AddPolicy("user_policy", context =>
            {
                // Lấy UserId từ Token. Nếu chưa đăng nhập thì dự phòng lấy IP Address.
                var userId = context.User.FindFirstValue(ClaimTypes.NameIdentifier)
                             ?? context.Connection.RemoteIpAddress?.ToString()
                             ?? "unknown_user";

                return RateLimitPartition.GetFixedWindowLimiter(userId, _ => new FixedWindowRateLimiterOptions
                {
                    Window = TimeSpan.FromSeconds(10), // Giới hạn trong 10 giây
                    PermitLimit = 30,                  // Cho phép tối đa 30 thao tác
                    QueueLimit = 0,
                    QueueProcessingOrder = QueueProcessingOrder.OldestFirst
                });
            });

            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

            // Xử lý khi bị chặn: Trả về cục JSON chuẩn chỉ để Frontend React đọc được
            options.OnRejected = async (context, token) =>
            {
                context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
                context.HttpContext.Response.ContentType = "application/json";
                await context.HttpContext.Response.WriteAsync("{\"message\": \"Bạn đã thao tác quá nhiều lần. Vui lòng đợi 1 phút rồi thử lại!\"}", cancellationToken: token);
            };
        });

        return services;
    }

    public static IServiceCollection AddExceptionHandlingConfiguration(this IServiceCollection services)
    {
        services.AddExceptionHandler<GlobalExceptionHandler>();
        services.AddProblemDetails(); // Cần thiết để ASP.NET Core tự động serialize lỗi thành chuẩn ProblemDetails (RFC 7807)
        return services;
    }

    public static IServiceCollection AddCorsConfiguration(this IServiceCollection services)
    {
        services.AddCors(options =>
        {
            options.AddPolicy("AllowFrontend", policy =>
            {
                policy.SetIsOriginAllowed(origin => true) // Cho phép MỌI Frontend kết nối (kể cả Vercel Preview)
                      .AllowAnyHeader()
                      .AllowAnyMethod()
                      .AllowCredentials(); // BẮT BUỘC: Cho phép gửi kèm HttpOnly Cookie
            });
        });

        return services;
    }

    public static IServiceCollection AddApplicationServices(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddScoped<GPSTracker.WebAPI.Modules.Friendships.Application.Interfaces.IFriendshipService, GPSTracker.WebAPI.Modules.Friendships.Application.Services.FriendshipService>();
        services.AddScoped<IRedisTrackingService, RedisTrackingService>();
        services.AddScoped<IMessageService, MessageService>();
        
        // Đăng ký SignalR kèm Redis Backplane để Scale Out
        var redisConfig = configuration.GetConnectionString("RedisConnection");
        services.AddSignalR().AddStackExchangeRedis(redisConfig ?? "");
        
        return services;
    }
}
