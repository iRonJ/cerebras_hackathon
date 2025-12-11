#!/usr/bin/env python3
import os
import sys
import json
import argparse
from pathlib import Path

def get_state_file():
    """Get the path to the state file in user's home directory"""
    return os.path.expanduser("~/.dir_navigator_state.json")

def load_state():
    """Load the current directory state from file"""
    state_file = get_state_file()
    if os.path.exists(state_file):
        try:
            with open(state_file, 'r') as f:
                state = json.load(f)
                return state.get('current_dir', os.getcwd())
        except:
            pass
    return os.getcwd()

def save_state(directory):
    """Save the current directory state to file"""
    state_file = get_state_file()
    state = {'current_dir': directory}
    with open(state_file, 'w') as f:
        json.dump(state, f)

def handle_cd(path, current_dir):
    """Handle cd command"""
    if not path:
        path = os.path.expanduser("~")  # cd without argument goes home
    
    # Handle relative paths
    if not os.path.isabs(path):
        path = os.path.join(current_dir, path)
    
    # Resolve to absolute path
    path = os.path.abspath(path)
    
    if os.path.isdir(path):
        save_state(path)
        return f"Changed to directory: {path}"
    else:
        return f"Error: Directory '{path}' does not exist"

def handle_pwd(current_dir):
    """Handle pwd command"""
    return current_dir

def handle_ls(args, current_dir):
    """Handle ls command"""
    try:
        import subprocess
        if args:
            cmd = ['ls'] + args.split()
        else:
            cmd = ['ls', '-la']
        result = subprocess.run(cmd, cwd=current_dir, capture_output=True, text=True)
        if result.returncode == 0:
            return result.stdout
        else:
            return f"Error: {result.stderr.strip()}"
    except Exception as e:
        return f"Error executing ls: {str(e)}"

def handle_mkdir(path, current_dir):
    """Handle mkdir command"""
    if not path:
        return "Error: mkdir requires a directory name"
    
    # Handle relative paths
    if not os.path.isabs(path):
        path = os.path.join(current_dir, path)
    
    try:
        os.makedirs(path, exist_ok=True)
        return f"Created directory: {path}"
    except Exception as e:
        return f"Error creating directory: {str(e)}"

def handle_tree(args, current_dir):
    """Handle tree command"""
    try:
        import subprocess
        if args:
            cmd = ['tree'] + args.split()
        else:
            cmd = ['tree', '-L', '2']  # Show 2 levels by default
        result = subprocess.run(cmd, cwd=current_dir, capture_output=True, text=True)
        if result.returncode == 0:
            return result.stdout
        else:
            # Fallback to ls if tree is not available
            return handle_ls('-la', current_dir)
    except:
        return handle_ls('-la', current_dir)

def main():
    parser = argparse.ArgumentParser(description='Directory Navigator Tool')
    parser.add_argument('--cmd', required=True, 
                       choices=['cd', 'pwd', 'ls', 'mkdir', 'tree', 'reset'],
                       help='Command to execute')
    parser.add_argument('--path', help='Path argument for cd/mkdir')
    parser.add_argument('--args', help='Additional arguments for commands')
    
    args = parser.parse_args()
    
    # Load current state
    current_dir = load_state()
    
    # Execute command
    if args.cmd == 'cd':
        result = handle_cd(args.path, current_dir)
    elif args.cmd == 'pwd':
        result = handle_pwd(current_dir)
    elif args.cmd == 'ls':
        result = handle_ls(args.args or '', current_dir)
    elif args.cmd == 'mkdir':
        result = handle_mkdir(args.path, current_dir)
    elif args.cmd == 'tree':
        result = handle_tree(args.args or '', current_dir)
    elif args.cmd == 'reset':
        # Reset to actual current working directory
        save_state(os.getcwd())
        result = f"Reset to: {os.getcwd()}"
    
    print(result)

if __name__ == '__main__':
    main()