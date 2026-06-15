using System.Text.RegularExpressions;
using Oztemur.API.Common.Models;
using Oztemur.API.Domain.Entities;
using Oztemur.API.Features.Notifications.Services;
using Oztemur.API.Infrastructure.Repositories;

namespace Oztemur.API.Features.Comms.Services;

public partial class CommsService : ICommsService
{
    private readonly IRepository<ContactMessage> _repository;
    private readonly INotificationService _notifications;

    
    private const int MaxNameLength = 120;
    private const int MaxEmailLength = 254;
    private const int MaxSubjectLength = 200;
    private const int MinMessageLength = 10;
    private const int MaxMessageLength = 5000;
    private const int MaxDirectorateLength = 80;


    [GeneratedRegex(@"^[^@\s]+@[^@\s]+\.[^@\s]+$", RegexOptions.IgnoreCase)]
    private static partial Regex EmailRegex();

    public CommsService(IRepository<ContactMessage> repository, INotificationService notifications)
    {
        _repository = repository;
        _notifications = notifications;
    }

    public async Task<Result> ProcessContactAsync(ContactRequestDto request)
    {
        var name        = (request.Name ?? string.Empty).Trim();
        var email       = (request.Email ?? string.Empty).Trim();
        var subject     = (request.Subject ?? string.Empty).Trim();
        var message     = (request.Message ?? string.Empty).Trim();
        var directorate = (request.Directorate ?? string.Empty).Trim();


        if (string.IsNullOrEmpty(name) || name.Length > MaxNameLength)
            return Result.Failure("Name is required and must be under 120 characters.");
        if (string.IsNullOrEmpty(email) || email.Length > MaxEmailLength || !EmailRegex().IsMatch(email))
            return Result.Failure("A valid email address is required to submit a contact inquiry.");
        if (string.IsNullOrEmpty(subject) || subject.Length > MaxSubjectLength)
            return Result.Failure("Subject is required and must be under 200 characters.");
        if (message.Length < MinMessageLength || message.Length > MaxMessageLength)
            return Result.Failure($"Message must be between {MinMessageLength} and {MaxMessageLength} characters.");
        if (directorate.Length > MaxDirectorateLength)
            return Result.Failure("Directorate field is too long.");

        var entity = new ContactMessage
        {
            Name = name,
            Email = email,
            Directorate = directorate,
            Subject = subject,
            Message = message
        };

        await _repository.AddAsync(entity);

        // Notify every admin with any messages.* permission.
        await _notifications.CreateAsync(
            permissionArea: "messages",
            type: "contact_message",
            title: "New contact message",
            message: $"{entity.Name} · {entity.Subject}",
            link: "/messages",
            entityId: entity.Id);

        return Result.Ok("Contact inquiry was successfully saved and queued for organizational review.");
    }
}
