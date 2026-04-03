using FinanceManager.Shared.Models;

namespace FinanceManager.Shared.Services
{
    /// <summary>
    /// Manages authentication state across the app lifetime.
    /// Access/refresh tokens + current user info.
    /// </summary>
    public class AuthStateService
    {
        private string? _accessToken;
        private string? _refreshToken;
        private UserInfo? _currentUser;

        public bool IsAuthenticated => !string.IsNullOrEmpty(_accessToken);
        public UserInfo? CurrentUser => _currentUser;
        public string? AccessToken => _accessToken;
        public string? RefreshToken => _refreshToken;

        public event Action? OnAuthStateChanged;

        public void SetTokens(string accessToken, string refreshToken)
        {
            _accessToken = accessToken;
            _refreshToken = refreshToken;
            OnAuthStateChanged?.Invoke();
        }

        public void SetUser(UserInfo user)
        {
            _currentUser = user;
            OnAuthStateChanged?.Invoke();
        }

        public void UpdateAccessToken(string newAccessToken)
        {
            _accessToken = newAccessToken;
            OnAuthStateChanged?.Invoke();
        }

        public void Logout()
        {
            _accessToken = null;
            _refreshToken = null;
            _currentUser = null;
            OnAuthStateChanged?.Invoke();
        }
    }
}
