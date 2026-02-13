import { z } from 'zod';
import { sanitizePlainText } from '@/lib/sanitize';

/**
 * Chat Validation Schemas
 * Validates all chat I/O for the Rowan AI Assistant
 */

// Incoming chat message from user
export const chatMessageSchema = z.object({
  message: z.string()
    .max(2000, 'Message must be less than 2000 characters')
    .trim(),
  conversationId: z.union([
    z.literal('new'),
    z.string().uuid('Invalid conversation ID'),
  ]),
  spaceId: z.string().uuid('Invalid space ID'),
  confirmAction: z.object({
    actionId: z.string().uuid('Invalid action ID'),
    confirmed: z.boolean(),
    editedParameters: z.record(z.string(), z.unknown()).optional(),
  }).optional(),
  // Voice input duration tracking (Web Speech API — client-side, no API cost)
  voiceDurationSeconds: z.number().int().min(0).max(300).optional(),
});

// Validate and sanitize chat input
export function validateAndSanitizeChatMessage(data: unknown): z.infer<typeof chatMessageSchema> {
  const parsed = chatMessageSchema.parse(data);
  return {
    ...parsed,
    message: sanitizePlainText(parsed.message),
  };
}

// Schema for tool call confirmation response
export const toolConfirmationSchema = z.object({
  actionId: z.string().uuid('Invalid action ID'),
  confirmed: z.boolean(),
  editedParameters: z.record(z.string(), z.unknown()).optional(),
});

// Schema for validating tool call parameters before execution
export const toolCallParametersSchema = z.object({
  toolName: z.string().min(1).max(100),
  parameters: z.record(z.string(), z.unknown()),
});

// Type exports
export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
export type ToolConfirmationInput = z.infer<typeof toolConfirmationSchema>;
export type ToolCallParameters = z.infer<typeof toolCallParametersSchema>;
