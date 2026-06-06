using System;
using System.Collections.Generic;

namespace Oztemur.API.Domain.Entities;

public class ApplicationUser : BaseEntity
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    
    // Used for Authentication 
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    
    // Permission-based access control. Flat "{module}.{action}" strings
    // (e.g. "news.edit"). Npgsql maps this directly to a Postgres 'text[]'
    // column. New users start with no permissions — an admin grants them.
    public List<string> Permissions { get; set; } = new List<string>();
    
    public bool IsActive { get; set; } = true;
    public DateTimeOffset? LastLoginAt { get; set; }
}
