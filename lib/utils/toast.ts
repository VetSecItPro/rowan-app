/**
 * Toast Notification Utilities
 * Wrapper around Sonner toast library for consistent toast notifications.
 *
 * Types:
 *   - success (green)  -- operation completed
 *   - error   (red)    -- something went wrong
 *   - info    (blue)   -- neutral information
 *   - warning (amber)  -- caution / non-blocking issue
 *   - loading          -- spinner while an async op is in-flight
 *   - promise          -- auto-transitions loading -> success / error
 *
 * All toasts respect the global Toaster config in app/layout.tsx:
 *   position: top-center, duration: 4s, visibleToasts: 3,
 *   swipe-to-dismiss (right + top), dark theme, richColors.
 */

import { toast } from 'sonner';

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastOptions {
  /** Optional action button displayed inside the toast */
  action?: ToastAction;
  /** Override default duration in ms (default 4000) */
  duration?: number;
  /** Optional description text shown below the main message */
  description?: string;
}

/**
 * Normalize the second argument so callers can pass either:
 *   - `{ label, onClick }` (legacy / shorthand)
 *   - `{ action: { label, onClick }, duration?, description? }` (extended)
 */
function normalizeOptions(arg?: ToastAction | ToastOptions): ToastOptions | undefined {
  if (!arg) return undefined;
  // Legacy shape: has `label` directly
  if ('label' in arg && 'onClick' in arg && !('action' in arg)) {
    return { action: arg as ToastAction };
  }
  return arg as ToastOptions;
}

// ---------------------------------------------------------------------------
// Core types
// ---------------------------------------------------------------------------

/**
 * Show a success toast notification (green accent).
 */
export const showSuccess = (message: string, optionsOrAction?: ToastAction | ToastOptions) => {
  const options = normalizeOptions(optionsOrAction);
  return toast.success(message, {
    action: options?.action ? {
      label: options.action.label,
      onClick: options.action.onClick,
    } : undefined,
    duration: options?.duration,
    description: options?.description,
  });
};

/**
 * Show an error toast notification (red accent).
 */
export const showError = (message: string, optionsOrAction?: ToastAction | ToastOptions) => {
  const options = normalizeOptions(optionsOrAction);
  return toast.error(message, {
    action: options?.action ? {
      label: options.action.label,
      onClick: options.action.onClick,
    } : undefined,
    duration: options?.duration ?? 6000, // errors stay longer by default
    description: options?.description,
  });
};

/**
 * Show an info toast notification (blue accent).
 */
export const showInfo = (message: string, optionsOrAction?: ToastAction | ToastOptions) => {
  const options = normalizeOptions(optionsOrAction);
  return toast.info(message, {
    action: options?.action ? {
      label: options.action.label,
      onClick: options.action.onClick,
    } : undefined,
    duration: options?.duration,
    description: options?.description,
  });
};

/**
 * Show a warning toast notification (amber accent).
 */
export const showWarning = (message: string, optionsOrAction?: ToastAction | ToastOptions) => {
  const options = normalizeOptions(optionsOrAction);
  return toast.warning(message, {
    action: options?.action ? {
      label: options.action.label,
      onClick: options.action.onClick,
    } : undefined,
    duration: options?.duration ?? 5000, // warnings stay a bit longer
    description: options?.description,
  });
};

// ---------------------------------------------------------------------------
// Async helpers
// ---------------------------------------------------------------------------

/**
 * Show a loading toast notification (spinner).
 * @returns Toast ID -- pass to `dismissToast` when the operation completes.
 */
export const showLoading = (message: string) => {
  return toast.loading(message);
};

/**
 * Show a promise toast with loading / success / error states.
 * The toast automatically transitions as the promise resolves or rejects.
 */
export const showPromise = <T,>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string;
    error: string;
  }
) => {
  return toast.promise(promise, messages);
};

// ---------------------------------------------------------------------------
// Dismiss helpers
// ---------------------------------------------------------------------------

/**
 * Dismiss a specific toast by ID.
 */
export const dismissToast = (toastId: string | number) => {
  toast.dismiss(toastId);
};

/**
 * Dismiss all visible toasts.
 */
export const dismissAllToasts = () => {
  toast.dismiss();
};
