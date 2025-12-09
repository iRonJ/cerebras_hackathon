#!/usr/bin/env python3
import argparse
import re
import json
import sys
from typing import Dict, Any, List, Union

def count_metrics(text: str) -> Dict[str, int]:
    """Count words, lines, and characters in text"""
    return {
        "words": len(text.split()),
        "lines": len(text.splitlines()),
        "characters": len(text),
        "characters_no_spaces": len(text.replace(" ", ""))
    }

def convert_case(text: str, case_type: str) -> str:
    """Convert text to specified case"""
    if case_type == "upper":
        return text.upper()
    elif case_type == "lower":
        return text.lower()
    elif case_type == "title":
        return text.title()
    elif case_type == "swap":
        return text.swapcase()
    else:
        return text

def find_patterns(text: str, pattern: str) -> List[str]:
    """Find all occurrences of a pattern in text"""
    matches = re.findall(pattern, text, re.MULTILINE | re.IGNORECASE)
    return matches

def replace_text(text: str, pattern: str, replacement: str) -> str:
    """Replace all occurrences of pattern with replacement"""
    return re.sub(pattern, replacement, text, flags=re.MULTILINE | re.IGNORECASE)

def extract_emails(text: str) -> List[str]:
    """Extract email addresses from text"""
    email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    return re.findall(email_pattern, text)

def extract_urls(text: str) -> List[str]:
    """Extract URLs from text"""
    url_pattern = r'https?://[^\s<>"']+|www\.[^\s<>"']+'
    return re.findall(url_pattern, text)

def main():
    parser = argparse.ArgumentParser(
        description="A versatile text processing tool",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python3 text_processor.py --input "Hello World" --operation count
  python3 text_processor.py --input "Hello World" --operation upper
  python3 text_processor.py --input "Hello World" --operation find --pattern "Hello"
  python3 text_processor.py --input "Hello World" --operation replace --pattern "Hello" --replacement "Hi"
  python3 text_processor.py --input "Contact us at email@example.com" --operation extract_emails
        """
    )
    
    parser.add_argument("--input", "-i", 
                       help="Input text to process")
    parser.add_argument("--file", "-f", 
                       help="Read input from file")
    parser.add_argument("--operation", "-o", 
                       choices=["count", "upper", "lower", "title", "swap", 
                               "find", "replace", "extract_emails", "extract_urls"],
                       required=True,
                       help="Operation to perform")
    parser.add_argument("--pattern", "-p", 
                       help="Pattern to search for (used with find/replace)")
    parser.add_argument("--replacement", "-r", 
                       help="Replacement text (used with replace)")
    parser.add_argument("--format", "-fmt", 
                       choices=["json", "plain"],
                       default="json",
                       help="Output format")
    
    args = parser.parse_args()
    
    # Get input text
    if args.file:
        try:
            with open(args.file, 'r', encoding='utf-8') as f:
                text = f.read()
        except FileNotFoundError:
            print(json.dumps({"error": f"File not found: {args.file}"}), file=sys.stderr)
            sys.exit(1)
    elif args.input:
        text = args.input
    else:
        # Read from stdin if no input provided
        text = sys.stdin.read()
    
    # Process based on operation
    result = None
    
    try:
        if args.operation == "count":
            result = {
                "operation": "count",
                "result": count_metrics(text)
            }
        elif args.operation in ["upper", "lower", "title", "swap"]:
            result = {
                "operation": "case_conversion",
                "case_type": args.operation,
                "result": convert_case(text, args.operation)
            }
        elif args.operation == "find":
            if not args.pattern:
                print(json.dumps({"error": "Pattern required for find operation"}), file=sys.stderr)
                sys.exit(1)
            matches = find_patterns(text, args.pattern)
            result = {
                "operation": "find",
                "pattern": args.pattern,
                "matches": matches,
                "count": len(matches)
            }
        elif args.operation == "replace":
            if not args.pattern or not args.replacement:
                print(json.dumps({"error": "Pattern and replacement required for replace operation"}), file=sys.stderr)
                sys.exit(1)
            result = {
                "operation": "replace",
                "pattern": args.pattern,
                "replacement": args.replacement,
                "result": replace_text(text, args.pattern, args.replacement)
            }
        elif args.operation == "extract_emails":
            emails = extract_emails(text)
            result = {
                "operation": "extract_emails",
                "emails": emails,
                "count": len(emails)
            }
        elif args.operation == "extract_urls":
            urls = extract_urls(text)
            result = {
                "operation": "extract_urls",
                "urls": urls,
                "count": len(urls)
            }
        
        # Output result
        if args.format == "json":
            print(json.dumps(result, indent=2, ensure_ascii=False))
        else:
            # Plain text output
            if args.operation == "count":
                metrics = result["result"]
                print(f"Words: {metrics['words']}")
                print(f"Lines: {metrics['lines']}")
                print(f"Characters: {metrics['characters']}")
                print(f"Characters (no spaces): {metrics['characters_no_spaces']}")
            elif args.operation in ["upper", "lower", "title", "swap"]:
                print(result["result"])
            elif args.operation == "find":
                for match in result["matches"]:
                    print(match)
                print(f"\nTotal matches: {result['count']}")
            elif args.operation == "replace":
                print(result["result"])
            elif args.operation in ["extract_emails", "extract_urls"]:
                key = "emails" if args.operation == "extract_emails" else "urls"
                for item in result[key]:
                    print(item)
                print(f"\nTotal found: {result['count']}")
    
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
