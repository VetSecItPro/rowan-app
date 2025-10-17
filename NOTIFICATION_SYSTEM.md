# Notification System Documentation

## Overview

The notification system allows users to control how they receive alerts for reminders, tasks, mentions, and comments across the Rowan app.

## Current Implementation Status

### ✅ Fully Implemented
- **Email Notifications**: Fully functional with database backend
- **Notification Preferences UI**: Complete settings page at `/settings/notifications`
- **Database Schema**: `user_notification_preferences` table with all fields
- **Service Layer**: `reminder-notifications-service.ts` handles all notification logic
- **Preference Categories**:
  - Task assignments
  - Due reminders (upcoming and overdue items)
  - @Mentions
  - Comments

### 🚧 Partially Implemented
- **Quiet Hours**: UI is complete and saves to database, but backend enforcement is not yet implemented
  - Users can set start/end times (e.g., 22:00 to 08:00)
  - Settings are stored in database
  - **Missing**: Actual notification suppression logic during quiet hours

### 🔜 Not Yet Implemented
- **Push Notifications**: UI exists but is disabled
  - Browser push notifications will require:
    - Service worker registration
    - Push subscription management
    - Web Push API integration
    - Notification permission handling
  - All push notification toggles are currently disabled in the UI

## Database Schema

### user_notification_preferences Table

```typescript
interface NotificationPreferences {
  id: string;
  user_id: string;
  space_id?: string;  // Allows per-space preferences

  // Email notifications
  email_enabled: boolean;
  email_due_reminders: boolean;
  email_assignments: boolean;
  email_mentions: boolean;
  email_comments: boolean;

  // In-app/Push notifications (for future use)
  in_app_enabled: boolean;
  in_app_due_reminders: boolean;
  in_app_assignments: boolean;
  in_app_mentions: boolean;
  in_app_comments: boolean;

  // Frequency and timing
  notification_frequency: 'instant' | 'hourly' | 'daily' | 'never';
  quiet_hours_enabled: boolean;
  quiet_hours_start?: string;  // Format: "HH:MM"
  quiet_hours_end?: string;    // Format: "HH:MM"

  created_at: string;
  updated_at: string;
}
```

## Notification Types

The system supports the following notification types:

1. **due**: Item is due now
2. **overdue**: Item is past due date
3. **assigned**: User was assigned to a task/reminder
4. **unassigned**: User was removed from a task/reminder
5. **mentioned**: User was @mentioned in a comment
6. **commented**: New comment on an item the user follows
7. **completed**: An item was marked as complete
8. **snoozed**: An item was snoozed

## Notification Channels

- **email**: Email notifications (functional)
- **in_app**: In-app notification center (functional)
- **push**: Browser push notifications (not yet implemented)

## Notification Frequency Options

Users can choose how often they want to receive notifications:

- **Instant**: Real-time notifications as events occur (default)
- **Hourly**: Digest email every hour with all notifications
- **Daily**: Daily summary of all notifications
- **Never**: Turn off all notifications

**Note**: Frequency batching for hourly/daily is not yet implemented. Currently all notifications are instant.

## Quiet Hours Implementation

### Current State

The quiet hours feature allows users to specify a time window where they don't want to receive notifications.

**What's working:**
- UI for enabling/disabling quiet hours
- Time picker for start and end times
- Settings are saved to database
- Settings sync across the app

**What's NOT working:**
- Notification suppression during quiet hours
- Notifications still send during quiet hours (they're just stored in the database)

### How It Should Work (When Fully Implemented)

1. User enables quiet hours and sets times (e.g., 22:00 to 08:00)
2. When a notification is about to be sent, the system checks:
   ```typescript
   const now = new Date();
   const currentTime = `${now.getHours()}:${now.getMinutes()}`;

   if (userPrefs.quiet_hours_enabled) {
     if (isTimeInRange(currentTime, userPrefs.quiet_hours_start, userPrefs.quiet_hours_end)) {
       // Defer notification or suppress email/push
       // Still store in notification center for later viewing
       return suppressNotification();
     }
   }
   ```
3. Notifications are still recorded in the `reminder_notifications` table
4. In-app notifications appear in the notification center
5. Email and push notifications are suppressed until quiet hours end

### Implementation TODO

To fully implement quiet hours:

1. Add time comparison logic to `reminderNotificationsService.createNotification()`
2. Check quiet hours before sending emails
3. Check quiet hours before sending push notifications
4. Handle timezone conversions properly
5. Consider storing pending notifications to send after quiet hours end (optional)

## Service Layer Functions

### reminderNotificationsService

Located in: `/lib/services/reminder-notifications-service.ts`

**Key methods:**
- `createNotification()` - Creates a new notification (checks preferences first)
- `getUserNotifications()` - Fetches notifications for a user
- `getUnreadCount()` - Gets count of unread notifications
- `markAsRead()` - Marks a single notification as read
- `markAllAsRead()` - Marks all notifications as read
- `getPreferences()` - Fetches user notification preferences
- `updatePreferences()` - Updates user notification preferences
- `formatNotificationMessage()` - Formats notification for display
- `getNotificationIcon()` - Returns icon name for notification type
- `getNotificationColor()` - Returns color class for notification type

## UI Components

### Settings Page

Location: `/app/(main)/settings/notifications/page.tsx`

Features:
- Email notification toggles with master switch
- Push notification toggles (disabled, shows "Coming soon" message)
- Notification frequency selector (radio buttons)
- Quiet hours toggle with time pickers
- Save button with loading states
- Success/error messages

### Toggle Component

Location: `/components/ui/Toggle.tsx`

A reusable toggle switch component with:
- Multiple sizes (sm, md, lg)
- Multiple colors (purple, blue, green, red)
- Disabled state support
- Optional label and description
- Dark mode support
- Smooth animations

## Backend Integration

### Database Function

The service uses a Postgres function `should_send_notification()` to determine if a notification should be sent:

```sql
CREATE FUNCTION should_send_notification(
  p_user_id UUID,
  p_space_id UUID,
  p_notification_type TEXT,
  p_channel TEXT
) RETURNS BOOLEAN
```

This function checks:
- User's notification preferences
- Whether notifications are enabled globally
- Whether the specific notification type is enabled
- Whether the channel (email/in-app/push) is enabled

## Future Enhancements

### High Priority
1. Implement quiet hours enforcement
2. Implement hourly/daily notification batching
3. Add push notification support with service workers
4. Add browser notification permission handling

### Medium Priority
5. Add per-feature notification controls (Tasks vs Reminders vs Messages vs Shopping)
6. Add notification sound preferences
7. Add digest email templates
8. Add notification history/archive

### Low Priority
9. Add notification preview/test feature
10. Add smart notification grouping
11. Add notification snoozing
12. Add do-not-disturb mode

## Testing Checklist

When testing notifications:

- [ ] Email notifications toggle on/off correctly
- [ ] Individual email notification types can be toggled
- [ ] Preferences save to database
- [ ] Preferences persist across page reloads
- [ ] Master toggle disables all sub-toggles
- [ ] Quiet hours times save correctly
- [ ] Notification frequency selection works
- [ ] Push notification toggles show as disabled
- [ ] "Coming soon" message displays for push notifications
- [ ] Success message appears after saving
- [ ] Loading states work during save operation

## Known Issues

1. **Duplicate toggles removed**: Previously had "Meal reminders" and "General reminders" toggles that used the same state variable as "Shopping lists". These have been removed as they didn't have corresponding database fields.

2. **Push notifications disabled**: Push notifications are disabled in the UI as the backend implementation is not complete.

3. **Quiet hours not enforced**: Quiet hours settings save but don't actually prevent notifications from being sent.

4. **Frequency batching not implemented**: Selecting "Hourly" or "Daily" frequency doesn't actually batch notifications - all notifications are still sent instantly.

## Privacy Considerations

- All notification preferences are user-specific and stored securely
- RLS (Row Level Security) policies ensure users can only access their own preferences
- No notification content is stored in third-party services
- Email notifications use the user's verified email address
- Users have full control over what notifications they receive

## Related Files

- `/lib/services/reminder-notifications-service.ts` - Main service layer
- `/app/(main)/settings/notifications/page.tsx` - Settings UI
- `/components/ui/Toggle.tsx` - Toggle switch component
- `/supabase/migrations/*_create_notification_tables.sql` - Database schema
