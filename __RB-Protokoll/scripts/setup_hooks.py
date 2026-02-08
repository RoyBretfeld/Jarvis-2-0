#!/usr/bin/env python3
"""
Setup Pre-Commit Hooks for RB-Framework
"""
import os
import sys
from pathlib import Path

HOOK_CONTENT = """#!/bin/sh
# RB-Framework Pre-Commit Hook
# Blocks commits if 'rb check' fails.

echo "[HOOK] 🚓 Running rb check..."
python scripts/rb.py check

EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
    echo "[HOOK] ❌ Check FAILED. Commit blocked."
    echo "       Fix issues or use 'git commit --no-verify' (only in emergencies!)"
    exit 1
fi
echo "[HOOK] ✅ Check PASSED."
exit 0
"""

def main():
    print("🔧 RB-Framework Hook Installer")
    print("=" * 50)
    
    hooks_dir = Path(".git/hooks")
    if not hooks_dir.exists():
        print("❌ Error: .git/hooks directory not found. Is this a git repo?")
        sys.exit(1)
    
    pre_commit_path = hooks_dir / "pre-commit"
    
    print(f"📍 Installing hook to: {pre_commit_path}")
    
    try:
        with open(pre_commit_path, "w", encoding="utf-8") as f:
            f.write(HOOK_CONTENT)
        
        # Make executable (Linux/Mac)
        if os.name != "nt":
            os.chmod(pre_commit_path, 0o755)
            
        print("✅ Hook installed successfully!")
        print("💡 Test it by trying to commit a blocked file or dummy secret.")
        
    except Exception as e:
        print(f"❌ Failed to install hook: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
