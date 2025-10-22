import { ElementType, HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/cn';

type ContainerSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';
type ContainerPadding = 'none' | 'sm' | 'md' | 'lg';

export interface ContainerProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  size?: ContainerSize;
  padding?: ContainerPadding;
  bleed?: boolean;
  withContainerQueries?: boolean;
}

const sizeClassnames: Record<ContainerSize, string> = {
  sm: 'max-w-content-sm',
  md: 'max-w-content',
  lg: 'max-w-content-lg',
  xl: 'max-w-screen-xl',
  full: 'max-w-none',
};

const paddingClassnames: Record<ContainerPadding, string> = {
  none: 'px-0',
  sm: 'px-4 sm:px-6',
  md: 'px-4 xs:px-6 md:px-8',
  lg: 'px-4 xs:px-6 md:px-8 lg:px-12',
};

export const Container = forwardRef<HTMLElement, ContainerProps>(function Container(
  {
    as: Component = 'div',
    size = 'md',
    padding = 'md',
    bleed = false,
    withContainerQueries = true,
    className,
    children,
    ...props
  },
  ref,
) {
  return (
    <Component
      ref={ref}
      className={cn(
        'mx-auto w-full',
        withContainerQueries && 'container-inline',
        sizeClassnames[size],
        bleed ? 'px-0' : paddingClassnames[padding],
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
});

export default Container;
