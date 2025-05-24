using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text;
using System.Threading.Tasks;
using System.Collections.Generic;
using Microsoft.Extensions.Configuration;

namespace cerebras_os.Services
{
    public class OpenRouterService
    {
        private readonly HttpClient _httpClient;
        private readonly string _apiKey;
        private readonly string _url = "https://openrouter.ai/api/v1/chat/completions";

        public OpenRouterService(HttpClient httpClient, IConfiguration config)
        {
            _httpClient = httpClient;
            _apiKey = config["OPENROUTER_API_KEY"] ?? string.Empty;
        }

        public async Task<JsonDocument?> GetChatCompletionAsync(string userMessage)
        {
            var payload = new
            {
                model = "meta-llama/llama-3.3-70b-instruct",
                provider = new { only = new[] { "Cerebras" } },
                messages = new[]
                {
                    new { role = "system", content = "You are a helpful assistant." },
                    new { role = "user", content = userMessage }
                }
            };

            var request = new HttpRequestMessage(HttpMethod.Post, _url)
            {
                Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json")
            };
            request.Headers.Add("Authorization", $"Bearer {_apiKey}");

            var response = await _httpClient.SendAsync(request);
            response.EnsureSuccessStatusCode();
            var stream = await response.Content.ReadAsStreamAsync();
            return await JsonDocument.ParseAsync(stream);
        }
    }
}
