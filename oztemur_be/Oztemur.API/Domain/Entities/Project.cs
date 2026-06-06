using System;
using System.Collections.Generic;
using Oztemur.API.Infrastructure.Database; // If needed for base entities, wait, Oztemur has BaseEntity? Let's check other entities.

namespace Oztemur.API.Domain.Entities
{
    public enum ProjectStatus
    {
        Planning,
        InProgress,
        Operational,
        Completed,
        OnHold
    }

    public class Project : BaseEntity
    {
        public Dictionary<string, string> Title { get; set; } = new();
        public string Slug { get; set; } = string.Empty;
        public Dictionary<string, string> Category { get; set; } = new();
        public ProjectStatus Status { get; set; } = ProjectStatus.Planning;
        public string Year { get; set; } = string.Empty;
        public Dictionary<string, string> Description { get; set; } = new();
        public Dictionary<string, string> LongDescription { get; set; } = new();
        
        // Media
        public string ImageUrl { get; set; } = string.Empty;
        public List<string> GalleryUrls { get; set; } = new();

        public Dictionary<string, string> Location { get; set; } = new();
        public Dictionary<string, string> Budget { get; set; } = new();

        // Storing complex arrays as JSONB using EF Core dynamic JSON support
        public List<ProjectTimelinePhase> Timeline { get; set; } = new();

        /// <summary>
        /// Manual sort key used by both the public list page and the admin
        /// list. Lower values come first; ties are broken by <c>Year DESC</c>
        /// and then <c>CreatedAt DESC</c>. Adjusted via drag-and-drop on
        /// the admin /projects page.
        /// </summary>
        public int DisplayOrder { get; set; } = 0;

        /// <summary>
        /// When true, the project competes for one of the four slots on the
        /// homepage showcase. A hard cap of four featured projects is
        /// enforced at the service layer — see <c>ProjectService</c> for
        /// the swap workflow that handles attempted fifth picks.
        /// </summary>
        public bool IsFeatured { get; set; } = false;
    }

    public class ProjectTimelinePhase
    {
        public Dictionary<string, string> Date { get; set; } = new();
        public Dictionary<string, string> Phase { get; set; } = new();
        public Dictionary<string, string> Details { get; set; } = new();
    }
}
