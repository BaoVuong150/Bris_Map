using GPSTracker.WebAPI.Modules.Identity.Domain.Entities;
using System.ComponentModel.DataAnnotations;

namespace GPSTracker.WebAPI.Modules.Messages.Domain.Entities;

public class Message
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public string SenderId { get; set; } = null!;
    public User? Sender { get; set; }

    [Required]
    public string ReceiverId { get; set; } = null!;
    public User? Receiver { get; set; }

    [Required]
    [MaxLength(2000)]
    public string Content { get; set; } = null!;

    public DateTime SentAt { get; set; } = DateTime.UtcNow;
}
