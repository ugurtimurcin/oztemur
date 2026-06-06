namespace Oztemur.API.Features.Email;

/// <summary>
/// Logical category of an outbound email. The <c>EmailRouting</c> row
/// maps each value to an <c>EmailProfile</c>; callers don't need to
/// know which SMTP server actually delivers their message.
/// </summary>
public enum EmailPurpose
{
    PasswordReset,
    ContactReply,
    ApplicationReply,
    /// <summary>
    /// System-to-admin notifications — fired alongside in-app notifications
    /// when something happens that an admin needs to know about (new
    /// contact message, new application, failed login, etc.). Distinct from
    /// the visitor-facing reply purposes because the recipient is an
    /// internal user, not the public.
    /// </summary>
    AdminNotification,
}
