// =============================================================================
// Windows Agent — WebSocket client for remote process control
// =============================================================================
// Connects to Cloudflare Worker, registers as a device, receives commands,
// starts/stops processes, sends heartbeats.  Auto-reconnects on disconnect.
//
// Config: config.ini (placed next to the .exe)
// =============================================================================

using System.Diagnostics;
using System.Net.WebSockets;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

// ── P/Invoke — console + memory trimming ────────────────────────────────────

[DllImport("kernel32.dll")]
static extern bool AllocConsole();

[DllImport("kernel32.dll")]
static extern bool SetProcessWorkingSetSize(IntPtr proc, int min, int max);

[DllImport("kernel32.dll")]
static extern IntPtr GetCurrentProcess();

// ── Entry point ───────────────────────────────────────────────────────────────

var cts = new CancellationTokenSource();

var _jsonOpts = new JsonSerializerOptions
{
    PropertyNamingPolicy = JsonNamingPolicy.CamelCase
};

// Parse config.ini
var ini = ParseIni("config.ini");

var serverUrl = ini.GetValueOrDefault("configs")?.GetValueOrDefault("serverurl")
    ?? throw new Exception("[configs] serverUrl is required");
var token = ini.GetValueOrDefault("token")?.GetValueOrDefault("id")
    ?? throw new Exception("[token] ID is required");
var deviceId = ini.GetValueOrDefault("deviceid")?.GetValueOrDefault("name")
    ?? throw new Exception("[deviceID] name is required");

// Boot config — silent mode
var silent = ini.GetValueOrDefault("bootconfig")?.GetValueOrDefault("silent") ?? "";
var showConsole = !string.Equals(silent, "enable", StringComparison.OrdinalIgnoreCase);

if (showConsole)
{
    AllocConsole();
    Console.CancelKeyPress += (_, e) => { e.Cancel = true; cts.Cancel(); };
}

var apps = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
if (ini.TryGetValue("applist", out var appSection))
{
    foreach (var kv in appSection)
        apps[kv.Key] = kv.Value;
}
if (apps.Count == 0)
    throw new Exception("[applist] must contain at least one app (name=path)");

Log($"Agent starting — device: {deviceId}, server: {serverUrl}");
Log($"Registered apps: {string.Join(", ", apps.Keys)}");

// Trim memory after startup
TrimMemory();

while (!cts.Token.IsCancellationRequested)
{
    try
    {
        await RunSession(serverUrl, token, deviceId, apps, cts.Token);
    }
    catch (OperationCanceledException) { break; }
    catch (Exception ex)
    {
        Log($"Session error: {ex.Message}");
    }

    if (!cts.Token.IsCancellationRequested)
    {
        TrimMemory(); // trim before reconnect
        Log("Disconnected — reconnecting in 5 seconds...");
        try { await Task.Delay(5000, cts.Token); } catch (OperationCanceledException) { break; }
    }
}

Log("Agent stopped.");

// ── Main session loop ─────────────────────────────────────────────────────────

async Task RunSession(string serverUrl, string token, string deviceId,
    Dictionary<string, string> apps, CancellationToken ct)
{
    using var ws = new ClientWebSocket();
    var url = new Uri($"{serverUrl}?token={Uri.EscapeDataString(token)}");

    Log($"Connecting to {serverUrl}...");
    await ws.ConnectAsync(url, ct);
    Log("WebSocket connected.");

    var hostname = Environment.MachineName;
    var appNames = apps.Keys.ToArray();
    await Send(ws, new WsMessage("agent_register", deviceId, hostname, appNames, null, null, null, null), ct);
    Log($"Registered as \"{deviceId}\" ({hostname})");

    var heartbeatTask = HeartbeatLoop(ws, ct);
    await ReceiveLoop(ws, deviceId, apps, ct);

    try { await heartbeatTask; } catch { }
}

// ── Heartbeat (every 30 s) ────────────────────────────────────────────────────

async Task HeartbeatLoop(ClientWebSocket ws, CancellationToken ct)
{
    while (ws.State == WebSocketState.Open && !ct.IsCancellationRequested)
    {
        try { await Task.Delay(30_000, ct); } catch (OperationCanceledException) { break; }
        if (ws.State != WebSocketState.Open) break;

        try
        {
            await Send(ws, new WsMessage("heartbeat", null, null, null, null, null, null, null), ct);
        }
        catch { break; }
    }
}

// ── Receive loop — handle incoming commands ───────────────────────────────────

async Task ReceiveLoop(ClientWebSocket ws, string deviceId,
    Dictionary<string, string> apps, CancellationToken ct)
{
    var buffer = new byte[8192];

    while (ws.State == WebSocketState.Open && !ct.IsCancellationRequested)
    {
        string json;
        using (var ms = new MemoryStream())
        {
            WebSocketReceiveResult result;
            do
            {
                result = await ws.ReceiveAsync(new ArraySegment<byte>(buffer), ct);
                ms.Write(buffer, 0, result.Count);
            } while (!result.EndOfMessage);

            if (result.MessageType == WebSocketMessageType.Close) break;

            json = Encoding.UTF8.GetString(ms.ToArray());
        }

        WsMessage? msg;
        try { msg = JsonSerializer.Deserialize<WsMessage>(json, _jsonOpts); }
        catch { continue; }
        if (msg is null) continue;

        switch (msg.Type)
        {
            case "cmd":
                await HandleCommand(ws, deviceId, apps, msg, ct);
                break;
            case "registered":
                Log($"Server ack: device \"{msg.DeviceId}\" registered");
                break;
        }
    }
}

// ── Command handler — start or stop a process ─────────────────────────────────

async Task HandleCommand(ClientWebSocket ws, string deviceId,
    Dictionary<string, string> apps, WsMessage msg, CancellationToken ct)
{
    var action = msg.Action ?? "";
    var name = msg.Name ?? "";

    try
    {
        if (action == "exec")
        {
            // Execute arbitrary shell command — no app lookup needed
            var psi = new ProcessStartInfo("cmd.exe", $"/c {name}")
            {
                UseShellExecute = false,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                CreateNoWindow = true,
                WindowStyle = ProcessWindowStyle.Hidden
            };
            using var proc = Process.Start(psi)!;
            var stdout = proc.StandardOutput.ReadToEnd();
            var stderr = proc.StandardError.ReadToEnd();
            proc.WaitForExit(10_000);

            var output = stdout;
            if (!string.IsNullOrEmpty(stderr))
                output += "\n[STDERR]\n" + stderr;

            Log($"Exec: {name}  (exit: {proc.ExitCode})");
            await SendResult(ws, deviceId, action, name, true, output, ct);
        }
        else
        {
        if (!apps.TryGetValue(name, out var path))
        {
            await SendResult(ws, deviceId, action, name, false, $"Unknown app: {name}", ct);
            return;
        }

        if (action == "start")
        {
            var psi = new ProcessStartInfo(path)
            {
                UseShellExecute = true,
                WindowStyle = ProcessWindowStyle.Normal
            };
            Process.Start(psi);
            Log($"Started: {name}  ({path})");
            await SendResult(ws, deviceId, action, name, true, $"Started {name}", ct);
        }
        else if (action == "stop")
        {
            var processName = Path.GetFileNameWithoutExtension(path);
            var procs = Process.GetProcessesByName(processName);

            if (procs.Length == 0)
            {
                await SendResult(ws, deviceId, action, name, true, $"{name} was not running", ct);
                return;
            }

            foreach (var p in procs)
            {
                try { p.Kill(); p.Dispose(); } catch (Exception ex) { Log($"Kill error ({name}): {ex.Message}"); }
            }

            Log($"Stopped: {name}  ({procs.Length} process(es))");
            await SendResult(ws, deviceId, action, name, true, $"Stopped {name} ({procs.Length} proc)", ct);
        }
        else
        {
            await SendResult(ws, deviceId, action, name, false, $"Unknown action: {action}", ct);
        }
        } // end else (non-exec actions)
    }
    catch (Exception ex)
    {
        Log($"Command error ({action} {name}): {ex.Message}");
        await SendResult(ws, deviceId, action, name, false, ex.Message, ct);
    }
}

// ── INI parser ────────────────────────────────────────────────────────────────

Dictionary<string, Dictionary<string, string>> ParseIni(string path)
{
    var exeDir = AppContext.BaseDirectory;
    var configPath = Path.Combine(exeDir, path);

    if (!File.Exists(configPath))
    {
        configPath = Path.Combine(Directory.GetCurrentDirectory(), path);
    }

    if (!File.Exists(configPath))
    {
        throw new FileNotFoundException(
            $"config.ini not found.  Expected at: {exeDir}  or current directory.");
    }

    Log($"Config loaded from: {configPath}");

    var result = new Dictionary<string, Dictionary<string, string>>(StringComparer.OrdinalIgnoreCase);
    var currentSection = "";
    var lines = File.ReadAllLines(configPath);

    foreach (var raw in lines)
    {
        var line = raw.Trim();

        // Skip empty lines and comments (;)
        if (string.IsNullOrEmpty(line) || line.StartsWith(";") || line.StartsWith("#"))
            continue;

        // Section header [name]
        if (line.StartsWith("[") && line.EndsWith("]"))
        {
            currentSection = line[1..^1].Trim();
            if (!result.ContainsKey(currentSection))
                result[currentSection] = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            continue;
        }

        // Key=Value
        var eq = line.IndexOf('=');
        if (eq > 0 && currentSection != "")
        {
            var key = line[..eq].Trim();
            var value = line[(eq + 1)..].Trim();

            // Remove inline comment (trailing ;)
            var semi = value.IndexOf(';');
            if (semi >= 0) value = value[..semi].TrimEnd();

            result[currentSection][key] = value;
        }
    }

    return result;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async Task Send(ClientWebSocket ws, WsMessage msg, CancellationToken ct)
{
    var json = JsonSerializer.Serialize(msg, _jsonOpts);
    var bytes = Encoding.UTF8.GetBytes(json);
    await ws.SendAsync(new ArraySegment<byte>(bytes), WebSocketMessageType.Text, true, ct);
}

async Task SendResult(ClientWebSocket ws, string deviceId, string action,
    string name, bool ok, string message, CancellationToken ct)
{
    await Send(ws, new WsMessage("cmd_result", deviceId, null, null, action, name, ok, message), ct);
}

static void Log(string msg)
{
    var ts = DateTime.Now.ToString("HH:mm:ss");
    Console.WriteLine($"[{ts}] {msg}");
}

static void TrimMemory()
{
    // Force GC and trim working set to minimize memory footprint
    GC.Collect();
    GC.WaitForPendingFinalizers();
    GC.Collect();
    if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
    {
        SetProcessWorkingSetSize(GetCurrentProcess(), -1, -1);
    }
}

// ── Wire message ──────────────────────────────────────────────────────────────

record WsMessage(
    string? Type,
    string? DeviceId,
    string? Hostname,
    string[]? Apps,
    string? Action,
    string? Name,
    bool? Ok,
    string? Message
);
