#!/bin/bash

# Add logger import to messages page
file="app/(main)/messages/page.tsx"

# Add logger import after other imports
sed -i '' '/^import { toast } from/a\
import { logger } from '\''@/lib/logger'\'';
' "$file"

# Replace all console.error with logger.error
sed -i '' "s/console\.error('\([^']*\)', error);/logger.error('\1', error, { component: 'page', action: 'service_call' });/g" "$file"
sed -i '' 's/console\.error("\([^"]*\)", error);/logger.error("\1", error, { component: "page", action: "service_call" });/g' "$file"

# Replace specific console.error patterns
sed -i '' "s/console\.error('Failed to \([^']*\):', \([^)]*\));/logger.error('Failed to \1', \2, { component: 'page', action: 'service_call' });/g" "$file"

echo "Fixed console statements in messages/page.tsx"
