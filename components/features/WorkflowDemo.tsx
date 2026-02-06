'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  CheckCircle2,
  Users,
  Bell,
  ListTodo,
  UserPlus,
  ChevronDown,
  Target,
  Trophy,
  BarChart3,
  Sparkles,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface WorkflowStep {
  label: string;
  content: React.ReactNode;
}

export interface Workflow {
  title: string;
  steps: WorkflowStep[];
}

export interface WorkflowDemoProps {
  workflows: Workflow[];
  colorScheme: {
    /** Hex color for primary accents */
    primary: string;
    /** Hex color for secondary accents */
    secondary: string;
  };
}

// ---------------------------------------------------------------------------
// Step duration (ms)
// ---------------------------------------------------------------------------
const STEP_DURATION = 3500;

// ---------------------------------------------------------------------------
// Single Workflow Card
// ---------------------------------------------------------------------------
function WorkflowCard({
  workflow,
  colorScheme,
}: {
  workflow: Workflow;
  colorScheme: WorkflowDemoProps['colorScheme'];
}) {
  const [activeStep, setActiveStep] = useState(0);
  const stepCount = workflow.steps.length;

  const advance = useCallback(() => {
    setActiveStep((prev) => (prev + 1) % stepCount);
  }, [stepCount]);

  useEffect(() => {
    const timer = setInterval(advance, STEP_DURATION);
    return () => clearInterval(timer);
  }, [advance]);

  return (
    <div className="flex-shrink-0 w-[300px] snap-start md:w-auto rounded-2xl border border-gray-800 bg-gray-900/80 p-5 flex flex-col">
      {/* Title */}
      <h3 className="text-sm font-semibold text-white mb-4">{workflow.title}</h3>

      {/* Step content area */}
      <div className="relative h-[140px] flex items-center justify-center overflow-hidden rounded-xl bg-gray-800/50 mb-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeStep}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.35, ease: [0.25, 0.4, 0.25, 1] }}
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4"
          >
            {workflow.steps[activeStep].content}
            <span className="text-xs text-gray-400 text-center leading-snug mt-1">
              {workflow.steps[activeStep].label}
            </span>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Step progress dots */}
      <div className="flex items-center justify-center gap-2">
        {workflow.steps.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setActiveStep(i)}
            aria-label={`Go to step ${i + 1}`}
            className="p-0.5"
          >
            <motion.div
              className="rounded-full"
              animate={{
                width: i === activeStep ? 20 : 6,
                height: 6,
                backgroundColor:
                  i === activeStep ? colorScheme.primary : '#4b5563',
              }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// WorkflowDemo Component
// ---------------------------------------------------------------------------
export function WorkflowDemo({ workflows, colorScheme }: WorkflowDemoProps) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide md:grid md:grid-cols-3 md:overflow-visible md:pb-0">
      {workflows.map((workflow, index) => (
        <motion.div
          key={workflow.title}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: index * 0.12, duration: 0.5 }}
          className="flex"
        >
          <WorkflowCard workflow={workflow} colorScheme={colorScheme} />
        </motion.div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helper: mini icon wrapper for step content
// ---------------------------------------------------------------------------
function StepIcon({
  icon: Icon,
  color,
}: {
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div
      className="w-10 h-10 rounded-xl flex items-center justify-center"
      style={{ backgroundColor: `${color}1a` }}
    >
      <Icon className="w-5 h-5" style={{ color }} />
    </div>
  );
}

function StepMockButton({
  label,
  color,
}: {
  label: string;
  color: string;
}) {
  return (
    <div
      className="px-4 py-1.5 rounded-full text-xs font-medium text-white"
      style={{ backgroundColor: color }}
    >
      {label}
    </div>
  );
}

function StepMockInput({ placeholder }: { placeholder: string }) {
  return (
    <div className="w-48 px-3 py-1.5 rounded-lg border border-gray-700 bg-gray-800 text-xs text-gray-400">
      {placeholder}
    </div>
  );
}

function StepMockDropdown({
  label,
  color,
}: {
  label: string;
  color: string;
}) {
  return (
    <div
      className="flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-medium"
      style={{ borderColor: `${color}40`, color }}
    >
      {label}
      <ChevronDown className="w-3 h-3" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Preset: Tasks Workflows
// ---------------------------------------------------------------------------
export const TASKS_WORKFLOWS: Workflow[] = [
  {
    title: 'Create a task in 3 taps',
    steps: [
      {
        label: 'Tap the add button',
        content: (
          <StepIcon icon={Plus} color="#3b82f6" />
        ),
      },
      {
        label: 'Type your task',
        content: <StepMockInput placeholder="Buy groceries..." />,
      },
      {
        label: 'Set a due date',
        content: <StepMockDropdown label="Due: Tomorrow" color="#3b82f6" />,
      },
      {
        label: 'Task created!',
        content: (
          <div className="flex items-center gap-2">
            <StepIcon icon={CheckCircle2} color="#22c55e" />
            <StepMockButton label="Done" color="#22c55e" />
          </div>
        ),
      },
    ],
  },
  {
    title: 'Assign to family members',
    steps: [
      {
        label: 'Open a task',
        content: <StepIcon icon={ListTodo} color="#3b82f6" />,
      },
      {
        label: 'Tap assign',
        content: <StepIcon icon={UserPlus} color="#8b5cf6" />,
      },
      {
        label: 'Pick family members',
        content: (
          <div className="flex -space-x-2">
            {['#3b82f6', '#ec4899', '#f97316'].map((c) => (
              <div
                key={c}
                className="w-8 h-8 rounded-full border-2 border-gray-800 flex items-center justify-center"
                style={{ backgroundColor: c }}
              >
                <Users className="w-4 h-4 text-white" />
              </div>
            ))}
          </div>
        ),
      },
      {
        label: 'They get notified',
        content: <StepIcon icon={Bell} color="#eab308" />,
      },
    ],
  },
  {
    title: 'Track completion',
    steps: [
      {
        label: 'View your task board',
        content: <StepIcon icon={BarChart3} color="#6366f1" />,
      },
      {
        label: 'Watch progress update',
        content: (
          <div className="w-40 h-2 rounded-full bg-gray-700 overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: '#3b82f6' }}
              initial={{ width: '30%' }}
              animate={{ width: '75%' }}
              transition={{ duration: 2, ease: 'easeInOut', repeat: Infinity, repeatType: 'reverse' }}
            />
          </div>
        ),
      },
      {
        label: 'Celebrate milestones',
        content: <StepIcon icon={Trophy} color="#f59e0b" />,
      },
      {
        label: 'Earn family rewards',
        content: <StepIcon icon={Sparkles} color="#ec4899" />,
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Preset: Calendar Workflows
// ---------------------------------------------------------------------------
export const CALENDAR_WORKFLOWS: Workflow[] = [
  {
    title: 'Add an event quickly',
    steps: [
      {
        label: 'Tap a date',
        content: <StepIcon icon={Plus} color="#a855f7" />,
      },
      {
        label: 'Enter event details',
        content: <StepMockInput placeholder="Soccer practice..." />,
      },
      {
        label: 'Set time',
        content: <StepMockDropdown label="3:30 PM" color="#a855f7" />,
      },
      {
        label: 'Event saved!',
        content: <StepIcon icon={CheckCircle2} color="#22c55e" />,
      },
    ],
  },
  {
    title: 'Share with family',
    steps: [
      {
        label: 'Open the event',
        content: <StepIcon icon={ListTodo} color="#a855f7" />,
      },
      {
        label: 'Invite members',
        content: <StepIcon icon={UserPlus} color="#6366f1" />,
      },
      {
        label: 'Everyone sees it',
        content: (
          <div className="flex -space-x-2">
            {['#a855f7', '#22c55e', '#f97316'].map((c) => (
              <div
                key={c}
                className="w-8 h-8 rounded-full border-2 border-gray-800 flex items-center justify-center"
                style={{ backgroundColor: c }}
              >
                <Users className="w-4 h-4 text-white" />
              </div>
            ))}
          </div>
        ),
      },
    ],
  },
  {
    title: 'Get reminders',
    steps: [
      {
        label: 'Set a reminder',
        content: <StepIcon icon={Bell} color="#ec4899" />,
      },
      {
        label: 'Choose when',
        content: <StepMockDropdown label="15 min before" color="#ec4899" />,
      },
      {
        label: 'Never miss it',
        content: <StepIcon icon={CheckCircle2} color="#22c55e" />,
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Preset: Goals Workflows
// ---------------------------------------------------------------------------
export const GOALS_WORKFLOWS: Workflow[] = [
  {
    title: 'Set a family goal',
    steps: [
      {
        label: 'Tap create goal',
        content: <StepIcon icon={Plus} color="#6366f1" />,
      },
      {
        label: 'Name your goal',
        content: <StepMockInput placeholder="Save for vacation..." />,
      },
      {
        label: 'Set a target',
        content: <StepMockDropdown label="Target: $2,000" color="#6366f1" />,
      },
      {
        label: 'Goal created!',
        content: <StepIcon icon={CheckCircle2} color="#22c55e" />,
      },
    ],
  },
  {
    title: 'Track daily check-ins',
    steps: [
      {
        label: 'Open your goal',
        content: <StepIcon icon={Target} color="#6366f1" />,
      },
      {
        label: 'Log progress',
        content: <StepMockButton label="Check in" color="#6366f1" />,
      },
      {
        label: 'Watch it grow',
        content: (
          <div className="w-40 h-2 rounded-full bg-gray-700 overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: '#6366f1' }}
              initial={{ width: '20%' }}
              animate={{ width: '65%' }}
              transition={{ duration: 2, ease: 'easeInOut', repeat: Infinity, repeatType: 'reverse' }}
            />
          </div>
        ),
      },
    ],
  },
  {
    title: 'Celebrate together',
    steps: [
      {
        label: 'Reach your target',
        content: <StepIcon icon={Trophy} color="#f59e0b" />,
      },
      {
        label: 'Family gets notified',
        content: <StepIcon icon={Bell} color="#eab308" />,
      },
      {
        label: 'Earn rewards',
        content: <StepIcon icon={Sparkles} color="#ec4899" />,
      },
    ],
  },
];
