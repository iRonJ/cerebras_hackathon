import argparse
import string
import secrets

def parse_bool(val):
    """Converts a string representation of a boolean to a bool."""
    if isinstance(val, bool):
        return val
    return val.lower() in ('true', '1', 't', 'y', 'yes')

def generate_password(length=16, include_lowercase=True, include_uppercase=True, 
                       include_digits=True, include_symbols=True):
    """
    Generates a secure random password based on the specified criteria.
    
    Args:
        length (int): The desired length of the password. Defaults to 16.
        include_lowercase (bool): Whether to include lowercase letters. Defaults to True.
        include_uppercase (bool): Whether to include uppercase letters. Defaults to True.
        include_digits (bool): Whether to include digits. Defaults to True.
        include_symbols (bool): Whether to include symbols. Defaults to True.
    
    Returns:
        str: The generated password.
    
    Raises:
        ValueError: If all character set options are False, resulting in an empty character pool.
    """
    char_pool = ''
    if include_lowercase:
        char_pool += string.ascii_lowercase
    if include_uppercase:
        char_pool += string.ascii_uppercase
    if include_digits:
        char_pool += string.digits
    if include_symbols:
        char_pool += string.punctuation
    
    if not char_pool:
        raise ValueError("Cannot generate a password with an empty character set. "
                         "Please ensure at least one character type is included.")
    
    password = ''.join(secrets.choice(char_pool) for _ in range(length))
    return password

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate a secure random password.")
    parser.add_argument("--length", type=int, default=16, help="Length of the password.")
    parser.add_argument("--include_lowercase", type=parse_bool, default=True, help="Include lowercase letters.")
    parser.add_argument("--include_uppercase", type=parse_bool, default=True, help="Include uppercase letters.")
    parser.add_argument("--include_digits", type=parse_bool, default=True, help="Include digits.")
    parser.add_argument("--include_symbols", type=parse_bool, default=True, help="Include symbols.")
    
    args = parser.parse_args()
    
    try:
        new_password = generate_password(
            length=args.length,
            include_lowercase=args.include_lowercase,
            include_uppercase=args.include_uppercase,
            include_digits=args.include_digits,
            include_symbols=args.include_symbols
        )
        print(new_password)
    except ValueError as e:
        print(f"Error: {e}")
}