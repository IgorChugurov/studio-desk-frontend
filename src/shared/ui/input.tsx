/**
 * Text field of the design kit (Inputs). Ported from starter-kit
 * components/figma/FigmaInput.tsx. Error state: `data-invalid`.
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';
import type { InputVariant, InputSize } from './types';

/**
 * Input variants from Figma with tokens applied through arbitrary values
 */
const inputVariants = cva(
  // Base styles
  'w-full transition-colors focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        // ============================================================================
        // OUTLINED - Text field / Outlined (with border on all sides)
        // ============================================================================
        outlined: [
          'bg-[var(--background-gray-secondary)]',
          'border border-[var(--stroke-border)] border-[var(--border-gray-default)]',
          'rounded-[var(--radius-200)]',
          'text-[var(--text-gray-default)]',
          'placeholder:text-[var(--text-gray-secondary)]',
          'font-[family-name:var(--body-font-family)]',
          'font-[var(--body-font-weight-regular)]',
          'text-[length:var(--body-sizeM)]',
          // Hover
          'hover:border-[var(--border-primary-default-hovered)]',
          // Focus
          'focus-visible:border-[var(--border-primary-default-pressed)]',
          'focus-visible:text-[var(--text-gray-default)]',
          // Disabled
          'disabled:bg-[var(--background-gray-default-disabled)]',
          'disabled:text-[var(--text-gray-default-disabled)]',
          'disabled:placeholder:text-[var(--text-gray-default-disabled)]',
          // Error (controlled via data-invalid)
          'data-[invalid=true]:bg-[var(--background-error-secondary)]',
          'data-[invalid=true]:border-[var(--border-error-default)]',
        ],

        // ============================================================================
        // STANDARD - Text field / Standard (bottom border only)
        // ============================================================================
        standard: [
          'bg-[var(--background-gray-secondary)]',
          'border-0 border-b-[var(--stroke-border-for-standard-text-field)] border-[var(--border-gray-default)]',
          'rounded-tl-[var(--radius-100)] rounded-tr-[var(--radius-100)]',
          'text-[var(--text-gray-default)]',
          'placeholder:text-[var(--text-gray-secondary)]',
          'font-[family-name:var(--heading-font-family)]',
          'text-[length:var(--heading-sizeS)]',
          // Hover
          'hover:border-b-[var(--border-primary-default-hovered)]',
          // Focus
          'focus-visible:border-b-[var(--border-primary-default-pressed)]',
          'focus-visible:text-[var(--text-gray-default)]',
          // Disabled
          'disabled:bg-[var(--background-gray-default-disabled)]',
          'disabled:text-[var(--text-gray-default-disabled)]',
          'disabled:placeholder:text-[var(--text-gray-default-disabled)]',
          // Filled state
          'data-[filled=true]:bg-[var(--background-gray-default)]',
          'data-[filled=true]:border-b-[var(--border-gray-secondary)]',
          'data-[filled=true]:hover:border-b-[var(--border-primary-default-hovered)]',
          // Error
          'data-[invalid=true]:bg-[var(--background-error-secondary)]',
          'data-[invalid=true]:border-b-[var(--border-error-default)]',
        ],
      },
      type: {
        text: [],
        textarea: ['min-h-[64px]', 'resize-none'],
      },
      size: {
        sm: ['h-[32px]', 'p-[var(--space-200)]'],
        md: ['h-[40px]', 'px-[var(--space-200)]', 'py-[var(--space-300)]'],
        lg: ['min-h-[64px]', 'p-[var(--space-200)]'],
      },
    },
    defaultVariants: {
      variant: 'outlined',
      type: 'text',
      size: 'md',
    },
  },
);

export type InputProps = (
  | (Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> & {
      type?:
        | 'text'
        | 'password'
        | 'number'
        | 'date'
        | 'time'
        | 'datetime-local'
        | 'email'
        | 'tel'
        | 'url';
    })
  | (Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'> & {
      type: 'textarea';
    })
) &
  Omit<VariantProps<typeof inputVariants>, 'type'> & {
    /**
     * Input variant from Figma
     */
    variant?: InputVariant;
    /**
     * Input size
     */
    size?: InputSize;
    /**
     * Show error state
     */
    'data-invalid'?: boolean;
    /**
     * Show filled state (for standard variant)
     */
    'data-filled'?: boolean;
  };

/**
 * Input - input with Figma design tokens applied
 *
 * @version 1.0.0
 *
 * Supports all variants from Figma design kit:
 * - Outlined: Text field / Outlined (with border on all sides)
 * - Standard: Text field / Standard (bottom border only)
 *
 * @example
 * // Outlined text field
 * <Input variant="outlined" type="text" size="md" placeholder="Enter text" />
 *
 * // Standard text field
 * <Input variant="standard" type="text" size="md" placeholder="Enter text" />
 *
 * // Textarea
 * <Input variant="outlined" type="textarea" size="lg" placeholder="Enter text" />
 *
 * // With error
 * <Input variant="outlined" data-invalid placeholder="Error state" />
 */
const Input = React.forwardRef<
  HTMLInputElement | HTMLTextAreaElement,
  InputProps
>(
  (
    {
      className,
      variant,
      type,
      size,
      'data-invalid': dataInvalid,
      'data-filled': dataFilled,
      ...props
    },
    ref,
  ) => {
    const isTextarea = type === 'textarea';

    // For textarea use textarea element
    if (isTextarea) {
      return (
        <textarea
          className={cn(inputVariants({ variant, type, size }), className)}
          data-invalid={dataInvalid ? 'true' : undefined}
          data-filled={dataFilled ? 'true' : undefined}
          ref={ref as React.ForwardedRef<HTMLTextAreaElement>}
          {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      );
    }

    // For all input types use input element with specified type
    const inputType = type || 'text';
    return (
      <input
        type={inputType}
        className={cn(
          inputVariants({ variant, type: 'text', size }),
          className,
        )}
        data-invalid={dataInvalid ? 'true' : undefined}
        data-filled={dataFilled ? 'true' : undefined}
        ref={ref as React.ForwardedRef<HTMLInputElement>}
        {...(props as React.InputHTMLAttributes<HTMLInputElement>)}
      />
    );
  },
);
Input.displayName = 'Input';

export { Input, inputVariants };
