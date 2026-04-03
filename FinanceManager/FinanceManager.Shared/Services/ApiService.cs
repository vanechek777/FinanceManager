using FinanceManager.Shared.Models;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace FinanceManager.Shared.Services
{
    /// <summary>
    /// HTTP API клиент с JWT Bearer-аутентификацией.
    /// Использует StringContent вместо JsonContent/PostAsJsonAsync,
    /// чтобы избежать Chunked Transfer Encoding, который не поддерживает
    /// Django runserver (wsgi).
    /// </summary>
    public class ApiService
    {
        private readonly HttpClient _http;
        private readonly AuthStateService _auth;

        private const string BaseUrl = "https://finmanager.ru.tuna.am";

        private static readonly JsonSerializerOptions JsonOpts = new()
        {
            PropertyNameCaseInsensitive = true,
            // Django REST Framework сериализует DecimalField как строку ("2500.00")
            // AllowReadingFromString позволяет System.Text.Json конвертировать их в decimal/double
            NumberHandling = JsonNumberHandling.AllowReadingFromString
        };

        private static readonly JsonSerializerOptions JsonWriteOpts = new()
        {
            PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower
        };

        public ApiService(AuthStateService auth, HttpClient http)
        {
            _auth = auth;
            _http = http;
            _http.BaseAddress ??= new Uri(BaseUrl);

            // Критично: без Accept: application/json Django REST Framework
            // может вернуть HTML (BrowsableAPIRenderer) вместо JSON!
            _http.DefaultRequestHeaders.Accept.Clear();
            _http.DefaultRequestHeaders.Accept
                .Add(new MediaTypeWithQualityHeaderValue("application/json"));
        }

        // ── Helpers ────────────────────────────────────────────────────────────

        /// <summary>
        /// Сериализует объект в StringContent с Content-Type: application/json.
        /// StringContent автоматически выставляет Content-Length, исключая chunked encoding.
        /// </summary>
        private static StringContent ToJsonContent(object body)
        {
            var json = JsonSerializer.Serialize(body, JsonWriteOpts);
            return new StringContent(json, Encoding.UTF8, "application/json");
        }

        private static async Task<T?> DeserializeAsync<T>(HttpContent content)
        {
            var json = await content.ReadAsStringAsync();
            if (string.IsNullOrWhiteSpace(json)) return default;
            return JsonSerializer.Deserialize<T>(json, JsonOpts);
        }

        private void SetAuthHeader()
        {
            _http.DefaultRequestHeaders.Authorization = !string.IsNullOrEmpty(_auth.AccessToken)
                ? new AuthenticationHeaderValue("Bearer", _auth.AccessToken)
                : null;
        }

        // ── Auth ───────────────────────────────────────────────────────────────

        public async Task<(bool success, string error)> LoginAsync(string username, string password)
        {
            try
            {
                var content = ToJsonContent(new TokenRequest
                {
                    Username = username,
                    Password = password
                });

                var response = await _http.PostAsync("/api/token/", content);

                if (!response.IsSuccessStatusCode)
                    return (false, "Неверный логин или пароль");

                var tokens = await DeserializeAsync<TokenResponse>(response.Content);
                if (tokens is null || string.IsNullOrEmpty(tokens.Access))
                    return (false, "Ошибка сервера: токен не получен");

                _auth.SetTokens(tokens.Access, tokens.Refresh);
                await LoadUserInfoAsync();
                return (true, "");
            }
            catch (Exception ex)
            {
                return (false, $"Ошибка подключения: {ex.Message}");
            }
        }

        public async Task<bool> RefreshTokenAsync()
        {
            if (string.IsNullOrEmpty(_auth.RefreshToken)) return false;
            try
            {
                var content = ToJsonContent(new RefreshRequest { Refresh = _auth.RefreshToken });
                var response = await _http.PostAsync("/api/token/refresh/", content);
                if (!response.IsSuccessStatusCode) return false;

                var result = await DeserializeAsync<TokenResponse>(response.Content);
                if (result is null || string.IsNullOrEmpty(result.Access)) return false;

                _auth.UpdateAccessToken(result.Access);
                return true;
            }
            catch { return false; }
        }

        // ── Generic requests ────────────────────────────────────────────────────

        private async Task<HttpResponseMessage> GetWithAuthAsync(string path)
        {
            SetAuthHeader();
            // Явно указываем Accept: application/json чтобы DRF не вернул HTML
            _http.DefaultRequestHeaders.Accept.Clear();
            _http.DefaultRequestHeaders.Accept
                .Add(new MediaTypeWithQualityHeaderValue("application/json"));

            var response = await _http.GetAsync(path);
            Console.WriteLine($"[ApiService] GET {path} → {(int)response.StatusCode}");

            if (response.StatusCode == System.Net.HttpStatusCode.Unauthorized)
            {
                if (await RefreshTokenAsync())
                {
                    SetAuthHeader();
                    response = await _http.GetAsync(path);
                    Console.WriteLine($"[ApiService] GET {path} retry → {(int)response.StatusCode}");
                }
                else
                {
                    _auth.Logout();
                }
            }
            return response;
        }

        private async Task<(T? result, string error)> PostWithAuthAsync<T>(string path, object body)
        {
            SetAuthHeader();
            var response = await _http.PostAsync(path, ToJsonContent(body));

            if (response.StatusCode == System.Net.HttpStatusCode.Unauthorized)
            {
                if (await RefreshTokenAsync())
                {
                    SetAuthHeader();
                    response = await _http.PostAsync(path, ToJsonContent(body));
                }
                else
                {
                    _auth.Logout();
                    return (default, "Не авторизован");
                }
            }

            if (!response.IsSuccessStatusCode)
                return (default, await response.Content.ReadAsStringAsync());

            return (await DeserializeAsync<T>(response.Content), "");
        }

        private async Task<(T? result, string error)> PatchWithAuthAsync<T>(string path, object body)
        {
            SetAuthHeader();
            var response = await _http.PatchAsync(path, ToJsonContent(body));

            if (response.StatusCode == System.Net.HttpStatusCode.Unauthorized)
            {
                if (await RefreshTokenAsync())
                {
                    SetAuthHeader();
                    response = await _http.PatchAsync(path, ToJsonContent(body));
                }
                else
                {
                    _auth.Logout();
                    return (default, "Не авторизован");
                }
            }

            if (!response.IsSuccessStatusCode)
                return (default, await response.Content.ReadAsStringAsync());

            return (await DeserializeAsync<T>(response.Content), "");
        }

        private async Task<(bool success, string error)> DeleteWithAuthAsync(string path)
        {
            SetAuthHeader();
            var response = await _http.DeleteAsync(path);

            if (response.StatusCode == System.Net.HttpStatusCode.Unauthorized)
            {
                if (await RefreshTokenAsync())
                {
                    SetAuthHeader();
                    response = await _http.DeleteAsync(path);
                }
                else
                {
                    _auth.Logout();
                    return (false, "Не авторизован");
                }
            }

            return response.IsSuccessStatusCode
                ? (true, "")
                : (false, await response.Content.ReadAsStringAsync());
        }

        // ── User ────────────────────────────────────────────────────────────────

        public async Task LoadUserInfoAsync()
        {
            try
            {
                var response = await GetWithAuthAsync("/api/users/me/");
                if (!response.IsSuccessStatusCode) return;
                var user = await DeserializeAsync<UserInfo>(response.Content);
                if (user is not null) _auth.SetUser(user);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ApiService] LoadUserInfo error: {ex.Message}");
            }
        }

        // ── Categories ──────────────────────────────────────────────────────────

        public async Task<List<Category>> GetCategoriesAsync()
        {
            try
            {
                var response = await GetWithAuthAsync("/api/categories/");
                if (!response.IsSuccessStatusCode) return new List<Category>();
                return await ParseListAsync<Category>(response.Content);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ApiService] GetCategories error: {ex.Message}");
                return new List<Category>();
            }
        }

        // ── Transactions ────────────────────────────────────────────────────────

        public async Task<List<Transaction>> GetTransactionsAsync()
        {
            try
            {
                var response = await GetWithAuthAsync("/api/transactions/");
                if (!response.IsSuccessStatusCode) return new List<Transaction>();
                return await ParseListAsync<Transaction>(response.Content);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ApiService] GetTransactions error: {ex.Message}");
                return new List<Transaction>();
            }
        }

        public async Task<(Transaction? tx, string error)> CreateTransactionAsync(TransactionCreate data)
            => await PostWithAuthAsync<Transaction>("/api/transactions/", data);

        public async Task<(Transaction? tx, string error)> UpdateTransactionAsync(int id, TransactionCreate data)
            => await PatchWithAuthAsync<Transaction>($"/api/transactions/{id}/", data);

        public async Task<(bool success, string error)> DeleteTransactionAsync(int id)
            => await DeleteWithAuthAsync($"/api/transactions/{id}/");

        // ── Goals ───────────────────────────────────────────────────────────────

        public async Task<List<Goal>> GetGoalsAsync()
        {
            try
            {
                var response = await GetWithAuthAsync("/api/goals/");
                if (!response.IsSuccessStatusCode) return new List<Goal>();
                return await ParseListAsync<Goal>(response.Content);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ApiService] GetGoals error: {ex.Message}");
                return new List<Goal>();
            }
        }

        public async Task<(Goal? goal, string error)> CreateGoalAsync(GoalCreate data)
            => await PostWithAuthAsync<Goal>("/api/goals/", data);

        public async Task<(Goal? goal, string error)> UpdateGoalAsync(int id, GoalCreate data)
            => await PatchWithAuthAsync<Goal>($"/api/goals/{id}/", data);

        public async Task<(bool success, string error)> DeleteGoalAsync(int id)
            => await DeleteWithAuthAsync($"/api/goals/{id}/");

        // ── DRF list parser ─────────────────────────────────────────────────────

        /// <summary>
        /// Обрабатывает оба формата DRF: plain array [] и pagination wrapper {count, results:[]}.
        /// </summary>
        private static async Task<List<T>> ParseListAsync<T>(HttpContent content)
        {
            var json = await content.ReadAsStringAsync();

            // Диагностика: всегда логируем первые символы ответа
            var preview = json.Length > 300 ? json[..300] + "..." : json;
            Console.WriteLine($"[ApiService] Response body preview: {preview}");

            if (string.IsNullOrWhiteSpace(json)) return new List<T>();

            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            if (root.ValueKind == JsonValueKind.Array)
                return JsonSerializer.Deserialize<List<T>>(json, JsonOpts) ?? new List<T>();

            if (root.TryGetProperty("results", out var results))
                return JsonSerializer.Deserialize<List<T>>(results.GetRawText(), JsonOpts) ?? new List<T>();

            return new List<T>();
        }
    }
}
