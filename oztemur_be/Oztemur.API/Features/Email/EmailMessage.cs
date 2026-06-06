namespace Oztemur.API.Features.Email;

/// <summary>A single outbound email — plain DTO passed to <see cref="IEmailService"/>.</summary>
public record EmailMessage(string To, string Subject, string HtmlBody, string? ReplyTo = null);
