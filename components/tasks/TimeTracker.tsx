'use client';

import { useState, useEffect, useCallback } from 'react';
import { Play, Pause, Clock } from 'lucide-react';
import { taskTimeTrackingService, type TimeEntry } from '@/lib/services/task-time-tracking-service';
import { logger } from '@/lib/logger';

interface TimeTrackerProps {
  taskId: string;
  userId: string;
}

export function TimeTracker({ taskId, userId }: TimeTrackerProps) {
  const [isTracking, setIsTracking] = useState(false);
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [totalTime, setTotalTime] = useState(0);

  const checkActiveTimer = useCallback(async () => {
    try {
      const active = await taskTimeTrackingService.getActiveTimer(userId);
      if (active && active.task_id === taskId) {
        setActiveEntry(active);
        setIsTracking(true);
      }
    } catch (error) {
      logger.error('Error checking timer:', error, { component: 'TimeTracker', action: 'component_action' });
    }
  }, [taskId, userId]);

  const loadTotalTime = useCallback(async () => {
    try {
      const total = await taskTimeTrackingService.getTotalDuration(taskId);
      setTotalTime(total);
    } catch (error) {
      logger.error('Error loading time:', error, { component: 'TimeTracker', action: 'component_action' });
    }
  }, [taskId]);

  useEffect(() => {
    checkActiveTimer();
    loadTotalTime();
  }, [checkActiveTimer, loadTotalTime]);

  useEffect(() => {
    if (isTracking && activeEntry) {
      const interval = setInterval(() => {
        setElapsed(Math.floor((Date.now() - new Date(activeEntry.start_time).getTime()) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isTracking, activeEntry]);

  async function startTimer() {
    try {
      const entry = await taskTimeTrackingService.startTimer(taskId, userId);
      setActiveEntry(entry);
      setIsTracking(true);
    } catch (error) {
      logger.error('Error starting timer:', error, { component: 'TimeTracker', action: 'component_action' });
    }
  }

  async function stopTimer() {
    try {
      if (activeEntry) {
        await taskTimeTrackingService.stopTimer(activeEntry.id);
        setIsTracking(false);
        setActiveEntry(null);
        setElapsed(0);
        loadTotalTime();
      }
    } catch (error) {
      logger.error('Error stopping timer:', error, { component: 'TimeTracker', action: 'component_action' });
    }
  }

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-gray-500" />
        <span className="text-sm text-gray-400">
          {totalTime > 0 ? `${Math.floor(totalTime / 60)}h ${totalTime % 60}m` : 'No time tracked'}
        </span>
      </div>

      {isTracking ? (
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono text-blue-600">{formatTime(elapsed)}</span>
          <button
            onClick={stopTimer}
            className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          onClick={startTimer}
          className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
        >
          <Play className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
