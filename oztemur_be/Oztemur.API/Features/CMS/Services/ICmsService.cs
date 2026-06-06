using System.Collections.Generic;
using System.Threading.Tasks;
using Oztemur.API.Common.Models;

namespace Oztemur.API.Features.CMS.Services;

public interface ICmsService
{
    Task<Result<PagedResult<object>>> GetCompaniesAsync(int pageNumber, int pageSize, string lang = "tr");
    Task<Result<PagedResult<object>>> GetNewsAsync(int pageNumber, int pageSize, string lang = "tr");
    Task<Result<object>> GetNewsBySlugAsync(string slug, string lang = "tr");
    Task<Result<PagedResult<object>>> GetBlogPostsAsync(int pageNumber, int pageSize, string lang = "tr");
    Task<Result<object>> GetBlogPostBySlugAsync(string slug, string lang = "tr");
    Task<Result<List<object>>> GetLeadershipMembersAsync(string lang = "tr");
    Task<Result<object>> GetLeadershipMemberByIdAsync(System.Guid id, string lang = "tr");
    Task<Result<object>> GetLeadershipMemberBySlugAsync(string slug, string lang = "tr");
}
