using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Oztemur.API.Common.Models;

public class Result<T>
{
    public bool Success { get; set; }
    public int StatusCode { get; set; }
    public string? Message { get; set; }
    public T? Data { get; set; }
    public IEnumerable<string>? Errors { get; set; }

    [JsonConstructor]
    protected Result(bool success, int statusCode, string? message, T? data, IEnumerable<string>? errors)
    {
        Success = success;
        StatusCode = statusCode;
        Message = message;
        Data = data;
        Errors = errors;
    }

    public static Result<T> Ok(T data, string? message = "Operation completed successfully.", int statusCode = 200)
    {
        return new Result<T>(true, statusCode, message, data, null);
    }

    public static Result<T> Failure(IEnumerable<string> errors, string? message = "Operation failed.", int statusCode = 400)
    {
        return new Result<T>(false, statusCode, message, default, errors);
    }

    public static Result<T> Failure(string error, string? message = "Operation failed.", int statusCode = 400)
    {
        return new Result<T>(false, statusCode, message, default, new List<string> { error });
    }
}

public class Result : Result<object>
{
    protected Result(bool success, int statusCode, string? message, object? data, IEnumerable<string>? errors) 
        : base(success, statusCode, message, data, errors)
    {
    }

    public static Result Ok(string? message = "Operation completed successfully.", int statusCode = 200)
    {
        return new Result(true, statusCode, message, null, null);
    }

    public new static Result Failure(IEnumerable<string> errors, string? message = "Operation failed.", int statusCode = 400)
    {
        return new Result(false, statusCode, message, null, errors);
    }

    public new static Result Failure(string error, string? message = "Operation failed.", int statusCode = 400)
    {
        return new Result(false, statusCode, message, null, new List<string> { error });
    }
}
