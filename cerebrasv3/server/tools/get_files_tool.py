import os
import argparse
import json

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Get files and directories from a path.")
    parser.add_argument("--path", type=str, required=True, help="The directory path to list.")
    args = parser.parse_args()

    try:
        if not os.path.isdir(args.path):
            # Attempt to list contents of a file, or path does not exist.
            # Raise a more specific error to be caught.
            raise NotADirectoryError(f"Error: Path '{args.path}' is not a directory or does not exist.")
            
        contents = os.listdir(args.path)
        # Print as a JSON list to ensure the output is easily parsable by the caller.
        print(json.dumps(contents))

    except FileNotFoundError:
        print(json.dumps({"error": f"Error: Path not found: '{args.path}'"}))
        exit(1)
    except NotADirectoryError as e:
        print(json.dumps({"error": str(e)}))
        exit(1)
    except PermissionError:
        print(json.dumps({"error": f"Error: Permission denied to read path: '{args.path}'"}))
        exit(1)
    except Exception as e:
        print(json.dumps({"error": f"An unexpected error occurred: {str(e)}"}))
        exit(1)
