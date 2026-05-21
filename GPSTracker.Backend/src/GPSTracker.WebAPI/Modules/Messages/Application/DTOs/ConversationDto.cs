namespace GPSTracker.WebAPI.Modules.Messages.Application.DTOs;

public class ConversationDto
{
    public string PartnerId { get; set; } = null!;
    public string PartnerName { get; set; } = null!;
    public string? LastMessage { get; set; }
    public DateTime LastMessageTime { get; set; }
    public int UnreadCount { get; set; }
}
