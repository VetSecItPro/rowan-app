import React from 'react';

type CardProps = React.HTMLAttributes<HTMLDivElement>;

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className = '', ...props }, ref) => (
    <div
      ref={ref}
      className={`rounded-lg border bg-card text-card-foreground shadow-sm ${className}`}
      {...props}
    />
  )
);

Card.displayName = 'Card';

type CardHeaderProps = React.HTMLAttributes<HTMLDivElement>;

export const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className = '', ...props }, ref) => (
    <div ref={ref} className={`flex flex-col space-y-1.5 p-6 ${className}`} {...props} />
  )
);

CardHeader.displayName = 'CardHeader';

type CardTitleProps = React.HTMLAttributes<HTMLHeadingElement>;

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

export const CardDescription = React.forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className = '', ...props }, ref) => (
    <p ref={ref} className={`text-sm text-muted-foreground ${className}`} {...props} />
  )
);

CardDescription.displayName = 'CardDescription';

type CardContentProps = React.HTMLAttributes<HTMLDivElement>;

export const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className = '', ...props }, ref) => (
    <div ref={ref} className={`p-6 pt-0 ${className}`} {...props} />
  )
);

CardContent.displayName = 'CardContent';

type CardFooterProps = React.HTMLAttributes<HTMLDivElement>;

export const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className = '', ...props }, ref) => (
    <div ref={ref} className={`flex items-center p-6 pt-0 ${className}`} {...props} />
  )
);

CardFooter.displayName = 'CardFooter';
