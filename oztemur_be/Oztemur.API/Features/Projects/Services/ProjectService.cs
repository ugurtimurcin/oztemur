using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Oztemur.API.Domain.Entities;
using Oztemur.API.Infrastructure.Database;

namespace Oztemur.API.Features.Projects.Services
{
    public class ProjectService : IProjectService
    {
        private readonly OztemurDbContext _context;

        public ProjectService(OztemurDbContext context)
        {
            _context = context;
        }

        public async Task<PaginatedResult<ProjectDto>> GetProjectsAsync(int page = 1, int pageSize = 10, string? language = null, string? category = null)
        {
            var query = _context.Projects.AsNoTracking().AsQueryable();

            // Category filter is matched against the requested language's JSONB
            // value, falling back to Turkish so a project that only has TR
            // categorisation still shows up under that label.
            if (!string.IsNullOrWhiteSpace(category))
            {
                var lang = string.IsNullOrWhiteSpace(language) ? "tr" : language!.ToLower();
                query = query.Where(p =>
                    (p.Category.ContainsKey(lang) && p.Category[lang] == category) ||
                    (!p.Category.ContainsKey(lang) && p.Category.ContainsKey("tr") && p.Category["tr"] == category));
            }

            var total = await query.CountAsync();
            var items = await query
                // Admin-curated order first. Year + CreatedAt break ties so
                // two projects sharing DisplayOrder=0 still sort sensibly.
                .OrderBy(p => p.DisplayOrder)
                .ThenByDescending(p => p.Year)
                .ThenByDescending(p => p.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(p => MapToDto(p))
                .ToListAsync();

            return new PaginatedResult<ProjectDto>
            {
                Items = items,
                TotalCount = total,
                Page = page,
                PageSize = pageSize
            };
        }

        public async Task<List<ProjectDto>> GetFeaturedProjectsAsync(int limit = 4)
        {
            // Featured-only selection — admin-curated. When fewer than the
            // limit are featured we DON'T fall back to non-featured rows so
            // the curation stays honest; the consumer decides whether to
            // pad or hide. The exception: zero featured → degrade gracefully
            // to top N by DisplayOrder so the homepage section never empties
            // on a fresh install.
            var featured = await _context.Projects.AsNoTracking()
                .Where(p => p.IsFeatured)
                .OrderBy(p => p.DisplayOrder)
                .ThenByDescending(p => p.Year)
                .ThenByDescending(p => p.CreatedAt)
                .Take(limit)
                .Select(p => MapToDto(p))
                .ToListAsync();

            if (featured.Count > 0) return featured;

            // No featured rows yet — fall back to the most recently created
            // projects so a fresh install shows something sensible until
            // the admin curates the slots.
            return await _context.Projects.AsNoTracking()
                .OrderByDescending(p => p.CreatedAt)
                .Take(limit)
                .Select(p => MapToDto(p))
                .ToListAsync();
        }

        public async Task<List<string>> GetCategoriesAsync(string language)
        {
            // Pull just the Category jsonb to keep the payload light, then
            // extract distinct localized values in-memory. EF Core can't
            // produce DISTINCT over a TryGetValue-with-fallback expression
            // cleanly, so doing it here is both simpler and fast enough at
            // realistic project volumes.
            var lang = string.IsNullOrWhiteSpace(language) ? "tr" : language.ToLower();
            var dicts = await _context.Projects
                .AsNoTracking()
                .Select(p => p.Category)
                .ToListAsync();

            return dicts
                .Select(d =>
                {
                    if (d.TryGetValue(lang, out var v) && !string.IsNullOrWhiteSpace(v)) return v;
                    if (d.TryGetValue("tr", out var vt) && !string.IsNullOrWhiteSpace(vt)) return vt;
                    return null;
                })
                .Where(s => !string.IsNullOrWhiteSpace(s))
                .Select(s => s!)
                .Distinct()
                .OrderBy(s => s)
                .ToList();
        }

        public async Task<ProjectDto?> GetProjectByIdAsync(Guid id)
        {
            var project = await _context.Projects.AsNoTracking().FirstOrDefaultAsync(p => p.Id == id);
            if (project == null) return null;
            return MapToDto(project);
        }

        public async Task<ProjectDto?> GetProjectBySlugAsync(string slug)
        {
            var project = await _context.Projects.AsNoTracking().FirstOrDefaultAsync(p => p.Slug == slug);
            if (project == null) return null;
            return MapToDto(project);
        }

        public async Task<ProjectDto> CreateProjectAsync(CreateProjectDto dto, string userId)
        {
            if (!Enum.TryParse<ProjectStatus>(dto.Status, true, out var statusEnum))
            {
                statusEnum = ProjectStatus.Planning;
            }

            var slug = await ResolveUniqueSlugAsync(dto.Slug, dto.Title, null);

            // Featured cap enforcement — same swap workflow as Update so
            // create-with-featured-toggle behaves consistently.
            if (dto.IsFeatured)
                await EnforceFeaturedCapAsync(currentId: null, replaceId: dto.ReplaceFeaturedId);

            var project = new Project
            {
                Title = dto.Title,
                Slug = slug,
                Category = dto.Category,
                Status = statusEnum,
                Year = dto.Year,
                Description = dto.Description,
                LongDescription = dto.LongDescription,
                ImageUrl = dto.ImageUrl,
                GalleryUrls = dto.GalleryUrls,
                Location = dto.Location,
                Budget = dto.Budget,
                Timeline = dto.Timeline.Select(t => new ProjectTimelinePhase
                {
                    Date = t.Date,
                    Phase = t.Phase,
                    Details = t.Details
                }).ToList(),
                DisplayOrder = dto.DisplayOrder,
                IsFeatured = dto.IsFeatured,
                CreatedBy = userId,
                CreatedAt = DateTimeOffset.UtcNow
            };

            _context.Projects.Add(project);
            await _context.SaveChangesAsync();

            return MapToDto(project);
        }

        public async Task<ProjectDto> UpdateProjectAsync(UpdateProjectDto dto, string userId)
        {
            var project = await _context.Projects.FindAsync(dto.Id);
            if (project == null) throw new Exception("Project not found");

            if (Enum.TryParse<ProjectStatus>(dto.Status, true, out var statusEnum))
            {
                project.Status = statusEnum;
            }

            project.Title = dto.Title;
            project.Slug = await ResolveUniqueSlugAsync(dto.Slug, dto.Title, project.Id);
            project.Category = dto.Category;
            project.Year = dto.Year;
            project.Description = dto.Description;
            project.LongDescription = dto.LongDescription;
            project.ImageUrl = dto.ImageUrl;
            project.GalleryUrls = dto.GalleryUrls;
            project.Location = dto.Location;
            project.Budget = dto.Budget;
            project.Timeline = dto.Timeline.Select(t => new ProjectTimelinePhase
            {
                Date = t.Date,
                Phase = t.Phase,
                Details = t.Details
            }).ToList();
            project.DisplayOrder = dto.DisplayOrder;

            // Featured toggle handling — cap check + optional swap in one
            // transaction. Only runs when admin is flipping from false → true.
            if (dto.IsFeatured && !project.IsFeatured)
                await EnforceFeaturedCapAsync(currentId: project.Id, replaceId: dto.ReplaceFeaturedId);
            project.IsFeatured = dto.IsFeatured;

            project.UpdatedBy = userId;
            project.UpdatedAt = DateTimeOffset.UtcNow;

            await _context.SaveChangesAsync();

            return MapToDto(project);
        }

        public async Task ReorderProjectsAsync(IEnumerable<ReorderProjectItemDto> items)
        {
            // Bulk in-memory update — small set (admins don't drag hundreds
            // of projects in one go). We tracked entities so SaveChanges
            // commits all ordering moves in a single transaction.
            var byId = items.ToDictionary(i => i.Id, i => i.DisplayOrder);
            var ids = byId.Keys.ToList();
            var rows = await _context.Projects.Where(p => ids.Contains(p.Id)).ToListAsync();
            foreach (var row in rows)
                row.DisplayOrder = byId[row.Id];
            await _context.SaveChangesAsync();
        }

        /// <summary>
        /// Throws <see cref="FeaturedCapReachedException"/> when promoting a
        /// project to featured would push the count above 4 and no
        /// replacement was named. When <paramref name="replaceId"/> IS
        /// provided, that project is demoted in-place so the swap commits
        /// as one transaction with the caller's SaveChanges.
        /// </summary>
        private async Task EnforceFeaturedCapAsync(Guid? currentId, Guid? replaceId)
        {
            const int Cap = 4;
            // Other featured projects, excluding the one we're about to flip on.
            var otherFeatured = await _context.Projects
                .Where(p => p.IsFeatured && (currentId == null || p.Id != currentId))
                .OrderBy(p => p.DisplayOrder)
                .ThenByDescending(p => p.Year)
                .ToListAsync();

            if (otherFeatured.Count < Cap) return; // Room to spare; promote freely.

            if (replaceId is null)
            {
                // Surface conflict to the caller so the FE can render a swap
                // modal listing exactly which projects already hold the slots.
                throw new FeaturedCapReachedException(new FeaturedConflictDto
                {
                    CurrentFeatured = otherFeatured.Select(p => new FeaturedProjectSummary
                    {
                        Id = p.Id,
                        Title = L(p.Title, "tr"),
                        DisplayOrder = p.DisplayOrder,
                    }).ToList(),
                });
            }

            var demote = otherFeatured.FirstOrDefault(p => p.Id == replaceId.Value);
            if (demote is null)
                throw new Exception("Belirtilen değiştirilecek proje öne çıkan listesinde değil.");
            demote.IsFeatured = false;
        }

        /// <summary>Picks the value for a locale with a fallback to TR/EN/first-available.</summary>
        private static string L(Dictionary<string, string>? dict, string lang)
        {
            if (dict == null || dict.Count == 0) return string.Empty;
            if (dict.TryGetValue(lang, out var v) && !string.IsNullOrWhiteSpace(v)) return v;
            if (dict.TryGetValue("tr", out var tr) && !string.IsNullOrWhiteSpace(tr)) return tr;
            if (dict.TryGetValue("en", out var en) && !string.IsNullOrWhiteSpace(en)) return en;
            return dict.Values.FirstOrDefault() ?? string.Empty;
        }

        public async Task<bool> DeleteProjectAsync(Guid id, string userId)
        {
            var project = await _context.Projects.FindAsync(id);
            if (project == null) return false;

            project.IsDeleted = true;
            project.DeletedAt = DateTimeOffset.UtcNow;
            project.DeletedBy = userId;

            await _context.SaveChangesAsync();
            return true;
        }

        /// <summary>
        /// Generates a slug from the supplied value (or falls back to the
        /// Turkish/English title), then ensures it doesn't collide with any
        /// other project. Pass the current project's Id on update so its own
        /// row isn't treated as a conflict; pass null on create.
        /// </summary>
        private async Task<string> ResolveUniqueSlugAsync(string? requested, Dictionary<string, string> title, Guid? selfId)
        {
            var source = !string.IsNullOrWhiteSpace(requested)
                ? requested!
                : (title.TryGetValue("tr", out var tr) && !string.IsNullOrWhiteSpace(tr) ? tr
                    : title.TryGetValue("en", out var en) ? en : string.Empty);

            var slug = Common.Slug.Generate(source);
            if (string.IsNullOrEmpty(slug))
                throw new Exception("Slug oluşturulamadı. Lütfen geçerli bir başlık veya slug girin.");

            var exists = selfId.HasValue
                ? await _context.Projects.AnyAsync(p => p.Slug == slug && p.Id != selfId.Value)
                : await _context.Projects.AnyAsync(p => p.Slug == slug);
            if (exists)
                throw new Exception($"Bu slug zaten kullanılıyor: '{slug}'.");

            return slug;
        }

        private static ProjectDto MapToDto(Project p)
        {
            return new ProjectDto
            {
                Id = p.Id,
                Title = p.Title,
                Slug = p.Slug,
                Category = p.Category,
                Status = p.Status.ToString(),
                Year = p.Year,
                Description = p.Description,
                LongDescription = p.LongDescription,
                ImageUrl = p.ImageUrl,
                GalleryUrls = p.GalleryUrls ?? new(),
                Location = p.Location,
                Budget = p.Budget,
                Timeline = p.Timeline.Select(t => new ProjectTimelinePhaseDto
                {
                    Date = t.Date,
                    Phase = t.Phase,
                    Details = t.Details
                }).ToList(),
                DisplayOrder = p.DisplayOrder,
                IsFeatured = p.IsFeatured,
                CreatedAt = p.CreatedAt,
                UpdatedAt = p.UpdatedAt
            };
        }
    }
}
