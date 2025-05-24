using System;
using System.Collections.Concurrent;
using System.Threading;
using System.Threading.Tasks;
using cerebras_os.Services;

namespace cerebras_os.Services
{
    public class SessionObject
    {
        public string ContextText { get; set; } = string.Empty;
        public string PromptText { get; set; } = string.Empty;
        public bool NeedsUpdate { get; set; } = false;
        public bool LiveData { get; set; } = false;
    }

    public class UserSessionState : IDisposable
    {
        private readonly ConcurrentDictionary<string, SessionObject> _objects = new();
        private readonly OpenRouterService _openRouterService;
        private readonly CancellationTokenSource _cts = new();
        private readonly Task _backgroundTask;

        public UserSessionState(OpenRouterService openRouterService)
        {
            _openRouterService = openRouterService;
            _backgroundTask = Task.Run(BackgroundPoll, _cts.Token);
        }

        public ConcurrentDictionary<string, SessionObject> Objects => _objects;

        public void AddOrUpdate(string key, SessionObject obj)
        {
            _objects.AddOrUpdate(key, obj, (k, existing) =>
            {
                // Only update ContextText if it is empty
                if (!string.IsNullOrEmpty(existing.ContextText))
                {
                    obj.ContextText = existing.ContextText;
                }
                return obj;
            });
        }

        private async Task BackgroundPoll()
        {
            while (!_cts.Token.IsCancellationRequested)
            {
                foreach (var kvp in _objects)
                {
                    if (kvp.Value.NeedsUpdate)
                    {
                        try
                        {
                            var response = await _openRouterService.GetGeminiWebSearchAsync($"My current data is:\"{kvp.Value.ContextText}\" it might already be good or need updating or correcting. {kvp.Value.PromptText}");
                            if (response != null)
                            {
                                kvp.Value.ContextText = response;
                                if(!kvp.Value.LiveData)
                                {
                                    kvp.Value.NeedsUpdate = false;
                                }
                            }
                        }
                        catch (Exception ex)
                        {
                            kvp.Value.ContextText = $"Error: {ex.Message}";
                        }
                    }
                }
                await Task.Delay(5000, _cts.Token);
            }
        }

        public void Dispose()
        {
            _cts.Cancel();
            try { _backgroundTask.Wait(); } catch { }
            _cts.Dispose();
        }
    }
}
