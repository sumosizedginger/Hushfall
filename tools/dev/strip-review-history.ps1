# ONE-OFF (PT-050): strips every image and audio file under review/ out of ALL of git's history, keeping all commits and messages.
# Run from the repo root in PowerShell:   powershell -File tools\dev\strip-review-history.ps1
# LOCAL ONLY: nothing is pushed. The backup bundle must exist first. Delete this file and review-strip-filter.sh afterwards.
# After it: git push needs --force (the old origin/main sha is printed below and recorded in design/ARCHIVE_INDEX.md); that is the owner's word, not this script's.
$ErrorActionPreference = 'Stop'
$root = (git rev-parse --show-toplevel).Trim()
Set-Location $root
$bundle = 'D:\Doom_archive\pre-filter-2026-10-14.bundle'
if (-not (Test-Path $bundle)) { throw "backup bundle missing: $bundle" }
if (git status --porcelain) { throw 'the working tree is not clean: commit or stash first' }
$sizeBefore = (git count-objects -vH) -join ' '
$old = @(git rev-list master)
$subj = @(git log --format='%s' master)
Write-Host "commits on master before: $($old.Count)"
git tag -d archive/pre-tidy-2026-10-14 2>$null | Out-Null
$env:FILTER_BRANCH_SQUELCH_WARNING = '1'
git filter-branch -f --index-filter "sh '$root/tools/dev/review-strip-filter.sh'" --tag-name-filter cat -- --branches --tags
if ($LASTEXITCODE -ne 0) { throw 'filter-branch failed: restore with: git clone D:\Doom_archive\pre-filter-2026-10-14.bundle' }
$new = @(git rev-list master)
if ($new.Count -ne $old.Count) { throw "commit count changed: $($old.Count) -> $($new.Count)" }
# old -> new commit map, so a hash quoted in PRODUCTION_LOG.md can still be found
New-Item -ItemType Directory -Force -Path (Join-Path $root 'design\history') | Out-Null
0..($old.Count - 1) | ForEach-Object { '{0} {1} {2}' -f $old[$_].Substring(0, 9), $new[$_].Substring(0, 9), $subj[$_] } | Set-Content -Encoding UTF8 (Join-Path $root 'design\history\commit-map-2026-10-14.txt')
# let the old blobs be collected: filter-branch's backup refs, the old remote-tracking ref and the reflogs all keep them alive
git for-each-ref --format='%(refname)' refs/original | ForEach-Object { git update-ref -d $_ }
git update-ref -d refs/remotes/origin/main 2>$null
git reflog expire --expire=now --all
git gc --prune=now --quiet
Write-Host "before: $sizeBefore"
Write-Host "after:  $((git count-objects -vH) -join ' ')"
Write-Host ".git folder: $([math]::Round(((Get-ChildItem .git -Recurse -Force | Measure-Object Length -Sum).Sum) / 1MB)) MB"
Write-Host 'done. Old origin/main was 839f5a6d0f1a846b0a3f063fe75101cdea4f0c4f. Next: npm run validate, commit design/history/commit-map-2026-10-14.txt, delete this script and review-strip-filter.sh.'
