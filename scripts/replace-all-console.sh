#!/bin/bash

# Comprehensive console.log/error/warn/info replacement script

files=(
  "app/api/shopping/generate-from-meals/route.ts"
  "app/api/cron/calendar-sync/route.ts"
  "app/(main)/tasks/page.tsx"
  "app/(main)/messages/page.tsx"
  "lib/contexts/subscription-context.tsx"
  "lib/constants/feature-flags.ts"
  "lib/utils/error-alerting.ts"
  "lib/utils/secure-error-handling.ts"
  "lib/jobs/task-reminders-job.ts"
  "lib/jobs/reminder-notifications-job.ts"
  "lib/jobs/chore-rotation-job.ts"
  "lib/jobs/cleanup-jobs.ts"
  "lib/jobs/task-recurrence-job.ts"
  "lib/jobs/goal-checkin-notifications-job.ts"
  "lib/services/recurring-goals-service.ts"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "Processing: $file"
    
    # Add logger import if not present (after other imports, before first function/export)
    if ! grep -q "import { logger }" "$file"; then
      # Find the last import line
      last_import=$(grep -n "^import" "$file" | tail -1 | cut -d: -f1)
      if [ -n "$last_import" ]; then
        sed -i '' "${last_import}a\\
import { logger } from '@/lib/logger';
" "$file"
      fi
    fi
  fi
done

echo "Logger imports added. Now run manual replacements..."
