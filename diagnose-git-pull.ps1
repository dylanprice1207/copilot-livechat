# Git Pull Troubleshooting Script for Windows PowerShell
# Diagnoses and fixes common Git pull issues

Write-Host "🔍 Git Pull Troubleshooting for ConvoAI Live Chat" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Function to check Git status
function Check-GitStatus {
    Write-Host "📋 Checking Git repository status..." -ForegroundColor Yellow
    
    $currentDir = Get-Location
    Write-Host "Repository: $currentDir"
    
    try {
        $branch = git branch --show-current 2>$null
        Write-Host "Branch: $branch"
    }
    catch {
        Write-Host "Branch: Unknown" -ForegroundColor Red
    }
    
    try {
        $remoteUrl = git remote get-url origin 2>$null
        Write-Host "Remote URL: $remoteUrl"
    }
    catch {
        Write-Host "Remote URL: No remote configured" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "Git status:"
    git status --porcelain
    Write-Host ""
}

# Function to check for merge conflicts
function Check-Conflicts {
    Write-Host "⚠️  Checking for merge conflicts..." -ForegroundColor Yellow
    
    $status = git status --porcelain
    $conflicts = $status | Where-Object { $_ -match "^(DD|AU|UD|UA|DU|AA|UU)" }
    
    if ($conflicts) {
        Write-Host "❌ Merge conflicts detected!" -ForegroundColor Red
        Write-Host "Files with conflicts:"
        $conflicts | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
        Write-Host ""
        Write-Host "To resolve:" -ForegroundColor Yellow
        Write-Host "1. Edit the conflicted files"
        Write-Host "2. Run: git add <file>"
        Write-Host "3. Run: git commit"
        return $false
    }
    else {
        Write-Host "✅ No merge conflicts detected" -ForegroundColor Green
        return $true
    }
}

# Function to check for uncommitted changes
function Check-Uncommitted {
    Write-Host "📝 Checking for uncommitted changes..." -ForegroundColor Yellow
    
    $status = git status --porcelain
    if ($status) {
        Write-Host "❌ Uncommitted changes detected!" -ForegroundColor Red
        Write-Host "Modified files:"
        $status | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }
        Write-Host ""
        Write-Host "Options to fix:" -ForegroundColor Yellow
        Write-Host "1. Commit changes: git add . && git commit -m 'Your message'"
        Write-Host "2. Stash changes: git stash"
        Write-Host "3. Discard changes: git reset --hard HEAD"
        return $false
    }
    else {
        Write-Host "✅ Working directory clean" -ForegroundColor Green
        return $true
    }
}

# Function to check remote connectivity
function Check-Remote {
    Write-Host "🌐 Checking remote connectivity..." -ForegroundColor Yellow
    
    try {
        git ls-remote origin *>$null
        Write-Host "✅ Remote repository accessible" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "❌ Cannot access remote repository" -ForegroundColor Red
        Write-Host "Check your internet connection and repository permissions"
        return $false
    }
}

# Function to show recent commits
function Show-Commits {
    Write-Host "📊 Recent commits (local vs remote):" -ForegroundColor Yellow
    Write-Host ""
    
    Write-Host "Local commits (last 5):"
    try {
        git log --oneline -5
    }
    catch {
        Write-Host "No local commits found" -ForegroundColor Yellow
    }
    Write-Host ""
    
    Write-Host "Remote commits (last 5):"
    try {
        git log origin/main --oneline -5
    }
    catch {
        Write-Host "No remote tracking branch" -ForegroundColor Yellow
    }
    Write-Host ""
}

# Function to suggest solutions
function Suggest-Solutions {
    Write-Host "🔧 Common Solutions:" -ForegroundColor Cyan
    Write-Host "===================" -ForegroundColor Cyan
    Write-Host ""
    
    Write-Host "1. Force pull (CAUTION: overwrites local changes):" -ForegroundColor Yellow
    Write-Host "   git fetch origin"
    Write-Host "   git reset --hard origin/main"
    Write-Host ""
    
    Write-Host "2. Pull with rebase:" -ForegroundColor Yellow
    Write-Host "   git pull --rebase origin main"
    Write-Host ""
    
    Write-Host "3. Merge remote changes:" -ForegroundColor Yellow
    Write-Host "   git fetch origin"
    Write-Host "   git merge origin/main"
    Write-Host ""
    
    Write-Host "4. Stash and pull:" -ForegroundColor Yellow
    Write-Host "   git stash"
    Write-Host "   git pull origin main"
    Write-Host "   git stash pop"
    Write-Host ""
    
    Write-Host "5. Check branch tracking:" -ForegroundColor Yellow
    Write-Host "   git branch -vv"
    Write-Host "   git branch --set-upstream-to=origin/main main"
    Write-Host ""
}

# Function to show safe pull command
function Show-SafePull {
    Write-Host "✅ Safe Pull Sequence:" -ForegroundColor Green
    Write-Host "=====================" -ForegroundColor Green
    Write-Host ""
    
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    Write-Host "# Step 1: Backup current state"
    Write-Host "git branch backup-$timestamp"
    Write-Host ""
    Write-Host "# Step 2: Fetch latest changes"
    Write-Host "git fetch origin"
    Write-Host ""
    Write-Host "# Step 3: Check what will be pulled"
    Write-Host "git log HEAD..origin/main --oneline"
    Write-Host ""
    Write-Host "# Step 4: Pull changes"
    Write-Host "git pull origin main"
    Write-Host ""
}

# Function to execute safe pull
function Execute-SafePull {
    Write-Host "🚀 Executing Safe Pull..." -ForegroundColor Green
    
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    
    try {
        Write-Host "Creating backup branch..."
        git branch "backup-$timestamp"
        Write-Host "✅ Backup created: backup-$timestamp" -ForegroundColor Green
        
        Write-Host "Fetching latest changes..."
        git fetch origin
        Write-Host "✅ Fetch completed" -ForegroundColor Green
        
        Write-Host "Changes to be pulled:"
        git log HEAD..origin/main --oneline
        
        Write-Host "Pulling changes..."
        git pull origin main
        Write-Host "✅ Pull completed successfully!" -ForegroundColor Green
        
    }
    catch {
        Write-Host "❌ Pull failed: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "Your changes are safe in backup branch: backup-$timestamp"
    }
}

# Main execution
function Main {
    # Check if we're in a git repository
    try {
        git rev-parse --git-dir *>$null
    }
    catch {
        Write-Host "❌ Not in a Git repository!" -ForegroundColor Red
        Write-Host "Navigate to your project directory first."
        return
    }
    
    # Run checks
    Check-GitStatus
    $noConflicts = Check-Conflicts
    $noUncommitted = Check-Uncommitted
    $hasRemote = Check-Remote
    
    Show-Commits
    
    # Determine the issue
    if (-not $noConflicts) {
        Write-Host "🚨 PRIMARY ISSUE: Merge conflicts need to be resolved first" -ForegroundColor Red
    }
    elseif (-not $noUncommitted) {
        Write-Host "🚨 PRIMARY ISSUE: Uncommitted changes blocking pull" -ForegroundColor Red
    }
    elseif (-not $hasRemote) {
        Write-Host "🚨 PRIMARY ISSUE: Remote repository not accessible" -ForegroundColor Red
    }
    else {
        Write-Host "✅ No obvious issues detected" -ForegroundColor Green
        Write-Host "The pull should work. Would you like me to execute a safe pull? (y/n)" -ForegroundColor Yellow
        
        $response = Read-Host
        if ($response -eq 'y' -or $response -eq 'Y' -or $response -eq 'yes') {
            Execute-SafePull
            return
        }
    }
    
    Write-Host ""
    Suggest-Solutions
    Show-SafePull
}

# Run the script
Main