using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Oztemur.API.Common.Models;
using Oztemur.API.Domain.Entities;
using Oztemur.API.Infrastructure.Repositories;

namespace Oztemur.API.Features.CMS.Services;

public class CmsService : ICmsService
{
    private readonly IRepository<Company> _companyRepo;
    private readonly IRepository<NewsArticle> _newsRepo;
    private readonly IRepository<BlogPost> _blogRepo;
    private readonly IRepository<LeadershipMember> _leadershipRepo;

    public CmsService(
        IRepository<Company> companyRepo,
        IRepository<NewsArticle> newsRepo,
        IRepository<BlogPost> blogRepo,
        IRepository<LeadershipMember> leadershipRepo)
    {
        _companyRepo = companyRepo;
        _newsRepo = newsRepo;
        _blogRepo = blogRepo;
        _leadershipRepo = leadershipRepo;
    }

    /// <summary>Helper: resolve a localized value from a JSONB dictionary with fallback to default language.</summary>
    private static string L(Dictionary<string, string>? dict, string lang, string fallback = "tr")
    {
        if (dict == null || dict.Count == 0) return string.Empty;
        if (dict.TryGetValue(lang, out var val) && !string.IsNullOrWhiteSpace(val)) return val;
        if (dict.TryGetValue(fallback, out var fb) && !string.IsNullOrWhiteSpace(fb)) return fb;
        return dict.Values.FirstOrDefault() ?? string.Empty;
    }

    public async Task<Result<PagedResult<object>>> GetCompaniesAsync(int pageNumber, int pageSize, string lang = "tr")
    {
        var (items, totalCount) = await _companyRepo.GetPagedAsync(pageNumber, pageSize, c => c.IsActive);
        
        var dtos = items.OrderBy(c => c.DisplayOrder).Select(c => new {
            c.Id,
            Name = L(c.Name, lang),
            Sector = L(c.Sector, lang),
            Description = L(c.Description, lang),
            DetailedDescription = L(c.DetailedDescription, lang),
            Address = L(c.Address, lang),
            c.LogoUrl, c.WebsiteUrl, c.ContactEmail, c.PhoneNumber
        }).Cast<object>().ToList();

        var pagedResult = new PagedResult<object>(dtos, totalCount, pageNumber, pageSize);
        return Result<PagedResult<object>>.Ok(pagedResult);
    }

    public async Task<Result<PagedResult<object>>> GetNewsAsync(int pageNumber, int pageSize, string lang = "tr")
    {
        var (items, totalCount) = await _newsRepo.GetPagedAsync(pageNumber, pageSize, n => n.IsPublished);
        
        var dtos = items.OrderByDescending(n => n.PublishedAt).Select(n => new { 
            n.Id, 
            Title = L(n.Title, lang), 
            n.Slug, 
            Summary = L(n.Summary, lang), 
            n.ImageUrl, n.PublishedAt 
        }).Cast<object>().ToList();

        var pagedResult = new PagedResult<object>(dtos, totalCount, pageNumber, pageSize);
        return Result<PagedResult<object>>.Ok(pagedResult);
    }

    public async Task<Result<object>> GetNewsBySlugAsync(string slug, string lang = "tr")
    {
        var articles = await _newsRepo.GetAsync(n => n.Slug == slug && n.IsPublished);
        var article = articles.FirstOrDefault();
        
        if (article == null)
            return Result<object>.Failure("Article not found or not published.", null, 404);

        var dto = new {
            article.Id,
            Title = L(article.Title, lang),
            article.Slug,
            Summary = L(article.Summary, lang),
            Content = L(article.Content, lang),
            article.ImageUrl,
            article.PublishedAt
        };
            
        return Result<object>.Ok(dto);
    }
 
    public async Task<Result<PagedResult<object>>> GetBlogPostsAsync(int pageNumber, int pageSize, string lang = "tr")
    {
        var (items, totalCount) = await _blogRepo.GetPagedAsync(pageNumber, pageSize, b => b.IsPublished);
        
        var dtos = items.OrderByDescending(b => b.PublishedAt).Select(b => new { 
            b.Id, 
            Title = L(b.Title, lang), 
            b.Slug, b.Author, 
            Summary = L(b.Summary, lang), 
            b.ImageUrl, b.PublishedAt 
        }).Cast<object>().ToList();
 
        var pagedResult = new PagedResult<object>(dtos, totalCount, pageNumber, pageSize);
        return Result<PagedResult<object>>.Ok(pagedResult);
    }
 
    public async Task<Result<object>> GetBlogPostBySlugAsync(string slug, string lang = "tr")
    {
        var posts = await _blogRepo.GetAsync(b => b.Slug == slug && b.IsPublished);
        var post = posts.FirstOrDefault();

        if (post == null)
            return Result<object>.Failure("Post not found or not published.", null, 404);

        var dto = new {
            post.Id,
            Title = L(post.Title, lang),
            post.Slug,
            post.Author,
            Summary = L(post.Summary, lang),
            Content = L(post.Content, lang),
            post.ImageUrl,
            post.PublishedAt
        };

        return Result<object>.Ok(dto);
    }

    public async Task<Result<List<object>>> GetLeadershipMembersAsync(string lang = "tr")
    {
        var items = await _leadershipRepo.GetAsync(m => m.IsActive);
        var dtos = items.OrderBy(m => m.DisplayOrder).Select(m => (object)new
        {
            m.Id,
            m.Slug,
            Name = L(m.Name, lang),
            Role = L(m.Role, lang),
            Bio = L(m.Bio, lang),
            m.PhotoUrl,
            m.DisplayOrder
        }).ToList();
        return Result<List<object>>.Ok(dtos);
    }

    public async Task<Result<object>> GetLeadershipMemberByIdAsync(System.Guid id, string lang = "tr")
    {
        var member = await _leadershipRepo.GetByIdAsync(id);
        if (member == null || !member.IsActive)
            return Result<object>.Failure("Leadership member not found.");

        return Result<object>.Ok(BuildLeadershipDetailDto(member, lang));
    }

    public async Task<Result<object>> GetLeadershipMemberBySlugAsync(string slug, string lang = "tr")
    {
        var members = await _leadershipRepo.GetAsync(m => m.Slug == slug && m.IsActive);
        var member = members.FirstOrDefault();
        if (member == null)
            return Result<object>.Failure("Leadership member not found.", null, 404);

        return Result<object>.Ok(BuildLeadershipDetailDto(member, lang));
    }

    // Shared shape for id + slug detail endpoints. Contact channels are
    // included verbatim — the FE decides which ones to render based on
    // whether they're populated.
    private static object BuildLeadershipDetailDto(LeadershipMember m, string lang) => new
    {
        m.Id,
        m.Slug,
        Name = L(m.Name, lang),
        Role = L(m.Role, lang),
        Bio = L(m.Bio, lang),
        m.PhotoUrl,
        m.DisplayOrder,
        m.Email,
        m.Phone,
        m.LinkedInUrl,
    };
}
