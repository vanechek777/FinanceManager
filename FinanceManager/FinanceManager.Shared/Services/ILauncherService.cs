using System.Threading.Tasks;

namespace FinanceManager.Shared.Services
{
    public interface ILauncherService
    {
        Task OpenUrlAsync(string url);
    }
}
