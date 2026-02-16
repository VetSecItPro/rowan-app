'use client';

import { useState, useEffect, memo } from 'react';
import { motion } from 'framer-motion';
import { logger } from '@/lib/logger';
import {
  Calendar,
  AlertCircle,
  Sun,
  Clock
} from 'lucide-react';
import { WeatherBadge } from '@/components/calendar/WeatherBadge';
import { format, isToday, isPast, parseISO, startOfDay, endOfDay } from 'date-fns';
import { calendarService, type CalendarEvent } from '@/lib/services/calendar-service';
import { tasksService } from '@/lib/services/tasks-service';
import { remindersService, type Reminder } from '@/lib/services/reminders-service';
import { mealsService, type Meal } from '@/lib/services/meals-service';
import type { Task } from '@/lib/types';
import { Skeleton } from '@/components/ui/Skeleton';

interface TodayAtAGlanceProps {
  spaceId: string;
  className?: string;
}

interface TodayData {
  events: CalendarEvent[];
  tasks: Task[];
  meals: Meal[];
  reminders: Reminder[];
  overdueTasks: Task[];
  overdueReminders: Reminder[];
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 }
};

// Priority badge component
const PriorityBadge = memo(function PriorityBadge({ priority }: { priority?: string }) {
  if (!priority || priority === 'low' || priority === 'medium') return null;

  const colors = {
    high: 'bg-orange-900/30 text-orange-300',
    urgent: 'bg-red-900/30 text-red-300'
  };

  return (
    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${colors[priority as keyof typeof colors] || ''}`}>
      !
    </span>
  );
});

// Task item component (used in OverdueSection)
const TaskItem = memo(function TaskItem({ task, isOverdue }: { task: Task; isOverdue?: boolean }) {
  return (
    <div className={`flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-gray-700/50 transition-colors ${isOverdue ? 'border-l-2 border-red-500' : ''
      }`}>
      <PriorityBadge priority={task.priority} />
      <p className={`text-sm flex-1 truncate ${isOverdue
        ? 'text-red-400'
        : 'text-gray-200'
        }`}>
        {task.title}
      </p>
      {task.due_date && (
        <span className="text-xs text-gray-400">
          {format(parseISO(task.due_date), 'h:mm a')}
        </span>
      )}
    </div>
  );
});

// Reminder item component (used in OverdueSection)
const ReminderItem = memo(function ReminderItem({ reminder, isOverdue }: { reminder: Reminder; isOverdue?: boolean }) {
  const remindAt = reminder.remind_at || reminder.reminder_time;

  return (
    <div className={`flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-gray-700/50 transition-colors ${isOverdue ? 'border-l-2 border-red-500' : ''
      }`}>
      {reminder.emoji && <span className="text-sm">{reminder.emoji}</span>}
      <p className={`text-sm flex-1 truncate ${isOverdue
        ? 'text-red-400'
        : 'text-gray-200'
        }`}>
        {reminder.title}
      </p>
      {remindAt && (
        <span className="text-xs text-gray-400">
          {format(parseISO(remindAt), 'h:mm a')}
        </span>
      )}
    </div>
  );
});

// Overdue section
const OverdueSection = memo(function OverdueSection({
  tasks,
  reminders
}: {
  tasks: Task[];
  reminders: Reminder[];
}) {
  const totalOverdue = tasks.length + reminders.length;

  if (totalOverdue === 0) return null;

  return (
    <motion.div
      variants={itemVariants}
      className="bg-red-900/20 border border-red-800 rounded-lg p-3"
    >
      <div className="flex items-center gap-2 mb-2">
        <AlertCircle className="w-4 h-4 text-red-400" />
        <h4 className="text-sm font-semibold text-red-300">
          Overdue ({totalOverdue})
        </h4>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {tasks.slice(0, 3).map(task => (
          <TaskItem key={task.id} task={task} isOverdue />
        ))}
        {reminders.slice(0, 3).map(reminder => (
          <ReminderItem key={reminder.id} reminder={reminder} isOverdue />
        ))}
        {totalOverdue > 6 && (
          <p className="text-xs text-red-400 col-span-full">
            +{totalOverdue - 6} more overdue items
          </p>
        )}
      </div>
    </motion.div>
  );
});

/** Displays a summary of today's events, tasks, and reminders. */
export const TodayAtAGlance = memo(function TodayAtAGlance({
  spaceId,
  className = ''
}: TodayAtAGlanceProps) {
  const [data, setData] = useState<TodayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTodayData() {
      if (!spaceId) return;

      try {
        setLoading(true);
        setError(null);

        const today = new Date();
        const todayStart = startOfDay(today);
        const todayEnd = endOfDay(today);
        const todayStr = format(today, 'yyyy-MM-dd');

        // Fetch all data in parallel
        const [allEvents, allTasks, allMeals, allReminders] = await Promise.all([
          calendarService.getEventsWithRecurring(spaceId, todayStart, todayEnd),
          tasksService.getTasks(spaceId),
          mealsService.getMeals(spaceId),
          remindersService.getReminders(spaceId)
        ]);

        // Filter events for today
        const todayEvents = allEvents.filter(event => {
          const eventDate = parseISO(event.start_time);
          return isToday(eventDate);
        }).sort((a, b) =>
          new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
        );

        // Filter tasks due today (not completed)
        const todayTasks = allTasks.filter(task => {
          if (!task.due_date || task.status === 'completed') return false;
          const dueDate = task.due_date.split('T')[0];
          return dueDate === todayStr;
        });

        // Filter overdue tasks
        const overdueTasks = allTasks.filter(task => {
          if (!task.due_date || task.status === 'completed') return false;
          const dueDate = parseISO(task.due_date);
          return isPast(dueDate) && !isToday(dueDate);
        });

        // Filter meals for today
        const todayMeals = allMeals.filter(meal => {
          const mealDate = meal.scheduled_date.split('T')[0];
          return mealDate === todayStr;
        }).sort((a, b) => {
          const order: Record<string, number> = { breakfast: 0, lunch: 1, dinner: 2, snack: 3 };
          return (order[a.meal_type] || 4) - (order[b.meal_type] || 4);
        });

        // Filter active reminders for today (use remind_at field, not reminder_time)
        const todayReminders = allReminders.filter(reminder => {
          if (reminder.completed) return false;
          const remindAt = reminder.remind_at || reminder.reminder_time;
          if (!remindAt) return false;
          const reminderDate = remindAt.split('T')[0];
          return reminderDate === todayStr;
        });

        // Filter overdue reminders
        const overdueReminders = allReminders.filter(reminder => {
          if (reminder.completed) return false;
          const remindAt = reminder.remind_at || reminder.reminder_time;
          if (!remindAt) return false;
          const reminderTime = parseISO(remindAt);
          return isPast(reminderTime) && !isToday(reminderTime);
        });

        setData({
          events: todayEvents,
          tasks: todayTasks,
          meals: todayMeals,
          reminders: todayReminders,
          overdueTasks,
          overdueReminders
        });
      } catch (err) {
        logger.error('Error fetching today data:', err, { component: 'TodayAtAGlance', action: 'component_action' });
        setError('Failed to load today\'s data');
      } finally {
        setLoading(false);
      }
    }

    fetchTodayData();
  }, [spaceId]);

  if (loading) {
    return (
      <div className={`bg-gray-800 rounded-xl shadow-sm border border-gray-700 overflow-hidden ${className}`}>
        <div className="px-4 sm:px-6 py-4 border-b border-gray-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-4">
              <Skeleton className="h-8 w-24 rounded-full" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        </div>
        <div className="p-4 sm:p-6">
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-gray-800 rounded-xl shadow-sm border border-gray-700 p-6 ${className}`}>
        <div className="flex items-center justify-center py-8 text-red-500">
          <AlertCircle className="w-5 h-5 mr-2" />
          {error}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const hasOverdue = data.overdueTasks.length > 0 || data.overdueReminders.length > 0;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={`bg-gray-800 rounded-xl shadow-sm border border-gray-700 overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="px-4 sm:px-6 py-4 border-b border-teal-800/50 bg-gradient-to-r from-teal-900/40 via-cyan-900/30 to-sky-900/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-teal-900/30 flex items-center justify-center">
              <Sun className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">
                Today at a Glance
              </h3>
              <p className="text-sm text-gray-400">
                {format(new Date(), 'EEEE, MMMM d, yyyy')}
              </p>
            </div>
          </div>
          {/* Weather + Time display - right side of header */}
          <div className="hidden sm:flex items-center gap-4">
            <WeatherBadge
              eventTime={new Date().toISOString()}
              location="Wylie, Texas, United States"
              display="header"
            />
            <div className="flex items-center gap-1.5 text-sm text-gray-400 border-l border-gray-700 pl-4">
              <Clock className="w-4 h-4" />
              <span className="font-medium">{format(new Date(), 'h:mm a')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content — Overdue items only */}
      <div className="p-4 sm:p-6">
        {!hasOverdue ? (
          <div className="text-center py-4">
            <p className="text-sm text-gray-400">
              Nothing overdue — you&apos;re all caught up!
            </p>
          </div>
        ) : (
          <OverdueSection
            tasks={data.overdueTasks}
            reminders={data.overdueReminders}
          />
        )}
      </div>
    </motion.div>
  );
});

export default TodayAtAGlance;
