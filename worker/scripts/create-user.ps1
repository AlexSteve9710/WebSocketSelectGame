# =============================================================================
# Generate KV key/value pair for user account (local only, no network)
# =============================================================================
# Usage:
#   .\scripts\create-user.ps1 <username> <password>
#
# Example:
#   .\scripts\create-user.ps1 admin mypassword123
#
# Output: KV key, JSON value, and copy-paste-ready wrangler command
# =============================================================================

param(
    [Parameter(Position = 0, Mandatory = $true)]
    [string]$Username,

    [Parameter(Position = 1, Mandatory = $true)]
    [string]$Password
)

# SHA-256 hash (same as Worker's crypto.subtle.digest("SHA-256", ...))
$sha256 = [System.Security.Cryptography.SHA256]::Create()
$hashBytes = $sha256.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($Password))
$hashHex = -join ($hashBytes | ForEach-Object { $_.ToString("x2") })

# Build KV pair
$kvKey   = "user:$Username"
$kvValue = "{`"passwordHash`":`"$hashHex`"}"

# Output
Write-Host ""
Write-Host "==============================================" -ForegroundColor DarkGray
Write-Host "  KV Key  : " -NoNewline -ForegroundColor Yellow
Write-Host $kvKey -ForegroundColor White
Write-Host "  KV Value: " -NoNewline -ForegroundColor Yellow
Write-Host $kvValue -ForegroundColor White
Write-Host "==============================================" -ForegroundColor DarkGray
Write-Host ""

# Wrangler command (copy-paste ready)
$jsonEscaped = $kvValue -replace '"', '\"'
Write-Host ">> Wrangler command (run in worker/ directory):" -ForegroundColor Cyan
Write-Host ""
Write-Host "  npx wrangler kv:key put `"$kvKey`" --binding USERS --json `"$jsonEscaped`""
Write-Host ""
