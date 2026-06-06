using System;
using System.Threading.Tasks;
using Oztemur.API.Common.Models;

namespace Oztemur.API.Features.Notifications.Services;

public interface INotificationService
{
    /// <summary>
    /// Emits a notification, fanning out one row per active admin who holds at
    /// least one permission in <paramref name="permissionArea"/>
    /// (e.g. <c>"messages"</c> matches every <c>messages.*</c> permission).
    /// </summary>
    Task CreateAsync(
        string permissionArea,
        string type,
        string title,
        string message,
        string? link = null,
        Guid? entityId = null);

    /// <summary>Emits a notification to one specific recipient.</summary>
    Task CreateForUserAsync(
        Guid userId,
        string type,
        string title,
        string message,
        string? link = null,
        Guid? entityId = null);

    /// <summary>Paged feed scoped to the given recipient.</summary>
    Task<Result<NotificationListResult>> GetPagedAsync(Guid userId, int page, int pageSize, bool unreadOnly);

    /// <summary>Unread count for the recipient (drives the bell badge).</summary>
    Task<Result<int>> GetUnreadCountAsync(Guid userId);

    /// <summary>Mark one of the recipient's notifications as read.</summary>
    Task<Result> MarkReadAsync(Guid userId, Guid id);

    /// <summary>Mark all of the recipient's unread notifications as read.</summary>
    Task<Result> MarkAllReadAsync(Guid userId);
}
