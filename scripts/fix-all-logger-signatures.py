#!/usr/bin/env python3
import re
import sys

# Read file path from arguments
file_path = sys.argv[1] if len(sys.argv) > 1 else None
if not file_path:
    print("Usage: python3 fix-all-logger-signatures.py <file>")
    sys.exit(1)

# Read the file
with open(file_path, 'r') as f:
    content = f.read()

# Pattern: logger.warn('message', variable, { metadata })
# Replace with: logger.warn('message', { metadata, error: variable })

# Pattern 1: logger.warn/info with trailing colon in message
pattern1 = r'logger\.(warn|info)\(([^,]+):,\s*error,\s*(\{[^}]+\})\)'
replacement1 = r'logger.\1(\2, { ...\3, error })'

# Pattern 2: logger.warn/info without trailing colon
pattern2 = r'logger\.(warn|info)\(([^,]+),\s*error,\s*(\{[^}]+\})\)'  
replacement2 = r'logger.\1(\2, { ...\3, error })'

# Actually, let me use a simpler approach - just move error inside
# Pattern: logger.X('msg', error, { component: 'Y' })
# Becomes: logger.X('msg', { component: 'Y', error })

pattern = r'logger\.(warn|info)\(([^,]+),\s*error,\s*\{\s*component:\s*([^}]+)\s*\}\)'
replacement = r'logger.\1(\2, { component: \3, error })'

content_fixed = re.sub(pattern, replacement, content)

# Write back
with open(file_path, 'w') as f:
    f.write(content_fixed)

print(f"Fixed: {file_path}")
