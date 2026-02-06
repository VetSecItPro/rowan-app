# Beta Access Expiration System

## Overview
Implements time-limited beta access with individual user expiration dates and a global program end date.

## Key Features

### 1. Database Schema (`20251202200000_add_beta_expiration.sql`)
- **New Columns**:
  - `access_granted_at`: Timestamp when beta access was granted
  - `access_expires_at`: Individual user expiration date
  - `days_granted`: Number of days granted (default: 30)

### 2. Global Program End Date
- **Hard deadline**: December 31, 2025 at 8:00 PM Central Time
- **Applies to**: All beta users regardless of individual expiration

### 3. Database Functions

#### `is_beta_access_valid(user_email TEXT)`
Checks if a user's beta access is still valid by:
1. Verifying beta access was granted
2. Checking against program end date (Dec 31, 2025 8PM CT)
3. Checking individual expiration date
4. Returns `true` if valid, `false` if expired

#### `extend_beta_access(request_id UUID, additional_days INTEGER)`
Allows admins to extend beta access for individual users:
- Adds days to current expiration
- Cannot extend beyond program end date
- Returns JSON with success status and new expiry date

### 4. Admin View: `admin_beta_users_status`
Provides comprehensive beta user status including:
- Days remaining until expiration
- Status: `pending`, `active`, `expiring_soon`, `expired`, `program_ended`
- User information and dates

### 5. Middleware Protection
- Automatically checks beta expiration on every request to protected routes
- Logs out users with expired access
- Redirects to `/beta-expired` page

### 6. Beta Expired Page
Professional landing page explaining:
- Beta program has ended
- Next steps for users
- Links to homepage and waitlist

## Usage

### For Admins

**View Beta Status**:
```sql
SELECT * FROM admin_beta_users_status;
```

**Extend Beta Access (add 15 days)**:
```sql
SELECT extend_beta_access('request-uuid-here', 15);
```

**Check if User Has Valid Access**:
```sql
SELECT is_beta_access_valid('user@example.com');
```

### For Developers

**Default Behavior**:
- New beta users get 30 days from grant date
- All access expires Dec 31, 2025 8PM CT (whichever comes first)

**Extending Access**:
Use the `extend_beta_access` function via admin API

## Timeline

| Event | Date | Action |
|-------|------|--------|
| Beta User Added | Any date | Gets 30 days or until program end |
| 7 Days Before Expiry | Auto | Status changes to `expiring_soon` |
| Individual Expiry | Varies | User loses access |
| Program End | Dec 31, 2025 8PM CT | ALL beta access ends |

## Migration Notes

- Existing beta users are automatically migrated with 30-day expiration from their grant date
- If `access_granted_at` is missing, uses `created_at` as fallback
- All dates stored as `TIMESTAMPTZ` for timezone accuracy

## Security

- Beta validation runs in middleware (every protected route request)
- Uses Supabase RPC for secure serverside validation
- Automatic sign-out on expiration
- No client-side bypass possible

## Testing

**Test expired access**:
1. Manually set `access_expires_at` to past date in database
2. Try to access protected route
3. Should redirect to `/beta-expired`

**Test program end**:
1. Temporarily change program end date in migration to near future
2. Wait for time to pass
3. All beta users should be locked out

## Future Enhancements

- Email notifications (7 days, 3 days, 1 day before expiry)
- Admin dashboard UI for extending access
- Bulk extend operations
- Export list of expiring users
- Automatic waitlist enrollment on expiry
