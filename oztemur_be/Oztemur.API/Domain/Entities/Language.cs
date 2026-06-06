using System;

namespace Oztemur.API.Domain.Entities;

public class Language : BaseEntity
{
    public string Code { get; set; } = string.Empty;       // e.g. "en", "tr", "de"
    public string Name { get; set; } = string.Empty;       // e.g. "English", "Türkçe"
    public string NativeName { get; set; } = string.Empty; // e.g. "English", "Türkçe"
    public string Flag { get; set; } = string.Empty;       // e.g. "🇬🇧", "🇹🇷"
    public bool IsDefault { get; set; } = false;
    public bool IsActive { get; set; } = true;
    public int DisplayOrder { get; set; } = 0;
}
