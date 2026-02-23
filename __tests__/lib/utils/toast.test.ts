/**
 * Unit tests for lib/utils/toast.ts
 *
 * Tests toast notification utilities.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  showSuccess,
  showError,
  showInfo,
  showWarning,
  showLoading,
  showPromise,
  dismissToast,
  dismissAllToasts,
} from '@/lib/utils/toast';

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    loading: vi.fn(),
    promise: vi.fn(),
    dismiss: vi.fn(),
  },
}));

describe('showSuccess', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call toast.success with message', async () => {
    const { toast } = await import('sonner');

    showSuccess('Operation completed');

    expect(toast.success).toHaveBeenCalledWith('Operation completed', expect.any(Object));
  });

  it('should support legacy action format', async () => {
    const { toast } = await import('sonner');
    const action = { label: 'Undo', onClick: vi.fn() };

    showSuccess('Item deleted', action);

    expect(toast.success).toHaveBeenCalledWith('Item deleted', {
      action: { label: 'Undo', onClick: action.onClick },
      duration: undefined,
      description: undefined,
    });
  });

  it('should support extended options format', async () => {
    const { toast } = await import('sonner');
    const action = { label: 'View', onClick: vi.fn() };

    showSuccess('Upload complete', { action, duration: 5000, description: 'File uploaded' });

    expect(toast.success).toHaveBeenCalledWith('Upload complete', {
      action: { label: 'View', onClick: action.onClick },
      duration: 5000,
      description: 'File uploaded',
    });
  });

  it('should work without action', async () => {
    const { toast } = await import('sonner');

    showSuccess('Success!');

    expect(toast.success).toHaveBeenCalledWith('Success!', {
      action: undefined,
      duration: undefined,
      description: undefined,
    });
  });

  it('should support custom duration', async () => {
    const { toast } = await import('sonner');

    showSuccess('Done', { duration: 3000 });

    expect(toast.success).toHaveBeenCalledWith('Done', expect.objectContaining({ duration: 3000 }));
  });

  it('should support description', async () => {
    const { toast } = await import('sonner');

    showSuccess('Saved', { description: 'Changes saved successfully' });

    expect(toast.success).toHaveBeenCalledWith('Saved', expect.objectContaining({ description: 'Changes saved successfully' }));
  });
});

describe('showError', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call toast.error with message', async () => {
    const { toast } = await import('sonner');

    showError('Operation failed');

    expect(toast.error).toHaveBeenCalledWith('Operation failed', expect.any(Object));
  });

  it('should use default 6000ms duration for errors', async () => {
    const { toast } = await import('sonner');

    showError('Error occurred');

    expect(toast.error).toHaveBeenCalledWith('Error occurred', expect.objectContaining({ duration: 6000 }));
  });

  it('should allow custom duration override', async () => {
    const { toast } = await import('sonner');

    showError('Error', { duration: 10000 });

    expect(toast.error).toHaveBeenCalledWith('Error', expect.objectContaining({ duration: 10000 }));
  });

  it('should support action and description', async () => {
    const { toast } = await import('sonner');
    const action = { label: 'Retry', onClick: vi.fn() };

    showError('Failed to save', { action, description: 'Network error' });

    expect(toast.error).toHaveBeenCalledWith('Failed to save', {
      action: { label: 'Retry', onClick: action.onClick },
      duration: 6000,
      description: 'Network error',
    });
  });
});

describe('showInfo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call toast.info with message', async () => {
    const { toast } = await import('sonner');

    showInfo('New update available');

    expect(toast.info).toHaveBeenCalledWith('New update available', expect.any(Object));
  });

  it('should support action', async () => {
    const { toast } = await import('sonner');
    const action = { label: 'Learn more', onClick: vi.fn() };

    showInfo('Feature released', action);

    expect(toast.info).toHaveBeenCalledWith('Feature released', expect.objectContaining({ action }));
  });
});

describe('showWarning', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call toast.warning with message', async () => {
    const { toast } = await import('sonner');

    showWarning('Low storage space');

    expect(toast.warning).toHaveBeenCalledWith('Low storage space', expect.any(Object));
  });

  it('should use default 5000ms duration for warnings', async () => {
    const { toast } = await import('sonner');

    showWarning('Warning!');

    expect(toast.warning).toHaveBeenCalledWith('Warning!', expect.objectContaining({ duration: 5000 }));
  });

  it('should allow custom duration override', async () => {
    const { toast } = await import('sonner');

    showWarning('Attention', { duration: 8000 });

    expect(toast.warning).toHaveBeenCalledWith('Attention', expect.objectContaining({ duration: 8000 }));
  });
});

describe('showLoading', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call toast.loading with message', async () => {
    const { toast } = await import('sonner');

    showLoading('Processing...');

    expect(toast.loading).toHaveBeenCalledWith('Processing...');
  });

  it('should return toast ID', async () => {
    const { toast } = await import('sonner');
    (toast.loading as ReturnType<typeof vi.fn>).mockReturnValue('toast-123');

    const id = showLoading('Loading...');

    expect(id).toBe('toast-123');
  });
});

describe('showPromise', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call toast.promise with promise and messages', async () => {
    const { toast } = await import('sonner');
    const promise = Promise.resolve('done');
    const messages = {
      loading: 'Saving...',
      success: 'Saved!',
      error: 'Failed to save',
    };

    showPromise(promise, messages);

    expect(toast.promise).toHaveBeenCalledWith(promise, messages);
  });

  it('should handle promise rejection', async () => {
    const { toast } = await import('sonner');
    const promise = Promise.reject(new Error('error')).catch(() => {}); // Catch to prevent unhandled rejection
    const messages = {
      loading: 'Loading...',
      success: 'Success!',
      error: 'Error!',
    };

    showPromise(promise, messages);

    expect(toast.promise).toHaveBeenCalled();
  });
});

describe('dismissToast', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call toast.dismiss with toast ID', async () => {
    const { toast } = await import('sonner');

    dismissToast('toast-123');

    expect(toast.dismiss).toHaveBeenCalledWith('toast-123');
  });

  it('should accept number ID', async () => {
    const { toast } = await import('sonner');

    dismissToast(456);

    expect(toast.dismiss).toHaveBeenCalledWith(456);
  });
});

describe('dismissAllToasts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call toast.dismiss with no arguments', async () => {
    const { toast } = await import('sonner');

    dismissAllToasts();

    expect(toast.dismiss).toHaveBeenCalledWith();
  });
});
