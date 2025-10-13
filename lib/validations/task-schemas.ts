import { z } from 'zod';

// Base task schema
export const taskBaseSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters').trim(),
  description: z.string().max(2000, 'Description must be less than 2000 characters').trim().optional().nullable(),
  space_id: z.string().uuid('Invalid space ID'),
  status: z.enum(['pending', 'in-progress', 'completed', 'blocked', 'on-hold']).default('pending'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  assigned_to: z.string().uuid('Invalid user ID').optional().nullable(),
  due_date: z.string().datetime().optional().nullable(),
  start_date: z.string().datetime().optional().nullable(),
  estimated_hours: z.number().min(0).max(1000).optional().nullable(),
  category: z.string().max(100).trim().optional().nullable(),
  tags: z.array(z.string().max(50).trim()).max(20).optional(),
});

// Create task schema
export const createTaskSchema = taskBaseSchema.extend({
  created_by: z.string().uuid('Invalid user ID'),
});

// Update task schema (all fields optional except space_id for security)
export const updateTaskSchema = taskBaseSchema.partial().extend({
  completed_at: z.string().datetime().optional().nullable(),
  updated_at: z.string().datetime().optional(),
});

// Subtask schemas
export const createSubtaskSchema = z.object({
  parent_task_id: z.string().uuid('Invalid task ID'),
  title: z.string().min(1, 'Title is required').max(200).trim(),
  description: z.string().max(1000).trim().optional().nullable(),
  status: z.enum(['pending', 'in-progress', 'completed']).default('pending'),
  sort_order: z.number().int().min(0).default(0),
  assigned_to: z.string().uuid().optional().nullable(),
  created_by: z.string().uuid('Invalid user ID'),
});

export const updateSubtaskSchema = createSubtaskSchema.partial().omit({ created_by: true });

// Recurring task schema
export const recurringPatternSchema = z.object({
  pattern: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
  interval: z.number().int().min(1).max(365),
  days_of_week: z.array(z.number().int().min(0).max(6)).optional(),
  day_of_month: z.number().int().min(1).max(31).optional(),
  month: z.number().int().min(1).max(12).optional(),
  end_date: z.string().datetime().optional().nullable(),
  max_occurrences: z.number().int().min(1).max(1000).optional().nullable(),
});

export const createRecurringTaskSchema = z.object({
  space_id: z.string().uuid(),
  title: z.string().min(1).max(200).trim(),
  description: z.string().max(2000).trim().optional(),
  category: z.string().max(100).trim().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  assigned_to: z.string().uuid().optional().nullable(),
  estimated_hours: z.number().min(0).max(1000).optional().nullable(),
  created_by: z.string().uuid(),
  recurrence: recurringPatternSchema,
});

// Template schema
export const createTemplateSchema = z.object({
  space_id: z.string().uuid(),
  name: z.string().min(1, 'Name is required').max(100).trim(),
  title: z.string().min(1).max(200).trim(),
  description: z.string().max(2000).trim().optional(),
  category: z.string().max(100).trim().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  estimated_hours: z.number().min(0).max(1000).optional().nullable(),
  tags: z.array(z.string().max(50).trim()).max(20).optional(),
  created_by: z.string().uuid(),
  is_favorite: z.boolean().default(false),
});

// Time tracking schema
export const createTimeEntrySchema = z.object({
  task_id: z.string().uuid(),
  user_id: z.string().uuid(),
  start_time: z.string().datetime(),
  end_time: z.string().datetime().optional().nullable(),
  duration_minutes: z.number().int().min(0).optional().nullable(),
  notes: z.string().max(500).trim().optional().nullable(),
});

// Comment schema
export const createCommentSchema = z.object({
  task_id: z.string().uuid(),
  user_id: z.string().uuid(),
  content: z.string().min(1, 'Comment cannot be empty').max(2000).trim(),
  parent_comment_id: z.string().uuid().optional().nullable(),
});

// Attachment schema
export const attachmentMetadataSchema = z.object({
  task_id: z.string().uuid(),
  file_name: z.string().min(1).max(255),
  file_path: z.string().min(1),
  file_size: z.number().int().min(0).max(50 * 1024 * 1024), // 50MB limit
  mime_type: z.string().max(100),
  uploaded_by: z.string().uuid(),
});

// Dependency schema
export const createDependencySchema = z.object({
  task_id: z.string().uuid(),
  dependent_task_id: z.string().uuid(),
  dependency_type: z.enum(['blocks', 'relates_to']),
}).refine(data => data.task_id !== data.dependent_task_id, {
  message: 'Task cannot depend on itself',
});

// Category schema
export const createCategorySchema = z.object({
  space_id: z.string().uuid(),
  name: z.string().min(1).max(50).trim(),
  color: z.string().regex(/^(red|blue|green|yellow|purple|pink|indigo|gray|orange|teal|cyan|emerald|amber)$/, 'Invalid color'),
  icon: z.string().max(50).optional().nullable(),
  description: z.string().max(200).trim().optional().nullable(),
  sort_order: z.number().int().min(0).default(0),
  created_by: z.string().uuid(),
});

// Assignment schema
export const createAssignmentSchema = z.object({
  task_id: z.string().uuid(),
  user_id: z.string().uuid(),
  role: z.enum(['owner', 'contributor', 'reviewer']).optional(),
  is_primary: z.boolean().default(false),
  assigned_by: z.string().uuid(),
});

// Approval schema
export const createApprovalSchema = z.object({
  task_id: z.string().uuid(),
  approver_id: z.string().uuid(),
  requested_by: z.string().uuid(),
});

export const reviewApprovalSchema = z.object({
  approval_id: z.string().uuid(),
  status: z.enum(['approved', 'rejected']),
  reviewed_by: z.string().uuid(),
  review_note: z.string().max(1000).trim().optional(),
});

// Snooze schema
export const snoozeTaskSchema = z.object({
  task_id: z.string().uuid(),
  snoozed_by: z.string().uuid(),
  snoozed_until: z.string().datetime(),
  reason: z.string().max(200).trim().optional().nullable(),
}).refine(data => new Date(data.snoozed_until) > new Date(), {
  message: 'Snooze time must be in the future',
});

// Reminder schema
export const createReminderSchema = z.object({
  task_id: z.string().uuid(),
  user_id: z.string().uuid(),
  reminder_type: z.enum(['notification', 'email', 'both']),
  offset_type: z.enum(['before_due', 'at_due', 'after_due', 'custom_time']),
  offset_minutes: z.number().int().min(-10080).max(10080).optional(), // +/- 1 week
  custom_time: z.string().datetime().optional().nullable(),
});

// Handoff schema
export const handoffTaskSchema = z.object({
  task_id: z.string().uuid(),
  from_user_id: z.string().uuid(),
  to_user_id: z.string().uuid(),
  performed_by: z.string().uuid(),
  note: z.string().max(500).trim().optional().nullable(),
  reason: z.string().max(200).trim().optional().nullable(),
}).refine(data => data.from_user_id !== data.to_user_id, {
  message: 'Cannot handoff task to the same user',
});

// Chore rotation schema
export const createChoreRotationSchema = z.object({
  task_id: z.string().uuid(),
  space_id: z.string().uuid(),
  rotation_type: z.enum(['round-robin', 'random']),
  interval_type: z.enum(['daily', 'weekly', 'monthly']),
  interval_value: z.number().int().min(1).max(365),
  member_ids: z.array(z.string().uuid()).min(2, 'At least 2 members required for rotation'),
  is_active: z.boolean().default(true),
});

// Export schema
export const exportTasksSchema = z.object({
  space_id: z.string().uuid(),
  filters: z.object({
    status: z.array(z.string()).optional(),
    priority: z.array(z.string()).optional(),
    assignees: z.array(z.string().uuid()).optional(),
    categories: z.array(z.string()).optional(),
    dueDateFrom: z.string().datetime().optional(),
    dueDateTo: z.string().datetime().optional(),
  }).optional(),
  columns: z.array(z.string()).optional(),
});

// Bulk operation schemas
export const bulkUpdateSchema = z.object({
  task_ids: z.array(z.string().uuid()).min(1, 'At least one task ID required').max(100, 'Maximum 100 tasks at once'),
  updates: z.object({
    status: z.enum(['pending', 'in-progress', 'completed', 'blocked', 'on-hold']).optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    assigned_to: z.string().uuid().optional().nullable(),
    category: z.string().max(100).trim().optional().nullable(),
  }),
});

export const bulkDeleteSchema = z.object({
  task_ids: z.array(z.string().uuid()).min(1).max(100),
  space_id: z.string().uuid(), // For security verification
});

// Helper function to sanitize HTML input
export function sanitizeString(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// Helper to validate and sanitize task input
export function validateAndSanitizeTask(data: unknown): z.infer<typeof createTaskSchema> {
  const parsed = createTaskSchema.parse(data);

  return {
    ...parsed,
    title: sanitizeString(parsed.title),
    description: parsed.description ? sanitizeString(parsed.description) : null,
    category: parsed.category ? sanitizeString(parsed.category) : null,
  };
}

// Type exports
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type CreateSubtaskInput = z.infer<typeof createSubtaskSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type BulkUpdateInput = z.infer<typeof bulkUpdateSchema>;
