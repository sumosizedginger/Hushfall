# Run node at IDLE priority on two cores (the machine-load rule in AGENTS.md). Usage: powershell -File tools/dev/low.ps1 <outfile> <node args...>
# Output (stdout+stderr) goes to <outfile>; the script waits for the process and prints its exit code.
param([string]$Out, [Parameter(ValueFromRemainingArguments = $true)][string[]]$NodeArgs)
$err = "$Out.err"
$p = Start-Process -FilePath node -ArgumentList $NodeArgs -WorkingDirectory 'D:\Doom' -RedirectStandardOutput $Out -RedirectStandardError $err -PassThru -NoNewWindow
try { $p.PriorityClass = 'Idle'; $p.ProcessorAffinity = [IntPtr]0xC0000 } catch { Write-Host "could not set priority/affinity: $_" }
$p.WaitForExit()
Get-Content $err | Add-Content $Out
Write-Host "exit $($p.ExitCode)"
