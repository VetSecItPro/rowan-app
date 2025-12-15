'use client';

import { useState, useEffect, useMemo, memo } from 'react';
import { motion } from 'framer-motion';
import { logger } from '@/lib/logger';
import {
  Calendar,
  CheckSquare,
  UtensilsCrossed,
  Bell,
  AlertCircle,
  MapPin,
  ChevronRight,
  Loader2,
  Sun,
  Coffee,
  Moon,
  Clock
} from 'lucide-react';
import { WeatherBadge } from '@/components/calendar/WeatherBadge';
import Link from 'next/link';
import { format, isToday, isPast, parseISO, startOfDay, endOfDay } from 'date-fns';
import { calendarService, type CalendarEvent } from '@/lib/services/calendar-service';
import { tasksService } from '@/lib/services/tasks-service';
import { remindersService, type Reminder } from '@/lib/services/reminders-service';
import { mealsService, type Meal } from '@/lib/services/meals-service';
import type { Task } from '@/lib/types';

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
    high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    urgent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
  };

  return (
    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${colors[priority as keyof typeof colors] || ''}`}>
      !
    </span>
  );
});

// Meal type icon
const MealTypeIcon = memo(function MealTypeIcon({ type }: { type: string }) {
  const icons: Record<string, { icon: React.JSX.Element; label: string }> = {
    breakfast: { icon: <Coffee className="w-3.5 h-3.5" />, label: 'Breakfast' },
    lunch: { icon: <Sun className="w-3.5 h-3.5" />, label: 'Lunch' },
    dinner: { icon: <Moon className="w-3.5 h-3.5" />, label: 'Dinner' },
    snack: { icon: <UtensilsCrossed className="w-3.5 h-3.5" />, label: 'Snack' }
  };

  const config = icons[type] || icons.snack;
  return (
    <span className="text-orange-600 dark:text-orange-400" title={config.label}>
      {config.icon}
    </span>
  );
});

// Section component
const Section = memo(function Section({
  title,
  icon,
  count,
  color,
  href,
  children,
  isEmpty
}: {
  title: string;
  icon: React.JSX.Element;
  count: number;
  color: string;
  href: string;
  children: React.ReactNode;
  isEmpty: boolean;
}) {
  const colorClasses: Record<string, string> = {
    purple: 'text-purple-600 dark:text-purple-400',
    blue: 'text-blue-600 dark:text-blue-400',
    orange: 'text-orange-600 dark:text-orange-400',
    pink: 'text-pink-600 dark:text-pink-400'
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={colorClasses[color]}>{icon}</span>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
            {title}
          </h4>
          {count > 0 && (
            <span className="text-xs bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full font-semibold">
              {count}
            </span>
          )}
        </div>
        <Link
          href={href}
          className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex items-center gap-0.5"
        >
          View all
          <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="flex-1 space-y-1.5">
        {isEmpty ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 italic py-2">
            Nothing scheduled
          </p>
        ) : (
          children
        )}
      </div>
    </div>
  );
});

// Event item component
const EventItem = memo(function EventItem({ event }: { event: CalendarEvent }) {
  const startTime = parseISO(event.start_time);

  return (
    <div className="flex items-start gap-2 py-1.5 px-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
      <span className="text-xs font-medium text-purple-600 dark:text-purple-400 min-w-[52px]">
        {format(startTime, 'h:mm a')}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-800 dark:text-gray-200 truncate">
          {event.title}
        </p>
        {event.location && (
          <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 truncate">
            <MapPin className="w-3 h-3" />
            {event.location}
          </p>
        )}
      </div>
    </div>
  );
});

// Task item component
const TaskItem = memo(function TaskItem({ task, isOverdue }: { task: Task; isOverdue?: boolean }) {
  return (
    <div className={`flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
      isOverdue ? 'border-l-2 border-red-500' : ''
    }`}>
      <PriorityBadge priority={task.priority} />
      <p className={`text-sm flex-1 truncate ${
        isOverdue
          ? 'text-red-700 dark:text-red-400'
          : 'text-gray-800 dark:text-gray-200'
      }`}>
        {task.title}
      </p>
      {task.due_date && (
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {format(parseISO(task.due_date), 'h:mm a')}
        </span>
      )}
    </div>
  );
});

// Meal item component
const MealItem = memo(function MealItem({ meal }: { meal: Meal }) {
  const mealName = meal.name || meal.recipe?.name || 'Unnamed meal';

  return (
    <div className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
      <MealTypeIcon type={meal.meal_type} />
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 capitalize min-w-[60px]">
        {meal.meal_type}
      </span>
      <p className="text-sm text-gray-800 dark:text-gray-200 flex-1 truncate">
        {mealName}
      </p>
    </div>
  );
});

// Reminder item component
const ReminderItem = memo(function ReminderItem({ reminder, isOverdue }: { reminder: Reminder; isOverdue?: boolean }) {
  // Use remind_at or reminder_time field
  const remindAt = reminder.remind_at || reminder.reminder_time;

  return (
    <div className={`flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
      isOverdue ? 'border-l-2 border-red-500' : ''
    }`}>
      {reminder.emoji && <span className="text-sm">{reminder.emoji}</span>}
      <p className={`text-sm flex-1 truncate ${
        isOverdue
          ? 'text-red-700 dark:text-red-400'
          : 'text-gray-800 dark:text-gray-200'
      }`}>
        {reminder.title}
      </p>
      {remindAt && (
        <span className="text-xs text-gray-500 dark:text-gray-400">
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
      className="col-span-full bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4"
    >
      <div className="flex items-center gap-2 mb-2">
        <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
        <h4 className="text-sm font-semibold text-red-700 dark:text-red-300">
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
          <p className="text-xs text-red-600 dark:text-red-400 col-span-full">
            +{totalOverdue - 6} more overdue items
          </p>
        )}
      </div>
    </motion.div>
  );
});

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
          // Check completed status (not 'status' field)
          if (reminder.completed) return false;
          // Use remind_at field for the reminder time
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
      <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-purple-600 animate-spin" />
          <span className="ml-2 text-gray-500 dark:text-gray-400">Loading today&apos;s overview...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
        <div className="flex items-center justify-center py-8 text-red-500">
          <AlertCircle className="w-5 h-5 mr-2" />
          {error}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const hasAnyContent =
    data.events.length > 0 ||
    data.tasks.length > 0 ||
    data.meals.length > 0 ||
    data.reminders.length > 0 ||
    data.overdueTasks.length > 0 ||
    data.overdueReminders.length > 0;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="px-4 sm:px-6 py-4 border-b border-teal-100 dark:border-teal-800/50 bg-gradient-to-r from-teal-100 via-cyan-100 to-sky-100 dark:from-teal-900/40 dark:via-cyan-900/40 dark:to-sky-900/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
              <Sun className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Today at a Glance
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {format(new Date(), 'EEEE, MMMM d, yyyy')}
              </p>
            </div>
          </div>
          {/* Weather + Time display - right side of header */}
          <div className="hidden sm:flex items-center gap-4">
            {/* Weather - flat horizontal layout for header */}
            <WeatherBadge
              eventTime={new Date().toISOString()}
              location="Wylie, Texas, United States"
              display="header"
            />
            {/* Time */}
            <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 border-l border-gray-200 dark:border-gray-700 pl-4">
              <Clock className="w-4 h-4" />
              <span className="font-medium">{format(new Date(), 'h:mm a')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6">
        {!hasAnyContent ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              <Calendar className="w-8 h-8 text-gray-400 dark:text-gray-500" />
            </div>
            <h4 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-1">
              Your day is clear!
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No events, tasks, or meals scheduled for today.
            </p>
          </div>
        ) : (
          <>
            {/* Overdue items alert */}
            <OverdueSection
              tasks={data.overdueTasks}
              reminders={data.overdueReminders}
            />

            {/* 2x2 Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Events */}
              <motion.div variants={itemVariants}>
                <Section
                  title="Events"
                  icon={<Calendar className="w-4 h-4" />}
                  count={data.events.length}
                  color="purple"
                  href="/calendar"
                  isEmpty={data.events.length === 0}
                >
                  {data.events.slice(0, 4).map(event => (
                    <EventItem key={event.id} event={event} />
                  ))}
                  {data.events.length > 4 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 pt-1">
                      +{data.events.length - 4} more events
                    </p>
                  )}
                </Section>
              </motion.div>

              {/* Tasks */}
              <motion.div variants={itemVariants}>
                <Section
                  title="Tasks Due"
                  icon={<CheckSquare className="w-4 h-4" />}
                  count={data.tasks.length}
                  color="blue"
                  href="/tasks"
                  isEmpty={data.tasks.length === 0}
                >
                  {data.tasks.slice(0, 4).map(task => (
                    <TaskItem key={task.id} task={task} />
                  ))}
                  {data.tasks.length > 4 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 pt-1">
                      +{data.tasks.length - 4} more tasks
                    </p>
                  )}
                </Section>
              </motion.div>

              {/* Meals */}
              <motion.div variants={itemVariants}>
                <Section
                  title="Meals"
                  icon={<UtensilsCrossed className="w-4 h-4" />}
                  count={data.meals.length}
                  color="orange"
                  href="/meals"
                  isEmpty={data.meals.length === 0}
                >
                  {data.meals.map(meal => (
                    <MealItem key={meal.id} meal={meal} />
                  ))}
                </Section>
              </motion.div>

              {/* Reminders */}
              <motion.div variants={itemVariants}>
                <Section
                  title="Reminders"
                  icon={<Bell className="w-4 h-4" />}
                  count={data.reminders.length}
                  color="pink"
                  href="/reminders"
                  isEmpty={data.reminders.length === 0}
                >
                  {data.reminders.slice(0, 4).map(reminder => (
                    <ReminderItem key={reminder.id} reminder={reminder} />
                  ))}
                  {data.reminders.length > 4 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 pt-1">
                      +{data.reminders.length - 4} more reminders
                    </p>
                  )}
                </Section>
              </motion.div>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
});

export default TodayAtAGlance;
