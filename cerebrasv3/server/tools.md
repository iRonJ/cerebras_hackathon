# Tool Index

<!-- Tools will be appended here by the ToolManager -->

## get_files_tool
- **Description**: Lists files and directories in a specified path.
- **API Endpoint**: /get_files
- **Command**: `python3 tools/get_files_tool.py --path {path}`
- **Response Type**: list
- **Created**: 2025-12-02T06:45:40.143Z

## generate_password_tool
- **Description**: Generates a secure, random password with customizable length and character sets.
- **API Endpoint**: /generate_password
- **Command**: `python3/tools/generate_password.py --length {length} --include_lowercase {include_lowercase} --include_uppercase {include_uppercase} --include_digits {include_digits} --include_symbols {include_symbols}`
- **Response Type**: string
- **Created**: 2025-12-02T06:47:06.903Z

## file-browser
- **Description**: A comprehensive terminal-based file browser with directory tree navigation, file operations, preview, search, and more
- **API Endpoint**: /api/file-browser
- **Command**: `python3 tools/file_browser.py --path {path} --operation {operation} --target {target}`
- **Response Type**: json
- **Created**: 2025-12-02T06:59:02.416Z
