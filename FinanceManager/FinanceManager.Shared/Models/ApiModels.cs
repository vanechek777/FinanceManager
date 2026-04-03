using System.Text.Json.Serialization;

namespace FinanceManager.Shared.Models
{
    // ──────────────────────────────────────────
    // Auth
    // ──────────────────────────────────────────
    public class TokenRequest
    {
        [JsonPropertyName("username")]
        public string Username { get; set; } = "";

        [JsonPropertyName("password")]
        public string Password { get; set; } = "";
    }

    public class TokenResponse
    {
        [JsonPropertyName("access")]
        public string Access { get; set; } = "";

        [JsonPropertyName("refresh")]
        public string Refresh { get; set; } = "";
    }

    public class RefreshRequest
    {
        [JsonPropertyName("refresh")]
        public string Refresh { get; set; } = "";
    }

    // ──────────────────────────────────────────
    // User
    // ──────────────────────────────────────────
    public class UserInfo
    {
        [JsonPropertyName("id")]
        public int Id { get; set; }

        [JsonPropertyName("username")]
        public string Username { get; set; } = "";

        [JsonPropertyName("email")]
        public string Email { get; set; } = "";

        [JsonPropertyName("first_name")]
        public string FirstName { get; set; } = "";

        [JsonPropertyName("last_name")]
        public string LastName { get; set; } = "";

        public string DisplayName => !string.IsNullOrWhiteSpace(FirstName)
            ? $"{FirstName} {LastName}".Trim()
            : Username;

        public string Initials
        {
            get
            {
                if (!string.IsNullOrWhiteSpace(FirstName) && !string.IsNullOrWhiteSpace(LastName))
                    return $"{FirstName[0]}{LastName[0]}".ToUpper();
                return Username.Length >= 2 ? Username[..2].ToUpper() : Username.ToUpper();
            }
        }
    }

    // ──────────────────────────────────────────
    // Category
    // ──────────────────────────────────────────
    public class Category
    {
        [JsonPropertyName("id")]
        public int Id { get; set; }

        [JsonPropertyName("name")]
        public string Name { get; set; } = "";

        [JsonPropertyName("icon")]
        public string Icon { get; set; } = "💰";

        [JsonPropertyName("type")]
        public string Type { get; set; } = "expense"; // "income" | "expense"

        [JsonPropertyName("color")]
        public string Color { get; set; } = "#4f8ef7";
    }

    // ──────────────────────────────────────────
    // Transaction
    // ──────────────────────────────────────────
    public class Transaction
    {
        [JsonPropertyName("id")]
        public int Id { get; set; }

        [JsonPropertyName("user")]
        public int? User { get; set; }

        [JsonPropertyName("type")]
        public string Type { get; set; } = "expense"; // "income" | "expense"

        [JsonPropertyName("amount")]
        public decimal Amount { get; set; }

        [JsonPropertyName("category")]
        public int? Category { get; set; }

        [JsonPropertyName("description")]
        public string Description { get; set; } = "";

        [JsonPropertyName("date")]
        public string Date { get; set; } = DateOnly.FromDateTime(DateTime.Today).ToString("yyyy-MM-dd");

        [JsonPropertyName("created_at")]
        public string? CreatedAt { get; set; }

        // Resolved from category list
        public Category? CategoryObj { get; set; }

        public string AmountFormatted => $"{(Type == "income" ? "+" : "−")}₽{Amount:N0}";
        public string DisplayDescription => !string.IsNullOrWhiteSpace(Description) ? Description : CategoryObj?.Name ?? "—";
    }

    public class TransactionCreate
    {
        [JsonPropertyName("type")]
        public string Type { get; set; } = "expense";

        [JsonPropertyName("amount")]
        public decimal Amount { get; set; }

        [JsonPropertyName("category")]
        public int? Category { get; set; }

        [JsonPropertyName("description")]
        public string Description { get; set; } = "";

        [JsonPropertyName("date")]
        public string Date { get; set; } = DateOnly.FromDateTime(DateTime.Today).ToString("yyyy-MM-dd");
    }

    // ──────────────────────────────────────────
    // Goal
    // ──────────────────────────────────────────
    public class Goal
    {
        [JsonPropertyName("id")]
        public int Id { get; set; }

        [JsonPropertyName("user")]
        public int? User { get; set; }

        [JsonPropertyName("name")]
        public string Name { get; set; } = "";

        [JsonPropertyName("icon")]
        public string Icon { get; set; } = "🎯";

        [JsonPropertyName("target_amount")]
        public decimal TargetAmount { get; set; }

        [JsonPropertyName("current_amount")]
        public decimal CurrentAmount { get; set; }

        [JsonPropertyName("deadline")]
        public string? Deadline { get; set; }

        [JsonPropertyName("created_at")]
        public string? CreatedAt { get; set; }

        [JsonPropertyName("progress_pct")]
        public double ProgressPct { get; set; }

        public string DeadlineFormatted
        {
            get
            {
                if (string.IsNullOrEmpty(Deadline)) return "Без срока";
                if (DateOnly.TryParse(Deadline, out var d))
                    return d.ToString("dd.MM.yyyy");
                return Deadline;
            }
        }
    }

    public class GoalCreate
    {
        [JsonPropertyName("name")]
        public string Name { get; set; } = "";

        [JsonPropertyName("icon")]
        public string Icon { get; set; } = "🎯";

        [JsonPropertyName("target_amount")]
        public decimal TargetAmount { get; set; }

        [JsonPropertyName("current_amount")]
        public decimal CurrentAmount { get; set; }

        [JsonPropertyName("deadline")]
        public string? Deadline { get; set; }
    }

    // ──────────────────────────────────────────
    // Stats helpers (computed client-side)
    // ──────────────────────────────────────────
    public class DashboardStats
    {
        public decimal TotalIncome { get; set; }
        public decimal TotalExpense { get; set; }
        public decimal Balance => TotalIncome - TotalExpense;
        public double SavingsRate => TotalIncome > 0
            ? Math.Round((double)(TotalIncome - TotalExpense) / (double)TotalIncome * 100, 1)
            : 0;
    }
}
