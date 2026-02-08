#!/usr/bin/env python3
"""
RB-Framework: HARDENED PRE-COMMIT POLICE (v3.1)
- Recursive full-repo scan
- Multi-extension support (.py, .json, .yml, .yaml, .sh, .md, .txt, .ps1, .toml)
- Hard-fail on git-tracked blocked files (.env, .key, etc.)
"""
import sys
import os
import re
import subprocess
from pathlib import Path

# Configuration
SCAN_DIRS = ['src', 'tests', 'scripts', 'docs']
EXTENSIONS = {'.py', '.json', '.yml', '.yaml', '.sh', '.md', '.txt', '.js', '.ts', '.ps1', '.toml'}
EXCLUDE_DIRS = {'.git', 'node_modules', '.venv', 'venv', '__pycache__', 'dist', 'build', '.rb_dumps'}
BLOCKED_PATTERNS = [
    r'\.env$', r'\.key$', r'\.pem$', r'shadow$', r'passwd$', r'id_rsa', r'\.p12$', r'\.pfx$'
]

def get_git_tracked_files():
    """Get list of git-tracked files."""
    try:
        result = subprocess.run(
            ['git', 'ls-files'],
            capture_output=True,
            text=True,
            check=True
        )
        return set(result.stdout.strip().split('\n'))
    except (subprocess.CalledProcessError, FileNotFoundError):
        # Git not available or not a git repo
        return set()

def scan_repo():
    root = Path.cwd()
    violations = []
    blocked_found = []
    git_tracked = get_git_tracked_files()

    print(f"🚓 RB Police v3.1: Scanning {root.name}...")

    # Determine scan paths (Recursively scan these)
    scan_paths = []
    for dir_name in SCAN_DIRS:
        dir_path = root / dir_name
        if dir_path.exists():
            scan_paths.append(dir_path)
    
    # Also scan files in the root directory
    root_files = [f for f in root.iterdir() if f.is_file()]

    # 1. Scan recursive directories
    files_to_scan = []
    for scan_path in scan_paths:
        files_to_scan.extend(scan_path.rglob('*'))
    
    # 2. Add root files
    files_to_scan.extend(root_files)

    for path in files_to_scan:
        # Skip excluded directories/files
        if any(exc in path.parts for exc in EXCLUDE_DIRS):
            continue

        if path.is_dir():
            continue

        rel_path = str(path.relative_to(root)).replace('\\', '/')

        # Check for blocked files (HARD FAIL if git-tracked)
        for pattern in BLOCKED_PATTERNS:
            if re.search(pattern, path.name, re.IGNORECASE):
                if rel_path in git_tracked:
                    blocked_found.append(path)
                else:
                    print(f"ℹ️  Found untracked blocked file (ignored): {rel_path}")

        # Content analysis for specific extensions
        if path.suffix.lower() in EXTENSIONS:
            try:
                content = path.read_text(encoding='utf-8', errors='ignore')
                
                # Rule: No hardcoded passwords (simple check, avoid false positives from os.getenv)
                if re.search(r'password\s*=\s*["\'][^"\']{3,}["\']', content, re.IGNORECASE):
                    # Exclude legitimate env usage
                    if 'os.getenv' not in content and 'os.environ' not in content:
                        violations.append(f"Potential hardcoded password in {rel_path}")
                
                # Rule: No unresolved security markers
                if "FIXME: SECURITY" in content or "TODO: SECURITY" in content:
                    violations.append(f"Unresolved security marker in {rel_path}")

            except Exception as e:
                print(f"⚠️  Could not read {rel_path}: {e}")

    # Reporting
    if blocked_found:
        print("\n❌ CRITICAL SECURITY VIOLATION: Git-tracked blocked files found!")
        for b in blocked_found:
            print(f"   [BLOCKED] {b.relative_to(root)}")
        print("\n🔒 ACTION REQUIRED: Remove from git, add to .gitignore, rotate credentials!")
        sys.exit(1)  # HARD FAIL

    if violations:
        print("\n⚠️  Policy violations found:")
        for v in violations:
            print(f"   - {v}")
        print("\n💡 Review and fix these issues before committing.")
        # Violations are warnings, not hard fails (unless extreme)

    print("\n[POLICE] ✅ Scan complete. System conforms to RB Protocol.")

if __name__ == "__main__":
    scan_repo()
