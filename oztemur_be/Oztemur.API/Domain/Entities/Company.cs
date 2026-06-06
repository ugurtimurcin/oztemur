using System;
using System.Collections.Generic;

namespace Oztemur.API.Domain.Entities;

public class Company : BaseEntity
{
    public Dictionary<string, string> Name { get; set; } = new();
    public Dictionary<string, string> Sector { get; set; } = new();
    public Dictionary<string, string> Description { get; set; } = new();
    public Dictionary<string, string> DetailedDescription { get; set; } = new();
    /// <summary>Physical mailing address, localized per language.</summary>
    public Dictionary<string, string> Address { get; set; } = new();
    public string LogoUrl { get; set; } = string.Empty;

    // Website and Contact metadata from the UI Modal
    public string WebsiteUrl { get; set; } = string.Empty;
    public string ContactEmail { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    
    // Allows controlling ordering on the frontend portfolio grid
    public int DisplayOrder { get; set; } = 0;
    public bool IsActive { get; set; } = true;
}
