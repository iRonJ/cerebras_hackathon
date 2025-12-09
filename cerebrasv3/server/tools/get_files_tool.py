#!/usr/bin/env python3
"""
get_files_tool - Lists files and directories in a specified path.

Returns JSON with detailed file information for the Cerebral DE file browser.
"""

import os
import sys
import json
import argparse
from datetime import datetime

def get_file_info(path, name):
    """Get detailed info about a file or directory."""
    full_path = os.path.join(path, name)
    try:
        stat = os.stat(full_path)
        is_dir = os.path.isdir(full_path)
        return {
            "name": name,
            "type": "directory" if is_dir else "file",
            "size": stat.st_size if not is_dir else None,
            "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
            "extension": os.path.splitext(name)[1][1:] if not is_dir else None,
        }
    except (OSError, PermissionError) as e:
        return {
            "name": name,
            "type": "unknown",
            "error": str(e),
        }

def list_files(path):
    """List all files and directories in the given path."""
    path = os.path.expanduser(path)
    
    if not os.path.exists(path):
        return {"error": f"Path does not exist: {path}", "items": [], "current_path": path, "parent_path": ""}
    
    if not os.path.isdir(path):
        return {"error": f"Path is not a directory: {path}", "items": [], "current_path": path, "parent_path": ""}
    
    try:
        entries = os.listdir(path)
        files = [get_file_info(path, name) for name in sorted(entries)]
        
        # Separate directories and files, directories first
        dirs = [f for f in files if f.get("type") == "directory"]
        regular_files = [f for f in files if f.get("type") != "directory"]
        
        return {
            "current_path": os.path.abspath(path),
            "parent_path": os.path.dirname(os.path.abspath(path)),
            "total_items": len(files),
            "directories": len(dirs),
            "files": len(regular_files),
            "items": dirs + regular_files,
        }
    except PermissionError:
        return {"error": f"Permission denied: {path}", "items": [], "current_path": path, "parent_path": ""}
    except Exception as e:
        return {"error": str(e), "items": [], "current_path": path, "parent_path": ""}

def main():
    parser = argparse.ArgumentParser(description="List files in a directory")
    parser.add_argument("--path", default=".", help="Path to list files from")
    args = parser.parse_args()
    
    result = list_files(args.path)
    print(json.dumps(result))

if __name__ == "__main__":
    main()
