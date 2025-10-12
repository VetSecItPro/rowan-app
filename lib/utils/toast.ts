/**
 * Toast Notification Utilities
 * Wrapper around Sonner toast library for consistent toast notifications
 */

import { toast, type ExternalToast } from 'sonner';

interface ToastAction {
  label: string;
  onClick: () => void;
}

/**
 * Show a success toast notification
 * @param message - Success message to display
 * @param action - Optional action button
 */
export const showSuccess = (message: string, action?: ToastAction) => {
  return toast.success(message, {
    action: action ? {
      label: action.label,
      onClick: action.onClick,
    } : undefined,
  });
};

/**
 * Show an error toast notification
 * @param message - Error message to display
 */
export const showError = (message: string) => {
  return toast.error(message);
};

/**
 * Show an info toast notification
 * @param message - Info message to display
 */
export const showInfo = (message: string) => {
  return toast.info(message);
};

/**
 * Show a loading toast notification
 * @param message - Loading message to display
 * @returns Toast ID to dismiss later
 */
export const showLoading = (message: string) => {
  return toast.loading(message);
};

/**
 * Show a promise toast with loading/success/error states
 * @param promise - Promise to track
 * @param messages - Messages for each state
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

/**
 * Dismiss a specific toast by ID
 * @param toastId - Toast ID to dismiss
 */
export const dismissToast = (toastId: string | number) => {
  toast.dismiss(toastId);
};

/**
 * Dismiss all toasts
 */
export const dismissAllToasts = () => {
  toast.dismiss();
};
