#!/bin/bash

# Fix all logger.warn/info calls with 3 arguments to proper 2-argument signature
# Pattern: logger.warn('message', error, { component: 'X' }) 
# Becomes: logger.warn('message', { component: 'X', error })

npx tsc --noEmit --skipLibCheck 2>&1 | grep -E "error TS2554.*Expected 1-2 arguments" | grep -oE "^[^(]+" | sort -u | while read -r file; do
  if [ -f "$file" ]; then
    echo "Processing: $file"
    
    # Pattern 1: logger.warn('message', error, { component: 'X' })
    perl -i -pe 's/logger\.(warn|info)\(([^,]+),\s*error,\s*\{\s*component:\s*([^}]+)\s*\}\)/logger.$1($2, { component: $3, error })/g' "$file"
    
    # Pattern 2: logger.warn('message:', error, { component: 'X' })
    perl -i -pe 's/logger\.(warn|info)\(([^,]+):,\s*error,\s*\{\s*component:\s*([^}]+)\s*\}\)/logger.$1($2, { component: $3, error })/g' "$file"
    
    # Pattern 3: Other data variable names
    perl -i -pe 's/logger\.(warn|info)\(([^,]+),\s*([a-zA-Z_][a-zA-Z0-9_]*),\s*\{\s*component:\s*([^}]+)\s*\}\)/logger.$1($2, { component: $4, data: $3 })/g' "$file"
  fi
done

echo "Done! Rerun TypeScript check to verify."
