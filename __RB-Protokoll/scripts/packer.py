#!/usr/bin/env python3
"""
RB-Framework Packer (v2.2-federation)
Generates context dumps for agents/debugging with TAIA Federation support
- Cross-platform (pathlib)
- Smart directory detection
- Configurable via environment
- Federation-aware (prioritizes brain/ for recovery)
"""
import os
import re
import io
import sys
import time
from pathlib import Path
from typing import Set, List

# Force UTF-8 output on Windows
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")

# PRIORITY DIRS (scanned first for Federation recovery)
PRIORITY_DIRS = ["brain/registry", "brain/bus", "brain/logs", "docs"]

# Default includes - automatically detect common project structures
DEFAULT_INCLUDE_DIRS = ["docs/_rb", "src", "tests", "scripts", "brain"]
COMMON_PROJECT_DIRS = [
    "backend", "frontend", "server", "client", 
    "app", "lib", "pkg", "packages",
    "api", "web", "core"
]

EXCLUDE_DIRS = {".git", "docs/_archive", "node_modules", ".venv", "__pycache__", 
                "dist", "build", ".next", ".nuxt", "vendor", 
                ".pytest_cache", "coverage", ".idea", ".vscode"}

MAX_BYTES = 2_000_000

BLOCK_FILES = [r"\.env$", r"\.pem$", r"\.key$", r"\.db$", r"\.sqlite$", r"\.pyc$"]

def cleanup_old_dumps(dump_dir: Path, current_dump: Path):
    """Keep only the latest dump file in the directory."""
    print("🧹 Cleaning up old dumps...")
    for item in dump_dir.glob("PROJECT_CONTEXT_DUMP_*.txt"):
        if item.is_file() and item != current_dump:
            try:
                item.unlink()
                print(f"   🗑️  Deleted: {item.name}")
            except Exception as e:
                print(f"   ⚠️  Could not delete {item.name}: {e}")

def is_blocked(path: Path) -> bool:
    """Check if file should be excluded from dump."""
    path_str = str(path).replace("\\", "/")
    return any(re.search(pattern, path_str, re.IGNORECASE) for pattern in BLOCK_FILES)

def detect_project_dirs(repo_root: Path) -> Set[Path]:
    """Auto-detect project directories based on common patterns."""
    detected = set()
    
    # Always include these if they exist
    for dir_name in DEFAULT_INCLUDE_DIRS:
        dir_path = repo_root / dir_name
        if dir_path.is_dir():
            detected.add(dir_path)
    
    # Scan for common project structures
    for item in repo_root.iterdir():
        if not item.is_dir():
            continue
        if item.name in EXCLUDE_DIRS or item.name.startswith("."):
            continue
        if item.name in COMMON_PROJECT_DIRS:
            detected.add(item)
    
    return detected

def should_exclude_dir(dir_path: Path) -> bool:
    """Check if directory should be excluded."""
    return any(excluded in dir_path.parts for excluded in EXCLUDE_DIRS)

def walk_and_collect(base_dir: Path, max_size: int) -> list:
    """Walk directory and collect file paths."""
    collected = []
    
    for item in base_dir.rglob("*"):
        if item.is_dir():
            continue
        
        # Skip excluded directories
        if should_exclude_dir(item):
            continue
        
        # Skip blocked files
        if is_blocked(item):
            continue
        
        # Skip large files
        try:
            if item.stat().st_size > max_size:
                continue
        except OSError:
            continue
        
        collected.append(item)
    
    return sorted(collected)

def collect_priority_files(repo_root: Path) -> List[Path]:
    """Collect files from PRIORITY_DIRS first (Federation recovery)."""
    priority_files = []
    for priority_dir in PRIORITY_DIRS:
        dir_path = repo_root / priority_dir
        if dir_path.exists() and dir_path.is_dir():
            priority_files.extend(walk_and_collect(dir_path, MAX_BYTES))
    return priority_files

def main():
    print("📦 RB-Framework Packer v2.2-federation")
    print("=" * 50)

    repo_root = Path.cwd()
    timestamp = time.strftime("%Y-%m-%d_%H-%M")

    # Secure output directory
    dump_dir = repo_root / ".rb_dumps"
    dump_dir.mkdir(exist_ok=True)

    output_file = dump_dir / f"PROJECT_CONTEXT_DUMP_{timestamp}.txt"

    # Get custom include dirs from environment
    custom_includes = os.environ.get("RB_PACK_INCLUDE", "")
    if custom_includes:
        include_dirs = {repo_root / d.strip() for d in custom_includes.split(",") if d.strip()}
        print(f"📂 Using custom includes: {', '.join(d.name for d in include_dirs)}")
    else:
        # Auto-detect
        include_dirs = detect_project_dirs(repo_root)
        print(f"🔍 Auto-detected directories: {', '.join(d.name for d in include_dirs)}")

    if not include_dirs:
        print("⚠️  No directories found to pack! Aborting.")
        return

    # Collect files: PRIORITY_DIRS first, then rest
    print("🔴 [FEDERATION] Scanning priority directories for recovery state...")
    all_files = collect_priority_files(repo_root)
    priority_count = len(all_files)

    print(f"   ✅ Priority dirs: {priority_count} file(s)")

    # Then collect remaining files
    for dir_path in include_dirs:
        if not dir_path.exists():
            print(f"⚠️  Skipping non-existent: {dir_path.name}")
            continue
        # Don't re-scan priority dirs
        if not any(str(dir_path).startswith(str(repo_root / pd)) for pd in PRIORITY_DIRS):
            all_files.extend(walk_and_collect(dir_path, MAX_BYTES))

    print(f"📄 Total: {len(all_files)} file(s) ({priority_count} from Federation)")

    # Write dump
    with output_file.open("w", encoding="utf-8") as w:
        w.write(f"# Project Context Dump: {timestamp}\n")
        w.write(f"# Generated by RB-Framework Packer v2.2-federation\n")
        w.write(f"# Repository: {repo_root.name}\n")
        w.write(f"# Total files: {len(all_files)}\n")
        w.write(f"# Priority (Federation): {priority_count} files\n")
        w.write("\n" + "=" * 80 + "\n\n")
        w.write("## FEDERATION RECOVERY STATE (PRIORITY)\n")
        w.write(f"Saved: {len([f for f in all_files if any(str(f).startswith(str(Path.cwd() / pd)) for pd in PRIORITY_DIRS)])} files\n")
        w.write("Contains: Registry, Bus messages, Audit logs - for complete system recovery\n\n")
        w.write("=" * 80 + "\n\n")

        for file_path in all_files:
            rel_path = file_path.relative_to(repo_root)
            w.write(f"\n\n{'=' * 80}\n")
            w.write(f"FILE: {rel_path}\n")
            w.write(f"{'=' * 80}\n\n")

            try:
                content = file_path.read_text(encoding="utf-8", errors="ignore")
                w.write(content)
            except Exception as e:
                w.write(f"<ERROR: Could not read file: {e}>")
    
    file_size_kb = output_file.stat().st_size / 1024
    print(f"✅ Context dump created: {output_file.name}")
    print(f"📊 Size: {file_size_kb:.1f} KB")
    print(f"🔴 Federation-ready: Priority dirs captured first for recovery")

    # Keep only the latest file
    cleanup_old_dumps(dump_dir, output_file)

    print(f"\n💡 Tip: Use 'RB_PACK_INCLUDE=dir1,dir2' to customize includes")
    print(f"🤖 Federation Note: brain/ and docs/ are always scanned first")

if __name__ == "__main__":
    main()

