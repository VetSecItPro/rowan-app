import React from 'react';

interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  onValueChange: (value: string) => void;
  defaultValue?: string;
}

/** Provides a tabbed interface container with value state management. */
export const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  ({ className = '', value, onValueChange, defaultValue, children, ...props }, ref) => {
    const [activeValue, setActiveValue] = React.useState(value || defaultValue || '');

    React.useEffect(() => {
      if (value !== undefined) {
        setActiveValue(value);
      }
    }, [value]);

    const handleValueChange = (newValue: string) => {
      if (value === undefined) {
        setActiveValue(newValue);
      }
      onValueChange?.(newValue);
    };

    return (
      <div
        ref={ref}
        className={`w-full ${className}`}
        data-value={activeValue}
        {...props}
      >
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child as React.ReactElement<{ value?: string; onValueChange?: (value: string) => void }>, {
              value: activeValue,
              onValueChange: handleValueChange,
            });
          }
          return child;
        })}
      </div>
    );
  }
);

Tabs.displayName = 'Tabs';

interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
  onValueChange?: (value: string) => void;
}

/** Renders the tab button list within a Tabs component. */
export const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(
  ({ className = '', children, value, onValueChange, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground ${className}`}
        {...props}
      >
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child as React.ReactElement<{ value?: string; onValueChange?: (value: string) => void }>, {
              value,
              onValueChange,
            });
          }
          return child;
        })}
      </div>
    );
  }
);

TabsList.displayName = 'TabsList';

interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
  currentValue?: string;
  onValueChange?: (value: string) => void;
}

/** Renders a single tab trigger button within a TabsList. */
export const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ className = '', value, currentValue, onValueChange, children, ...props }, ref) => {
    const isActive = currentValue === value;

    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
          isActive
            ? 'bg-background text-foreground shadow-sm'
            : 'hover:bg-muted hover:text-foreground'
        } ${className}`}
        onClick={() => onValueChange?.(value)}
        {...props}
      >
        {children}
      </button>
    );
  }
);

TabsTrigger.displayName = 'TabsTrigger';

interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  currentValue?: string;
}

/** Renders the content panel for a specific tab value. */
export const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ className = '', value, currentValue, children, ...props }, ref) => {
    if (currentValue !== value) {
      return null;
    }

    return (
      <div
        ref={ref}
        className={`mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

TabsContent.displayName = 'TabsContent';