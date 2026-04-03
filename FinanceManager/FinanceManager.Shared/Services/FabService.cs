namespace FinanceManager.Shared.Services
{
    /// <summary>
    /// Сервис для передачи FAB-событий между MainLayout и страницами.
    /// Заменяет ненадёжные static events.
    /// Регистрируется как Singleton в MauiProgram.cs
    /// </summary>
    public class FabService
    {
        // Текущий обработчик FAB (только одна страница в каждый момент)
        private Func<Task>? _handler;

        /// <summary>
        /// Страница вызывает Register в OnInitializedAsync
        /// </summary>
        public void Register(Func<Task> handler)
        {
            _handler = handler;
        }

        /// <summary>
        /// Страница вызывает Unregister в Dispose
        /// </summary>
        public void Unregister()
        {
            _handler = null;
        }

        /// <summary>
        /// MainLayout вызывает при нажатии FAB
        /// </summary>
        public async Task TriggerAsync()
        {
            if (_handler != null)
            {
                try
                {
                    await _handler.Invoke();
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[FabService] Handler error: {ex.Message}");
                }
            }
        }
    }
}
