using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Oztemur.API.Common.Authorization;
using Oztemur.API.Common.Models;
using Oztemur.API.Common.Validation;
using Oztemur.API.Domain.Entities;
using Oztemur.API.Features.Email;
using Oztemur.API.Features.Notifications.Services;
using Oztemur.API.Infrastructure.Database;
using Oztemur.API.Infrastructure.Repositories;

namespace Oztemur.API.Features.Auth.Services;

public interface IAuthService
{
    Task<AuthOutcome> LoginAsync(LoginRequestDto request);
    Task<Result<object>> RegisterAsync(RegisterRequestDto request);
    Task<AuthOutcome> RefreshAsync(string refreshToken);
    Task RevokeRefreshTokenAsync(string refreshToken);
    Task<Result> RequestPasswordResetAsync(string email);
    Task<Result> ValidatePasswordResetTokenAsync(string token);
    Task<Result> ResetPasswordAsync(string token, string newPassword);
}

public record LoginRequestDto(string Email, string Password);
public record RegisterRequestDto(string FirstName, string LastName, string Email, string Password);


public record AuthOutcome(Result<object> Result, string? RefreshToken);

public class AuthService : IAuthService
{
    private readonly IRepository<ApplicationUser> _userRepo;
    private readonly IConfiguration _configuration;
    private readonly INotificationService _notifications;
    private readonly OztemurDbContext _db;
    private readonly IEmailService _email;
    private readonly ILogger<AuthService> _logger;

    // Reset link is only valid for one hour — long enough that admins won't
    // miss the mail, short enough that a leaked link expires quickly.
    private static readonly TimeSpan ResetTokenLifetime = TimeSpan.FromHours(1);

    // Refresh tokens are long-lived (7 days) so admins stay logged in across
    // browser sessions, but rotated on every use so a leaked token is good
    // for at most one refresh round-trip before the legitimate client
    // exchanges it.
    private static readonly TimeSpan RefreshTokenLifetime = TimeSpan.FromDays(7);

    public AuthService(
        IRepository<ApplicationUser> userRepo,
        IConfiguration configuration,
        INotificationService notifications,
        OztemurDbContext db,
        IEmailService email,
        ILogger<AuthService> logger)
    {
        _userRepo = userRepo;
        _configuration = configuration;
        _notifications = notifications;
        _db = db;
        _email = email;
        _logger = logger;
    }

    public async Task<AuthOutcome> LoginAsync(LoginRequestDto request)
    {
        var users = await _userRepo.GetAsync(u => u.Email == request.Email);
        var user = users.Count > 0 ? users[0] : null;

        if (user == null)
        {
            // Unknown email — there is no account owner to notify.
            return new AuthOutcome(Result<object>.Failure("Invalid email or password.", statusCode: 401), null);
        }

        if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            await NotifyFailedLoginAsync(user);
            return new AuthOutcome(Result<object>.Failure("Invalid email or password.", statusCode: 401), null);
        }

        if (!user.IsActive)
            return new AuthOutcome(Result<object>.Failure(
                "Your account has been deactivated. Contact an administrator.", statusCode: 403), null);

        user.LastLoginAt = DateTimeOffset.UtcNow;
        await _userRepo.UpdateAsync(user);

        var token = GenerateJwtToken(user);
        var refreshToken = await IssueRefreshTokenAsync(user.Id);

        var result = Result<object>.Ok(new
        {
            Token = token,
            User = new
            {
                user.Id,
                user.FirstName,
                user.LastName,
                user.Email,
                user.Permissions
            }
        }, "Authentication successful.");
        return new AuthOutcome(result, refreshToken);
    }

    public async Task<AuthOutcome> RefreshAsync(string refreshToken)
    {
        if (string.IsNullOrWhiteSpace(refreshToken))
            return new AuthOutcome(Result<object>.Failure("Refresh token gerekli.", statusCode: 401), null);

        var hash = HashToken(refreshToken);
        var record = await _db.RefreshTokens.FirstOrDefaultAsync(t => t.TokenHash == hash);
        if (record == null) return new AuthOutcome(Result<object>.Failure("Geçersiz refresh token.", statusCode: 401), null);
        if (record.UsedAt != null) return new AuthOutcome(Result<object>.Failure("Bu refresh token zaten kullanılmış.", statusCode: 401), null);
        if (record.RevokedAt != null) return new AuthOutcome(Result<object>.Failure("Bu refresh token iptal edilmiş.", statusCode: 401), null);
        if (record.ExpiresAt <= DateTimeOffset.UtcNow) return new AuthOutcome(Result<object>.Failure("Refresh token süresi dolmuş.", statusCode: 401), null);

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == record.UserId);
        if (user == null || !user.IsActive)
            return new AuthOutcome(Result<object>.Failure("Hesap bulunamadı veya devre dışı.", statusCode: 401), null);

        // Single-use: stamp the old record consumed before issuing the new
        // pair. If the same token is replayed later, the second exchange
        // hits the UsedAt check above and is rejected.
        record.UsedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync();

        var newAccess = GenerateJwtToken(user);
        var newRefresh = await IssueRefreshTokenAsync(user.Id);

        var result = Result<object>.Ok(new
        {
            Token = newAccess,
            User = new
            {
                user.Id,
                user.FirstName,
                user.LastName,
                user.Email,
                user.Permissions
            }
        }, "Token refreshed.");
        return new AuthOutcome(result, newRefresh);
    }

    public async Task RevokeRefreshTokenAsync(string refreshToken)
    {
        if (string.IsNullOrWhiteSpace(refreshToken)) return;
        var hash = HashToken(refreshToken);
        var record = await _db.RefreshTokens.FirstOrDefaultAsync(t => t.TokenHash == hash);
        if (record == null) return;
        if (record.RevokedAt != null) return;
        record.RevokedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync();
    }

    private async Task<string> IssueRefreshTokenAsync(Guid userId)
    {
        var raw = GenerateRawToken();
        _db.RefreshTokens.Add(new RefreshToken
        {
            UserId = userId,
            TokenHash = HashToken(raw),
            ExpiresAt = DateTimeOffset.UtcNow.Add(RefreshTokenLifetime),
        });
        await _db.SaveChangesAsync();
        return raw;
    }

    /// <summary>
    /// Alerts the account owner that someone tried — and failed — to sign in
    /// as them. Sent only on a wrong-password attempt against a real account;
    /// an attempt on an unknown email has no owner to notify. Production
    /// should add throttling (one per account per minute) before scale.
    /// </summary>
    private Task NotifyFailedLoginAsync(ApplicationUser user)
        => _notifications.CreateForUserAsync(
            userId: user.Id,
            type: "failed_login",
            title: "Failed login attempt",
            message: "Someone tried to sign in to your account with the wrong password.",
            link: null,
            entityId: null);

    public async Task<Result<object>> RegisterAsync(RegisterRequestDto request)
    {
        // Bootstrap-only: registration is open exclusively when the system has
        // no users yet. The first account is created with the full permission
        // set so it can manage everyone else. Once any user exists, accounts
        // are created from the admin panel (users.edit permission required).
        var anyUser = await _userRepo.GetAsync(_ => true);
        if (anyUser.Count > 0)
            return Result<object>.Failure(
                "Registration is closed. New accounts are created from the admin panel.", statusCode: 403);

        var pwError = PasswordPolicy.Validate(request.Password);
        if (pwError != null)
            return Result<object>.Failure(pwError);

        var user = new ApplicationUser
        {
            FirstName = request.FirstName,
            LastName = request.LastName,
            Email = request.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Permissions = Permissions.All.ToList()
        };

        await _userRepo.AddAsync(user);

        var token = GenerateJwtToken(user);

        return Result<object>.Ok(new
        {
            Token = token,
            User = new
            {
                user.Id,
                user.FirstName,
                user.LastName,
                user.Email,
                user.Permissions
            }
        }, "Registration successful.");
    }

    public async Task<Result> RequestPasswordResetAsync(string email)
    {
        // Always return success regardless of whether the email exists — this
        // prevents account enumeration via the forgot-password endpoint.
        // Logged-only side-effects: token issued + mail attempted.
        var users = await _userRepo.GetAsync(u => u.Email == email && u.IsActive);
        var user = users.Count > 0 ? users[0] : null;
        if (user == null)
        {
            _logger.LogInformation("Password reset requested for unknown email {Email} — silently ignored.", email);
            return Result.Ok("Eğer bu e-posta adresi sistemde kayıtlıysa, sıfırlama bağlantısı kısa süre içinde gönderilecektir.");
        }

        // Invalidate any previously issued, still-unused tokens for this user
        // so only the freshest link works — prevents multiple-link confusion
        // if admin clicks "forgot password" twice.
        var oldTokens = await _db.PasswordResetTokens
            .Where(t => t.UserId == user.Id && t.UsedAt == null && t.ExpiresAt > DateTimeOffset.UtcNow)
            .ToListAsync();
        foreach (var ot in oldTokens) ot.UsedAt = DateTimeOffset.UtcNow;

        var rawToken = GenerateRawToken();
        var hash = HashToken(rawToken);

        _db.PasswordResetTokens.Add(new PasswordResetToken
        {
            UserId = user.Id,
            TokenHash = hash,
            ExpiresAt = DateTimeOffset.UtcNow.Add(ResetTokenLifetime),
        });
        await _db.SaveChangesAsync();

        var adminBaseUrl = (_configuration["Admin:BaseUrl"] ?? "http://localhost:3001").TrimEnd('/');
        var resetLink = $"{adminBaseUrl}/reset-password?token={Uri.EscapeDataString(rawToken)}";

        var fullName = string.IsNullOrWhiteSpace(user.FirstName) ? "Yönetici" : $"{user.FirstName} {user.LastName}".Trim();
        var htmlBody = $@"
            <div style=""font-family:system-ui,sans-serif;max-width:560px;color:#222"">
              <h2 style=""margin:0 0 12px 0;font-size:18px;color:#000666"">Şifre sıfırlama talebi</h2>
              <p style=""margin:0 0 14px 0;line-height:1.6"">Merhaba {System.Net.WebUtility.HtmlEncode(fullName)},</p>
              <p style=""margin:0 0 14px 0;line-height:1.6"">Öztemur admin panelinde şifre sıfırlama talebinde bulundunuz. Yeni şifrenizi belirlemek için aşağıdaki bağlantıya 1 saat içinde tıklayın:</p>
              <p style=""margin:20px 0""><a href=""{resetLink}"" style=""display:inline-block;padding:12px 24px;background:#000666;color:#fff;text-decoration:none;border-radius:6px;font-weight:600"">Şifremi sıfırla</a></p>
              <p style=""font-size:12px;color:#777;margin:0 0 14px 0;line-height:1.5"">Bağlantı çalışmazsa şu adresi tarayıcınıza yapıştırın:<br/><span style=""word-break:break-all"">{resetLink}</span></p>
              <hr style=""margin:24px 0;border:none;border-top:1px solid #eee""/>
              <p style=""font-size:11px;color:#999;margin:0;line-height:1.5"">Bu talebi siz yapmadıysanız bu maili göz ardı edebilirsiniz — şifreniz değişmeyecek.</p>
            </div>";

        await _email.SendAsync(
            new EmailMessage(user.Email, "Öztemur admin · Şifre sıfırlama", htmlBody),
            EmailPurpose.PasswordReset);

        return Result.Ok("Eğer bu e-posta adresi sistemde kayıtlıysa, sıfırlama bağlantısı kısa süre içinde gönderilecektir.");
    }

    public async Task<Result> ValidatePasswordResetTokenAsync(string token)
    {
        if (string.IsNullOrWhiteSpace(token))
            return Result.Failure("Bağlantı geçersiz veya bozuk.");

        var hash = HashToken(token);
        var record = await _db.PasswordResetTokens.AsNoTracking().FirstOrDefaultAsync(t => t.TokenHash == hash);
        if (record == null) return Result.Failure("Bağlantı geçersiz.");
        if (record.UsedAt != null) return Result.Failure("Bu bağlantı zaten kullanılmış.");
        if (record.ExpiresAt <= DateTimeOffset.UtcNow) return Result.Failure("Bağlantı süresi dolmuş. Yeni bir sıfırlama talebinde bulunun.");
        return Result.Ok("Bağlantı geçerli.");
    }

    public async Task<Result> ResetPasswordAsync(string token, string newPassword)
    {
        if (string.IsNullOrWhiteSpace(token))
            return Result.Failure("Bağlantı geçersiz.");

        var pwError = PasswordPolicy.Validate(newPassword);
        if (pwError != null) return Result.Failure(pwError);

        var hash = HashToken(token);
        var record = await _db.PasswordResetTokens.FirstOrDefaultAsync(t => t.TokenHash == hash);
        if (record == null) return Result.Failure("Bağlantı geçersiz.");
        if (record.UsedAt != null) return Result.Failure("Bu bağlantı zaten kullanılmış.");
        if (record.ExpiresAt <= DateTimeOffset.UtcNow) return Result.Failure("Bağlantı süresi dolmuş. Yeni bir sıfırlama talebinde bulunun.");

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == record.UserId);
        if (user == null) return Result.Failure("Hesap bulunamadı.");

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
        record.UsedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync();

        _logger.LogInformation("Password reset completed for user {UserId}.", user.Id);
        return Result.Ok("Şifreniz başarıyla güncellendi. Yeni şifrenizle giriş yapabilirsiniz.");
    }

    /// <summary>
    /// 32 random bytes → URL-safe base64 (~43 chars). High enough entropy
    /// that brute-forcing is infeasible even without rate limiting.
    /// </summary>
    private static string GenerateRawToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(32);
        return Convert.ToBase64String(bytes)
            .Replace('+', '-').Replace('/', '_').TrimEnd('=');
    }

    private static string HashToken(string raw)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(raw));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }

    private string GenerateJwtToken(ApplicationUser user)
    {
        var secretKey = _configuration["Jwt:SecretKey"]!;
        var issuer = _configuration["Jwt:Issuer"]!;
        var audience = _configuration["Jwt:Audience"]!;
        // Short-lived access tokens (60 min default). Refresh tokens cover
        // long sessions — see RefreshAsync. Override via Jwt:ExpirationInMinutes
        // only when there's a concrete reason (e.g. CI test flake).
        var expirationMinutes = int.Parse(_configuration["Jwt:ExpirationInMinutes"] ?? "60");

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.GivenName, user.FirstName),
            new Claim(ClaimTypes.Surname, user.LastName),
        };

        // Add each permission as a separate claim — endpoints gate on these.
        foreach (var permission in user.Permissions)
        {
            claims.Add(new Claim(PermissionAuthorizationHandler.ClaimType, permission));
        }

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expirationMinutes),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
