using System;
using System.Collections.Generic;

namespace Oztemur.API.Domain.Entities;

public class JobRequisition : BaseEntity
{
    public Dictionary<string, string> Title { get; set; } = new();
    public string ReferenceCode { get; set; } = string.Empty;
    public Dictionary<string, string> Department { get; set; } = new();
    public string Location { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    
    public Dictionary<string, string> Description { get; set; } = new();
    
    public Dictionary<string, List<string>> Requirements { get; set; } = new();
    public Dictionary<string, List<string>> CoreObjectives { get; set; } = new();
    
    public bool IsActive { get; set; } = true;
    
    public ICollection<JobApplication> Applications { get; set; } = new List<JobApplication>();
}
