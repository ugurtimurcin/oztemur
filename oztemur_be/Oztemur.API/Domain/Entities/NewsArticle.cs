using System;
using System.Collections.Generic;

namespace Oztemur.API.Domain.Entities;

public class NewsArticle : BaseEntity
{
    public Dictionary<string, string> Title { get; set; } = new();
    public string Slug { get; set; } = string.Empty;
    public Dictionary<string, string> Summary { get; set; } = new();
    public Dictionary<string, string> Content { get; set; } = new();
    public string ImageUrl { get; set; } = string.Empty;
    
    public bool IsPublished { get; set; } = false;
    public DateTimeOffset? PublishedAt { get; set; }
}
