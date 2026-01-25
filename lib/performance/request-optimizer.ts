/**
 * Request Optimizer for Poor Connectivity
 *
 * Network-aware request handling with:
 * - Request prioritization (critical vs background)
 * - Timeout adaptation based on connection quality
 * - Request batching for slow networks
 * - Smaller payloads on poor connections
 */

import { type ConnectionQuality } from '@/lib/native/network';

// Simple sync check using browser API
function getConnectionQualitySync(): ConnectionQuality {
  if (typeof navigator === 'undefined') return 'good';
  if (!navigator.onLine) return 'offline';

  // Check Network Information API if available
  const connection = (navigator as Navigator & { connection?: { effectiveType?: string } })
    .connection;
  if (connection?.effectiveType) {
    switch (connection.effectiveType) {
      case '4g':
        return 'excellent';
      case '3g':
        return 'good';
      case '2g':
      case 'slow-2g':
        return 'poor';
    }
  }

  return 'good';
}

/** Request priority levels */
export type RequestPriority = 'critical' | 'high' | 'normal' | 'low' | 'background';

/** Request configuration */
export interface OptimizedRequestConfig {
  /** Request priority */
  priority?: RequestPriority;
  /** Allow reduced payload on poor connections */
  allowReducedPayload?: boolean;
  /** Fields to exclude on poor connections */
  excludeOnPoorConnection?: string[];
  /** Whether to batch with other requests */
  batchable?: boolean;
  /** Batch key for grouping */
  batchKey?: string;
  /** Custom timeout override (ms) */
  timeout?: number;
  /** Retry configuration */
  retry?: {
    maxRetries?: number;
    retryDelay?: number;
  };
}

/** Default timeouts by connection quality (ms) */
const QUALITY_TIMEOUTS: Record<ConnectionQuality, number> = {
  excellent: 10000, // 10s
  good: 15000,      // 15s
  poor: 25000,      // 25s (more patience on slow networks)
  offline: 0,       // Don't try
};

/** Default timeouts by priority (ms) - base values adjusted by quality */
const PRIORITY_TIMEOUT_MULTIPLIERS: Record<RequestPriority, number> = {
  critical: 1.5,    // Critical gets more time
  high: 1.2,
  normal: 1.0,
  low: 0.8,
  background: 0.6,  // Background times out faster
};

/** Batch queue for combining requests */
interface BatchedRequest {
  url: string;
  options: RequestInit;
  config: OptimizedRequestConfig;
  resolve: (value: Response) => void;
  reject: (error: Error) => void;
  timestamp: number;
}

const batchQueue: Map<string, BatchedRequest[]> = new Map();
let batchTimer: NodeJS.Timeout | null = null;
const BATCH_DELAY = 100; // ms to wait for more requests

/**
 * Get optimized timeout based on connection quality and priority
 */
export function getOptimizedTimeout(
  priority: RequestPriority = 'normal',
  customTimeout?: number
): number {
  if (customTimeout) return customTimeout;

  const quality = getConnectionQualitySync();
  if (quality === 'offline') return 0;

  const baseTimeout = QUALITY_TIMEOUTS[quality];
  const multiplier = PRIORITY_TIMEOUT_MULTIPLIERS[priority];

  return Math.round(baseTimeout * multiplier);
}

/**
 * Check if request should proceed based on network conditions
 */
export function shouldProceedWithRequest(priority: RequestPriority = 'normal'): boolean {
  const quality = getConnectionQualitySync();

  // Always allow critical requests (they'll queue if offline)
  if (priority === 'critical') return true;

  // Block all non-critical when offline
  if (quality === 'offline') return false;

  // On poor connection, only allow critical and high priority
  if (quality === 'poor' && (priority === 'low' || priority === 'background')) {
    return false;
  }

  return true;
}

/**
 * Reduce payload size for poor connections
 */
export function reducePayload<T extends Record<string, unknown>>(
  data: T,
  excludeFields: string[] = []
): Partial<T> {
  const quality = getConnectionQualitySync();

  // Only reduce on poor connections
  if (quality !== 'poor') return data;

  const reduced = { ...data };
  for (const field of excludeFields) {
    delete reduced[field];
  }

  return reduced;
}

/** Default fields to exclude on poor connections */
const DEFAULT_EXCLUDE_FIELDS = [
  'metadata',
  'extra',
  'debug',
  'analytics',
  'tracking',
  'full_description',
  'large_content',
  'attachments',
  'history',
  'comments',
];

/** Recommended page sizes by connection quality */
const PAGE_SIZES: Record<ConnectionQuality, number> = {
  excellent: 50,
  good: 30,
  poor: 10,
  offline: 5,
};

/**
 * Get recommended page size based on connection quality
 */
export function getOptimizedPageSize(defaultSize: number = 20): number {
  const quality = getConnectionQualitySync();
  return Math.min(defaultSize, PAGE_SIZES[quality]);
}

/**
 * Get optimized query parameters for API requests
 */
export function getOptimizedQueryParams(
  params: Record<string, string | number | boolean> = {}
): Record<string, string | number | boolean> {
  const quality = getConnectionQualitySync();

  const optimized = { ...params };

  // Add limit if not specified
  if (!optimized.limit) {
    optimized.limit = PAGE_SIZES[quality];
  }

  // On poor connections, request minimal fields
  if (quality === 'poor') {
    optimized.fields = 'minimal';
  }

  return optimized;
}

/**
 * Auto-reduce payload for API requests
 */
export function optimizeRequestBody<T extends Record<string, unknown>>(
  body: T,
  options: {
    excludeFields?: string[];
    useDefaults?: boolean;
    maxStringLength?: number;
  } = {}
): Partial<T> {
  const quality = getConnectionQualitySync();

  // No optimization needed on good connections
  if (quality === 'excellent' || quality === 'good') {
    return body;
  }

  const { excludeFields = [], useDefaults = true, maxStringLength = 1000 } = options;

  const fieldsToExclude = useDefaults
    ? [...DEFAULT_EXCLUDE_FIELDS, ...excludeFields]
    : excludeFields;

  const optimized = { ...body };

  // Remove excluded fields
  for (const field of fieldsToExclude) {
    delete optimized[field];
  }

  // Truncate long strings
  for (const [key, value] of Object.entries(optimized)) {
    if (typeof value === 'string' && value.length > maxStringLength) {
      (optimized as Record<string, unknown>)[key] = value.slice(0, maxStringLength) + '...';
    }
  }

  return optimized;
}

/**
 * Get optimized image quality based on connection
 */
export function getOptimizedImageQuality(): { quality: number; format: string } {
  const quality = getConnectionQualitySync();

  switch (quality) {
    case 'excellent':
      return { quality: 90, format: 'webp' };
    case 'good':
      return { quality: 80, format: 'webp' };
    case 'poor':
      return { quality: 50, format: 'webp' };
    case 'offline':
      return { quality: 30, format: 'webp' };
  }
}

/**
 * Build optimized image URL (for services that support query params)
 */
export function getOptimizedImageUrl(
  baseUrl: string,
  options: { width?: number; height?: number } = {}
): string {
  const { quality, format } = getOptimizedImageQuality();
  const connectionQuality = getConnectionQualitySync();

  // Reduce dimensions on poor connections
  let width = options.width;
  let height = options.height;

  if (connectionQuality === 'poor') {
    if (width) width = Math.round(width * 0.5);
    if (height) height = Math.round(height * 0.5);
  }

  // Build URL with optimization params
  const url = new URL(baseUrl, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');

  url.searchParams.set('q', String(quality));
  url.searchParams.set('fm', format);
  if (width) url.searchParams.set('w', String(width));
  if (height) url.searchParams.set('h', String(height));

  return url.toString();
}

/**
 * Create AbortController with timeout
 */
export function createTimeoutController(timeout: number): {
  controller: AbortController;
  timeoutId: NodeJS.Timeout;
} {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  return { controller, timeoutId };
}

/**
 * Optimized fetch with network awareness
 */
export async function optimizedFetch(
  url: string,
  options: RequestInit = {},
  config: OptimizedRequestConfig = {}
): Promise<Response> {
  const {
    priority = 'normal',
    allowReducedPayload = false,
    excludeOnPoorConnection = [],
    batchable = false,
    batchKey,
    timeout: customTimeout,
    retry = {},
  } = config;

  // Check if we should proceed
  if (!shouldProceedWithRequest(priority)) {
    throw new Error('Request blocked due to poor network conditions');
  }

  // Handle batching for batchable requests
  if (batchable && batchKey && getConnectionQualitySync() === 'poor') {
    return new Promise((resolve, reject) => {
      addToBatch(url, options, config, resolve, reject);
    });
  }

  const timeout = getOptimizedTimeout(priority, customTimeout);
  const { maxRetries = 2, retryDelay = 1000 } = retry;

  // Reduce payload on poor connections
  let processedOptions = options;
  if (allowReducedPayload && options.body && typeof options.body === 'string') {
    try {
      const data = JSON.parse(options.body);
      const reducedData = reducePayload(data, excludeOnPoorConnection);
      processedOptions = {
        ...options,
        body: JSON.stringify(reducedData),
      };
    } catch {
      // Not JSON, keep original
    }
  }

  // Execute with timeout and retries
  return executeWithRetry(url, processedOptions, timeout, maxRetries, retryDelay);
}

/**
 * Execute fetch with retry logic
 */
async function executeWithRetry(
  url: string,
  options: RequestInit,
  timeout: number,
  maxRetries: number,
  retryDelay: number
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const { controller, timeoutId } = createTimeoutController(timeout);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Retry on server errors (5xx)
      if (response.status >= 500 && attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay * (attempt + 1)));
        continue;
      }

      return response;
    } catch (error) {
      lastError = error as Error;

      // Don't retry on abort (timeout) if offline
      if (getConnectionQualitySync() === 'offline') {
        throw new Error('Network offline');
      }

      // Retry on network errors
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay * (attempt + 1)));
        continue;
      }
    }
  }

  throw lastError || new Error('Request failed after retries');
}

/**
 * Add request to batch queue
 */
function addToBatch(
  url: string,
  options: RequestInit,
  config: OptimizedRequestConfig,
  resolve: (value: Response) => void,
  reject: (error: Error) => void
): void {
  const batchKey = config.batchKey || 'default';

  if (!batchQueue.has(batchKey)) {
    batchQueue.set(batchKey, []);
  }

  batchQueue.get(batchKey)!.push({
    url,
    options,
    config,
    resolve,
    reject,
    timestamp: Date.now(),
  });

  // Schedule batch processing
  if (!batchTimer) {
    batchTimer = setTimeout(processBatches, BATCH_DELAY);
  }
}

/**
 * Process all batched requests
 */
async function processBatches(): Promise<void> {
  batchTimer = null;

  for (const [batchKey, requests] of batchQueue) {
    if (requests.length === 0) continue;

    // Clear the queue for this batch key
    batchQueue.set(batchKey, []);

    // If only one request, execute normally
    if (requests.length === 1) {
      const req = requests[0];
      try {
        const response = await executeWithRetry(
          req.url,
          req.options,
          getOptimizedTimeout(req.config.priority),
          2,
          1000
        );
        req.resolve(response);
      } catch (error) {
        req.reject(error as Error);
      }
      continue;
    }

    // Multiple requests - execute sequentially on poor connection
    // (parallel might overwhelm slow network)
    for (const req of requests) {
      try {
        const response = await executeWithRetry(
          req.url,
          req.options,
          getOptimizedTimeout(req.config.priority),
          2,
          1000
        );
        req.resolve(response);
      } catch (error) {
        req.reject(error as Error);
      }
    }
  }
}

/**
 * Get current request queue status
 */
export function getBatchQueueStatus(): { pending: number; batches: number } {
  let pending = 0;
  for (const requests of batchQueue.values()) {
    pending += requests.length;
  }
  return {
    pending,
    batches: batchQueue.size,
  };
}

/**
 * Clear all pending batched requests
 */
export function clearBatchQueue(): void {
  for (const requests of batchQueue.values()) {
    for (const req of requests) {
      req.reject(new Error('Batch queue cleared'));
    }
  }
  batchQueue.clear();
  if (batchTimer) {
    clearTimeout(batchTimer);
    batchTimer = null;
  }
}

/**
 * Preload critical data with high priority
 */
export async function preloadCritical(urls: string[]): Promise<void> {
  const quality = getConnectionQualitySync();
  if (quality === 'offline') return;

  // On poor connection, limit preloading
  const urlsToPreload = quality === 'poor' ? urls.slice(0, 3) : urls;

  await Promise.allSettled(
    urlsToPreload.map((url) =>
      optimizedFetch(url, { method: 'GET' }, { priority: 'background' })
    )
  );
}
