'use client';

import { mentionsService } from '@/lib/services/mentions-service';

interface MentionHighlightProps {
  content: string;
  currentUserId?: string;
  className?: string;
}

/**
 * Component that highlights @mentions in message text
 * Highlights mentions of current user in a different color
 */
export function MentionHighlight({
  content,
  currentUserId: _currentUserId,
  className = '',
}: MentionHighlightProps) {
  // Split content by @mentions
  const parts = content.split(/(@[\w.-]+|@"[^"]+")/g);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        // Check if this part is a mention
        if (part.startsWith('@')) {
          // Extract mention text (remove @ and quotes if present)
          let mentionText = part.substring(1);

          if (mentionText.startsWith('"') && mentionText.endsWith('"')) {
            mentionText = mentionText.slice(1, -1);
          }

          // For now, we don't have user context to know if this is the current user
          // But we can still highlight it
          return (
            <span
              key={index}
              className="font-semibold text-green-400 bg-green-900/20 px-1 rounded cursor-pointer hover:bg-green-900/30 transition-colors"
              title={`Mentioned: ${mentionText}`}
            >
              {part}
            </span>
          );
        }

        // Regular text
        return <span key={index}>{part}</span>;
      })}
    </span>
  );
}

/**
 * Simple helper to check if content contains mentions
 */
export function hasMentions(content: string): boolean {
  return /@[\w.-]+|@"[^"]+"/.test(content);
}

/**
 * Get mention count from content
 */
export function getMentionCount(content: string): number {
  return mentionsService.extractMentions(content).length;
}
