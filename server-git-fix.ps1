# ConvoAI Server Git Pull Emergency Fix
# PowerShell version for Windows servers

Write-Host "=== ConvoAI Server Git Pull Diagnostic & Fix ===" -ForegroundColor Cyan
Write-Host "Timestamp: $(Get-Date)" -ForegroundColor Gray
Write-Host

# Basic Git status check
Write-Host "1. Checking current Git status..." -ForegroundColor Yellow
git status
Write-Host

# Check remote configuration
Write-Host "2. Checking remote configuration..." -ForegroundColor Yellow
git remote -v
Write-Host

# Check for uncommitted changes
Write-Host "3. Checking for uncommitted local changes..." -ForegroundColor Yellow
git diff --name-only
Write-Host

# Check for staged changes
Write-Host "4. Checking for staged changes..." -ForegroundColor Yellow
git diff --cached --name-only
Write-Host

# Check current branch
Write-Host "5. Current branch information..." -ForegroundColor Yellow
git branch -v
Write-Host

# Check for file locks or permissions
Write-Host "6. Checking for file locks or permission issues..." -ForegroundColor Yellow
Get-ChildItem -Path "." -Recurse -ErrorAction SilentlyContinue | Where-Object {$_.Name -eq ".git"} | ForEach-Object {
    Write-Host "Git directory: $($_.FullName)"
    $acl = Get-Acl $_.FullName -ErrorAction SilentlyContinue
    if ($acl) {
        Write-Host "Permissions OK"
    } else {
        Write-Host "Permission issue detected" -ForegroundColor Red
    }
}
Write-Host

# Try to identify the exact error
Write-Host "7. Attempting git pull with verbose output..." -ForegroundColor Yellow
git pull origin main --verbose
Write-Host "Pull exit code: $LASTEXITCODE" -ForegroundColor $(if ($LASTEXITCODE -eq 0) {"Green"} else {"Red"})
Write-Host

# If pull fails, try alternative approaches
if ($LASTEXITCODE -ne 0) {
    Write-Host "8. Pull failed, trying git fetch + reset..." -ForegroundColor Yellow
    git fetch origin
    Write-Host "Fetch exit code: $LASTEXITCODE"
    Write-Host

    Write-Host "9. Showing difference between local and remote..." -ForegroundColor Yellow
    git log HEAD..origin/main --oneline
    Write-Host

    $confirm = Read-Host "10. Do you want to proceed with hard reset? This will discard local changes. (y/N)"
    if ($confirm -match "^[yY]") {
        Write-Host "Creating backup of current state..." -ForegroundColor Yellow
        git stash push -m "Backup before hard reset $(Get-Date)"
        Write-Host "Performing hard reset to origin/main..." -ForegroundColor Yellow
        git reset --hard origin/main
        Write-Host "Reset complete!" -ForegroundColor Green
    } else {
        Write-Host "Skipping hard reset." -ForegroundColor Yellow
    }
} else {
    Write-Host "Pull succeeded!" -ForegroundColor Green
}

Write-Host
Write-Host "11. Final status check..." -ForegroundColor Yellow
git status
Write-Host
Write-Host "=== Diagnostic Complete ===" -ForegroundColor Cyan