# Run node at IDLE priority on two cores (the machine-load rule in AGENTS.md). Usage: powershell -File tools/dev/low.ps1 <outfile> <node args...>   (LOW_CWD=<dir> runs it from another checkout, e.g. a git worktree; default D:\Doom)
# Output (stdout+stderr) goes to <outfile>; the script waits for the process and prints its exit code.
param([string]$Out, [Parameter(ValueFromRemainingArguments = $true)][string[]]$NodeArgs)
$err = "$Out.err"
$p = Start-Process -FilePath node -ArgumentList $NodeArgs -WorkingDirectory $(if ($env:LOW_CWD) { $env:LOW_CWD } else { 'D:\Doom' }) -RedirectStandardOutput $Out -RedirectStandardError $err -PassThru -NoNewWindow -ErrorAction Stop
$processHandle = $p.Handle # Retain the handle so Windows PowerShell can read ExitCode after a short-lived child exits.
try { $p.PriorityClass = 'Idle'; $p.ProcessorAffinity = [IntPtr]0xC0000 } catch { Write-Host "could not set priority/affinity: $_" }
$p.WaitForExit()
$childExitCode = $p.ExitCode
Get-Content $err | Add-Content $Out
Write-Host "exit $childExitCode"
if ($null -eq $childExitCode) { exit 1 }
exit $childExitCode
