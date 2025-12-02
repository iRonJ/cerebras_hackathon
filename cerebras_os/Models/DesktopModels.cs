using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace cerebras_os.Models;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum DesktopIntent
{
    create_widget,
    close_widget,
    context_sync,
    hydrate_widget
}

public class DesktopCommandPayload
{
    public string? SessionId { get; set; }
    public DesktopIntent Intent { get; set; }
    public string? Prompt { get; set; }
    public string? WidgetId { get; set; }
    public Dictionary<string, string>? ContextSnapshot { get; set; }
}

public class WidgetContent
{
    public string Id { get; set; } = $"widget_{Guid.NewGuid():N}";
    public string Prompt { get; set; } = string.Empty;
    public string Html { get; set; } = string.Empty;
    public bool LiveData { get; set; }
    public string? Explanation { get; set; }
    public string? ContextKey { get; set; }
    public long? LastUpdated { get; set; }
}

public class BackgroundProcess
{
    public string Key { get; set; } = string.Empty;
    public string Prompt { get; set; } = string.Empty;
    public string Status { get; set; } = "pending";
    public long? LastRun { get; set; }
    public string? Message { get; set; }
}

public class DesktopStatePayload
{
    public string SessionId { get; set; } = string.Empty;
    public List<WidgetContent> Widgets { get; set; } = new();
    public Dictionary<string, string> Context { get; set; } = new();
    public List<BackgroundProcess> BackgroundProcesses { get; set; } = new();
    public string? Notice { get; set; }
}

public class DesktopSession
{
    public DesktopSession(string sessionId)
    {
        SessionId = sessionId;
    }

    public string SessionId { get; }
    public ConcurrentDictionary<string, WidgetContent> Widgets { get; } = new();
    public ConcurrentDictionary<string, string> Context { get; } = new();
    public ConcurrentDictionary<string, BackgroundProcess> BackgroundProcesses { get; } = new();
}
