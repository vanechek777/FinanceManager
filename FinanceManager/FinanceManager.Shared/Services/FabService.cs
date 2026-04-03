namespace FinanceManager.Shared.Services
{
    /// <summary>
    /// Сервис для передачи FAB-событий между MainLayout и страницами.
    /// Использует стандартный C# event pattern — единственный надёжный способ
    /// cross-component коммуникации в Blazor.
    /// Регистрируется как Singleton в MauiProgram.cs
    /// </summary>
    public class FabService
    {
        /// <summary>
        /// Страницы подписываются на это событие в OnInitialized / OnInitializedAsync.
        /// ВАЖНО: внутри обработчика используйте InvokeAsync для обновления UI.
        /// </summary>
        public event Action? OnFabClicked;

        /// <summary>
        /// MainLayout вызывает при нажатии FAB.
        /// </summary>
        public void Trigger() => OnFabClicked?.Invoke();
    }
}
