import { sendAIDailyDigestEmail, AIDailyDigestData, DailyDigestData } from '@/lib/services/email-service';
import { digestGeneratorService, DigestInput } from '@/lib/services/ai/digest-generator-service';
import { logger } from '@/lib/logger';
import { supabaseAdmin } from '@/lib/supabase/admin';

// SECURITY: Runtime check to prevent accidental client-side import
// This job uses the service role key and must only run on the server
if (typeof window !== 'undefined') {
  throw new Error(
    'SECURITY ERROR: daily-digest-job.ts cannot be used on the client side. ' +
    'This module uses the service role key and must only run on the server.'
  );
}

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

    // PERFORMANCE: Filter users who should receive digest now first
    const usersToProcess = (digestPreferences as UserDigestPreference[]).filter(
      (pref) => shouldSendDigest(pref.digest_time, pref.digest_timezone, now)
    );

    if (usersToProcess.length === 0) {
      logger.info('No users due for digest at this time', {
        component: 'DailyDigestJob',
        action: 'filter_users',
      });
      return result;
    }

    logger.info(`${usersToProcess.length} users due for digest now`, {
      component: 'DailyDigestJob',
      action: 'filter_users',
    });

    // PERFORMANCE: Batch fetch all profiles at once instead of N queries
    const userIds = usersToProcess.map((p) => p.user_id);
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, name')
      .in('id', userIds);

    if (profilesError) {
      throw new Error(`Failed to batch fetch profiles: ${profilesError.message}`);
    }

    // Create lookup map for profiles
    const profileMap = new Map<string, UserProfile>();
    (profiles || []).forEach((p) => {
      profileMap.set(p.id, p as UserProfile);
    });

    // PERFORMANCE: Batch fetch all space memberships at once instead of N queries
    const { data: spaceMemberships, error: membershipsError } = await supabaseAdmin
      .from('space_members')
      .select('user_id, space_id, spaces(id, name)')
      .in('user_id', userIds);

    if (membershipsError) {
      throw new Error(`Failed to batch fetch space memberships: ${membershipsError.message}`);
    }

    // Create lookup map for space memberships (first space per user)
    const spaceMembershipMap = new Map<string, SpaceMember>();
    (spaceMemberships || []).forEach((sm) => {
      // Only keep the first space for each user
      if (!spaceMembershipMap.has(sm.user_id)) {
        spaceMembershipMap.set(sm.user_id, sm as unknown as SpaceMember);
      }
    });

    // PERFORMANCE: Process users in parallel batches of 5 to balance throughput vs rate limiting
    const BATCH_SIZE = 5;
    for (let i = 0; i < usersToProcess.length; i += BATCH_SIZE) {
      const batch = usersToProcess.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (pref) => {
          try {
            result.usersProcessed++;

            const profile = profileMap.get(pref.user_id);
            if (!profile) {
              result.errors.push(`Failed to get profile for user ${pref.user_id}`);
              return;
            }

            const spaceMembership = spaceMembershipMap.get(pref.user_id);
            if (!spaceMembership) {
              // User might not have a space yet
              return;
            }

            const spaceId = spaceMembership.spaces.id;
            const spaceName = spaceMembership.spaces.name;

            // Fetch today's data for the user
            const digestData = await fetchDigestData(pref.user_id, spaceId, pref.digest_timezone);

            // Determine time of day for AI context
            const timeOfDay = getTimeOfDay(pref.digest_time);
            const dayOfWeek = new Intl.DateTimeFormat('en-US', {
              weekday: 'long',
              timeZone: pref.digest_timezone || 'America/Chicago',
            }).format(now);

            // Format the date for the email
            const dateFormatter = new Intl.DateTimeFormat('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
              timeZone: pref.digest_timezone || 'America/Chicago',
            });
            const formattedDate = dateFormatter.format(now);

            // Prepare AI input
            const aiInput: DigestInput = {
              recipientName: profile.name || 'there',
              date: formattedDate,
              dayOfWeek,
              timeOfDay,
              events: digestData.events,
              tasksDue: digestData.tasksDue,
              overdueTasks: digestData.overdueTasks,
              meals: digestData.meals,
              reminders: digestData.reminders,
              timezone: pref.digest_timezone || 'America/Chicago',
            };

            // Generate AI content with fallback
            let aiContent;
            const aiResult = await digestGeneratorService.generateDigest(aiInput);

            if (aiResult.success) {
              aiContent = aiResult.data;
              logger.info('AI digest generated successfully', {
                component: 'DailyDigestJob',
                action: 'ai_generate',
                userId: pref.user_id,
                aiGenerated: true,
              });
            } else {
              // Fallback to template-based content
              aiContent = digestGeneratorService.generateFallbackDigest(aiInput);
              logger.warn('AI digest failed, using fallback', {
                component: 'DailyDigestJob',
                action: 'ai_fallback',
                userId: pref.user_id,
                error: aiResult.error,
              });
            }

            // Send the email with AI content
            const emailData: AIDailyDigestData = {
              recipientEmail: profile.email,
              recipientName: profile.name || 'there',
              date: formattedDate,
              spaceName,
              spaceId,
              events: digestData.events,
              tasksDue: digestData.tasksDue,
              overdueTasks: digestData.overdueTasks,
              meals: digestData.meals,
              reminders: digestData.reminders,
              narrativeIntro: aiContent.narrativeIntro,
              closingMessage: aiContent.closingMessage,
              aiGenerated: aiContent.aiGenerated,
            };

            const emailResult = await sendAIDailyDigestEmail(emailData);

            if (emailResult.success) {
              result.emailsSent++;
              logger.info(`Daily digest sent to ${profile.email}`, {
                component: 'DailyDigestJob',
                action: 'send_email',
                userId: pref.user_id,
              });
            } else {
              result.errors.push(`Failed to send email to ${profile.email}: ${emailResult.error}`);
            }
          } catch (userError) {
            result.errors.push(`Error processing user ${pref.user_id}: ${userError instanceof Error ? userError.message : 'Unknown error'}`);
          }
        })
      );

      // Small delay between batches to avoid rate limiting
      if (i + BATCH_SIZE < usersToProcess.length) {
        await new Promise((resolve) => setTimeout(resolve, 200));
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
    const [hours] = digestTime.split(':').map(Number);

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
 * Get time of day based on digest time
 */
function getTimeOfDay(digestTime: string): 'morning' | 'afternoon' | 'evening' {
  try {
    const [hours] = digestTime.split(':').map(Number);
    if (hours < 12) return 'morning';
    if (hours < 17) return 'afternoon';
    return 'evening';
  } catch {
    return 'morning';
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
