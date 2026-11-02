# Fetches the DailyPulse briefing and tasks from the local backend and writes
# briefing-output.txt in the project root. Requires the backend on port 8000.
$ErrorActionPreference = 'Stop'
$out = Join-Path (Split-Path $PSScriptRoot -Parent) 'briefing-output.txt'

function Test-Backend {
    try { Invoke-RestMethod -Uri 'http://localhost:8000/tasks' -TimeoutSec 3 | Out-Null; $true } catch { $false }
}

# Start the backend (hidden) if it isn't already running, then wait up to 30s for it.
if (-not (Test-Backend)) {
    $python = (Get-Command python.exe -ErrorAction SilentlyContinue).Source
    if (-not $python) { $python = 'C:\Python314\python.exe' }
    Start-Process -FilePath $python -ArgumentList '-m', 'uvicorn', 'main:app', '--port', '8000' `
        -WorkingDirectory (Join-Path (Split-Path $PSScriptRoot -Parent) 'backend') -WindowStyle Hidden
    for ($i = 0; $i -lt 15 -and -not (Test-Backend); $i++) { Start-Sleep -Seconds 2 }
}

try {
    $b =Invoke-RestMethod -Uri 'http://localhost:8000/briefing' -TimeoutSec 60
    $raw = Invoke-RestMethod -Uri 'http://localhost:8000/tasks' -TimeoutSec 15
    $tasks = @($raw | ForEach-Object { $_ })  # flatten: PS 5.1 can return the JSON array as one object
} catch {
    "DailyPulse briefing failed at $(Get-Date -Format s): backend not reachable or errored.`nStart it with: cd backend; uvicorn main:app --reload`n$($_.Exception.Message)" |
        Set-Content -Path $out -Encoding utf8
    exit 1
}

$today = (Get-Date).Date
$yesterday = $today.AddDays(-1)
$pending = @($tasks | Where-Object { -not $_.completed })
$doneY = @($tasks | Where-Object { $_.completed_at -and ([datetime]$_.completed_at).Date -eq $yesterday })
$incompleteY = @($pending | Where-Object { ([datetime]$_.created_at).Date -eq $yesterday })
$focus = $pending | Sort-Object { [datetime]$_.created_at } | Select-Object -First 1

$lines = @()
$lines += "DailyPulse $([char]0xB7) $(Get-Date -Format 'dddd, MMMM d')"
$lines += ''
$lines += "`"$($b.quote)`""
$lines += ''
$lines += "Focus tip: $($b.focus_tip)"
$lines += "Note: $($b.message)"
$lines += ''
$lines += 'Tasks'
$lines += "- Pending: $($pending.Count)"
if ($doneY.Count -gt 0) { $lines += "- Completed yesterday: $($doneY.Count)" }
$lines += ''
if ($focus) { $lines += "Suggested focus: $($focus.title) - oldest pending task." }
else { $lines += 'Suggested focus: Nothing pending - plan your day by adding a task.' }
$lines += ''
$lines += 'Incomplete tasks from yesterday'
if ($incompleteY.Count -eq 0) { $lines += '- None' }
else { $incompleteY | ForEach-Object { $lines += "- $($_.title)" } }

$lines | Set-Content -Path $out -Encoding utf8
