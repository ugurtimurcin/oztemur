using System.Threading.Tasks;
using Oztemur.API.Common.Models;
using Oztemur.API.Domain.Entities;
using Oztemur.API.Features.Notifications.Services;
using Oztemur.API.Infrastructure.Repositories;

namespace Oztemur.API.Features.Comms.Services;

public class CommsService : ICommsService
{
    private readonly IRepository<ContactMessage> _repository;
    private readonly INotificationService _notifications;

    public CommsService(IRepository<ContactMessage> repository, INotificationService notifications)
    {
        _repository = repository;
        _notifications = notifications;
    }

    public async Task<Result> ProcessContactAsync(ContactRequestDto request)
    {
        // Business Validation Mapping
        if (string.IsNullOrWhiteSpace(request.Email) || !request.Email.Contains("@"))
        {
            return Result.Failure("A valid email address is required to submit a contact inquiry.");
        }

        if (string.IsNullOrWhiteSpace(request.Message))
        {
            return Result.Failure("Inquiry message body cannot be empty.");
        }

        var message = new ContactMessage
        {
            Name = request.Name,
            Email = request.Email,
            Directorate = request.Directorate,
            Subject = request.Subject,
            Message = request.Message
        };

        // Repository execution
        await _repository.AddAsync(message);

        // Notify every admin with any messages.* permission.
        await _notifications.CreateAsync(
            permissionArea: "messages",
            type: "contact_message",
            title: "New contact message",
            message: $"{message.Name} · {message.Subject}",
            link: "/messages",
            entityId: message.Id);

        return Result.Ok("Contact inquiry was successfully saved and queued for organizational review.");
    }
}
