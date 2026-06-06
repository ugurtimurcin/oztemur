using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Oztemur.API.Features.Projects.Services
{
    public interface IProjectService
    {
        Task<PaginatedResult<ProjectDto>> GetProjectsAsync(int page = 1, int pageSize = 10, string? language = null, string? category = null);
        Task<List<ProjectDto>> GetFeaturedProjectsAsync(int limit = 4);
        Task<List<string>> GetCategoriesAsync(string language);
        Task<ProjectDto?> GetProjectByIdAsync(Guid id);
        Task<ProjectDto?> GetProjectBySlugAsync(string slug);
        Task<ProjectDto> CreateProjectAsync(CreateProjectDto dto, string userId);
        Task<ProjectDto> UpdateProjectAsync(UpdateProjectDto dto, string userId);
        Task<bool> DeleteProjectAsync(Guid id, string userId);
        Task ReorderProjectsAsync(IEnumerable<ReorderProjectItemDto> items);
    }

    /// <summary>Thrown when the admin tries to feature a fifth project without supplying ReplaceFeaturedId.</summary>
    public class FeaturedCapReachedException : Exception
    {
        public FeaturedConflictDto Conflict { get; }
        public FeaturedCapReachedException(FeaturedConflictDto conflict)
            : base("Featured cap of 4 reached. Caller must supply ReplaceFeaturedId.")
        {
            Conflict = conflict;
        }
    }
}
