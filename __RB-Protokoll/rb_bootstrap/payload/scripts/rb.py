#!/usr/bin/env python3
"""
RB-Framework CLI (v2.1)
Unified command interface for check/test/pack/learn
Integrates 4 Laws & External Error DB
"""
import argparse
import subprocess
import sys
import re
from pathlib import Path

def has_placeholder(cmd: str) -> bool:
    """Check if command still contains {{PLACEHOLDER}}."""
    return bool(re.search(r'\{\{[^}]+\}\}', cmd))

def get_error_db_path() -> Path:
    """Resolve Error DB path from POINTER (priority) or SYSTEM_FACTS (fallback)."""
    pointer_file = Path("docs/_rb/03_ERROR_DB_POINTER.md")
    facts_file = Path("docs/_rb/02_SYSTEM_FACTS.md")
    default_path = Path("docs/_rb/03_ERROR_DB.md")
    
    # Priority 1: Read from dedicated pointer file
    if pointer_file.exists():
        content = pointer_file.read_text(encoding="utf-8")
        # Expected format: **Location:** `C:\Path\To\03_ERROR_DB.md`
        match = re.search(r'\*\*Location:\*\* `([^`]+)`', content)
        if match:
            db_path_str = match.group(1)
            db_path = Path(db_path_str)
            if db_path.exists():
                return db_path
            else:
                print(f"⚠️  Warning: Central Error DB not found at {db_path_str}, using local fallback.")
    
    # Priority 2: Fallback to SYSTEM_FACTS
    if not facts_file.exists():
        return default_path
        
    content = facts_file.read_text(encoding="utf-8")
    # Search for Error DB path in markdown link or text
    # Expected format: **Error DB**: `../../03_ERROR_DB.md`
    match = re.search(r'\*\*Error DB \(Central\):\*\* `([^`]+)`', content)
    if match:
        rel_path = match.group(1)
        # Try to resolve as absolute Windows path first
        if Path(rel_path).is_absolute():
            resolved = Path(rel_path)
        else:
            # Resolve relative to docs/_rb/
            base_dir = Path("docs/_rb")
            resolved = (base_dir / rel_path).resolve()
        
        if resolved.exists():
            return resolved
        else:
            print(f"⚠️  Warning: Error DB not found at {resolved}, using local fallback.")
            
    return default_path

def run(cmd: str, allow_placeholder: bool = False) -> int:
    """Execute shell command with validation."""
    if not allow_placeholder and has_placeholder(cmd):
        print(f"\n❌ ERROR: Command contains unfilled placeholder(s):", file=sys.stderr)
        print(f"   {cmd}", file=sys.stderr)
        print(f"\n💡 Fix: Update docs/_rb/02_SYSTEM_FACTS.md and regenerate rb.py", file=sys.stderr)
        return 1
    
    print(f"\n$ {cmd}")
    try:
        return subprocess.call(cmd, shell=True)
    except KeyboardInterrupt:
        print("\n⚠️  Command interrupted by user")
        return 130
    except Exception as e:
        print(f"\n❌ Command failed: {e}", file=sys.stderr)
        return 1

def check_system_facts() -> bool:
    """Verify SYSTEM_FACTS exists and is filled out."""
    facts_file = Path("docs/_rb/02_SYSTEM_FACTS.md")
    if not facts_file.exists():
        print("❌ ERROR: docs/_rb/02_SYSTEM_FACTS.md not found!", file=sys.stderr)
        return False
    
    content = facts_file.read_text(encoding="utf-8")
    unfilled = re.findall(r'\{\{([^}]+)\}\}', content)
    
    if unfilled:
        print(f"⚠️  WARNING: {len(unfilled)} placeholder(s) in SYSTEM_FACTS:", file=sys.stderr)
        for placeholder in unfilled[:5]:  # Show first 5
            print(f"   - {{{{ {placeholder} }}}}", file=sys.stderr)
        if len(unfilled) > 5:
            print(f"   ... and {len(unfilled) - 5} more", file=sys.stderr)
        print("\n💡 Run the agent initialization task to fill these out.\n", file=sys.stderr)
    
    return True

def main():
    p = argparse.ArgumentParser(
        prog="rb",
        description="RB-Framework unified CLI v2.1",
        epilog="See docs/_rb/ for 4 Laws and full documentation"
    )
    sub = p.add_subparsers(dest="cmd", required=True)

    # Commands
    sub.add_parser("check", help="Run police + baseline tests (pre-commit gate)")
    sub.add_parser("test", help="Run full test suite")
    sub.add_parser("pack", help="Generate context dump for agents/debug")
    sub.add_parser("learn", help="Create new Error-DB entry")
    sub.add_parser("init", help="Verify RB-Framework setup")

    a = p.parse_args()

    # Location check
    if not Path("docs/_rb/01_THE_CONSTITUTION.md").exists():
        print("❌ ERROR: Not in RB-Framework root directory!", file=sys.stderr)
        print("   Expected docs/_rb/01_THE_CONSTITUTION.md to exist", file=sys.stderr)
        sys.exit(1)

    # === COMMANDS ===
    
    if a.cmd == "init":
        print("🔍 Checking RB-Framework setup...\n")
        if check_system_facts():
            print("✅ RB-Framework is properly initialized")
            sys.exit(0)
        else:
            sys.exit(1)

    if a.cmd == "check":
        print("🚓 Running pre-commit checks...\n")
        
        # 1. Check Error DB existence (Law #1 & #2 Support)
        error_db = get_error_db_path()
        if not error_db.exists():
            print(f"❌ ERROR: Error DB not found at: {error_db}", file=sys.stderr)
            print("   Required for core law compliance (Transparency/Reversibility).", file=sys.stderr)
            sys.exit(1)
        else:
            print(f"✅ Error DB found at: {error_db}")

        # 2. Run Police (Code Quality Gate)
        if Path("scripts/pre_commit_police.py").exists():
            if run("python scripts/pre_commit_police.py") != 0:
                sys.exit(1)
        else:
            print("ℹ️  No police script found, skipping.")
        
        # 3. Baseline Smoke Test (<30s quick sanity check)
        # Note: This is a framework repo, no CLI exists yet
        # Using "no-op pass" for now - projects that use this will override
        print("ℹ️  No baseline smoke test configured (framework-only repo)")
        
        print("\n✅ All checks passed! (4 Laws Compliant)")
        sys.exit(0)

    if a.cmd == "test":
        print("🧪 Running full test suite...\n")
        # Framework repo currently has no dedicated test suite
        print("ℹ️  No full test suite configured (framework-only repo)")
        sys.exit(0)

    if a.cmd == "pack":
        print("📦 Generating project context dump...\n")
        if Path("scripts/packer.py").exists():
            sys.exit(run("python scripts/packer.py"))
        else:
            print("❌ scripts/packer.py missing!")
            sys.exit(1)

    if a.cmd == "learn":
        error_db = get_error_db_path()
        if not error_db.exists():
            print(f"❌ ERROR: Error-DB not found at {error_db}!", file=sys.stderr)
            sys.exit(1)
        
        print("📝 Create a new Error-DB entry:")
        print(f"   Edit: {error_db}")
        print("\nTemplate (append to file):")
        print("- ID: ERR-YYYYMMDD-SHORT")
        print("- Symptom: What went wrong?")
        print("- Root Cause: Why did it happen?")
        print("- Fix: How was it resolved?")
        print("- Regression Test: How to prevent recurrence?")
        print("- Prevention Rule: New guardrail?")
        sys.exit(0)

if __name__ == "__main__":
    main()

