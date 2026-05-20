using GPSTracker.WebAPI.Modules.Messages.Application.DTOs;
using GPSTracker.WebAPI.Modules.Messages.Application.Interfaces;
using GPSTracker.WebAPI.Modules.Messages.Domain.Entities;
using GPSTracker.WebAPI.Shared.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace GPSTracker.WebAPI.Modules.Messages.Application.Services;

public class MessageService(AppDbContext dbContext) : IMessageService
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
                SentAt = m.SentAt
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
            SentAt = message.SentAt
        };
    }

}
