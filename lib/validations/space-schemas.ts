import { z } from 'zod';
import { sanitizePlainText } from '@/lib/sanitize';

// Invitation role enum (only roles that can be assigned via invitation)
// Note: 'owner' cannot be assigned via invitation, and 'viewer' is not used for invitations
const invitationRoleEnum = z.enum(['member', 'admin']);

// Base space schema
// Note: Only includes fields that exist as actual DB columns on the `spaces` table.
// `icon`, `color`, and `timezone` were removed — they do not exist in the database.
export const spaceBaseSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .trim(),
  description: z.string().max(500, 'Description must be less than 500 characters').trim().optional().nullable()
    .transform(val => val === '' ? null : val),
  settings: z.record(z.string(), z.unknown()).optional().nullable(),
});

// Create space schema
export const createSpaceSchema = spaceBaseSchema;

// Update space schema (all fields optional)
export const updateSpaceSchema = spaceBaseSchema.partial();

// Space invite schema
export const spaceInviteSchema = z.object({
  space_id: z.string().uuid('Invalid space ID'),
  email: z.string()
    .email('Invalid email address')
    .max(255, 'Email must be less than 255 characters')
    .toLowerCase()
    .trim(),
  role: invitationRoleEnum.default('member'),
  message: z.string().max(500, 'Message must be less than 500 characters').trim().optional().nullable()
    .transform(val => val === '' ? null : val),
});

// Accept invitation schema
export const acceptInviteSchema = z.object({
  token: z.string().uuid('Invalid invitation token'),
});

// Helper to validate and sanitize space input
export function validateAndSanitizeSpace(data: unknown): z.infer<typeof createSpaceSchema> {
  const parsed = createSpaceSchema.parse(data);

  return {
    ...parsed,
    name: sanitizePlainText(parsed.name),
    description: parsed.description ? sanitizePlainText(parsed.description) : null,
  };
}

// Helper to validate and sanitize invite input
export function validateAndSanitizeInvite(data: unknown): z.infer<typeof spaceInviteSchema> {
  const parsed = spaceInviteSchema.parse(data);

  return {
    ...parsed,
    message: parsed.message ? sanitizePlainText(parsed.message) : null,
  };
}

// Type exports
export type CreateSpaceInput = z.infer<typeof createSpaceSchema>;
export type UpdateSpaceInput = z.infer<typeof updateSpaceSchema>;
export type SpaceInviteInput = z.infer<typeof spaceInviteSchema>;
