using System.Threading.Tasks;
using Microsoft.Maui.ApplicationModel;
using FinanceManager.Shared.Services;

namespace FinanceManager.Services
{
    public class MauiLauncherService : ILauncherService
    {
        public Task OpenUrlAsync(string url)
        {
            return Launcher.Default.OpenAsync(url);
        }
    }
}
