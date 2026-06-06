namespace Oztemur.API.Domain.Entities;

/// <summary>
/// One outbound reply an admin sent to a job applicant — interview
/// invite, rejection, follow-up request, etc. Persisted even when SMTP
/// rejects the message; <see cref="DeliveryOk"/> tells the admin whether
/// they need to retry.
/// </summary>
public class JobApplicationReply : BaseEntity
{
    public Guid JobApplicationId { get; set; }
    public JobApplication? JobApplication { get; set; }

    public string Subject { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;

    public bool DeliveryOk { get; set; }
}
