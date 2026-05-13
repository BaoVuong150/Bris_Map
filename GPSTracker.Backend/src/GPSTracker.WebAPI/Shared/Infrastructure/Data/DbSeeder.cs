using GPSTracker.WebAPI.Modules.Identity.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace GPSTracker.WebAPI.Shared.Infrastructure.Data;

public static class DbSeeder
{
    public static async Task SeedAsync(IServiceProvider serviceProvider)
    {
        using var scope = serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<User>>();

        // Tự động Apply Migration khi chạy ứng dụng
        await context.Database.MigrateAsync();

        if (!await context.Users.AnyAsync())
        {
            var users = new List<User>
            {
                new User { UserName = "baovuong150", Email = "bao@test.com", DisplayName = "Bảo Vương" },
                new User { UserName = "alice", Email = "alice@test.com", DisplayName = "Alice Nguyen" },
                new User { UserName = "bob", Email = "bob@test.com", DisplayName = "Bob Tran" }
            };

            foreach (var user in users)
            {
                await userManager.CreateAsync(user, "Password123!");
            }
        }
    }
}
