using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text;
using System.Threading.Tasks;
using System.Collections.Generic;
using Microsoft.Extensions.Configuration;
using System.Text.RegularExpressions;

namespace cerebras_os.Services
{
    public class OpenRouterService
    {
        private readonly HttpClient _httpClient;
        private readonly string _apiKey;
        private readonly string _url = "https://openrouter.ai/api/v1/chat/completions";

        public OpenRouterService(HttpClient httpClient)
        {
            _httpClient = httpClient;
            _apiKey = Environment.GetEnvironmentVariable("OPENROUTER_API_KEY") ?? string.Empty;
        }

        public async Task<String?> GetChatCompletionAsync(string userMessage)
        {
            var movieSchema = new
            {
                type = "object",
                properties = new
                {
                    HTMLText = new { type = "string" },
                    prompt = new { type = "string", description = "This is the prompt so you the LLM will know how to update the data in the future" },
                    liveData = new { type = "boolean", description = "Whether the data has to be continuously update, like weather or news or stocks or sports, etc." },
                    LLMExplanation = new
                    {
                        type = "string",
                        description = "An explanation of the reasoning behind the recommendation."
                    }
                },
                required = new[] { "HTMLText", "prompt", "liveData" },
                additionalProperties = false
            };

            var payload = new
            {
                model = "qwen/qwen3-32b",
                stream= false,
                provider = new { only = new[] { "Cerebras" } },
                messages = new[]
                {
                    new { role = "system", content = $"You are an AI OS that generates delightful UI widgets in HTML and always outputs correct JSON. All responses begin and end with curly or square braces as appropriate. The template schema is {JsonSerializer.Serialize(movieSchema)}" },
                    new { role = "user", content = userMessage }
                }
            };

            var request = new HttpRequestMessage(HttpMethod.Post, _url)
            {
                Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json")
            };
            request.Headers.Add("Authorization", $"Bearer {_apiKey}");

            var response = await _httpClient.SendAsync(request);
            try
            {
                //response.EnsureSuccessStatusCode();
                var stream = await response.Content.ReadAsStreamAsync();
                using var doc = JsonDocument.Parse(stream);
                var content = doc.RootElement
                    .GetProperty("choices")[0]
                    .GetProperty("message")
                    .GetProperty("content")
                    .GetString();
                return content;
            }
            catch (JsonException ex)
            {
                var errorTxt = await response.Content.ReadAsStreamAsync();
                Console.WriteLine($"Error parsing JSON response: {ex.Message}");
                return null;
            }
        }

        public async Task<string?> GetGeminiWebSearchAsync(string userText, string? imageUrl = null)
        {
            var messages = new List<object>
            {
                new Dictionary<string, object>
                {
                    ["role"] = "system",
                    ["content"] = new List<object>
                    {
                        new Dictionary<string, object>
                        {
                            ["type"] = "text",
                            ["text"] = "You are an AI assistant that can search the web and provide information. Never say you cannot provide an answer, make an informed guess always, some hallucination is acceptable."
                        }
                    }
                },
                                new Dictionary<string, object>
                {
                    ["role"] = "user",
                    ["content"] = new List<object>
                    {
                        new Dictionary<string, object>
                        {
                            ["type"] = "text",
                            ["text"] = userText
                        }
                    }
                }
            };

            var payload = new
            {
                model = "openrouter/auto",
                plugins = new[]
                {
                    new {
                        id = "web",
                        max_results = 2
                    }   
                },
                messages = messages
            };

            var request = new HttpRequestMessage(HttpMethod.Post, _url)
            {
                Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json")
            };
            request.Headers.Add("Authorization", $"Bearer {_apiKey}");
            request.Headers.Add("HTTP-Referer", "https://your-site-url.com"); // Optional, replace as needed
            request.Headers.Add("X-Title", "Your Site Name"); // Optional, replace as needed

            var response = await _httpClient.SendAsync(request);
            response.EnsureSuccessStatusCode();
            var json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);
            var content = doc.RootElement
                .GetProperty("choices")[0]
                .GetProperty("message")
                .GetProperty("content")
                .GetString();
            return content;
        }

        public async Task<Dictionary<string,object>> GetChatCompletionWithContextAsync(string userMessage, Dictionary<string, string>? sessionState = null)
        {
            var movieSchema = new
            {
                type = "object",
                properties = new
                {
                    HTMLText = new { type = "string" },
                    prompt = new { type = "string", description = "This is the prompt so you as the LLM will know how to update the data in the future" },
                    liveData = new { type = "boolean", description = "Whether the data has to be continuously update, like weather or news or stocks or sports, etc." },
                    LLMExplanation = new
                    {
                        type = "string",
                        description = "An explanation of the reasoning behind the recommendation."
                    }
                },
                required = new[] { "HTMLText", "prompt", "liveData" },
                additionalProperties = false
            };

            string contextText = sessionState != null && sessionState.Count > 0
                ? sessionState.Select(kvp => $"{kvp.Key}: {kvp.Value}").Aggregate((current, next) => $"{current}\n {next}")
                : "";

            var messages = new List<object>();
            messages.Add(new { role = "system", content = $"You are an AI OS that generates delightful UI widgets in HTML and always outputs correct JSON. Some responses you can't answer immediately, so make sure to flag this as \"liveData\" with the right prompt to retrieve the info and it will be added to the context later. All responses begin and end with curly or square braces as appropriate. The template schema is {JsonSerializer.Serialize(movieSchema)}" });

            if (!string.IsNullOrEmpty(contextText))
            {
                messages.Add(new { role = "system", content = $"Context: {contextText}" });
            }
            messages.Add(new { role = "user", content = userMessage });

            var payload = new
            {
                model = "qwen/qwen3-32b",
                stream = false,
                provider = new { only = new[] { "Cerebras" } },
                messages = messages
            };

            var request = new HttpRequestMessage(HttpMethod.Post, _url)
            {
                Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json")
            };
            request.Headers.Add("Authorization", $"Bearer {_apiKey}");

            var response = await _httpClient.SendAsync(request);
            try
            {
                var stream = await response.Content.ReadAsStreamAsync();
                using var doc = JsonDocument.Parse(stream);
                var content = doc.RootElement
                    .GetProperty("choices")[0]
                    .GetProperty("message")
                    .GetProperty("content")
                    .GetString();
                return await parseAsDict(content);
            }
            catch (JsonException ex)
            {
                var errorTxt = await response.Content.ReadAsStreamAsync();
                Console.WriteLine($"Error parsing JSON response: {ex.Message}");
                return null;
            }
        }

        private async Task<Dictionary<string, object>?> parseAsDict(string responseMsg)
        {
                if (string.IsNullOrWhiteSpace(responseMsg)) return null;
                var match = Regex.Match(responseMsg, "([\\[{].*[\\]}])", RegexOptions.Singleline);
                if (!match.Success) return null;
                var json = match.Groups[1].Value;
                var dict = new Dictionary<string, object>();
                using var jsonDoc = JsonDocument.Parse(json);
                var root = jsonDoc.RootElement;
                if (root.ValueKind == JsonValueKind.Object)
                {
                    foreach (var prop in root.EnumerateObject())
                    {
                        dict[prop.Name] = prop.Value.ToString();
                    }
                }
                return dict;
        }
    }
}
