import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '@/lib/logger';

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export interface DigestData {
  userId: string;
  userName: string;
  userEmail: string;
  timezone: string;
  tasks: Array<{
    id: string;
    title: string;
    description?: string;
    due_date: string;
    priority: 'low' | 'normal' | 'high' | 'urgent';
    is_overdue: boolean;
  }>;
  events: Array<{
    id: string;
    title: string;
    description?: string;
    start_time: string;
    end_time: string;
    location?: string;
  }>;
  shopping: Array<{
    id: string;
    name: string;
    items_count: number;
    pending_items: number;
  }>;
  meals: Array<{
    id: string;
    name: string;
    meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    prep_time?: string;
    cook_time?: string;
  }>;
  overdue: Array<{
    id: string;
    title: string;
    type: 'task' | 'event' | 'reminder';
    days_overdue: number;
  }>;
}

export interface DigestEmailContent {
  subject: string;
  htmlContent: string;
  textContent: string;
}

export interface BatchDigestRequest {
  users: DigestData[];
}

export interface BatchDigestResponse {
  digests: Array<{
    userId: string;
    email: DigestEmailContent;
  }>;
}

/**
 * Gemini service for generating daily digest emails
 */
export const geminiService = {
  /**
   * Generate a single daily digest email using Gemini
   */
  async generateDigest(userData: DigestData): Promise<DigestEmailContent> {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const prompt = this.buildDigestPrompt(userData);

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const generatedContent = response.text();

      // Parse the generated content
      const parsed = this.parseGeneratedDigest(generatedContent, userData.userName);

      return parsed;
    } catch (error) {
      logger.error('Error generating digest with Gemini:', error, { component: 'lib-gemini-service', action: 'service_call' });

      // Fallback to template-based digest
      return this.generateFallbackDigest(userData);
    }
  },

  /**
   * Generate multiple digests in batch (50% cost savings)
   */
  async generateBatchDigests(batchRequest: BatchDigestRequest): Promise<BatchDigestResponse> {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      // Build batch prompts
      const batchPrompts = batchRequest.users.map(userData => ({
        userId: userData.userId,
        prompt: this.buildDigestPrompt(userData)
      }));

      // Process in smaller batches to avoid API limits
      const batchSize = 10;
      const results: Array<{ userId: string; email: DigestEmailContent }> = [];

      for (let i = 0; i < batchPrompts.length; i += batchSize) {
        const batch = batchPrompts.slice(i, i + batchSize);

        const batchResults = await Promise.all(
          batch.map(async ({ userId, prompt }) => {
            try {
              const result = await model.generateContent(prompt);
              const response = await result.response;
              const generatedContent = response.text();

              const userData = batchRequest.users.find(u => u.userId === userId)!;
              const parsed = this.parseGeneratedDigest(generatedContent, userData.userName);

              return { userId, email: parsed };
            } catch (error) {
              logger.error('Error generating digest for user ${userId}:', error, { component: 'lib-gemini-service', action: 'service_call' });

              const userData = batchRequest.users.find(u => u.userId === userId)!;
              const fallback = this.generateFallbackDigest(userData);

              return { userId, email: fallback };
            }
          })
        );

        results.push(...batchResults);

        // Small delay between batches to respect rate limits
        if (i + batchSize < batchPrompts.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      return { digests: results };
    } catch (error) {
      logger.error('Error in batch digest generation:', error, { component: 'lib-gemini-service', action: 'service_call' });
      throw error;
    }
  },

  /**
   * Build the prompt for Gemini to generate the digest
   */
  buildDigestPrompt(userData: DigestData): string {
    const today = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });

    const hasContent = userData.tasks.length > 0 ||
                      userData.events.length > 0 ||
                      userData.shopping.length > 0 ||
                      userData.meals.length > 0 ||
                      userData.overdue.length > 0;

    if (!hasContent) {
      return `Generate a brief, positive daily digest email for ${userData.userName} for ${today}.
They have no scheduled tasks, events, or items for today.
Keep it encouraging and suggest they enjoy their free day.
Format as JSON: {"subject": "...", "html": "...", "text": "..."}`;
    }

    return `Generate a professional, concise daily digest email for ${userData.userName} for ${today}.

USER DATA:
${userData.tasks.length > 0 ? `TASKS (${userData.tasks.length}):
${userData.tasks.map(t => `• ${t.title}${t.due_date ? ` (Due: ${new Date(t.due_date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })})` : ''}${t.priority === 'high' || t.priority === 'urgent' ? ' [HIGH PRIORITY]' : ''}${t.is_overdue ? ' [OVERDUE]' : ''}`).join('\n')}` : ''}

${userData.events.length > 0 ? `EVENTS (${userData.events.length}):
${userData.events.map(e => `• ${e.title} at ${new Date(e.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}${e.location ? ` (${e.location})` : ''}`).join('\n')}` : ''}

${userData.shopping.length > 0 ? `SHOPPING (${userData.shopping.length}):
${userData.shopping.map(s => `• ${s.name} (${s.pending_items}/${s.items_count} items pending)`).join('\n')}` : ''}

${userData.meals.length > 0 ? `MEALS (${userData.meals.length}):
${userData.meals.map(m => `• ${m.name} (${m.meal_type})${m.prep_time ? ` - Prep: ${m.prep_time}` : ''}`).join('\n')}` : ''}

${userData.overdue.length > 0 ? `OVERDUE (${userData.overdue.length}):
${userData.overdue.map(o => `• ${o.title} (${o.days_overdue} days overdue)`).join('\n')}` : ''}

REQUIREMENTS:
- Professional, encouraging tone
- Concise but actionable
- Use emojis sparingly (only for section headers)
- Prioritize by urgency/time
- Include time-specific items first
- Keep total length under 200 words
- HTML should be clean and mobile-friendly

FORMAT as JSON: {"subject": "Daily Digest - [Date]", "html": "complete HTML email", "text": "plain text version"}`;
  },

  /**
   * Parse the generated digest content from Gemini
   */
  parseGeneratedDigest(generatedContent: string, userName: string): DigestEmailContent {
    try {
      // Try to parse as JSON first
      const jsonMatch = generatedContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          subject: parsed.subject || `Daily Digest - ${new Date().toLocaleDateString()}`,
          htmlContent: parsed.html || parsed.htmlContent || generatedContent,
          textContent: parsed.text || parsed.textContent || this.htmlToText(parsed.html || generatedContent)
        };
      }

      // Fallback: treat entire content as HTML
      return {
        subject: `Daily Digest - ${new Date().toLocaleDateString()}`,
        htmlContent: generatedContent,
        textContent: this.htmlToText(generatedContent)
      };
    } catch (error) {
      logger.error('Error parsing generated digest:', error, { component: 'lib-gemini-service', action: 'service_call' });

      // Ultimate fallback
      return {
        subject: `Daily Digest - ${new Date().toLocaleDateString()}`,
        htmlContent: `<p>Good morning, ${userName}!</p><p>${generatedContent}</p>`,
        textContent: `Good morning, ${userName}!\n\n${generatedContent}`
      };
    }
  },

  /**
   * Generate fallback digest when Gemini fails
   */
  generateFallbackDigest(userData: DigestData): DigestEmailContent {
    const today = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });

    const hasContent = userData.tasks.length > 0 ||
                      userData.events.length > 0 ||
                      userData.shopping.length > 0 ||
                      userData.meals.length > 0 ||
                      userData.overdue.length > 0;

    if (!hasContent) {
      return {
        subject: `Daily Digest - ${today}`,
        htmlContent: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #7c3aed; margin-bottom: 20px;">Good morning, ${userData.userName}! ☀️</h2>
            <p style="color: #374151; line-height: 1.6;">
              You have a clear schedule for ${today}. Perfect time to relax, catch up on personal projects, or enjoy some well-deserved downtime!
            </p>
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              Have a wonderful day!<br>
              —The Rowan Team
            </p>
          </div>
        `,
        textContent: `Good morning, ${userData.userName}!\n\nYou have a clear schedule for ${today}. Perfect time to relax, catch up on personal projects, or enjoy some well-deserved downtime!\n\nHave a wonderful day!\n—The Rowan Team`
      };
    }

    // Build sections
    let htmlSections: string[] = [];
    let textSections: string[] = [];

    if (userData.tasks.length > 0) {
      const taskHtml = `
        <div style="margin-bottom: 20px;">
          <h3 style="color: #1f2937; margin-bottom: 10px;">📋 Tasks (${userData.tasks.length})</h3>
          <ul style="margin: 0; padding-left: 20px;">
            ${userData.tasks.map(task => `
              <li style="margin-bottom: 5px; color: ${task.is_overdue ? '#dc2626' : '#374151'};">
                ${task.title}${task.due_date ? ` (Due: ${new Date(task.due_date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })})` : ''}
                ${task.priority === 'high' || task.priority === 'urgent' ? ' <span style="color: #dc2626; font-weight: bold;">[HIGH PRIORITY]</span>' : ''}
              </li>
            `).join('')}
          </ul>
        </div>
      `;
      htmlSections.push(taskHtml);

      const taskText = `📋 TASKS (${userData.tasks.length})\n${userData.tasks.map(t => `• ${t.title}${t.due_date ? ` (Due: ${new Date(t.due_date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })})` : ''}`).join('\n')}\n`;
      textSections.push(taskText);
    }

    if (userData.events.length > 0) {
      const eventHtml = `
        <div style="margin-bottom: 20px;">
          <h3 style="color: #1f2937; margin-bottom: 10px;">📅 Events (${userData.events.length})</h3>
          <ul style="margin: 0; padding-left: 20px;">
            ${userData.events.map(event => `
              <li style="margin-bottom: 5px; color: #374151;">
                ${event.title} at ${new Date(event.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                ${event.location ? ` (${event.location})` : ''}
              </li>
            `).join('')}
          </ul>
        </div>
      `;
      htmlSections.push(eventHtml);

      const eventText = `📅 EVENTS (${userData.events.length})\n${userData.events.map(e => `• ${e.title} at ${new Date(e.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}${e.location ? ` (${e.location})` : ''}`).join('\n')}\n`;
      textSections.push(eventText);
    }

    if (userData.shopping.length > 0) {
      const shoppingHtml = `
        <div style="margin-bottom: 20px;">
          <h3 style="color: #1f2937; margin-bottom: 10px;">🛒 Shopping (${userData.shopping.length})</h3>
          <ul style="margin: 0; padding-left: 20px;">
            ${userData.shopping.map(list => `
              <li style="margin-bottom: 5px; color: #374151;">
                ${list.name} (${list.pending_items}/${list.items_count} items pending)
              </li>
            `).join('')}
          </ul>
        </div>
      `;
      htmlSections.push(shoppingHtml);

      const shoppingText = `🛒 SHOPPING (${userData.shopping.length})\n${userData.shopping.map(s => `• ${s.name} (${s.pending_items}/${s.items_count} items pending)`).join('\n')}\n`;
      textSections.push(shoppingText);
    }

    if (userData.overdue.length > 0) {
      const overdueHtml = `
        <div style="margin-bottom: 20px;">
          <h3 style="color: #dc2626; margin-bottom: 10px;">⚠️ Overdue (${userData.overdue.length})</h3>
          <ul style="margin: 0; padding-left: 20px;">
            ${userData.overdue.map(item => `
              <li style="margin-bottom: 5px; color: #dc2626;">
                ${item.title} (${item.days_overdue} days overdue)
              </li>
            `).join('')}
          </ul>
        </div>
      `;
      htmlSections.push(overdueHtml);

      const overdueText = `⚠️ OVERDUE (${userData.overdue.length})\n${userData.overdue.map(o => `• ${o.title} (${o.days_overdue} days overdue)`).join('\n')}\n`;
      textSections.push(overdueText);
    }

    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #7c3aed; margin-bottom: 20px;">Good morning, ${userData.userName}! ☀️</h2>
        <p style="color: #374151; margin-bottom: 20px;">Here's what's happening ${today}:</p>

        ${htmlSections.join('')}

        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
          Have a productive day!<br>
          —The Rowan Team
        </p>
      </div>
    `;

    const textContent = `Good morning, ${userData.userName}!\n\nHere's what's happening ${today}:\n\n${textSections.join('\n')}Have a productive day!\n—The Rowan Team`;

    return {
      subject: `Daily Digest - ${today}`,
      htmlContent,
      textContent
    };
  },

  /**
   * Convert HTML to plain text
   */
  htmlToText(html: string): string {
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
      .replace(/&amp;/g, '&') // Replace &amp; with &
      .replace(/&lt;/g, '<') // Replace &lt; with <
      .replace(/&gt;/g, '>') // Replace &gt; with >
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim();
  }
};