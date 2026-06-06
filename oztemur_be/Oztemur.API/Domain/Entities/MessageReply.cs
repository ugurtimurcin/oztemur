namespace Oztemur.API.Domain.Entities;

/// <summary>
/// One outbound reply an admin sent to a contact form message.
/// Persisted regardless of delivery outcome — <see cref="DeliveryOk"/>
/// records whether SMTP actually accepted the message, so the admin can
/// see a red marker if a reply failed and retry.
/// </summary>
public class MessageReply : BaseEntity
{
    public Guid ContactMessageId { get; set; }
    public ContactMessage? ContactMessage { get; set; }

    public string Subject { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;

    public bool DeliveryOk { get; set; }
}
