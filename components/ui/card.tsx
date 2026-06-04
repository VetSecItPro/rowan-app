import React from 'react';

type CardProps = React.HTMLAttributes<HTMLDivElement>;

/**
 * Shared card surface (Phase 16.1).
 *
 * Encodes Rowan's canonical card style - `bg-gray-800 border border-gray-700
 * rounded-xl` - which is the most common hand-rolled pattern across the app
 * (53+ exact occurrences). Previously this primitive used shadcn `bg-card` /
 * `text-card-foreground` tokens that DON'T resolve in Rowan's dark-only Tailwind
 * setup, so it rendered nearly invisible - which is why it had zero adopters.
 * Now it produces the real card look, so migrating a hand-rolled
 * `bg-gray-800 border border-gray-700 rounded-xl` div to `<Card>` is a visual
 * no-op. Use it for new cards; migrate existing ones opportunistically.
 */
export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className = '', ...props }, ref) => (
    <div
      ref={ref}
      className={`rounded-xl border border-gray-700 bg-gray-800 text-white shadow-sm ${className}`}
      {...props}
    />
  )
);

Card.displayName = 'Card';

type CardHeaderProps = React.HTMLAttributes<HTMLDivElement>;

/** Renders the header section of a Card component. */
export const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className = '', ...props }, ref) => (
    <div ref={ref} className={`flex flex-col space-y-1.5 p-6 ${className}`} {...props} />
  )
);

CardHeader.displayName = 'CardHeader';

type CardTitleProps = React.HTMLAttributes<HTMLHeadingElement>;

/** Renders the title heading within a Card header. */
export const CardTitle = React.forwardRef<HTMLParagraphElement, CardTitleProps>(
  ({ className = '', ...props }, ref) => (
    <h3
      ref={ref}
      className={`text-2xl font-semibold leading-none tracking-tight ${className}`}
      {...props}
    />
  )
);

CardTitle.displayName = 'CardTitle';

type CardDescriptionProps = React.HTMLAttributes<HTMLParagraphElement>;

/** Renders a description paragraph within a Card header. */
export const CardDescription = React.forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className = '', ...props }, ref) => (
    <p ref={ref} className={`text-sm text-gray-400 ${className}`} {...props} />
  )
);

CardDescription.displayName = 'CardDescription';

type CardContentProps = React.HTMLAttributes<HTMLDivElement>;

/** Renders the main content section of a Card component. */
export const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className = '', ...props }, ref) => (
    <div ref={ref} className={`p-6 pt-0 ${className}`} {...props} />
  )
);

CardContent.displayName = 'CardContent';

type CardFooterProps = React.HTMLAttributes<HTMLDivElement>;

/** Renders the footer section of a Card component. */
export const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className = '', ...props }, ref) => (
    <div ref={ref} className={`flex items-center p-6 pt-0 ${className}`} {...props} />
  )
);

CardFooter.displayName = 'CardFooter';
