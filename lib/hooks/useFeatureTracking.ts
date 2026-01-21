'use client';

/**
 * Feature Usage Tracking Hook
 *
 * Provides methods to track user interactions with app features.
 * Automatically handles session management and batching.
 *
 * Usage:
 *   const { trackPageView, trackAction } = useFeatureTracking();
 *
 *   // Track page view (usually in useEffect)
 *   useEffect(() => {
 *     trackPageView('tasks');
 *   }, [trackPageView]);
 *
 *   // Track user actions
 *   const handleCreateTask = async () => {
 *     await createTask(data);
 *     trackAction('tasks', 'create', { taskId: newTask.id });
 *   };
 */

import { useCallback, useEffect, useRef } from 'react';
import { logger } from '@/lib/logger';
import { csrfFetch } from '@/lib/utils/csrf-fetch';

// Feature names must match the API validation
export type FeatureName =
  | 'dashboard'
  | 'tasks'
  | 'calendar'
  | 'reminders'
  | 'shopping'
  | 'meals'
  | 'recipes'
  | 'messages'
  | 'goals'
  | 'household'
  | 'projects'
  | 'expenses'
  | 'rewards'
  | 'checkin'
  | 'settings';

// Action types must match the API validation
export type ActionType =
  | 'page_view'
  | 'create'
  | 'update'
  | 'delete'
  | 'complete'
  | 'share'
  | 'export'
  | 'import'
  | 'search'
  | 'filter';

interface TrackingEvent {
  feature: FeatureName;
  action: ActionType;
  metadata?: Record<string, unknown>;
  sessionId?: string;
}

// Session ID persists for the browser session
let sessionId: string | null = null;

function getSessionId(): string {
  if (typeof window === 'undefined') return '';

  if (!sessionId) {
    // Check sessionStorage first
    sessionId = sessionStorage.getItem('rowan_session_id');

    if (!sessionId) {
      // Generate new session ID
      sessionId = crypto.randomUUID();
      sessionStorage.setItem('rowan_session_id', sessionId);
    }
  }

  return sessionId;
}

// Event queue for batching
const eventQueue: TrackingEvent[] = [];
let flushTimeout: NodeJS.Timeout | null = null;

// Flush interval in ms
const FLUSH_INTERVAL = 5000;
const MAX_QUEUE_SIZE = 20;

async function flushEvents(): Promise<void> {
  if (eventQueue.length === 0) return;

  // Copy and clear queue
  const events = [...eventQueue];
  eventQueue.length = 0;

  try {
    const response = await csrfFetch('/api/analytics/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ events }),
    });

    if (!response.ok) {
      // Re-queue events on failure (up to a limit)
      if (eventQueue.length < MAX_QUEUE_SIZE) {
        eventQueue.push(...events.slice(0, MAX_QUEUE_SIZE - eventQueue.length));
      }
      logger.error('Failed to track events:', undefined, { component: 'lib-useFeatureTracking', action: 'service_call', details: response.status });
    }
  } catch (error) {
    // Re-queue events on network error
    if (eventQueue.length < MAX_QUEUE_SIZE) {
      eventQueue.push(...events.slice(0, MAX_QUEUE_SIZE - eventQueue.length));
    }
    logger.error('Error tracking events:', error, { component: 'lib-useFeatureTracking', action: 'service_call' });
  }
}

function scheduleFlush(): void {
  if (flushTimeout) return;

  flushTimeout = setTimeout(() => {
    flushTimeout = null;
    flushEvents();
  }, FLUSH_INTERVAL);
}

function queueEvent(event: TrackingEvent): void {
  eventQueue.push({
    ...event,
    sessionId: getSessionId(),
  });

  // Flush immediately if queue is full
  if (eventQueue.length >= MAX_QUEUE_SIZE) {
    if (flushTimeout) {
      clearTimeout(flushTimeout);
      flushTimeout = null;
    }
    flushEvents();
  } else {
    scheduleFlush();
  }
}

// Track immediately for important events (without batching)
async function trackImmediate(event: TrackingEvent): Promise<void> {
  try {
    await csrfFetch('/api/analytics/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...event,
        sessionId: getSessionId(),
      }),
    });
  } catch (error) {
    logger.error('Error tracking event:', error, { component: 'lib-useFeatureTracking', action: 'service_call' });
  }
}

// Flush on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (eventQueue.length > 0) {
      // Use sendBeacon for reliable delivery on page close
      const data = JSON.stringify({ events: eventQueue });
      navigator.sendBeacon('/api/analytics/track', data);
    }
  });

  // Also flush on visibility change (tab hidden)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && eventQueue.length > 0) {
      const data = JSON.stringify({ events: eventQueue });
      navigator.sendBeacon('/api/analytics/track', data);
      eventQueue.length = 0;
    }
  });
}

/**
 * Hook for tracking feature usage
 */
export function useFeatureTracking() {
  const lastPageView = useRef<string | null>(null);

  /**
   * Track a page view for a feature
   * Automatically deduplicates consecutive views of the same page
   */
  const trackPageView = useCallback((feature: FeatureName, metadata?: Record<string, unknown>) => {
    // Prevent duplicate page views
    const key = `${feature}-${JSON.stringify(metadata || {})}`;
    if (lastPageView.current === key) return;
    lastPageView.current = key;

    queueEvent({
      feature,
      action: 'page_view',
      metadata,
    });
  }, []);

  /**
   * Track a user action
   */
  const trackAction = useCallback(
    (feature: FeatureName, action: Exclude<ActionType, 'page_view'>, metadata?: Record<string, unknown>) => {
      queueEvent({
        feature,
        action,
        metadata,
      });
    },
    []
  );

  /**
   * Track an action immediately (without batching)
   * Use for critical events like purchases
   */
  const trackActionImmediate = useCallback(
    async (feature: FeatureName, action: ActionType, metadata?: Record<string, unknown>) => {
      await trackImmediate({
        feature,
        action,
        metadata,
      });
    },
    []
  );

  return {
    trackPageView,
    trackAction,
    trackActionImmediate,
  };
}

/**
 * Component to track page view automatically
 * Usage: <FeaturePageTracker feature="tasks" />
 */
export function FeaturePageTracker({
  feature,
  metadata,
}: {
  feature: FeatureName;
  metadata?: Record<string, unknown>;
}) {
  const { trackPageView } = useFeatureTracking();

  useEffect(() => {
    trackPageView(feature, metadata);
  }, [feature, metadata, trackPageView]);

  return null;
}

export default useFeatureTracking;
