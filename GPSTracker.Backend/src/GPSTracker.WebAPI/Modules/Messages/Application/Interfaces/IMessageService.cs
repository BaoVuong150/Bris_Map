using GPSTracker.WebAPI.Modules.Messages.Application.DTOs;

namespace GPSTracker.WebAPI.Modules.Messages.Application.Interfaces;

public interface IMessageService
{
    Task<List<MessageDto>> GetChatHistoryAsync(string userId1, string userId2, int limit = 50);
    Task<MessageDto> SendMessageAsync(string senderId, string receiverId, string content);
    Task<int> GetTotalUnreadCountAsync(string userId);
    Task MarkMessagesAsReadAsync(string currentUserId, string senderId);
    Task<List<ConversationDto>> GetRecentConversationsAsync(string userId);
}
