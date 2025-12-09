# Tool Index

<!-- Tools are registered here with their response samples so the AI generator knows how to parse responses -->

## get_files_tool
- **Description**: Lists files and directories in a specified path with detailed metadata. Returns JSON with current path, parent path, and items array. On error, returns items as empty array.
- **API Endpoint**: /api/mono/get_files
- **Command**: `python3 tools/get_files_tool.py --path {path}`
- **Response Type**: json
- **Response Sample (success)**: `{"result": {"current_path": "/Users/demo", "parent_path": "/Users", "total_items": 2, "items": [{"name": "Documents", "type": "directory"}, {"name": "file.txt", "type": "file", "size": 1234}]}}`
- **Response Sample (error)**: `{"result": {"error": "Permission denied: /path", "items": [], "current_path": "/path", "parent_path": ""}}`
- **Usage**: `fetch('/api/mono/get_files?path=/some/path').then(r => r.json()).then(data => { if (data.result.error) { console.error(data.result.error); } else { console.log(data.result.items); }})`
- **Created**: 2025-12-09T00:22:00.000Z

## file_reader
- **Description**: Reads the content of a file from the local file system and outputs it to stdout
- **API Endpoint**: /api/mono/file_reader
- **Command**: `python3 tools/file_reader.py --file {path}`
- **Response Type**: string
- **Response Sample**: `This is the file content`
- **Created**: 2025-12-09T00:35:35.635Z

## text_processor
- **Description**: A versatile text processing tool that can count words/lines/characters, convert text case, search for patterns, replace text, and extract emails/URLs from input text
- **API Endpoint**: /api/mono/text_processor
- **Command**: `python3 tools/text_processor.py --input {text} --operation {operation} [--pattern {pattern}] [--replacement {replacement}]`
- **Response Type**: json
- **Response Sample**: `{"operation": "count", "result": {"words": 5, "lines": 2, "characters": 30}}`
- **Created**: 2025-12-09T00:45:38.811Z

## directory_navigator
- **Description**: A shell navigation tool that can change directories and execute basic navigation commands while maintaining state between operations
- **API Endpoint**: /api/mono/directory_navigator
- **Command**: `python3 tools/directory_navigator.py --cmd {command} --path {path}`
- **Response Type**: string
- **Response Sample**: `Changed to directory: /home/user
Current directory: /home/user`
- **Created**: 2025-12-09T00:49:44.599Z
