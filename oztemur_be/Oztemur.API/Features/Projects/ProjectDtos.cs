using System;
using System.Collections.Generic;
using Oztemur.API.Domain.Entities;

namespace Oztemur.API.Features.Projects
{
    public class ProjectDto
    {
        public Guid Id { get; set; }
        public Dictionary<string, string> Title { get; set; } = new();
        public string Slug { get; set; } = string.Empty;
        public Dictionary<string, string> Category { get; set; } = new();
        public string Status { get; set; } = string.Empty;
        public string Year { get; set; } = string.Empty;
        public Dictionary<string, string> Description { get; set; } = new();
        public Dictionary<string, string> LongDescription { get; set; } = new();
        public string ImageUrl { get; set; } = string.Empty;
        public List<string> GalleryUrls { get; set; } = new();
        public Dictionary<string, string> Location { get; set; } = new();
        public Dictionary<string, string> Budget { get; set; } = new();
        public List<ProjectTimelinePhaseDto> Timeline { get; set; } = new();

        public int DisplayOrder { get; set; }
        public bool IsFeatured { get; set; }

        // Metadata
        public DateTimeOffset CreatedAt { get; set; }
        public DateTimeOffset? UpdatedAt { get; set; }
    }

    public class ProjectTimelinePhaseDto
    {
        public Dictionary<string, string> Date { get; set; } = new();
        public Dictionary<string, string> Phase { get; set; } = new();
        public Dictionary<string, string> Details { get; set; } = new();
    }

    public class CreateProjectDto
    {
        public Dictionary<string, string> Title { get; set; } = new();
        public string Slug { get; set; } = string.Empty;
        public Dictionary<string, string> Category { get; set; } = new();
        public string Status { get; set; } = "Planning";
        public string Year { get; set; } = string.Empty;
        public Dictionary<string, string> Description { get; set; } = new();
        public Dictionary<string, string> LongDescription { get; set; } = new();
        public string ImageUrl { get; set; } = string.Empty;
        public List<string> GalleryUrls { get; set; } = new();
        public Dictionary<string, string> Location { get; set; } = new();
        public Dictionary<string, string> Budget { get; set; } = new();
        public List<ProjectTimelinePhaseDto> Timeline { get; set; } = new();

        public int DisplayOrder { get; set; }
        public bool IsFeatured { get; set; }

        /// <summary>
        /// When the project is being toggled to <c>IsFeatured=true</c> and
        /// four other projects are already featured, the admin must say
        /// which one to demote. The service swaps them in one transaction.
        /// Ignored when <c>IsFeatured=false</c> or when the cap isn't reached.
        /// </summary>
        public Guid? ReplaceFeaturedId { get; set; }
    }

    public class UpdateProjectDto : CreateProjectDto
    {
        public Guid Id { get; set; }
    }

    /// <summary>
    /// Returned with HTTP 409 when the admin tries to feature a fifth
    /// project. The FE shows a swap modal listing these and lets the user
    /// pick which one to demote — the retry comes back with
    /// <c>ReplaceFeaturedId</c> set.
    /// </summary>
    public class FeaturedConflictDto
    {
        public List<FeaturedProjectSummary> CurrentFeatured { get; set; } = new();
    }

    public class FeaturedProjectSummary
    {
        public Guid Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public int DisplayOrder { get; set; }
    }

    public class ReorderProjectItemDto
    {
        public Guid Id { get; set; }
        public int DisplayOrder { get; set; }
    }

    public class PaginatedResult<T>
    {
        public List<T> Items { get; set; } = new();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
    }
}
