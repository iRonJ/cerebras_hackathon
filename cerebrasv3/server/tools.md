# Tool Index

<!-- Tools are registered here with their response samples so the AI generator knows how to parse responses -->

## heif_to_jpeg_converter
- **Description**: Converts HEIF/HEIC image files to JPEG format for CLIP embedding extraction
- **API Endpoint**: /api/mono/heif_to_jpeg_converter
- **Command**: `python3 tools/heif_to_jpeg_converter.py --input {input}`
- **Response Type**: json
- **Response Sample**: `{"converted_files": ["/tmp/heif_convert_1.jpg", "/tmp/heif_convert_2.jpg"]}`
- **Usage**: `fetch('/api/mono/heif_to_jpeg_converter?input=/path/to/image1.heic,/path/to/image2.heif').then(r => r.json()).then(data => console.log(data))`
- **Created**: 2025-12-09T05:31:52.703Z

## photo_finder
- **Description**: Recursive photo finder tool that searches directory trees for image files and returns their metadata with improved macOS permission handling
- **API Endpoint**: /api/mono/photo_finder
- **Command**: `python3 tools/photo_finder.py --directory {directory} --extensions {extensions}`
- **Response Type**: json
- **Response Sample**: `[{"path": "/path/to/photo.jpg", "filename": "photo.jpg", "extension": ".jpg", "size_bytes": 1234567, "created": "2023-01-01T00:00:00Z", "modified": "2023-01-01T00:00:00Z", "directory": "/path/to", "dimensions": [1920, 1080]}]`
- **Usage**: `fetch('/api/mono/photo_finder?directory=/path/to/photos&extensions=jpg,png').then(r => r.json()).then(data => console.log(data))`
- **Created**: 2025-12-09T05:35:17.486Z

## file_reader
- **Description**: Reads and returns the full text content of a specified file within a directory. Defaults to reading 'README.md' in the specified directory if no file is explicitly provided.
- **API Endpoint**: /api/mono/file_reader
- **Command**: `python3 tools/file_reader.py --directory {directory} --file {file?}`
- **Response Type**: string
- **Response Sample**: `File content as text`
- **Usage**: `fetch('/api/mono/file_reader?directory=/path/to/dir&file=filename.txt').then(r => r.text()).then(data => console.log(data))`
- **Created**: 2025-12-09T05:46:02.241Z

## get_files_tool
- **Description**: Lists files and directories with Windows 98-style metadata including human-readable file sizes, file type icons, classic date format, and column-based sorting options
- **API Endpoint**: /api/mono/get_files
- **Command**: `python3 tools/get_files_tool.py --path {path} --sort name`
- **Response Type**: json
- **Response Sample**: `{"current_path": "/Users/test", "parent_path": "/Users", "items": [{"name": "document.txt", "path": "/Users/test/document.txt", "type": "file", "size": 1024, "size_formatted": "1.0 KB", "modified": "12/31/1999 5:30 PM", "modified_timestamp": 946684800, "extension": "txt", "icon": "text"}]}`
- **Usage**: `fetch('/api/mono/get_files').then(r => r.json())`
- **Created**: 2025-12-09T06:01:29.330Z

## macos_file_commands
- **Description**: Generate and execute macOS file and directory open commands with proper path handling, respecting the directory flag when opening files
- **API Endpoint**: /api/mono/macos_file_commands
- **Command**: `python3 tools/macos_file_commands.py --path {path}`
- **Response Type**: json
- **Response Sample**: `{
  "success": true,
  "command": "open '/Users/user/file.txt'",
  "originalPath": "file.txt",
  "escapedPath": "'/Users/user/file.txt'",
  "executed": true,
  "pathType": "file",
  "parentDirectory": "/Users/user",
  "directoryCommand": "open '/Users/user'"
}`
- **Usage**: `fetch('/api/mono/macos_file_commands?path=filename.txt').then(r => r.json()).then(data => console.log(data))`
- **Created**: 2025-12-09T06:07:53.284Z

## png_processor
- **Description**: Simple PNG processor with pixel-level transformation and corner stretching
- **API Endpoint**: /api/mono/png_processor
- **Command**: `python3 tools/png_processor.py --input {input} --output {output} --corners {corners} --scale {scale}`
- **Response Type**: json
- **Response Sample**: `{"status": "success", "output_path": "output.png"}`
- **Usage**: `Process PNG images with pixel-level corner stretching and scaling`
- **Created**: 2025-12-09T07:50:35.921Z

## webgl_texture_fixer
- **Description**: WebGL texture fixer that converts rectangular images to square textures with proper UV mapping and corner position manipulation
- **API Endpoint**: /api/mono/webgl_texture_fixer
- **Command**: `python3 tools/webgl_texture_fixer.py --input {input} --output {output} --corners {corners}`
- **Response Type**: json
- **Response Sample**: `{"original_size": [1920, 1080], "square_size": 1920, "texture_coords": [[0,0],[1,0],[1,0.5625],[0,0.5625]], "corner_offsets": [[0,0],[10,0],[10,-5],[0,-5]], "output_path": "/path/to/output.png"}`
- **Usage**: `fetch('/api/mono/webgl_texture_fixer?input=/path/to/image.jpg&output=/path/to/output.png&corners=0,0,10,0,10,-5,0,-5').then(r => r.json()).then(data => console.log(data))`
- **Created**: 2025-12-09T07:54:03.617Z

## process_checker
- **Description**: A process checker tool that lists and filters running system processes with PIDs, names, and resource usage information
- **API Endpoint**: /api/mono/process_checker
- **Command**: `python3 tools/process_checker.py --name {name} --format {format}`
- **Response Type**: json
- **Response Sample**: `[{"pid": 1234, "name": "Finder", "cpu_percent": 0.5, "memory_percent": 2.1}]`
- **Usage**: `fetch('/api/mono/process_checker?name=finder&format=json').then(r => r.json()).then(data => console.log(data))`
- **Created**: 2025-12-09T07:54:27.287Z

## disk_usage_analyzer
- **Description**: Analyzes disk usage for a specified directory on macOS and returns a breakdown of file sizes and counts by extension
- **API Endpoint**: /api/mono/disk_usage_analyzer
- **Command**: `python3 tools/disk_usage_analyzer.py --directory {directory} --depth {depth}`
- **Response Type**: json
- **Response Sample**: `{"total_size": 1048576, "total_files": 42, "extensions": {".py": {"count": 10, "size": 204800}, ".txt": {"count": 5, "size": 10240}, "other": {"count": 27, "size": 807536}}}`
- **Usage**: `fetch('/api/mono/disk_usage_analyzer?directory=/Users/username/Documents&depth=2').then(r => r.json()).then(data => console.log(data))`
- **Created**: 2025-12-09T08:01:10.016Z

## video_integrity_checker
- **Description**: Analyzes video files for corruption, checks metadata and container integrity, and compares files before/after upload
- **API Endpoint**: /api/mono/video_integrity_checker
- **Command**: `python3 tools/video_integrity_checker.py --file {file} --compare {compare_file} --format {format}`
- **Response Type**: json
- **Response Sample**: `{"file":"video.mp4","size":1048576,"duration":10.5,"codec":"h264","container":"mp4","integrity":"ok","hash":"sha256:abc123..."}`
- **Usage**: `fetch('/api/mono/video_integrity_checker?file=video.mp4&compare=upload_video.mp4&format=json').then(r => r.json()).then(data => console.log(data))`
- **Created**: 2025-12-09T08:08:24.307Z

## duplicate_finder
- **Description**: Finds duplicate files in a directory tree based on content hash (SHA256), prints file paths in JSON format
- **API Endpoint**: /api/mono/duplicate_finder
- **Command**: `python3 tools/duplicate_finder.py --directory {directory}`
- **Response Type**: json
- **Response Sample**: `{"duplicates": [{"hash": "e3b0c44...", "files": ["/path/to/file1", "/path/to/file2"]}]}`
- **Usage**: `fetch('/api/mono/duplicate_finder?directory=/Users/username/Downloads').then(r => r.json()).then(data => console.log(data))`
- **Created**: 2025-12-09T08:12:10.975Z

## WebGL Polygon Media Tool
- **Description**: WebGL-based polygon editor with fullscreen UI controls, hamburger menu interactions, media attachments, and fixed drag bar functionality
- **API Endpoint**: /api/mono/webgl-polygon
- **Command**: `python3 tools/webgl_polygon_tool.py --mode {mode} --port {port}`
- **Response Type**: json
- **Response Sample**: `{"polygons": [{"vertices": [-0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5], "color": [1, 0, 0, 0.5], "media": {"type": "image", "url": "https://picsum.photos/seed/rect1/200/200.jpg"}}]}`
- **Usage**: `fetch('/api/mono/WebGL Polygon Media Tool?mode=server&port=8080').then(r => r.json()).then(data => console.log(data))`
- **Created**: 2025-12-09T08:18:27.084Z

## image_embeddings_3d
- **Description**: Extracts CLIP embeddings from images, reduces to 3D coordinates using UMAP, and generates WebGL-ready HTML visualization with functional zoom and pan controls
- **API Endpoint**: /api/mono/image_embeddings_3d
- **Command**: `python3 tools/image_embeddings_3d.py --directory {directory} --model {model}`
- **Response Type**: json
- **Response Sample**: `[{"path":"image1.jpg","coordinates":[1.2, -0.3, 0.8],"distanceToNearestNeighbor":0.1234,"metadata":{"format":"JPEG","dimensions":{"width":1920,"height":1080}}}]`
- **Usage**: `fetch('/api/mono/image_embeddings_3d?directory=path/to/images&model=openai/clip-vit-base-patch32').then(r => r.json()).then(data => console.log(data))`
- **Created**: 2025-12-09T08:29:08.863Z

## metadata_calculator
- **Description**: A metadata calculator tool that takes an object with format and dimensions properties and calculates the size by multiplying width and height from the dimensions object, returning the updated metadata object with the calculated size property.
- **API Endpoint**: /api/mono/metadata_calculator
- **Command**: `/Users/ronj/Documents/cerebras_hackathon/cerebrasv3/server/.venv/bin/python3 tools/metadata_calculator.py --input '{"format":"PNG","dimensions":{"width":1742,"height":1140}}'`
- **Response Type**: json
- **Response Sample**: `{"format":"image","dimensions":{"width":1920,"height":1080},"size":2073600}`
- **Usage**: `fetch('/api/mono/metadata_calculator?input={"format":"image","dimensions":{"width":1920,"height":1080}}').then(r => r.json()).then(data => console.log(data))`
- **Created**: 2025-12-09T08:38:04.809Z

## image_to_dataurl
- **Description**: Converts image files to base64 data URLs for web preview display. Takes image path as input and returns data URL that can be used as src attribute for img elements.
- **API Endpoint**: /api/mono/image_to_dataurl
- **Command**: `python3 tools/image_to_dataurl.py --input {path}`
- **Response Type**: string
- **Response Sample**: `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...`
- **Usage**: `fetch('/api/mono/image_to_dataurl').then(r => r.json())`
- **Created**: 2025-12-09T08:42:50.826Z

## duration_slider
- **Description**: Generates an interactive HTML duration slider component with configurable values and JavaScript callbacks
- **API Endpoint**: /api/mono/duration_slider
- **Command**: `python3 tools/duration_slider.py --min {min} --max {max} --default {default_value} --step {step} --id {id} --label {label}`
- **Response Type**: string
- **Response Sample**: `<div class="duration-slider-container">
  <label for="duration-slider">Duration:</label>
  <input type="range" id="duration-slider" min="0" max="3600" step="1" value="1800">
  <span class="slider-value">30:00</span>
</div>
<style>
...
</style>
<script>
...
</script>`
- **Usage**: `fetch('/api/mono/duration_slider?min=0&max=3600&default_value=1800&step=1&id=duration-slider&label=Duration').then(r => r.text()).then(data => console.log(data))`
- **Created**: 2025-12-10T17:06:29.495Z

## system_audio_beep
- **Description**: Generate and play beeping sounds through system audio output at specified frequencies and durations
- **API Endpoint**: /api/mono/system_audio_beep
- **Command**: `python3 tools/system_audio_beep.py --frequency {frequency} --duration {duration} --volume {volume}`
- **Response Type**: string
- **Response Sample**: `Played beep: frequency=440.0 Hz, duration=0.5 seconds, volume=0.5`
- **Usage**: `fetch('/api/mono/system_audio_beep?frequency=440&duration=0.5&volume=0.5').then(r => r.text()).then(data => console.log(data))`
- **Created**: 2025-12-10T17:07:41.930Z

## geq_analyzer
- **Description**: Real-time audio frequency spectrum analyzer with FFT analysis, outputs frequency band data as JSON
- **API Endpoint**: /api/mono/geq_analyzer
- **Command**: `python3 tools/geq_analyzer.py --duration 1.0 --bands 8 --sensitivity 1.0 --sample-rate 44100`
- **Response Type**: json
- **Response Sample**: `{"timestamp": 1703123456.789, "bands": [0.12, 0.45, 0.67, 0.23, 0.89, 0.34, 0.56, 0.78], "config": {"sensitivity": 1.0, "bands": 8}}`
- **Usage**: `fetch('/api/mono/geq_analyzer?duration=5&bands=16&sensitivity=1.5').then(r => r.json()).then(data => console.log(data))`
- **Created**: 2025-12-10T17:10:54.123Z

## disco_sphere_generator
- **Description**: Generates a WebGL disco sphere with static position and dynamic visual effects
- **API Endpoint**: /api/mono/disco_sphere_generator
- **Command**: `python3 tools/disco_sphere_generator.py`
- **Response Type**: json
- **Response Sample**: `{"html":"<!DOCTYPE html>...</html>"}`
- **Usage**: `fetch('/api/mono/disco_sphere_generator').then(r => r.json()).then(data => console.log(data.html))`
- **Created**: 2025-12-10T17:16:02.493Z

## macos_system_info
- **Description**: Retrieves macOS system information including OS version, hardware details, and network configuration
- **API Endpoint**: /api/mono/macos_system_info
- **Command**: `python3 tools/macos_system_info.py --info-type {info_type}`
- **Response Type**: json
- **Response Sample**: `{"os_version": "macOS 14.0", "model": "MacBook Pro", "processor": "Apple M2", "memory": "16 GB", "serial": "XXXXXXXXXXXX"}`
- **Usage**: `fetch('/api/mono/macos_system_info?info_type=hardware').then(r => r.json()).then(data => console.log(data))`
- **Created**: 2025-12-10T17:47:25.974Z

## file_access_debugger
- **Description**: Debug tool for checking file accessibility and reading error logs to diagnose file loading issues
- **API Endpoint**: /api/mono/file_access_debugger
- **Command**: `python3 tools/file_access_debugger.py --path {path} --search-logs {search_logs} --log-pattern {log_pattern}`
- **Response Type**: json
- **Response Sample**: `{"file_info": {"path": "/path/to/file", "exists": true, "readable": true, "writable": false, "executable": false}, "error_logs": [{"file": "/var/log/system.log", "recent_errors": ["Error message 1", "Error message 2"]}]}`
- **Usage**: `fetch('/api/mono/file_access_debugger?path=/path/to/check&search-logs=true&log-pattern=error').then(r => r.json()).then(data => console.log(data))`
- **Created**: 2025-12-10T17:57:32.739Z

## root_folder_selector
- **Description**: Enhanced Terminator 2-themed file browser with sorting options and audio feedback. Provides immersive file navigation with customizable sorting by name, size, or date, and includes robotic sound effects for interactions.
- **API Endpoint**: /api/mono/root_folder_selector
- **Command**: `python3 tools/root_folder_selector.py --path {path} --sort {sort} --order {order}`
- **Response Type**: json
- **Response Sample**: `{"path": "/path/to/folder", "files": [{"name": "file.txt", "type": "file", "size": 1024}]}`
- **Usage**: `fetch('/api/mono/root_folder_selector?path=/Users&sort=name&order=asc').then(r => r.json()).then(data => console.log(data))`
- **Created**: 2025-12-10T17:58:56.746Z

## webgl_map_generator
- **Description**: WebGL-based FEA visualization tool with voxel mesh generation, structural analysis, and interactive element manipulation
- **API Endpoint**: /api/mono/webgl_map_generator
- **Command**: `python3 tools/webgl_map_generator.py --input {input} --output {output} --resolution {resolution}`
- **Response Type**: json
- **Response Sample**: `{"status": "success", "output_file": "/path/to/output.html", "mesh_elements": 1000}`
- **Usage**: `fetch('/api/mono/webgl_map_generator?input=data.json&output=visualization.html&resolution=1920x1080').then(r => r.json()).then(data => console.log(data))`
- **Created**: 2025-12-10T18:00:17.883Z

## drone_controller
- **Description**: Simulates quadcopter control and camera operations with mock APIs for drone hardware interfacing
- **API Endpoint**: /api/mono/drone_controller
- **Command**: `python3 tools/drone_controller.py --action camera_center --drone_id {drone_id}`
- **Response Type**: json
- **Response Sample**: `{"status": "success", "drone_id": "DRONE_001", "action": "takeoff", "altitude": 10, "timestamp": "2024-01-15T10:30:00Z"}`
- **Usage**: `fetch('/api/mono/drone_controller?action=takeoff&drone_id=DRONE_001&altitude=10&duration=5').then(r => r.json()).then(data => console.log(data))`
- **Created**: 2025-12-10T18:03:14.866Z

## tool_configurator
- **Description**: Prepares and configures available tools by scanning directories, gathering metadata, and generating configuration for tool execution
- **API Endpoint**: /api/mono/tool_configurator
- **Command**: `python3 tools/tool_configurator.py --directory /path/to/tools --output json`
- **Response Type**: json
- **Response Sample**: `{"tools": [{"name": "script.py", "path": "/tools/script.py", "type": "python", "executable": true}], "config": {"scanned_dir": "/tools", "timestamp": "2024-01-01T00:00:00Z"}}`
- **Usage**: `fetch('/api/mono/tool_configurator?directory=/path/to/tools&output=json&config=env').then(r => r.json()).then(data => console.log(data))`
- **Created**: 2025-12-10T19:51:34.221Z

## countdown_timer
- **Description**: A countdown timer that counts for a specified duration and sends a system notification when complete
- **API Endpoint**: /api/mono/countdown_timer
- **Command**: `python3 tools/countdown_timer.py --duration 10 --message "Timer completed!"`
- **Response Type**: string
- **Response Sample**: `Timer completed: 5 seconds elapsed`
- **Usage**: `fetch('/api/mono/countdown_timer?duration=5&message=Time%27s%20up!').then(r => r.text()).then(data => console.log(data))`
- **Created**: 2025-12-10T20:32:44.977Z
