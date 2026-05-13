using GPSTracker.WebAPI.Modules.Friendships.Domain.Entities;
using GPSTracker.WebAPI.Modules.Identity.Domain.Entities;
using GPSTracker.WebAPI.Modules.Tracking.Domain.Entities;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace GPSTracker.WebAPI.Shared.Infrastructure.Data;

public class AppDbContext : IdentityDbContext<User>
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<Friendship> Friendships { get; set; }
    public DbSet<LocationHistory> LocationHistories { get; set; }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // Kích hoạt PostGIS extension trên PostgreSQL
        builder.HasPostgresExtension("postgis");

        // Cấu hình bảng Friendship (tránh lỗi cascade delete vòng lặp)
        builder.Entity<Friendship>()
            .HasOne(f => f.Requester)
            .WithMany()
            .HasForeignKey(f => f.RequesterId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<Friendship>()
            .HasOne(f => f.Receiver)
            .WithMany()
            .HasForeignKey(f => f.ReceiverId)
            .OnDelete(DeleteBehavior.Restrict);

        // Ràng buộc duy nhất: Một cặp user chỉ có 1 quan hệ friendship
        builder.Entity<Friendship>()
            .HasIndex(f => new { f.RequesterId, f.ReceiverId })
            .IsUnique();
    }
}
