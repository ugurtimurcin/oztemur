using Microsoft.AspNetCore.Builder;

namespace Oztemur.API.Common.Authorization;

public static class AuthorizationExtensions
{
    /// <summary>
    /// Gates an endpoint (or route group) on a single "{module}.{action}"
    /// permission. Resolves through <see cref="PermissionPolicyProvider"/>,
    /// which builds the policy on demand — no need to pre-register it.
    /// </summary>
    public static TBuilder RequirePermission<TBuilder>(this TBuilder builder, string permission)
        where TBuilder : IEndpointConventionBuilder
        => (TBuilder)builder.RequireAuthorization($"{PermissionPolicyProvider.Prefix}{permission}");
}
