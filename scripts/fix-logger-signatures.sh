#!/bin/bash

# Fix logger.warn/info calls with 3 arguments to use proper 2-argument signature
# Pattern: logger.warn('MESSAGE', data, { component: 'X' }) -> logger.warn('MESSAGE', { component: 'X', data })

files=(
  "app/api/calendar/parse-event/route.ts"
  "components/cookies/CookieConsentBanner.tsx"
  "components/goals/CheckInReactions.tsx"
  "components/notifications/NotificationBell.tsx"
  "hooks/useChoreRealtime.ts"
  "hooks/useRemindersRealtime.ts"
  "hooks/useTaskRealtime.ts"
  "lib/hooks/useUnifiedCalendar.ts"
  "lib/services/admin-cache-service.ts"
  "lib/services/calendar/ics-import-service.ts"
  "lib/services/chores-service.ts"
  "lib/services/file-upload-service.ts"
  "lib/services/milestone-notification-service.ts"
  "lib/services/space-export-service.ts"
  "lib/services/weather-cache-service.ts"
  "lib/services/weather-service.ts"
  "lib/utils/haptics.ts"
  "lib/utils/monetization-logger.ts"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "Processing: $file"
    # Backup file
    cp "$file" "$file.bak"
  fi
done

echo "Files backed up. Ready for manual fixes."
