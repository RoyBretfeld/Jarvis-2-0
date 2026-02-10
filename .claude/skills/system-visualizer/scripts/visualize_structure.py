#!/usr/bin/env python3
"""
System Visualizer - Codebase Structure Explorer
Generates interactive HTML tree of filesystem structure.
Reads ONLY metadata: size, type, mtime (no code interpretation).
"""

import sys
import json
import os
import webbrowser
from pathlib import Path
from datetime import datetime
from collections import defaultdict

# Configuration
IGNORE = {
    '.git', 'node_modules', '__pycache__', '.venv', 'venv',
    'dist', 'build', '.next', '.nuxt', 'vendor', '.pytest_cache',
    'coverage', '.idea', '.vscode', '.rb_dumps', '.claude'
}

FILE_COLORS = {
    '.js': '#f7df1e', '.ts': '#3178c6', '.tsx': '#3178c6',
    '.py': '#3776ab', '.go': '#00add8', '.rs': '#dea584',
    '.rb': '#cc342d', '.java': '#007396', '.cs': '#239120',
    '.css': '#264de4', '.scss': '#c6538c', '.html': '#e34c26',
    '.json': '#6b7280', '.yaml': '#cb171e', '.yml': '#cb171e',
    '.md': '#083fa1', '.mdx': '#083fa1', '.sh': '#4eaa25',
    '.sql': '#e16d00', '.xml': '#0066cc', '.toml': '#9c4221',
}

def fmt_bytes(b):
    """Format bytes to human readable."""
    if b < 1024:
        return f"{b} B"
    if b < 1048576:
        return f"{b/1024:.1f} KB"
    if b < 1073741824:
        return f"{b/1048576:.1f} MB"
    return f"{b/1073741824:.2f} GB"

def fmt_date(timestamp):
    """Format timestamp to readable date."""
    try:
        return datetime.fromtimestamp(timestamp).strftime("%Y-%m-%d")
    except:
        return "unknown"

def should_ignore(path: Path) -> bool:
    """Check if path should be ignored."""
    return any(part in IGNORE for part in path.parts)

def scan_dir(path: Path, stats: dict) -> dict:
    """Recursively scan directory."""
    result = {
        "name": path.name or "root",
        "children": [],
        "size": 0,
        "type": "dir"
    }

    try:
        items = sorted(path.iterdir(), key=lambda x: x.name.lower())
    except PermissionError:
        return result

    for item in items:
        if should_ignore(item):
            continue

        try:
            if item.is_file():
                size = item.stat().st_size
                ext = item.suffix.lower() or "(no ext)"
                mtime = fmt_date(item.stat().st_mtime)

                result["children"].append({
                    "name": item.name,
                    "size": size,
                    "ext": ext,
                    "mtime": mtime,
                    "type": "file"
                })

                result["size"] += size
                stats["files"] += 1
                stats["extensions"][ext] += 1
                stats["ext_sizes"][ext] += size

            elif item.is_dir():
                stats["dirs"] += 1
                child = scan_dir(item, stats)
                if child["children"]:
                    result["children"].append(child)
                    result["size"] += child["size"]

        except (PermissionError, OSError):
            pass

    # Sort: dirs first, then by size desc
    result["children"].sort(key=lambda x: (x["type"] != "dir", -x["size"]))
    return result

def generate_html(data: dict, stats: dict, target: Path) -> None:
    """Generate interactive HTML visualization."""

    ext_sizes = stats["ext_sizes"]
    total_size = sum(ext_sizes.values()) or 1

    # Top extensions
    sorted_exts = sorted(ext_sizes.items(), key=lambda x: -x[1])[:12]

    # Bar chart HTML
    bars = ""
    for ext, size in sorted_exts:
        pct = (size / total_size) * 100
        color = FILE_COLORS.get(ext, "#6b7280")
        bars += f'''
        <div class="bar-row">
            <span class="bar-label">{ext}</span>
            <div class="bar" style="width:{pct}%;background:{color}"></div>
            <span class="bar-pct">{pct:.1f}%</span>
            <span class="bar-size">{fmt_bytes(size)}</span>
        </div>'''

    html = f'''<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Codebase Structure Map</title>
    <style>
        * {{ box-sizing: border-box; margin: 0; padding: 0; }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: #1a1a2e;
            color: #eee;
            line-height: 1.5;
        }}
        .container {{ display: flex; height: 100vh; }}
        .sidebar {{
            width: 300px;
            background: #16213e;
            border-right: 1px solid #3d3d5c;
            padding: 20px;
            overflow-y: auto;
            flex-shrink: 0;
        }}
        .main {{
            flex: 1;
            padding: 20px;
            overflow-y: auto;
        }}
        h1 {{ font-size: 20px; margin: 0 0 20px 0; color: #fff; }}
        h2 {{ font-size: 13px; margin: 20px 0 10px 0; color: #888; text-transform: uppercase; letter-spacing: 1px; }}
        .stat {{
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #2d2d44;
            font-size: 13px;
        }}
        .stat-value {{ font-weight: bold; color: #ffd700; }}
        .bar-row {{
            display: flex;
            align-items: center;
            margin: 8px 0;
            gap: 8px;
            font-size: 12px;
        }}
        .bar-label {{ width: 60px; font-family: monospace; color: #aaa; }}
        .bar {{ height: 20px; border-radius: 3px; min-width: 2px; }}
        .bar-pct {{ width: 45px; text-align: right; color: #666; }}
        .bar-size {{ width: 70px; text-align: right; color: #888; font-family: monospace; }}
        .tree-search {{
            margin: 15px 0;
            input {{
                width: 100%;
                padding: 8px;
                background: #2d2d44;
                border: 1px solid #3d3d5c;
                color: #eee;
                border-radius: 4px;
                font-size: 12px;
            }}
        }}
        .tree {{
            list-style: none;
            padding: 0;
        }}
        details {{
            cursor: pointer;
        }}
        summary {{
            padding: 6px 8px;
            border-radius: 4px;
            user-select: none;
            display: flex;
            align-items: center;
            gap: 8px;
        }}
        summary:hover {{ background: #2d2d44; }}
        summary::marker {{ color: #ffd700; }}
        .folder {{ color: #ffd700; }}
        .file {{
            display: flex;
            align-items: center;
            padding: 4px 8px;
            border-radius: 3px;
            font-size: 13px;
            gap: 8px;
        }}
        .file:hover {{ background: #2d2d44; }}
        .dot {{
            width: 8px;
            height: 8px;
            border-radius: 50%;
            flex-shrink: 0;
        }}
        .file-info {{
            flex: 1;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 10px;
            overflow: hidden;
        }}
        .file-name {{ flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }}
        .file-meta {{
            display: flex;
            gap: 10px;
            color: #888;
            font-size: 11px;
            flex-shrink: 0;
        }}
        .tree-level {{ padding-left: 16px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="sidebar">
            <h1>📊 Summary</h1>
            <div class="stat"><span>Files</span><span class="stat-value">{stats["files"]:,}</span></div>
            <div class="stat"><span>Directories</span><span class="stat-value">{stats["dirs"]:,}</span></div>
            <div class="stat"><span>Total Size</span><span class="stat-value">{fmt_bytes(data["size"])}</span></div>
            <div class="stat"><span>File Types</span><span class="stat-value">{len(stats["extensions"])}</span></div>

            <h2>By File Type</h2>
            {bars}

            <h2>Search</h2>
            <div class="tree-search">
                <input type="text" id="searchBox" placeholder="Filter files...">
            </div>
        </div>

        <div class="main">
            <h1>📁 {data["name"]}</h1>
            <ul class="tree" id="root"></ul>
        </div>
    </div>

    <script>
        const data = {json.dumps(data)};
        const colors = {json.dumps(FILE_COLORS)};

        function render(node, parent, level = 0) {{
            if (node.type === "dir" && node.children) {{
                const det = document.createElement("details");
                det.open = level < 2;

                const summary = document.createElement("summary");
                summary.innerHTML = `
                    <span class="folder">📁</span>
                    <span class="file-name">${{node.name}}</span>
                    <span class="file-meta">${{node.children.length}} items, ${{fmt_bytes(node.size)}}</span>
                `;

                det.appendChild(summary);

                const ul = document.createElement("ul");
                ul.className = "tree tree-level";

                node.children.forEach(c => render(c, ul, level + 1));
                det.appendChild(ul);

                const li = document.createElement("li");
                li.appendChild(det);
                parent.appendChild(li);
            }} else {{
                const li = document.createElement("li");
                li.className = "file";

                const dot = document.createElement("span");
                dot.className = "dot";
                dot.style.background = colors[node.ext] || "#6b7280";

                const info = document.createElement("div");
                info.className = "file-info";

                const name = document.createElement("span");
                name.className = "file-name";
                name.textContent = node.name;

                const meta = document.createElement("span");
                meta.className = "file-meta";
                meta.textContent = `${{fmt_bytes(node.size)}} · ${{node.mtime}}`;

                info.appendChild(name);
                info.appendChild(meta);

                li.appendChild(dot);
                li.appendChild(info);
                parent.appendChild(li);
            }}
        }}

        function fmt_bytes(b) {{
            if (b < 1024) return b + " B";
            if (b < 1048576) return (b/1024).toFixed(1) + " KB";
            if (b < 1073741824) return (b/1048576).toFixed(1) + " MB";
            return (b/1073741824).toFixed(2) + " GB";
        }}

        // Render tree
        data.children.forEach(c => render(c, document.getElementById("root")));

        // Search filter
        document.getElementById("searchBox").addEventListener("input", function(e) {{
            const search = e.target.value.toLowerCase();
            const files = document.querySelectorAll(".file");
            const dirs = document.querySelectorAll("details summary");

            files.forEach(f => {{
                const match = f.textContent.toLowerCase().includes(search);
                f.style.display = search === "" || match ? "flex" : "none";
            }});

            dirs.forEach(d => {{
                const match = d.textContent.toLowerCase().includes(search);
                d.closest("details").style.display = search === "" || match ? "block" : "none";
            }});
        }});
    </script>
</body>
</html>'''

    output = target.parent / "codebase-map.html"
    output.write_text(html, encoding="utf-8")
    print(f"✅ Generated: {output}")
    webbrowser.open(f"file://{output.absolute()}")

def main():
    target_path = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()

    if not target_path.exists():
        print(f"❌ Path not found: {target_path}")
        sys.exit(1)

    print(f"📂 Scanning: {target_path}")

    stats = {
        "files": 0,
        "dirs": 0,
        "extensions": defaultdict(int),
        "ext_sizes": defaultdict(int),
    }

    data = scan_dir(target_path, stats)
    print(f"📊 Found {stats['files']} files, {stats['dirs']} directories")

    generate_html(data, stats, target_path)

if __name__ == "__main__":
    main()
