import React from 'react';

type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement>;

/** Renders a styled form label element. */
export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className = '', ...props }, ref) => (
    <label
      ref={ref}
      className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`}
      {...props}
    />
  )
);

Label.displayName = 'Label';
