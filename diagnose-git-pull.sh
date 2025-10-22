#!/bin/bash

# Git Pull Troubleshooting Script for ConvoAI Live Chat
# This script helps diagnose and fix common Git pull issues

echo "🔍 Git Pull Troubleshooting for ConvoAI Live Chat"
echo "=================================================="
echo ""

# Function to check Git status
check_git_status() {
    echo "📋 Checking Git repository status..."
    echo "Repository: $(pwd)"
    echo "Branch: $(git branch --show-current 2>/dev/null || echo 'Unknown')"
    echo "Remote URL: $(git remote get-url origin 2>/dev/null || echo 'No remote configured')"
    echo ""
    
    echo "Git status:"
    git status --porcelain
    echo ""
}

# Function to check for merge conflicts
check_conflicts() {
    echo "⚠️  Checking for merge conflicts..."
    if git status | grep -q "both modified\|both added\|both deleted"; then
        echo "❌ Merge conflicts detected!"
        echo "Files with conflicts:"
        git status | grep "both modified\|both added\|both deleted"
        echo ""
        echo "To resolve:"
        echo "1. Edit the conflicted files"
        echo "2. Run: git add <file>"
        echo "3. Run: git commit"
        return 1
    else
        echo "✅ No merge conflicts detected"
        return 0
    fi
    echo ""
}

# Function to check for uncommitted changes
check_uncommitted() {
    echo "📝 Checking for uncommitted changes..."
    if [ -n "$(git status --porcelain)" ]; then
        echo "❌ Uncommitted changes detected!"
        echo "Modified files:"
        git status --short
        echo ""
        echo "Options to fix:"
        echo "1. Commit changes: git add . && git commit -m 'Your message'"
        echo "2. Stash changes: git stash"
        echo "3. Discard changes: git reset --hard HEAD"
        return 1
    else
        echo "✅ Working directory clean"
        return 0
    fi
    echo ""
}

# Function to check remote connectivity
check_remote() {
    echo "🌐 Checking remote connectivity..."
    if git ls-remote origin &>/dev/null; then
        echo "✅ Remote repository accessible"
        return 0
    else
        echo "❌ Cannot access remote repository"
        echo "Check your internet connection and repository permissions"
        return 1
    fi
    echo ""
}

# Function to show recent commits
show_commits() {
    echo "📊 Recent commits (local vs remote):"
    echo ""
    echo "Local commits (last 5):"
    git log --oneline -5 2>/dev/null || echo "No local commits found"
    echo ""
    
    echo "Remote commits (last 5):"
    git log origin/main --oneline -5 2>/dev/null || echo "No remote tracking branch"
    echo ""
}

# Function to suggest solutions
suggest_solutions() {
    echo "🔧 Common Solutions:"
    echo "==================="
    echo ""
    
    echo "1. Force pull (CAUTION: overwrites local changes):"
    echo "   git fetch origin"
    echo "   git reset --hard origin/main"
    echo ""
    
    echo "2. Pull with rebase:"
    echo "   git pull --rebase origin main"
    echo ""
    
    echo "3. Merge remote changes:"
    echo "   git fetch origin"
    echo "   git merge origin/main"
    echo ""
    
    echo "4. Stash and pull:"
    echo "   git stash"
    echo "   git pull origin main"
    echo "   git stash pop"
    echo ""
    
    echo "5. Check branch tracking:"
    echo "   git branch -vv"
    echo "   git branch --set-upstream-to=origin/main main"
    echo ""
}

# Function to show safe pull command
safe_pull() {
    echo "✅ Safe Pull Sequence:"
    echo "====================="
    echo ""
    echo "# Step 1: Backup current state"
    echo "git branch backup-$(date +%Y%m%d-%H%M%S)"
    echo ""
    echo "# Step 2: Fetch latest changes"
    echo "git fetch origin"
    echo ""
    echo "# Step 3: Check what will be pulled"
    echo "git log HEAD..origin/main --oneline"
    echo ""
    echo "# Step 4: Pull changes"
    echo "git pull origin main"
    echo ""
}

# Main execution
main() {
    # Check if we're in a git repository
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        echo "❌ Not in a Git repository!"
        echo "Navigate to your project directory first."
        exit 1
    fi
    
    # Run checks
    check_git_status
    has_conflicts=$(check_conflicts; echo $?)
    has_uncommitted=$(check_uncommitted; echo $?)
    has_remote=$(check_remote; echo $?)
    
    show_commits
    
    # Determine the issue
    if [ $has_conflicts -eq 1 ]; then
        echo "🚨 PRIMARY ISSUE: Merge conflicts need to be resolved first"
    elif [ $has_uncommitted -eq 1 ]; then
        echo "🚨 PRIMARY ISSUE: Uncommitted changes blocking pull"
    elif [ $has_remote -eq 1 ]; then
        echo "🚨 PRIMARY ISSUE: Remote repository not accessible"
    else
        echo "✅ No obvious issues detected"
        echo "The pull should work. Try: git pull origin main"
    fi
    
    echo ""
    suggest_solutions
    safe_pull
}

# Run the script
main "$@"