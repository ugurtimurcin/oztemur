using Oztemur.API.Common.Validation;
using Xunit;

namespace Oztemur.Tests;

/// <summary>Covers <see cref="PasswordPolicy"/> — minimum account password rules.</summary>
public class PasswordPolicyTests
{
    [Theory]
    [InlineData("StrongPwd1")]
    [InlineData("MyLongPa55word")]
    [InlineData("Abcdefg1xyz")]
    public void StrongPassword_PassesValidation(string password)
    {
        Assert.Null(PasswordPolicy.Validate(password));
    }

    [Theory]
    [InlineData("")]
    [InlineData(null)]
    [InlineData("Short1A")]      // 7 chars — below the 10-char minimum
    [InlineData("Short1Ab")]     // 8 chars — still below
    [InlineData("Short1Abc")]    // 9 chars — still below
    public void TooShort_IsRejected(string? password)
    {
        Assert.NotNull(PasswordPolicy.Validate(password));
    }

    [Fact]
    public void NoUppercase_IsRejected()
    {
        Assert.NotNull(PasswordPolicy.Validate("alllower123"));
    }

    [Fact]
    public void NoLowercase_IsRejected()
    {
        Assert.NotNull(PasswordPolicy.Validate("ALLUPPER123"));
    }

    [Fact]
    public void NoDigit_IsRejected()
    {
        Assert.NotNull(PasswordPolicy.Validate("AllLettersNoDigits"));
    }

    [Fact]
    public void CommonWeakPassword_IsRejected()
    {
        // Length + upper + lower + digit satisfied, but on the blacklist.
        Assert.NotNull(PasswordPolicy.Validate("Password123"));
    }
}
