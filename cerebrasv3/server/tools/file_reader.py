#!/usr/bin/env python3
import argparse
import sys
import os

def read_file_content(file_path):
    """Read and return the content of a file."""
    try:
        # Check if file exists
        if not os.path.exists(file_path):
            print(f"Error: File '{file_path}' does not exist.", file=sys.stderr)
            sys.exit(1)
        
        # Check if it's a file (not a directory)
        if not os.path.isfile(file_path):
            print(f"Error: '{file_path}' is not a file.", file=sys.stderr)
            sys.exit(1)
        
        # Check read permissions
        if not os.access(file_path, os.R_OK):
            print(f"Error: No read permission for file '{file_path}'.", file=sys.stderr)
            sys.exit(1)
        
        # Read file content with appropriate encoding
        with open(file_path, 'r', encoding='utf-8') as file:
            content = file.read()
            
        return content
    
    except UnicodeDecodeError:
        # If UTF-8 fails, try with other encodings
        try:
            with open(file_path, 'r', encoding='latin-1') as file:
                content = file.read()
            return content
        except Exception as e:
            print(f"Error: Could not decode file content: {str(e)}", file=sys.stderr)
            sys.exit(1)
    
    except Exception as e:
        print(f"Error reading file: {str(e)}", file=sys.stderr)
        sys.exit(1)

def main():
    # Set up argument parser
    parser = argparse.ArgumentParser(
        description='Read the content of a file from the local file system',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='Examples:\n  python3 file_reader.py --file /path/to/file.txt\n  python3 file_reader.py -f ./document.md'
    )
    
    parser.add_argument(
        '--file', '-f',
        required=True,
        help='Path to the file to read'
    )
    
    # Parse arguments
    args = parser.parse_args()
    
    # Read and output file content
    content = read_file_content(args.file)
    print(content)

if __name__ == '__main__':
    main()
