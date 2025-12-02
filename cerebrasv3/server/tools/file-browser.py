#!/usr/bin/env python3
import argparse
import json
import os
import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path

def get_file_info(path):
    """Get detailed file information"""
    try:
        stat = os.stat(path)
        return {
            "name": os.path.basename(path),
            "path": os.path.abspath(path),
            "size": stat.st_size,
            "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
            "type": "directory" if os.path.isdir(path) else "file",
            "extension": os.path.splitext(path)[1].lower() if os.path.isfile(path) else "",
            "readable": os.access(path, os.R_OK),
            "writable": os.access(path, os.W_OK),
            "executable": os.access(path, os.X_OK),
            "hidden": os.path.basename(path).startswith(".")
        }
    except Exception as e:
        return {"error": str(e)}

def list_directory(path, show_hidden=False, sort_by="name"):
    """List directory contents with details"""
    try:
        items = []
        for item in os.listdir(path):
            if not show_hidden and item.startswith("."):
                continue
            full_path = os.path.join(path, item)
            items.append(get_file_info(full_path))
        
        # Sort items
        reverse = False
        if sort_by.startswith("-"):
            sort_by = sort_by[1:]
            reverse = True
        
        if sort_by in ["name", "size", "modified", "type"]:
            items = sorted(items, key=lambda x: x.get(sort_by, ""), reverse=reverse)
        
        return {"path": os.path.abspath(path), "items": items}
    except Exception as e:
        return {"error": str(e)}

def create_file_or_directory(path, is_directory=False):
    """Create a new file or directory"""
    try:
        if is_directory:
            os.makedirs(path, exist_ok=True)
        else:
            Path(path).touch()
        return {"success": True, "path": os.path.abspath(path)}
    except Exception as e:
        return {"error": str(e)}

def copy_item(src, dst):
    """Copy file or directory"""
    try:
        if os.path.isdir(src):
            if os.path.exists(dst):
                dst = os.path.join(dst, os.path.basename(src))
            shutil.copytree(src, dst, dirs_exist_ok=True)
        else:
            if os.path.isdir(dst):
                dst = os.path.join(dst, os.path.basename(src))
            shutil.copy2(src, dst)
        return {"success": True, "source": src, "dest": dst}
    except Exception as e:
        return {"error": str(e)}

def move_item(src, dst):
    """Move file or directory"""
    try:
        shutil.move(src, dst)
        return {"success": True, "source": src, "dest": dst}
    except Exception as e:
        return {"error": str(e)}

def delete_item(path):
    """Delete file or directory"""
    try:
        if os.path.isdir(path):
            shutil.rmtree(path)
        else:
            os.remove(path)
        return {"success": True, "path": path}
    except Exception as e:
        return {"error": str(e)}

def rename_item(old_path, new_name):
    """Rename file or directory"""
    try:
        new_path = os.path.join(os.path.dirname(old_path), new_name)
        os.rename(old_path, new_path)
        return {"success": True, "old": old_path, "new": new_path}
    except Exception as e:
        return {"error": str(e)}

def search_files(directory, pattern, recursive=True):
    """Search for files matching pattern"""
    try:
        matches = []
        pattern = pattern.lower()
        
        if recursive:
            for root, dirs, files in os.walk(directory):
                for name in files + dirs:
                    if pattern in name.lower():
                        full_path = os.path.join(root, name)
                        matches.append(get_file_info(full_path))
        else:
            for item in os.listdir(directory):
                if pattern in item.lower():
                    full_path = os.path.join(directory, item)
                    matches.append(get_file_info(full_path))
        
        return {"directory": directory, "pattern": pattern, "matches": matches}
    except Exception as e:
        return {"error": str(e)}

def get_tree_structure(path, max_depth=3):
    """Get directory tree structure"""
    def _build_tree(dir_path, depth=0):
        items = []
        if depth >= max_depth:
            return items
        
        try:
            for item in sorted(os.listdir(dir_path)):
                if item.startswith("."):
                    continue
                full_path = os.path.join(dir_path, item)
                if os.path.isdir(full_path):
                    items.append({
                        "name": item,
                        "type": "directory",
                        "children": _build_tree(full_path, depth + 1)
                    })
                else:
                    items.append({
                        "name": item,
                        "type": "file"
                    })
        except PermissionError:
            pass
        return items
    
    return {
        "root": os.path.abspath(path),
        "tree": _build_tree(path)
    }

def preview_file(path, max_lines=20):
    """Preview file content"""
    try:
        if os.path.isdir(path):
            return {"error": "Cannot preview directory"}
        
        file_ext = os.path.splitext(path)[1].lower()
        binary_extensions = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".exe", ".dll", ".zip", ".tar", ".gz"]
        
        if file_ext in binary_extensions:
            return {"preview": "Binary file - preview not available"}
        
        with open(path, "r", errors="replace") as f:
            lines = f.readlines()[:max_lines]
            return {
                "path": path,
                "preview": "".join(lines),
                "total_lines": len(open(path, "r").readlines()),
                "previewed_lines": len(lines)
            }
    except Exception as e:
        return {"error": str(e)}

def main():
    parser = argparse.ArgumentParser(description="Comprehensive File Browser Tool")
    
    # Main operations
    parser.add_argument("--path", type=str, default=".", help="Path to operate on")
    parser.add_argument("--operation", type=str, choices=[
        "list", "info", "create", "copy", "move", "delete", "rename", 
        "search", "tree", "preview"
    ], required=True, help="Operation to perform")
    
    # Operation-specific arguments
    parser.add_argument("--target", type=str, help="Target path for operations")
    parser.add_argument("--pattern", type=str, help="Search pattern")
    parser.add_argument("--name", type=str, help="New name for rename operation")
    parser.add_argument("--type", type=str, choices=["file", "directory"], help="Type to create")
    parser.add_argument("--hidden", action="store_true", help="Show hidden files")
    parser.add_argument("--sort", type=str, default="name", 
                       choices=["name", "-name", "size", "-size", "modified", "-modified", "type", "-type"],
                       help="Sort order for list operation")
    parser.add_argument("--max-depth", type=int, default=3, help="Max depth for tree operation")
    parser.add_argument("--max-lines", type=int, default=20, help="Max lines for preview")
    parser.add_argument("--recursive", action="store_true", default=True, help="Recursive search")
    
    args = parser.parse_args()
    
    # Normalize path
    path = os.path.abspath(args.path)
    
    # Execute operation
    result = {"operation": args.operation, "timestamp": datetime.now().isoformat()}
    
    if args.operation == "list":
        result.update(list_directory(path, args.hidden, args.sort))
    elif args.operation == "info":
        result.update(get_file_info(path))
    elif args.operation == "create":
        if not args.target:
            result = {"error": "--target required for create operation"}
        else:
            result.update(create_file_or_directory(args.target, args.type == "directory"))
    elif args.operation == "copy":
        if not args.target:
            result = {"error": "--target required for copy operation"}
        else:
            result.update(copy_item(path, args.target))
    elif args.operation == "move":
        if not args.target:
            result = {"error": "--target required for move operation"}
        else:
            result.update(move_item(path, args.target))
    elif args.operation == "delete":
        result.update(delete_item(path))
    elif args.operation == "rename":
        if not args.name:
            result = {"error": "--name required for rename operation"}
        else:
            result.update(rename_item(path, args.name))
    elif args.operation == "search":
        if not args.pattern:
            result = {"error": "--pattern required for search operation"}
        else:
            result.update(search_files(path, args.pattern, args.recursive))
    elif args.operation == "tree":
        result.update(get_tree_structure(path, args.max_depth))
    elif args.operation == "preview":
        result.update(preview_file(path, args.max_lines))
    
    # Output result as JSON to stdout
    print(json.dumps(result, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    main()
