#!/bin/zsh
# scrub-git-history.sh
# Scrub .env, copilot-instructions.md, and memory-bank/ from git history using BFG Repo-Cleaner
# Usage: zsh scrub-git-history.sh

set -e

REPO_NAME="dex-mcp-server"
BACKUP_DIR="${REPO_NAME}-backup-$(date +%Y%m%d%H%M%S)"
MIRROR_DIR="${REPO_NAME}-mirror.git"

# 1. Install BFG if not already installed
if ! command -v bfg &> /dev/null; then
  echo "BFG not found. Installing via Homebrew..."
  brew install bfg
fi

echo "Backing up your repo to ../$BACKUP_DIR ..."
cd ..
cp -r "$REPO_NAME" "$BACKUP_DIR"

# 2. Create a bare mirror
if [ -d "$MIRROR_DIR" ]; then
  echo "Removing old mirror directory..."
  rm -rf "$MIRROR_DIR"
fi
git clone --mirror "$REPO_NAME" "$MIRROR_DIR"
cd "$MIRROR_DIR"

# 3. Run BFG to delete sensitive files/folders
echo "Running BFG to delete .env..."
bfg --delete-files .env
echo "Running BFG to delete copilot-instructions.md..."
bfg --delete-files copilot-instructions.md
echo "Running BFG to delete memory-bank folder..."
bfg --delete-folders memory-bank --no-blob-protection

# 4. Clean and update the repo
git reflog expire --expire=now --all
git gc --prune=now --aggressive

echo "Force-pushing cleaned history to origin..."
git remote -v  # Show remotes for verification
git push --force --all
git push --force --tags

echo "\nDone! All sensitive files scrubbed from git history."
echo "IMPORTANT: All collaborators must re-clone the repository after this operation."
