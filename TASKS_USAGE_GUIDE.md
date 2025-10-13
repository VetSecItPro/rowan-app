# Tasks & Chores - Usage Guide

## 📍 Routes

- **Standard Tasks Page:** `/tasks` - Original simple interface
- **Advanced Tasks Page:** `/tasks-advanced` - Full-featured with all 23 enhancements

## 🎯 Quick Start

### Access the Advanced Features

Navigate to `/tasks-advanced` to access:
- Drag-and-drop task reordering
- Real-time updates
- Advanced filtering
- Bulk operations
- All modal components

### Basic Task Operations

```typescript
// Create a new task
const taskData = {
  title: "Complete project",
  description: "Finish the quarterly report",
  space_id: spaceId,
  created_by: userId,
  status: "pending",
  priority: "high",
};
await tasksService.createTask(taskData);

// Update task status
await tasksService.updateTask(taskId, { status: "completed" });

// Delete a task
await tasksService.deleteTask(taskId);
```

## 🔥 Advanced Features

### 1. Recurring Tasks

Create tasks that repeat automatically:

```typescript
import { RecurringTaskModal } from '@/components/tasks/RecurringTaskModal';

<RecurringTaskModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  onSave={() => refreshTasks()}
  spaceId={spaceId}
  userId={userId}
/>
```

**Patterns supported:**
- Daily (every N days)
- Weekly (specific days of week)
- Monthly (specific date)
- Yearly (specific date)

### 2. Task Templates

Save common task configurations:

```typescript
import { TemplatePickerModal } from '@/components/tasks/TemplatePickerModal';

<TemplatePickerModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  onSelect={(templateId) => createFromTemplate(templateId)}
  spaceId={spaceId}
/>
```

### 3. Subtasks

Break down tasks into smaller pieces:

```typescript
import { SubtasksList } from '@/components/tasks/SubtasksList';

<SubtasksList
  taskId={taskId}
  userId={userId}
/>
```

### 4. Time Tracking

Track time spent on tasks:

```typescript
import { TimeTracker } from '@/components/tasks/TimeTracker';

<TimeTracker
  taskId={taskId}
  userId={userId}
/>
```

### 5. File Attachments

Upload files up to 50MB:

```typescript
import { AttachmentsModal } from '@/components/tasks/AttachmentsModal';

<AttachmentsModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  taskId={taskId}
  userId={userId}
/>
```

### 6. Task Dependencies

Create relationships between tasks:

```typescript
import { DependenciesModal } from '@/components/tasks/DependenciesModal';

<DependenciesModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  taskId={taskId}
  spaceId={spaceId}
/>
```

**Relationship types:**
- **Blocks:** This task must be completed before dependent task can start
- **Relates To:** Tasks are related but not blocking

### 7. Approval Workflow

Require approval before tasks are considered complete:

```typescript
import { ApprovalModal } from '@/components/tasks/ApprovalModal';

<ApprovalModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  taskId={taskId}
  currentUserId={userId}
  spaceId={spaceId}
/>
```

### 8. Snooze/Postpone

Temporarily hide tasks:

```typescript
import { SnoozeModal } from '@/components/tasks/SnoozeModal';

<SnoozeModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  taskId={taskId}
  userId={userId}
  onSnooze={() => refreshTasks()}
/>
```

**Quick snooze options:**
- 1 Hour
- 3 Hours
- Tomorrow 9 AM
- Next Monday
- Next Week
- Custom date/time

### 9. Comments & Reactions

Collaborate on tasks:

```typescript
import { TaskComments } from '@/components/tasks/TaskComments';

<TaskComments
  taskId={taskId}
  userId={userId}
/>
```

### 10. Calendar Integration

Sync tasks to calendar:

```typescript
import { CalendarSyncToggle } from '@/components/tasks/CalendarSyncToggle';

<CalendarSyncToggle
  taskId={taskId}
  userId={userId}
/>
```

### 11. Chore Rotation

Automatically rotate chore assignments:

```typescript
import { ChoreRotationConfig } from '@/components/tasks/ChoreRotationConfig';

<ChoreRotationConfig
  taskId={taskId}
  spaceId={spaceId}
/>
```

**Rotation types:**
- **Round-robin:** Assign in order
- **Random:** Random assignment

### 12. Advanced Filtering

Filter tasks by multiple criteria:

```typescript
import { TaskFilterPanel } from '@/components/tasks/TaskFilterPanel';

<TaskFilterPanel
  spaceId={spaceId}
  onFilterChange={(filters) => setFilters(filters)}
/>
```

**Filter options:**
- Search text
- Status (pending, in-progress, completed, blocked, on-hold)
- Priority (urgent, high, medium, low)
- Assignees
- Categories
- Due date range
- Has attachments
- Has dependencies
- Is past due

### 13. Bulk Operations

Perform actions on multiple tasks:

```typescript
import { BulkActionsBar } from '@/components/tasks/BulkActionsBar';

<BulkActionsBar
  selectedTaskIds={selectedTaskIds}
  onClearSelection={() => setSelectedTaskIds([])}
  onActionComplete={() => refreshTasks()}
/>
```

**Bulk actions:**
- Mark as completed
- Delete selected
- Change status
- Change priority

### 14. Export Tasks

Export to CSV with custom columns:

```typescript
import { ExportModal } from '@/components/tasks/ExportModal';

<ExportModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  spaceId={spaceId}
  currentFilters={filters}
/>
```

### 15. Drag & Drop Reordering

Reorder tasks visually:

```typescript
import { DraggableTaskList } from '@/components/tasks/DraggableTaskList';

<DraggableTaskList
  spaceId={spaceId}
  initialTasks={tasks}
  onTaskClick={(task) => openTaskDetails(task)}
  onTasksReorder={() => refreshTasks()}
/>
```

### 16. Real-time Updates

Get live updates when tasks change:

```typescript
import { useTaskRealtime } from '@/hooks/useTaskRealtime';

const { tasks, loading, refreshTasks } = useTaskRealtime({
  spaceId,
  filters: {
    status: ['pending', 'in-progress'],
    priority: ['urgent', 'high'],
  },
  onTaskAdded: (task) => console.log('New task:', task),
  onTaskUpdated: (task) => console.log('Updated:', task),
  onTaskDeleted: (taskId) => console.log('Deleted:', taskId),
});
```

## 🤖 Background Jobs

Tasks system includes automated background jobs:

### Job Schedule

| Job | Schedule | Purpose |
|-----|----------|---------|
| Reminders | Every 5 min | Send task reminders |
| Recurring | Daily midnight | Generate recurring task instances |
| Rotation | Daily midnight | Process chore rotations |
| Cleanup | Daily 2am | Unsnooze expired, clean old data |
| Refresh Views | Every 6 hours | Update materialized views |

### Manual Job Trigger

```bash
# Trigger all jobs
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://your-app.vercel.app/api/cron/task-jobs?job=all

# Trigger specific job
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://your-app.vercel.app/api/cron/task-jobs?job=reminders
```

## 🎨 Styling & Theming

All components support dark mode automatically:

```typescript
// Components use Tailwind's dark: prefix
<div className="bg-white dark:bg-gray-800">
  <p className="text-gray-900 dark:text-white">Content</p>
</div>
```

## 📱 Mobile Support

Components are responsive by default:

- Touch-enabled drag and drop
- Mobile-optimized modals
- Collapsible sidebars
- Responsive grids

## 🔒 Security

All services include:

- Row Level Security (RLS) policies
- Partnership data isolation
- Input validation (needs Zod - see TODO)
- Error handling
- Proper cleanup on unmount

## 🚀 Performance

Optimizations included:

- Real-time subscriptions with filters
- Optimistic updates
- Memoized calculations
- Efficient re-renders
- Cleanup on component unmount

## 📝 Example: Complete Integration

See `components/tasks/TasksPageExample.tsx` or `/tasks-advanced` for a complete working example showing all features integrated together.

## 🆘 Troubleshooting

### Tasks not updating in real-time

Check that Supabase Realtime is enabled for the `tasks` table.

### Drag and drop not working

Ensure @dnd-kit packages are installed:
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

### File uploads failing

Check Supabase Storage bucket `task-attachments` exists and has proper RLS policies.

### Background jobs not running

Verify `CRON_SECRET` environment variable is set in Vercel and `vercel.json` has correct cron schedules.

## 📚 Additional Resources

- Full implementation details: `TASKS_IMPLEMENTATION.md`
- Component source: `components/tasks/`
- Services source: `lib/services/task-*.ts`
- Database migrations: `supabase/migrations/202510130000*.sql`

---

*Generated with Claude Code*
*Last updated: 2025-10-13*
