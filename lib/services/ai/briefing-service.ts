/**
 * AI Briefing Service — Morning briefing generator
 *
 * Reuses the digest-generator-service pipeline (Gemini Flash + Zod + fallback)
 * to create a morning briefing that displays as the first message in the chat.
 *
 * Flow:
 * 1. Assembles context from ai-context-service
 * 2. Maps to DigestInput format
 * 3. Calls digestGeneratorService.generateDigest()
 * 4. Transforms output to chat-friendly BriefingOutput
 */

import { format } from 'date-fns';
import { logger } from '@/lib/logger';
import { aiContextService } from './ai-context-service';
import { digestGeneratorService } from './digest-generator-service';
import type { DigestInput, DigestEvent, DigestTask } from './digest-generator-service';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface BriefingOutput {
  greeting: string;
  briefingText: string;
  highlights: string[];
  aiGenerated: boolean;
}

function getTimeOfDay(): 'morning' | 'afternoon' | 'evening' {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

class BriefingService {
  /**
   * Generate a morning briefing for the user
   */
  async generateBriefing(
    supabase: SupabaseClient,
    spaceId: string,
    user: { id: string; email?: string; user_metadata?: { name?: string } }
  ): Promise<BriefingOutput> {
    try {
      const context = await aiContextService.buildFullContext(supabase, spaceId, user);
      const summary = context.summary;
      const activity = context.recentActivity;

      const now = new Date();
      const userName = context.userName;
      const timeOfDay = getTimeOfDay();

      // Map upcoming events to DigestEvent format
      const events: DigestEvent[] = (summary?.upcomingEvents ?? [])
        .slice(0, 5)
        .map((e, i) => ({
          id: `event-${i}`,
          title: e.title,
          start_time: e.startTime,
        }));

      // Fetch tasks due today for the briefing
      const today = now.toISOString().split('T')[0];
      const { data: tasksDueData } = await supabase
        .from('tasks')
        .select('id, title, priority, due_date')
        .eq('space_id', spaceId)
        .eq('due_date', today)
        .in('status', ['pending', 'in_progress'])
        .limit(10);

      const tasksDue: DigestTask[] = (tasksDueData ?? []).map((t) => ({
        id: t.id,
        title: t.title,
        priority: t.priority ?? 'normal',
        due_date: t.due_date,
      }));

      // Fetch overdue tasks
      const { data: overdueData } = await supabase
        .from('tasks')
        .select('id, title, priority, due_date')
        .eq('space_id', spaceId)
        .in('status', ['pending', 'in_progress'])
        .lt('due_date', today)
        .limit(5);

      const overdueTasks: DigestTask[] = (overdueData ?? []).map((t) => ({
        id: t.id,
        title: t.title,
        priority: t.priority ?? 'normal',
        due_date: t.due_date,
      }));

      // Build digest input
      const digestInput: DigestInput = {
        recipientName: userName,
        date: format(now, 'MMMM d, yyyy'),
        dayOfWeek: format(now, 'EEEE'),
        timeOfDay,
        events,
        tasksDue,
        overdueTasks,
        meals: [], // Could be expanded with meal plan data
        reminders: [],
        timezone: context.timezone,
      };

      // Generate digest
      const result = await digestGeneratorService.generateDigest(digestInput);

      if (result.success) {
        // Extract highlights from context
        const highlights: string[] = [];
        if (summary) {
          if (summary.taskCounts.dueToday > 0) {
            highlights.push(`${summary.taskCounts.dueToday} task${summary.taskCounts.dueToday > 1 ? 's' : ''} due today`);
          }
          if (summary.taskCounts.overdue > 0) {
            highlights.push(`${summary.taskCounts.overdue} overdue`);
          }
          if (events.length > 0) {
            highlights.push(`${events.length} event${events.length > 1 ? 's' : ''} coming up`);
          }
          if (activity && activity.completedTasks.length > 0) {
            highlights.push(`${activity.completedTasks.length} completed yesterday`);
          }
        }

        return {
          greeting: `Good ${timeOfDay}, ${userName}!`,
          briefingText: result.data.narrativeIntro,
          highlights,
          aiGenerated: true,
        };
      }

      // Fallback to non-AI briefing
      const fallback = digestGeneratorService.generateFallbackDigest(digestInput);
      return {
        greeting: `Good ${timeOfDay}, ${userName}!`,
        briefingText: fallback.narrativeIntro,
        highlights: [],
        aiGenerated: false,
      };
    } catch (error) {
      logger.error('[BriefingService] Failed to generate briefing', error, {
        component: 'briefing-service',
        action: 'generate_briefing',
      });

      const userName =
        user.user_metadata?.name || user.email?.split('@')[0] || 'there';
      const timeOfDay = getTimeOfDay();

      return {
        greeting: `Good ${timeOfDay}, ${userName}!`,
        briefingText: "Here's a quick look at your day. Check your tasks and calendar for what's coming up!",
        highlights: [],
        aiGenerated: false,
      };
    }
  }
}

export const briefingService = new BriefingService();
