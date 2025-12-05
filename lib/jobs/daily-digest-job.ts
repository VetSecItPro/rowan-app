import { createClient } from '@supabase/supabase-js';
import { sendDailyDigestEmail, DailyDigestData } from '@/lib/services/email-service';
import { logger } from '@/lib/logger';

// Create admin Supabase client for server-side operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

interface DigestResult {
  success: boolean;
  emailsSent: number;
  errors: string[];
  usersProcessed: number;
}

interface UserDigestPreference {
  user_id: string;
  digest_enabled: boolean;
  digest_time: string;
  digest_timezone: string;
}

interface UserProfile {
  id: string;
  email: string;
  name: string;
}

interface SpaceMember {
  space_id: string;
  spaces: {
    id: string;
    name: string;
  };
}

/**
 * Process daily digest emails for users who have enabled the feature
 * This job runs every hour and checks if users have their digest_time matching the current hour
 */
export async function processDailyDigest(): Promise<DigestResult> {
  const result: DigestResult = {
    success: true,
    emailsSent: 0,
    errors: [],
    usersProcessed: 0,
  };

  try {
    // Get current hour in UTC
    const now = new Date();
    const currentHour = now.getUTCHours();
    const currentMinute = now.getUTCMinutes();

    logger.info('Starting daily digest job', {
      component: 'DailyDigestJob',
      action: 'start',
      currentHour,
      currentMinute,
    });

    // Get users with digest enabled
    // We'll filter by digest_time matching the current hour
    const { data: digestPreferences, error: prefsError } = await supabaseAdmin
      .from('user_notification_preferences')
      .select('user_id, digest_enabled, digest_time, digest_timezone')
      .eq('digest_enabled', true);

    if (prefsError) {
      throw new Error(`Failed to fetch digest preferences: ${prefsError.message}`);
    }

    if (!digestPreferences || digestPreferences.length === 0) {
      logger.info('No users with digest enabled', {
        component: 'DailyDigestJob',
        action: 'check_users',
      });
      return result;
    }

    logger.info(`Found ${digestPreferences.length} users with digest enabled`, {
      component: 'DailyDigestJob',
      action: 'check_users',
    });

    // Process each user
    for (const pref of digestPreferences as UserDigestPreference[]) {
      try {
        // Check if it's time to send this user's digest
        // The digest_time is stored as HH:MM:SS in their local timezone
        // We need to convert to UTC and check if it matches
        if (!shouldSendDigest(pref.digest_time, pref.digest_timezone, now)) {
          continue;
        }

        result.usersProcessed++;

        // Get user profile
        const { data: profile, error: profileError } = await supabaseAdmin
          .from('profiles')
          .select('id, email, name')
          .eq('id', pref.user_id)
          .single();

        if (profileError || !profile) {
          result.errors.push(`Failed to get profile for user ${pref.user_id}`);
          continue;
        }

        // Get user's primary space (first space they're a member of)
        const { data: spaceMembership, error: spaceError } = await supabaseAdmin
          .from('space_members')
          .select('space_id, spaces(id, name)')
          .eq('user_id', pref.user_id)
          .limit(1)
          .single();

        if (spaceError || !spaceMembership) {
          // User might not have a space yet
          continue;
        }

        const spaceId = (spaceMembership as unknown as SpaceMember).spaces.id;
        const spaceName = (spaceMembership as unknown as SpaceMember).spaces.name;

        // Fetch today's data for the user
        const digestData = await fetchDigestData(pref.user_id, spaceId, pref.digest_timezone);

        // Determine greeting based on time of day in user's timezone
        const greeting = getGreeting(pref.digest_time);

        // Format the date for the email
        const dateFormatter = new Intl.DateTimeFormat('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
          timeZone: pref.digest_timezone || 'America/Chicago',
        });
        const formattedDate = dateFormatter.format(now);

        // Send the email
        const emailData: DailyDigestData = {
          recipientEmail: (profile as UserProfile).email,
          recipientName: (profile as UserProfile).name || 'there',
          date: formattedDate,
          spaceName,
          spaceId,
          events: digestData.events,
          tasksDue: digestData.tasksDue,
          overdueTasks: digestData.overdueTasks,
          meals: digestData.meals,
          reminders: digestData.reminders,
          greeting,
        };

        const emailResult = await sendDailyDigestEmail(emailData);

        if (emailResult.success) {
          result.emailsSent++;
          logger.info(`Daily digest sent to ${(profile as UserProfile).email}`, {
            component: 'DailyDigestJob',
            action: 'send_email',
            userId: pref.user_id,
          });
        } else {
          result.errors.push(`Failed to send email to ${(profile as UserProfile).email}: ${emailResult.error}`);
        }

        // Small delay between emails to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (userError) {
        result.errors.push(`Error processing user ${pref.user_id}: ${userError instanceof Error ? userError.message : 'Unknown error'}`);
      }
    }

    logger.info('Daily digest job completed', {
      component: 'DailyDigestJob',
      action: 'complete',
      emailsSent: result.emailsSent,
      usersProcessed: result.usersProcessed,
      errorCount: result.errors.length,
    });

    return result;
  } catch (error) {
    result.success = false;
    result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    logger.error('Daily digest job failed', error, {
      component: 'DailyDigestJob',
      action: 'error',
    });
    return result;
  }
}

/**
 * Check if we should send the digest to this user based on their preferences
 */
function shouldSendDigest(digestTime: string, timezone: string, now: Date): boolean {
  try {
    // Parse the digest_time (format: HH:MM:SS)
    const [hours, minutes] = digestTime.split(':').map(Number);

    // Get the current time in the user's timezone
    const userTimeFormatter = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
      timeZone: timezone || 'America/Chicago',
    });

    const userTimeStr = userTimeFormatter.format(now);
    const [userHour, userMinute] = userTimeStr.split(':').map(Number);

    // Check if we're within the digest window (same hour, within first 15 minutes)
    // This accounts for the cron job running every hour
    return userHour === hours && userMinute >= 0 && userMinute < 15;
  } catch {
    // Default to not sending if there's an error parsing
    return false;
  }
}

/**
 * Get greeting based on time of day
 */
function getGreeting(digestTime: string): string {
  try {
    const [hours] = digestTime.split(':').map(Number);
    if (hours < 12) return 'Good morning';
    if (hours < 17) return 'Good afternoon';
    return 'Good evening';
  } catch {
    return 'Hello';
  }
}

/**
 * Fetch all the data needed for the digest email
 */
async function fetchDigestData(
  userId: string,
  spaceId: string,
  timezone: string
): Promise<{
  events: DailyDigestData['events'];
  tasksDue: DailyDigestData['tasksDue'];
  overdueTasks: DailyDigestData['overdueTasks'];
  meals: DailyDigestData['meals'];
  reminders: DailyDigestData['reminders'];
}> {
  const tz = timezone || 'America/Chicago';
  const now = new Date();

  // Get today's date boundaries in user's timezone
  const todayStart = new Date(
    now.toLocaleString('en-US', { timeZone: tz }).split(',')[0]
  );
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date(todayStart);
  todayEnd.setHours(23, 59, 59, 999);

  // Fetch today's events
  const { data: events } = await supabaseAdmin
    .from('calendar_events')
    .select('id, title, start_time, end_time, location, all_day')
    .eq('space_id', spaceId)
    .gte('start_time', todayStart.toISOString())
    .lte('start_time', todayEnd.toISOString())
    .order('start_time', { ascending: true })
    .limit(10);

  // Fetch tasks due today
  const { data: tasksDue } = await supabaseAdmin
    .from('tasks')
    .select('id, title, priority, due_date')
    .eq('space_id', spaceId)
    .eq('status', 'pending')
    .gte('due_date', todayStart.toISOString().split('T')[0])
    .lte('due_date', todayEnd.toISOString().split('T')[0])
    .order('priority', { ascending: false })
    .limit(10);

  // Fetch overdue tasks
  const { data: overdueTasks } = await supabaseAdmin
    .from('tasks')
    .select('id, title, priority, due_date')
    .eq('space_id', spaceId)
    .eq('status', 'pending')
    .lt('due_date', todayStart.toISOString().split('T')[0])
    .order('due_date', { ascending: true })
    .limit(10);

  // Fetch today's meals
  const { data: meals } = await supabaseAdmin
    .from('meal_entries')
    .select('id, meal_type, recipe_name')
    .eq('space_id', spaceId)
    .eq('scheduled_date', todayStart.toISOString().split('T')[0])
    .order('meal_type', { ascending: true });

  // Fetch reminders due today
  const { data: reminders } = await supabaseAdmin
    .from('reminders')
    .select('id, title, reminder_time')
    .eq('space_id', spaceId)
    .eq('is_complete', false)
    .gte('reminder_time', todayStart.toISOString())
    .lte('reminder_time', todayEnd.toISOString())
    .order('reminder_time', { ascending: true })
    .limit(10);

  return {
    events: (events || []).map((e) => ({
      id: e.id,
      title: e.title,
      start_time: e.start_time,
      end_time: e.end_time,
      location: e.location,
      all_day: e.all_day,
    })),
    tasksDue: (tasksDue || []).map((t) => ({
      id: t.id,
      title: t.title,
      priority: t.priority as 'low' | 'normal' | 'high' | 'urgent',
      due_date: t.due_date,
    })),
    overdueTasks: (overdueTasks || []).map((t) => ({
      id: t.id,
      title: t.title,
      priority: t.priority as 'low' | 'normal' | 'high' | 'urgent',
      due_date: t.due_date,
    })),
    meals: (meals || []).map((m) => ({
      id: m.id,
      meal_type: m.meal_type as 'breakfast' | 'lunch' | 'dinner' | 'snack',
      recipe_name: m.recipe_name,
    })),
    reminders: (reminders || []).map((r) => ({
      id: r.id,
      title: r.title,
      reminder_time: r.reminder_time,
    })),
  };
}
