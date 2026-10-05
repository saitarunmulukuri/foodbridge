# FoodBridge Shutdown Script
# Terminates any processes listening on port 5000 (Backend) and port 3000 (Frontend)

$ports = @(5000, 3000)
$stoppedAny = $false

foreach ($port in $ports) {
    $connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($connections) {
        $pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
        foreach ($pidToKill in $pids) {
            if ($pidToKill -and $pidToKill -gt 4) {
                try {
                    $proc = Get-Process -Id $pidToKill -ErrorAction SilentlyContinue
                    $pName = if ($proc) { $proc.ProcessName } else { "Process" }
                    Write-Host "  [x] Stopping $pName (PID: $pidToKill) on port $port..." -ForegroundColor Yellow
                    # Use taskkill /T to terminate the entire process tree (e.g. Werkzeug reloader children, Vite workers)
                    & taskkill.exe /F /T /PID $pidToKill 2>$null | Out-Null
                    Stop-Process -Id $pidToKill -Force -ErrorAction SilentlyContinue
                    $stoppedAny = $true
                } catch {
                    Write-Warning "  Failed to stop PID $pidToKill : $_"
                }
            }
        }
    }
}

if (-not $stoppedAny) {
    Write-Host "  [i] No active servers found listening on port 5000 or 3000." -ForegroundColor Cyan
} else {
    Write-Host "  [+] Servers stopped successfully." -ForegroundColor Green
}
