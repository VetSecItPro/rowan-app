import React from 'react';

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

interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  ({ className = '', children, open, onOpenChange, ...props }, ref) => {
    if (!open) return null;

    return (
      <>
        <DialogOverlay open={open} onOpenChange={onOpenChange} />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            ref={ref}
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
  ({ className = '', ...props }, ref) => (
    <h2
      ref={ref}
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
