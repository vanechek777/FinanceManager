using FinanceManager.Services;
using FinanceManager.Shared.Services;
using Microsoft.Extensions.Logging;

namespace FinanceManager
{
    public static class MauiProgram
    {
        public static MauiApp CreateMauiApp()
        {
            var builder = MauiApp.CreateBuilder();
            builder
                .UseMauiApp<App>()
                .ConfigureFonts(fonts =>
                {
                    fonts.AddFont("OpenSans-Regular.ttf", "OpenSansRegular");
                });

            // ── Device-specific services ──────────────────────────
            builder.Services.AddSingleton<IFormFactor, FormFactor>();

            // ── HTTP Client ───────────────────────────────────────
            builder.Services.AddSingleton<HttpClient>(_ =>
            {
                return new HttpClient
                {
                    DefaultRequestVersion = new Version(1, 1),
                    Timeout = TimeSpan.FromSeconds(30)
                };
            });

            // ── FinanceFlow Services ───────────────────────────────
            builder.Services.AddSingleton<AuthStateService>();

            builder.Services.AddSingleton<ApiService>(sp =>
                new ApiService(
                    sp.GetRequiredService<AuthStateService>(),
                    sp.GetRequiredService<HttpClient>()
                ));

            // FAB event bus
            builder.Services.AddSingleton<FabService>();

            // launcher
            builder.Services.AddSingleton<ILauncherService, MauiLauncherService>();

            // ── Blazor WebView ────────────────────────────────────
            builder.Services.AddMauiBlazorWebView();

#if DEBUG
            builder.Services.AddBlazorWebViewDeveloperTools();
            builder.Logging.AddDebug();
#endif

            return builder.Build();
        }
    }
}
