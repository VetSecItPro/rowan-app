#!/bin/bash

# Get all files with logger signature errors
files=$(npx tsc --noEmit --skipLibCheck 2>&1 | grep "error TS2554.*Expected 1-2 arguments" | cut -d'(' -f1 | sort -u)

for file in $files; do
  if [ -f "$file" ]; then
    echo "Fixing: $file"
    
    # Fix pattern: logger.warn/info('message:', variable, { component: 'X' })
    # To: logger.warn/info('message', { component: 'X', error: variable })
    
    sed -i '' -E \
      -e "s/logger\\.(warn|info)\\(([^,]+):, (error|[a-zA-Z_][a-zA-Z0-9_]*), \\{ component: ([^}]+) \\}\\)/logger.\\1(\\2, { component: \\4, error: \\3 })/g" \
      -e "s/logger\\.(warn|info)\\(([^,]+), (error|[a-zA-Z_][a-zA-Z0-9_]*), \\{ component: ([^}]+) \\}\\)/logger.\\1(\\2, { component: \\4, error: \\3 })/g" \
      "$file"
  fi
done

echo "Done! Check with: npx tsc --noEmit --skipLibCheck"
