using System.Collections.Generic;
using System.Linq;

namespace Oztemur.API.Common.Authorization;

/// <summary>
/// The single source of truth for the permission catalog. Permissions are
/// stored on <see cref="Domain.Entities.ApplicationUser"/> as flat strings of
/// the form "{module}.{action}" (e.g. "news.edit"). Endpoints gate on them via
/// the RequirePermission(...) extension.
/// </summary>
public static class Permissions
{
    /// <summary>A module groups a set of actions for the admin UI.</summary>
    public record Module(string Key, string Label, string[] Actions);

    public static readonly IReadOnlyList<Module> Catalog = new[]
    {
        new Module("news",         "News",         new[] { "view", "edit", "delete" }),
        new Module("blog",         "Blog",         new[] { "view", "edit", "delete" }),
        new Module("projects",     "Projects",     new[] { "view", "edit", "delete" }),
        new Module("companies",    "Companies",    new[] { "view", "edit", "delete" }),
        new Module("careers",      "Careers",      new[] { "view", "edit", "delete" }),
        new Module("applications", "Applications", new[] { "view", "edit" }),
        new Module("messages",     "Messages",     new[] { "view", "edit", "delete" }),
        new Module("leadership",   "Leadership",   new[] { "view", "edit", "delete" }),
        new Module("sitecontent",  "Site Content", new[] { "view", "edit" }),
        new Module("settings",     "Settings",     new[] { "view", "edit" }),
        new Module("users",        "Users",        new[] { "view", "edit", "delete" }),
        new Module("audit",        "Audit Log",    new[] { "view" }),
    };

    /// <summary>Every valid permission string in the system.</summary>
    public static readonly IReadOnlyList<string> All =
        Catalog.SelectMany(m => m.Actions.Select(a => $"{m.Key}.{a}")).ToList();

    private static readonly HashSet<string> AllSet = new(All);

    public static bool IsValid(string permission) => AllSet.Contains(permission);
}
