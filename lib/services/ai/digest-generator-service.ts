/**
 * AI-Enhanced Daily Digest Generator Service
 * Uses Google Gemini to create personalized, conversational daily briefings
 * JARVIS-style assistant that provides context-aware insights
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import { logger } from '@/lib/logger';

// Types for digest data
export interface DigestEvent {
  id: string;
  title: string;
  start_time: string;
  end_time?: string;
  location?: string;
  all_day?: boolean;
}

export interface DigestTask {
  id: string;
  title: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string;
}

export interface DigestMeal {
  id: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  name: string;
}

export interface DigestReminder {
  id: string;
  title: string;
  reminder_time?: string;
}

export interface DigestInput {
  recipientName: string;
  date: string;
  dayOfWeek: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening';
  events: DigestEvent[];
  tasksDue: DigestTask[];
  overdueTasks: DigestTask[];
  meals: DigestMeal[];
  reminders: DigestReminder[];
  timezone: string;
}

export interface AIDigestOutput {
  narrativeIntro: string;
  closingMessage: string;
  aiGenerated: boolean;
}

// Zod schema for AI response validation
const AIDigestResponseSchema = z.object({
  narrativeIntro: z.string().min(50).max(1500),
  closingMessage: z.string().min(10).max(200),
});

// System prompt for JARVIS-style digest generation
const SYSTEM_PROMPT = `You are Rowan, a warm and helpful AI assistant for a family/household management app. Think of yourself like JARVIS from Iron Man, but for families instead of superheroes - friendly, personable, and genuinely helpful.

Your job is to create a personalized daily briefing email that feels like a trusted assistant catching someone up on their day.

PERSONALITY GUIDELINES:
- Be warm and conversational, not robotic or overly formal
- Show genuine awareness of the user's schedule and priorities
- Make helpful connections between items (e.g., "You have a grocery run before dinner prep")
- Add light, appropriate observations (e.g., "Looks like a busy morning, but your afternoon is clear")
- Be encouraging but not over-the-top or cheesy
- Never lecture or be preachy
- Keep it concise - this is a quick briefing, not an essay

CRITICAL RULES:
1. Return ONLY valid JSON matching the exact schema below
2. The narrativeIntro should be 2-4 short paragraphs that summarize the day ahead
3. Highlight urgent/overdue items naturally without being alarmist
4. If there's nothing scheduled, make it feel positive ("A clear day ahead!")
5. The closingMessage should be a brief, warm sign-off appropriate to time of day
6. Don't use excessive emojis - one or two at most, and only if natural
7. Reference specific items by name to show you've actually read the data

RESPONSE JSON SCHEMA:
{
  "narrativeIntro": string (2-4 paragraphs of conversational briefing),
  "closingMessage": string (brief warm sign-off like "Have a great day!" or "Enjoy your evening!")
}

Return ONLY the JSON object. No markdown, no explanations.`;

class DigestGeneratorService {
  private genAI: GoogleGenerativeAI | null = null;
  private model: ReturnType<GoogleGenerativeAI['getGenerativeModel']> | null = null;

  private getClient() {
    if (!this.genAI) {
      const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('GOOGLE_GEMINI_API_KEY environment variable is not set');
      }
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        generationConfig: {
          temperature: 0.7, // Higher temperature for more natural, varied responses
          topP: 0.9,
          maxOutputTokens: 2048,
        },
      });
    }
    return this.model!;
  }

  /**
   * Generate an AI-enhanced daily digest briefing
   */
  async generateDigest(
    input: DigestInput
  ): Promise<{ success: true; data: AIDigestOutput } | { success: false; error: string }> {
    try {
      const model = this.getClient();

      // Format the data for the AI
      const formattedData = this.formatDigestData(input);

      const prompt = `${SYSTEM_PROMPT}

CURRENT CONTEXT:
- Recipient: ${input.recipientName}
- Date: ${input.dayOfWeek}, ${input.date}
- Time of Day: ${input.timeOfDay}
- Timezone: ${input.timezone}

TODAY'S SCHEDULE DATA:
${formattedData}

Generate the daily briefing JSON:`;

      const result = await model.generateContent(prompt);
      const response = result.response;
      const responseText = response.text();

      // Clean the response - remove any markdown code blocks
      let cleanedResponse = responseText.trim();
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.slice(7);
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.slice(3);
      }
      if (cleanedResponse.endsWith('```')) {
        cleanedResponse = cleanedResponse.slice(0, -3);
      }
      cleanedResponse = cleanedResponse.trim();

      // Parse JSON
      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(cleanedResponse);
      } catch {
        logger.error('[DigestGenerator] Failed to parse JSON:', cleanedResponse, { component: 'lib-digest-generator-service', action: 'service_call' });
        return { success: false, error: 'AI response was not valid JSON' };
      }

      // Validate with Zod schema
      const validated = AIDigestResponseSchema.safeParse(parsedJson);
      if (!validated.success) {
        logger.error('[DigestGenerator] Validation failed:', undefined, { component: 'lib-digest-generator-service', action: 'service_call', details: validated.error.issues });
        return {
          success: false,
          error: `Invalid digest data: ${validated.error.issues.map((issue) => issue.message).join(', ')}`
        };
      }

      return {
        success: true,
        data: {
          ...validated.data,
          aiGenerated: true,
        }
      };
    } catch (error) {
      logger.error('[DigestGenerator] Error generating digest:', error, { component: 'lib-digest-generator-service', action: 'service_call' });

      if (error instanceof Error) {
        if (error.message.includes('API key')) {
          return { success: false, error: 'AI service configuration error' };
        }
        if (error.message.includes('quota') || error.message.includes('rate')) {
          return { success: false, error: 'AI service rate limit exceeded' };
        }
      }

      return { success: false, error: 'Failed to generate AI digest' };
    }
  }

  /**
   * Format digest data into a readable format for the AI
   */
  private formatDigestData(input: DigestInput): string {
    const sections: string[] = [];

    // Overdue tasks (urgent attention)
    if (input.overdueTasks.length > 0) {
      sections.push('⚠️ OVERDUE TASKS:');
      input.overdueTasks.forEach((task) => {
        sections.push(`  - "${task.title}" (Priority: ${task.priority}, Due: ${task.due_date || 'No date'})`);
      });
      sections.push('');
    }

    // Today's events (chronological)
    if (input.events.length > 0) {
      sections.push('📅 TODAY\'S EVENTS:');
      input.events.forEach((event) => {
        const time = event.all_day ? 'All Day' : this.formatTime(event.start_time);
        const location = event.location ? ` at ${event.location}` : '';
        sections.push(`  - ${time}: "${event.title}"${location}`);
      });
      sections.push('');
    }

    // Tasks due today
    if (input.tasksDue.length > 0) {
      sections.push('✅ TASKS DUE TODAY:');
      input.tasksDue.forEach((task) => {
        sections.push(`  - "${task.title}" (Priority: ${task.priority})`);
      });
      sections.push('');
    }

    // Today's meals
    if (input.meals.length > 0) {
      sections.push('🍽️ TODAY\'S MEALS:');
      input.meals.forEach((meal) => {
        const mealLabel = meal.meal_type.charAt(0).toUpperCase() + meal.meal_type.slice(1);
        sections.push(`  - ${mealLabel}: ${meal.name}`);
      });
      sections.push('');
    }

    // Reminders
    if (input.reminders.length > 0) {
      sections.push('⏰ REMINDERS:');
      input.reminders.forEach((reminder) => {
        const time = reminder.reminder_time ? ` at ${this.formatTime(reminder.reminder_time)}` : '';
        sections.push(`  - "${reminder.title}"${time}`);
      });
      sections.push('');
    }

    // If nothing is scheduled
    if (sections.length === 0) {
      sections.push('📭 NO ITEMS SCHEDULED');
      sections.push('  - Clear calendar');
      sections.push('  - No tasks due');
      sections.push('  - No meals planned');
      sections.push('  - No reminders set');
    }

    return sections.join('\n');
  }

  /**
   * Format time string to readable format
   */
  private formatTime(timeString: string): string {
    try {
      return new Date(timeString).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return timeString;
    }
  }

  /**
   * Generate a fallback digest when AI is unavailable
   */
  generateFallbackDigest(input: DigestInput): AIDigestOutput {
    const { recipientName, timeOfDay, events, tasksDue, overdueTasks, meals, reminders } = input;

    // Count items
    const totalItems = events.length + tasksDue.length + meals.length + reminders.length;
    const hasOverdue = overdueTasks.length > 0;

    // Build narrative intro
    let narrativeIntro = '';

    // Greeting based on time of day
    const greetings: Record<string, string> = {
      morning: `Good morning, ${recipientName}!`,
      afternoon: `Good afternoon, ${recipientName}!`,
      evening: `Good evening, ${recipientName}!`,
    };
    narrativeIntro += greetings[timeOfDay] + ' ';

    // Day overview
    if (totalItems === 0 && !hasOverdue) {
      narrativeIntro += "You have a clear day ahead with nothing on the schedule. Enjoy the breathing room!";
    } else {
      // Build summary
      const parts: string[] = [];
      if (events.length > 0) parts.push(`${events.length} event${events.length > 1 ? 's' : ''}`);
      if (tasksDue.length > 0) parts.push(`${tasksDue.length} task${tasksDue.length > 1 ? 's' : ''} due`);
      if (meals.length > 0) parts.push(`${meals.length} meal${meals.length > 1 ? 's' : ''} planned`);
      if (reminders.length > 0) parts.push(`${reminders.length} reminder${reminders.length > 1 ? 's' : ''}`);

      narrativeIntro += `Here's what's on your plate today: ${parts.join(', ')}.`;

      // Highlight overdue if present
      if (hasOverdue) {
        narrativeIntro += `\n\nHeads up: You have ${overdueTasks.length} overdue task${overdueTasks.length > 1 ? 's' : ''} that need${overdueTasks.length === 1 ? 's' : ''} attention.`;
      }

      // First event mention
      if (events.length > 0 && !events[0].all_day) {
        const firstEvent = events[0];
        const time = this.formatTime(firstEvent.start_time);
        narrativeIntro += `\n\nYour day starts with "${firstEvent.title}" at ${time}.`;
      }
    }

    // Closing message based on time
    const closings: Record<string, string> = {
      morning: 'Have a wonderful day!',
      afternoon: 'Have a great rest of your day!',
      evening: 'Have a relaxing evening!',
    };

    return {
      narrativeIntro,
      closingMessage: closings[timeOfDay],
      aiGenerated: false,
    };
  }
}

/** Singleton instance for generating AI-powered activity digest summaries. */
export const digestGeneratorService = new DigestGeneratorService();
