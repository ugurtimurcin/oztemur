using System.Text;
using System.Threading.RateLimiting;
using Npgsql;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using Serilog;
using Oztemur.API.Common.Models;
using Oztemur.API.Infrastructure.Database;

using Oztemur.API.Features.Auth;
using Oztemur.API.Features.Auth.Services;
using Oztemur.API.Features.Users;
using Oztemur.API.Features.CMS;
using Oztemur.API.Features.Careers;
using Oztemur.API.Features.Comms;
using Oztemur.API.Features.Storage;
using Oztemur.API.Features.Settings;
using Oztemur.API.Features.Notifications;
using Oztemur.API.Features.Email;
using Oztemur.API.Features.CMS.Services;
using Oztemur.API.Features.Careers.Services;
using Oztemur.API.Features.Comms.Services;
using Oztemur.API.Features.Projects;
using Oztemur.API.Features.Projects.Services;
using Oztemur.API.Features.SiteContent;
using Oztemur.API.Features.SiteContent.Services;
using Oztemur.API.Features.Audit;
using Oztemur.API.Features.Translations;
using Oztemur.API.Infrastructure.Repositories;
using Microsoft.Extensions.FileProviders;

var builder = WebApplication.CreateBuilder(args);

// ─── Logging ─────────────────────────────────────────────────────────────
// Errors only — Info and Warning are dropped everywhere. Console output
// (visible via `docker compose logs api`) and the rolling-daily file both
// receive Error + Fatal. The file lives under content-root so in the
// container it lands at /app/logs (mounted to a Docker volume so rotated
// files survive container restarts).
var logDir = Path.Combine(builder.Environment.ContentRootPath, "logs");
Directory.CreateDirectory(logDir);
Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Error()
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .WriteTo.File(
        path: Path.Combine(logDir, "errors-.txt"),
        rollingInterval: RollingInterval.Day,
        // Cap at ~30 days of rolling files (≈30 MB at default size cap) so the
        // log volume can't fill the disk on a small VPS. Daily rotation +
        // 30-file retention = roughly one month of error history.
        retainedFileCountLimit: 30,
        outputTemplate: "{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz} [{Level:u3}] {SourceContext} {Message:lj}{NewLine}{Exception}{NewLine}",
        shared: true)
    .CreateLogger();
builder.Host.UseSerilog();

// ─── Required secrets — fail fast with a clear message if unconfigured ───
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
if (string.IsNullOrWhiteSpace(connectionString))
    throw new InvalidOperationException(
        "ConnectionStrings:DefaultConnection is not configured. Set it in appsettings.Development.json " +
        "(local) or the ConnectionStrings__DefaultConnection environment variable (production).");

var jwtKey = builder.Configuration["Jwt:SecretKey"];
if (string.IsNullOrWhiteSpace(jwtKey) || jwtKey.Length < 32)
    throw new InvalidOperationException(
        "Jwt:SecretKey is missing or shorter than 32 characters. Set it in appsettings.Development.json " +
        "(local) or the Jwt__SecretKey environment variable (production).");
var jwtIssuer = builder.Configuration["Jwt:Issuer"]!;
var jwtAudience = builder.Configuration["Jwt:Audience"]!;

// ─── Storage paths — resolve relative config values against the content root ───
string ResolveStoragePath(string key)
{
    var configured = builder.Configuration[$"Storage:{key}"] ?? key;
    return Path.IsPathRooted(configured)
        ? configured
        : Path.Combine(builder.Environment.ContentRootPath, configured);
}
builder.Configuration["Storage:MediaUploadPath"] = ResolveStoragePath("MediaUploadPath");
builder.Configuration["Storage:CvUploadPath"] = ResolveStoragePath("CvUploadPath");

// Inject Entity Framework Core and Npgsql PostgreSQL
// Configure Npgsql DataSource with Dynamic JSON support for LocalizedField (Dictionary<string, string>)
var dataSourceBuilder = new NpgsqlDataSourceBuilder(connectionString);
dataSourceBuilder.EnableDynamicJson();
var dataSource = dataSourceBuilder.Build();

builder.Services.AddDbContext<OztemurDbContext>(options =>
    options.UseNpgsql(dataSource));

// Register IHttpContextAccessor for AuditLog identity resolution
builder.Services.AddHttpContextAccessor();

// Register Generic Repository Pattern
builder.Services.AddScoped(typeof(IRepository<>), typeof(Repository<>));

// Register Feature Service Business Logics
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<ICmsService, CmsService>();
builder.Services.AddScoped<ICareersService, CareersService>();
builder.Services.AddScoped<ICommsService, CommsService>();
builder.Services.AddScoped<IProjectService, ProjectService>();
builder.Services.AddScoped<ISiteContentService, SiteContentService>();
builder.Services.AddScoped<Oztemur.API.Features.Notifications.Services.INotificationService, Oztemur.API.Features.Notifications.Services.NotificationService>();

// AuditLog retention — runs once on startup (after a stagger) and then
// every 24h, trimming rows older than Audit:RetentionDays (default 35).
builder.Services.AddHostedService<Oztemur.API.Features.Audit.AuditLogPurger>();

// ─── Email: DataProtection + SMTP service ─────────────────────────────────
// DataProtection keys persist to a volume so encrypted SMTP passwords stay
// readable across container restarts. Without this, EF would round-trip an
// unreadable ciphertext after every redeploy and mail would silently stop.
var dpKeysPath = builder.Configuration["DataProtection:KeysPath"]
    ?? Path.Combine(builder.Environment.ContentRootPath, "keys");
Directory.CreateDirectory(dpKeysPath);
builder.Services.AddDataProtection()
    .PersistKeysToFileSystem(new DirectoryInfo(dpKeysPath));
builder.Services.AddSingleton<EmailPasswordProtector>();
builder.Services.AddScoped<IEmailService, SmtpEmailService>();

// Cloudflare Turnstile (form spam protection). HttpClient is reused per
// request via the typed-client pattern.
builder.Services.AddHttpClient<Oztemur.API.Features.Comms.Services.ITurnstileService,
    Oztemur.API.Features.Comms.Services.TurnstileService>();

// JWT Authentication
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtIssuer,
        ValidAudience = jwtAudience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
    };
});
builder.Services.AddAuthorization();
// Permission-based authorization: a dynamic policy provider materializes a
// policy per "perm:{permission}" name, and the handler checks the JWT claim.
builder.Services.AddSingleton<Microsoft.AspNetCore.Authorization.IAuthorizationPolicyProvider,
    Oztemur.API.Common.Authorization.PermissionPolicyProvider>();
builder.Services.AddSingleton<Microsoft.AspNetCore.Authorization.IAuthorizationHandler,
    Oztemur.API.Common.Authorization.PermissionAuthorizationHandler>();

// ─── Rate limiting — partitioned by client IP ───
// "auth"   guards the login endpoint against brute-force.
// "public-forms" throttles anonymous contact / job-application submissions.
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    options.AddPolicy("auth", http =>
        RateLimitPartition.GetFixedWindowLimiter(
            http.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions { PermitLimit = 10, Window = TimeSpan.FromMinutes(5) }));

    options.AddPolicy("public-forms", http =>
        RateLimitPartition.GetFixedWindowLimiter(
            http.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions { PermitLimit = 8, Window = TimeSpan.FromMinutes(10) }));
});

// CORS — allowed origins come from configuration so production domains are
// set without a code change (Cors__AllowedOrigins__0, __1, …).
var corsOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
                  ?? Array.Empty<string>();
builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendPolicy", policy =>
    {
        policy.WithOrigins(corsOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

// Allow larger uploads (hero background videos). Both the Kestrel transport
// limit (default ~28 MB) and the multipart form parser must be raised; the
// storage endpoint enforces its own 100 MB cap on top.
const long maxUploadBytes = 100L * 1024 * 1024;
builder.WebHost.ConfigureKestrel(o => o.Limits.MaxRequestBodySize = maxUploadBytes);
builder.Services.Configure<Microsoft.AspNetCore.Http.Features.FormOptions>(o =>
{
    o.MultipartBodyLengthLimit = maxUploadBytes;
});

// Add basic feature services
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddHealthChecks();

var app = builder.Build();

// ─── Global exception handler — never leak a raw stack trace ───
app.UseExceptionHandler(errorApp =>
{
    errorApp.Run(async context =>
    {
        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsJsonAsync(
            Result.Failure("An unexpected error occurred. Please try again later.", statusCode: 500));
    });
});

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("FrontendPolicy");
app.UseHttpsRedirection();
app.UseRateLimiter();

// Serve uploaded media files as static content
var mediaPath = builder.Configuration["Storage:MediaUploadPath"]!;
if (!Directory.Exists(mediaPath)) Directory.CreateDirectory(mediaPath);
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(mediaPath),
    RequestPath = "/uploads"
});

app.UseAuthentication();
app.UseAuthorization();

// Liveness probe for load balancers / uptime monitoring.
app.MapHealthChecks("/health");

// Wire Minimal API Feature endpoints (Public)
app.MapAuthEndpoints();
app.MapCmsEndpoints();
app.MapCareersEndpoints();
app.MapCommsEndpoints();
app.MapProjectEndpoints();
app.MapSiteContentEndpoints();

// Wire Admin CRUD endpoints (JWT Protected)
app.MapCmsAdminEndpoints();
app.MapCareersAdminEndpoints();
app.MapCommsAdminEndpoints();
app.MapStorageEndpoints();
app.MapSettingsEndpoints();
app.MapProjectAdminEndpoints();
app.MapSiteContentAdminEndpoints();
app.MapAuditAdminEndpoints();
app.MapNotificationEndpoints();
app.MapUsersEndpoints();
app.MapEmailSettingsEndpoints();
app.MapTranslationsEndpoints();

// Apply any pending EF Core migrations so a fresh database (e.g. a newly
// provisioned cloud Postgres) is schema-ready on the first container start.
using (var migrationScope = app.Services.CreateScope())
{
    var migrationDb = migrationScope.ServiceProvider.GetRequiredService<OztemurDbContext>();
    await migrationDb.Database.MigrateAsync();
}

// Seed default languages
await Oztemur.API.Features.Settings.SettingsEndpoints.SeedLanguagesAsync(app.Services);

// Seed initial site-content rows from current frontend dictionaries
await Oztemur.API.Features.SiteContent.SiteContentSeed.RunAsync(app.Services);

app.Run();

// Exposed so the integration-test host (WebApplicationFactory) can reference it.
public partial class Program { }
