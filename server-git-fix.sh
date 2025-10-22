#!/bin/bash

echo "=== ConvoAI Server Git Pull Diagnostic & Fix ==="
echo "Timestamp: $(date)"
echo

# Basic Git status check
echo "1. Checking current Git status..."
git status
echo

# Check remote configuration
echo "2. Checking remote configuration..."
git remote -v
echo

# Check for uncommitted changes
echo "3. Checking for uncommitted local changes..."
git diff --name-only
echo

# Check for staged changes
echo "4. Checking for staged changes..."
git diff --cached --name-only
echo

# Check current branch
echo "5. Current branch information..."
git branch -v
echo

# Try to identify the exact error
echo "6. Attempting git pull with verbose output..."
git pull origin main --verbose
echo

# If pull fails, try alternative approaches
echo "7. If pull failed, trying git fetch + reset..."
git fetch origin
echo "Fetch result: $?"

echo "8. Showing difference between local and remote..."
git log HEAD..origin/main --oneline

echo "9. If there are differences, attempting hard reset..."
read -p "Do you want to proceed with hard reset? This will discard local changes. (y/N): " confirm
if [[ $confirm == [yY] || $confirm == [yY][eE][sS] ]]; then
    echo "Creating backup of current state..."
    git stash push -m "Backup before hard reset $(date)"
    echo "Performing hard reset to origin/main..."
    git reset --hard origin/main
    echo "Reset complete!"
else
    echo "Skipping hard reset."
fi

echo
echo "10. Final status check..."
git status
echo
echo "=== Diagnostic Complete ==="