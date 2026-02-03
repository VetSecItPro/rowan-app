import React, { useEffect, useRef, useCallback } from 'react';

interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

type DialogChildProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onClick?: React.MouseEventHandler;
};

export const Dialog: React.FC<DialogProps> = ({ open, onOpenChange, children }) => {
  return (
    <div data-state={open ? 'open' : 'closed'}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<DialogChildProps>, {
            open,
            onOpenChange,
          });
        }
        return child;
      })}
    </div>
  );
};

interface DialogTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const DialogTrigger = React.forwardRef<HTMLButtonElement, DialogTriggerProps>(
  ({ className = '', children, open, onOpenChange, asChild, ...props }, ref) => {
    const handleClick = () => {
      onOpenChange?.(!open);
    };

    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement<DialogChildProps>, {
        onClick: handleClick,
      });
    }

    return (
      <button
        ref={ref}
        className={className}
        onClick={handleClick}
        {...props}
      >
        {children}
      </button>
    );
  }
);

DialogTrigger.displayName = 'DialogTrigger';

interface DialogPortalProps {
  children: React.ReactNode;
}

export const DialogPortal: React.FC<DialogPortalProps> = ({ children }) => {
  // Simple portal implementation - in a real app you'd use createPortal
  return <>{children}</>;
};

interface DialogOverlayProps extends React.HTMLAttributes<HTMLDivElement> {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const DialogOverlay = React.forwardRef<HTMLDivElement, DialogOverlayProps>(
  ({ className = '', open, onOpenChange, ...props }, ref) => {
    if (!open) return null;

    return (
      <div
        ref={ref}
        className={`fixed inset-0 z-50 bg-background/80 backdrop-blur-sm ${className}`}
        onClick={() => onOpenChange?.(false)}
        {...props}
      />
    );
  }
);

DialogOverlay.displayName = 'DialogOverlay';

// Focus trap constants
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'button:not([disabled])',
  'iframe',
  'object',
  'embed',
  '[contenteditable]',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  ({ className = '', children, open, onOpenChange, ...props }, ref) => {
    const internalRef = useRef<HTMLDivElement>(null);
    const dialogRef = (ref as React.RefObject<HTMLDivElement>) || internalRef;
    const previouslyFocusedRef = useRef<HTMLElement | null>(null);

    const getFocusableElements = useCallback(() => {
      const container = dialogRef.current ?? internalRef.current;
      if (!container) return [];
      const elements = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      return Array.from(elements).filter((el) => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden';
      });
    }, [dialogRef]);

    // Handle Escape key
    useEffect(() => {
      if (!open) return;
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onOpenChange?.(false);
        }
      };
      window.addEventListener('keydown', handleEscape);
      return () => window.removeEventListener('keydown', handleEscape);
    }, [open, onOpenChange]);

    // Focus trap and auto-focus
    useEffect(() => {
      if (!open) return;

      previouslyFocusedRef.current = document.activeElement as HTMLElement;

      // Auto-focus first focusable element
      requestAnimationFrame(() => {
        const elements = getFocusableElements();
        if (elements.length > 0) {
          elements[0].focus();
        }
      });

      const handleTabKey = (event: KeyboardEvent) => {
        if (event.key !== 'Tab') return;

        const elements = getFocusableElements();
        if (elements.length === 0) return;

        const firstElement = elements[0];
        const lastElement = elements[elements.length - 1];
        const activeElement = document.activeElement as HTMLElement;

        if (event.shiftKey) {
          const container = dialogRef.current ?? internalRef.current;
          if (activeElement === firstElement || !container?.contains(activeElement)) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          const container = dialogRef.current ?? internalRef.current;
          if (activeElement === lastElement || !container?.contains(activeElement)) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      };

      document.addEventListener('keydown', handleTabKey);

      return () => {
        document.removeEventListener('keydown', handleTabKey);
        if (previouslyFocusedRef.current) {
          requestAnimationFrame(() => {
            previouslyFocusedRef.current?.focus();
          });
        }
      };
    }, [open, getFocusableElements, dialogRef]);

    if (!open) return null;

    return (
      <>
        <DialogOverlay open={open} onOpenChange={onOpenChange} />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
            className={`relative z-50 grid w-full max-w-lg gap-4 border bg-background p-6 shadow-lg duration-200 sm:rounded-lg ${className}`}
            onClick={(e) => e.stopPropagation()}
            {...props}
          >
            {children}
          </div>
        </div>
      </>
    );
  }
);

DialogContent.displayName = 'DialogContent';

type DialogHeaderProps = React.HTMLAttributes<HTMLDivElement>;

export const DialogHeader = React.forwardRef<HTMLDivElement, DialogHeaderProps>(
  ({ className = '', ...props }, ref) => (
    <div
      ref={ref}
      className={`flex flex-col space-y-1.5 text-center sm:text-left ${className}`}
      {...props}
    />
  )
);

DialogHeader.displayName = 'DialogHeader';

type DialogFooterProps = React.HTMLAttributes<HTMLDivElement>;

export const DialogFooter = React.forwardRef<HTMLDivElement, DialogFooterProps>(
  ({ className = '', ...props }, ref) => (
    <div
      ref={ref}
      className={`flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 ${className}`}
      {...props}
    />
  )
);

DialogFooter.displayName = 'DialogFooter';

type DialogTitleProps = React.HTMLAttributes<HTMLHeadingElement>;

export const DialogTitle = React.forwardRef<HTMLHeadingElement, DialogTitleProps>(
  ({ className = '', id = 'dialog-title', ...props }, ref) => (
    <h2
      ref={ref}
      id={id}
      className={`text-lg font-semibold leading-none tracking-tight ${className}`}
      {...props}
    />
  )
);

DialogTitle.displayName = 'DialogTitle';

type DialogDescriptionProps = React.HTMLAttributes<HTMLParagraphElement>;

export const DialogDescription = React.forwardRef<HTMLParagraphElement, DialogDescriptionProps>(
  ({ className = '', ...props }, ref) => (
    <p
      ref={ref}
      className={`text-sm text-muted-foreground ${className}`}
      {...props}
    />
  )
);

DialogDescription.displayName = 'DialogDescription';
