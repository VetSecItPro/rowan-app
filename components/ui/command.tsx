import React from 'react';

interface CommandProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

/** Renders a command palette container for searchable command lists. */
export const Command = React.forwardRef<HTMLDivElement, CommandProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Command.displayName = 'Command';

interface CommandInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onValueChange?: (value: string) => void;
}

/** Renders the search input field within a Command palette. */
export const CommandInput = React.forwardRef<HTMLInputElement, CommandInputProps>(
  ({ className = '', onValueChange, ...props }, ref) => {
    return (
      <div className="flex items-center border-b px-3">
        <input
          ref={ref}
          className={`flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
          onChange={(e) => {
            onValueChange?.(e.target.value);
            props.onChange?.(e);
          }}
          {...props}
        />
      </div>
    );
  }
);

CommandInput.displayName = 'CommandInput';

type CommandListProps = React.HTMLAttributes<HTMLDivElement>;

/** Renders the scrollable list container within a Command palette. */
export const CommandList = React.forwardRef<HTMLDivElement, CommandListProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`max-h-[300px] overflow-y-auto overflow-x-hidden ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CommandList.displayName = 'CommandList';

type CommandEmptyProps = React.HTMLAttributes<HTMLDivElement>;

/** Renders the empty state message when no Command items match. */
export const CommandEmpty = React.forwardRef<HTMLDivElement, CommandEmptyProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`py-6 text-center text-sm ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CommandEmpty.displayName = 'CommandEmpty';

interface CommandGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  heading?: React.ReactNode;
}

/** Renders a labeled group of items within a Command palette. */
export const CommandGroup = React.forwardRef<HTMLDivElement, CommandGroupProps>(
  ({ className = '', children, heading, ...props }, ref) => {
    return (
      <div ref={ref} className={`overflow-hidden p-1 text-foreground ${className}`} {...props}>
        {heading && (
          <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
            {heading}
          </div>
        )}
        <div role="group">
          {children}
        </div>
      </div>
    );
  }
);

CommandGroup.displayName = 'CommandGroup';

interface CommandItemProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  disabled?: boolean;
  onSelect?: (value: string) => void;
  value?: string;
}

/** Renders a single selectable item within a Command palette. */
export const CommandItem = React.forwardRef<HTMLDivElement, CommandItemProps>(
  ({ className = '', children, disabled, onSelect, value, ...props }, ref) => {
    const handleClick = () => {
      if (!disabled && onSelect && value) {
        onSelect(value);
      }
    };

    return (
      <div
        ref={ref}
        className={`relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        } ${className}`}
        onClick={handleClick}
        data-disabled={disabled}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CommandItem.displayName = 'CommandItem';

type CommandSeparatorProps = React.HTMLAttributes<HTMLDivElement>;

/** Renders a visual separator between Command palette groups. */
export const CommandSeparator = React.forwardRef<HTMLDivElement, CommandSeparatorProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`-mx-1 h-px bg-border ${className}`}
        {...props}
      />
    );
  }
);

CommandSeparator.displayName = 'CommandSeparator';
