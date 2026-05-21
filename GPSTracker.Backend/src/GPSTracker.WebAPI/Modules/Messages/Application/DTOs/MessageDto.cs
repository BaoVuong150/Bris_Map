namespace GPSTracker.WebAPI.Modules.Messages.Application.DTOs;

public class MessageDto
{
    public Guid Id { get; set; }
    public string SenderId { get; set; } = null!;
    public string ReceiverId { get; set; } = null!;
    public string Content { get; set; } = null!;
    public DateTime SentAt { get; set; }
    public bool IsRead { get; set; }
}
