import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, fullWidth = true, type = 'text', ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        'touch-target min-h-[2.75rem] rounded-lg border border-default bg-background px-4 text-sm text-foreground shadow-soft outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        fullWidth ? 'w-full' : 'w-auto',
        className,
      )}
      {...props}
    />
  );
});

export default Input;
