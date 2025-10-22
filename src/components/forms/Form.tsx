'use client';

import {
  Controller,
  FormProvider,
  type ControllerFieldState,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
  type UseFormReturn,
} from 'react-hook-form';
import {
  HTMLAttributes,
  ReactElement,
  ReactNode,
  cloneElement,
  createContext,
  forwardRef,
  isValidElement,
  useContext,
  useId,
} from 'react';
import { cn } from '@/lib/cn';
import { ResponsiveGrid, type ResponsiveGridProps } from '@/components/ui/ResponsiveGrid';

type FormProviderProps<TFieldValues extends FieldValues = FieldValues, TContext = unknown> = UseFormReturn<
  TFieldValues,
  TContext
> & { children: ReactNode };

interface FormItemContextValue {
  id: string;
  descriptionId: string;
  messageId: string;
}

interface FormFieldContextValue<TFieldValues extends FieldValues = FieldValues, TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>> {
  name: TName;
  fieldState: ControllerFieldState;
}

const FormItemContext = createContext<FormItemContextValue | undefined>(undefined);
const FormFieldContext = createContext<FormFieldContextValue | undefined>(undefined);

export function Form<TFieldValues extends FieldValues, TContext = unknown>({
  children,
  ...form
}: FormProviderProps<TFieldValues, TContext>) {
  return <FormProvider {...form}>{children}</FormProvider>;
}

export function FormField<TFieldValues extends FieldValues, TName extends FieldPath<TFieldValues>>({
  render,
  ...props
}: ControllerProps<TFieldValues, TName>) {
  return (
    <Controller
      {...props}
      render={(controllerProps) => (
        <FormFieldContext.Provider
          value={{
            name: props.name,
            fieldState: controllerProps.fieldState,
          }}
        >
          {render(controllerProps)}
        </FormFieldContext.Provider>
      )}
    />
  );
}

export const FormItem = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function FormItem(
  { className, children, ...props },
  ref,
) {
  const id = useId();
  const contextValue: FormItemContextValue = {
    id,
    descriptionId: `${id}-description`,
    messageId: `${id}-message`,
  };

  return (
    <FormItemContext.Provider value={contextValue}>
      <div ref={ref} className={cn('flex w-full flex-col gap-2', className)} {...props}>
        {children}
      </div>
    </FormItemContext.Provider>
  );
});

export const FormLabel = forwardRef<HTMLLabelElement, HTMLAttributes<HTMLLabelElement>>(function FormLabel(
  { className, children, ...props },
  ref,
) {
  const { id } = useFormItem();
  const { fieldState } = useFormField();
  return (
    <label
      ref={ref}
      htmlFor={id}
      className={cn(
        'text-sm font-semibold text-muted-foreground transition-colors',
        fieldState.error ? 'text-danger' : null,
        className,
      )}
      {...props}
    >
      {children}
    </label>
  );
});

export const FormControl = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function FormControl(
  { children, className, ...props },
  ref,
) {
  const { id, descriptionId, messageId } = useFormItem();
  const { fieldState } = useFormField();

  const describedBy = [descriptionId, fieldState.error ? messageId : null].filter(Boolean).join(' ') || undefined;

  return (
    <div ref={ref} className={cn('flex flex-col gap-2', className)} {...props}>
      {isValidElement(children)
        ? cloneElement(children as ReactElement<Record<string, unknown>>, {
            id,
            'aria-describedby': describedBy,
            'aria-invalid': Boolean(fieldState.error) || undefined,
          })
        : children}
    </div>
  );
});

export const FormMessage = ({ className }: { className?: string }) => {
  const { messageId } = useFormItem();
  const { fieldState } = useFormField();

  if (!fieldState.error?.message) {
    return null;
  }

  return (
    <p id={messageId} className={cn('text-sm text-danger', className)}>
      {fieldState.error.message}
    </p>
  );
};

export const FormDescription = ({ children, className }: { children?: ReactNode; className?: string }) => {
  const { descriptionId } = useFormItem();

  if (!children) return null;

  return (
    <p id={descriptionId} className={cn('text-sm text-muted-foreground', className)}>
      {children}
    </p>
  );
};

export interface FormGridProps extends ResponsiveGridProps {
  columns?: ResponsiveGridProps['columns'];
}

export function FormGrid({ children, className, columns = { base: 1, md: 2 }, ...props }: FormGridProps) {
  return (
    <ResponsiveGrid
      columns={columns}
      gap="md"
      rowGap="md"
      className={cn('md:items-end', className)}
      {...props}
    >
      {children}
    </ResponsiveGrid>
  );
}

function useFormItem() {
  const context = useContext(FormItemContext);
  if (!context) {
    throw new Error('Form compound components must be used inside a <FormItem>.');
  }
  return context;
}

export function useFormField() {
  const fieldContext = useContext(FormFieldContext);
  if (!fieldContext) {
    throw new Error('useFormField must be used within a <FormField>.');
  }
  return fieldContext;
}

export type { ColumnPriority } from '@/components/datagrid/ColumnVisibility';
