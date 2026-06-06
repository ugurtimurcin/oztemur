using System.Threading.Tasks;
using Oztemur.API.Common.Models;

namespace Oztemur.API.Features.Comms.Services;

public interface ICommsService
{
    Task<Result> ProcessContactAsync(ContactRequestDto request);
}
