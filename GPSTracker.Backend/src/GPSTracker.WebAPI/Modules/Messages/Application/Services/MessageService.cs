using GPSTracker.WebAPI.Modules.Messages.Application.DTOs;
using GPSTracker.WebAPI.Modules.Messages.Application.Interfaces;
using GPSTracker.WebAPI.Modules.Messages.Domain.Entities;
using GPSTracker.WebAPI.Shared.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

using Microsoft.Extensions.Logging;

namespace GPSTracker.WebAPI.Modules.Messages.Application.Services;

public class MessageService(AppDbContext dbContext, ILogger<MessageService> logger) : IMessageService
{
    public async Task<List<MessageDto>> GetChatHistoryAsync(string userId1, string userId2, int limit = 50)
    {
        return await dbContext.Messages
            .Where(m => (m.SenderId == userId1 && m.ReceiverId == userId2) ||
                        (m.SenderId == userId2 && m.ReceiverId == userId1))
            .OrderByDescending(m => m.SentAt)
            .Take(limit)
            .OrderBy(m => m.SentAt) // Đảo ngược lại để tin mới nhất nằm ở dưới cùng
            .Select(m => new MessageDto
            {
                Id = m.Id,
                SenderId = m.SenderId,
                ReceiverId = m.ReceiverId,
                Content = m.Content,
                SentAt = m.SentAt,
                IsRead = m.IsRead
            })
            .ToListAsync();
    }

    public async Task<MessageDto> SendMessageAsync(string senderId, string receiverId, string content)
    {
        var message = new Message
        {
            SenderId = senderId,
            ReceiverId = receiverId,
            Content = content,
            SentAt = DateTime.UtcNow
        };

        dbContext.Messages.Add(message);
        await dbContext.SaveChangesAsync();

        return new MessageDto
        {
            Id = message.Id,
            SenderId = message.SenderId,
            ReceiverId = message.ReceiverId,
            Content = message.Content,
            SentAt = message.SentAt,
            IsRead = message.IsRead
        };
    }

    public async Task<int> GetTotalUnreadCountAsync(string userId)
    {
        // Chỉ đếm tin nhắn từ những người ĐANG LÀ BẠN BÈ (Status = Accepted)
        var activeFriendIdsQuery = dbContext.Friendships
            .Where(f => f.Status == GPSTracker.WebAPI.Modules.Friendships.Domain.Entities.FriendshipStatus.Accepted && 
                        (f.RequesterId == userId || f.ReceiverId == userId))
            .Select(f => f.RequesterId == userId ? f.ReceiverId : f.RequesterId);

        return await dbContext.Messages
            .CountAsync(m => m.ReceiverId == userId && !m.IsRead && activeFriendIdsQuery.Contains(m.SenderId));
    }

    public async Task MarkMessagesAsReadAsync(string currentUserId, string senderId)
    {
        var unreadMessages = await dbContext.Messages
            .Where(m => m.ReceiverId == currentUserId && m.SenderId == senderId && !m.IsRead)
            .ToListAsync();

        if (unreadMessages.Any())
        {
            foreach (var message in unreadMessages)
            {
                message.IsRead = true;
            }
            await dbContext.SaveChangesAsync();
        }
    }

    public async Task<List<ConversationDto>> GetRecentConversationsAsync(string userId)
    {
        try
        {
            var conversations = await dbContext.Messages
                .Where(m => m.SenderId == userId || m.ReceiverId == userId)
                .Select(m => new 
                {
                    PartnerId = m.SenderId == userId ? m.ReceiverId : m.SenderId,
                    Message = m
                })
                .GroupBy(x => x.PartnerId)
                .Select(g => new ConversationDto
                {
                    PartnerId = g.Key,
                    PartnerName = dbContext.Users
                        .Where(u => u.Id == g.Key)
                        .Select(u => u.DisplayName)
                        .FirstOrDefault() ?? "Unknown User",
                    LastMessage = g.OrderByDescending(x => x.Message.SentAt)
                                   .Select(x => x.Message.Content)
                                   .FirstOrDefault(),
                    LastMessageTime = g.Max(x => x.Message.SentAt),
                    UnreadCount = g.Count(x => x.Message.ReceiverId == userId && !x.Message.IsRead)
                })
                .OrderByDescending(c => c.LastMessageTime)
                .ToListAsync();

            return conversations;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "[MessageService] Lỗi khi lấy danh sách trò chuyện gần đây cho user {UserId}", userId);
            return new List<ConversationDto>();
        }
    }
}
