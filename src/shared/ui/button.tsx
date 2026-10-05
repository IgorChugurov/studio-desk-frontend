/**
 * Button of the design kit (Buttons / CTA, Icon buttons, Danger button).
 * Ported from starter-kit components/figma/FigmaButton.tsx; tokens come from
 * shared/styles/figma-tokens.css. `loading` is added: spinner on the button.
 */

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { LoaderCircle } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';
import type { ButtonVariant, ButtonSize } from './types';

/**
 * Button variants from Figma with tokens applied through arbitrary values
 */
const buttonVariants = cva(
  // Base styles
  'inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        // ============================================================================
        // CTA BUTTONS
        // ============================================================================

        // CTA - Contained Style (primary button)
        // Text sizes and border radius are applied conditionally in component
        cta: [
          'bg-[var(--background-primary-default)]',
          'text-[var(--text-primary-on-primary)]',
          'hover:bg-[var(--background-primary-default-hover)]',
          'active:bg-[var(--background-primary-default-pressed)]',
          'disabled:bg-[var(--background-gray-default-disabled)]',
          'disabled:text-[var(--text-gray-default-disabled)]',
          'font-[family-name:var(--body-font-family)]',
          'font-[var(--body-font-weight-strong)]',
        ],

        // CTA - Outlined Style (with border)
        outlined: [
          'bg-[var(--background-gray-default)]',
          'border border-[var(--border-gray-default)]',
          'text-[var(--text-gray-default)]',
          'hover:border-[var(--border-gray-secondary)]',
          'active:border-[var(--border-gray-tertiary)]',
          'disabled:border-[var(--border-gray-default)]',
          'disabled:text-[var(--text-gray-default-disabled)]',
          'rounded-[var(--radius-200)]',
          'font-[family-name:var(--body-font-family)]',
          'font-[var(--body-font-weight-strong)]',
          'text-[length:var(--body-sizeM)]',
        ],

        // CTA - Text Style (text button)
        text: [
          'text-[var(--text-primary-default)]',
          'hover:bg-[var(--background-primary-secondary)]',
          'active:bg-[var(--background-primary-secondary-pressed)]',
          'disabled:text-[var(--text-gray-default-disabled)]',
          'rounded-[var(--radius-200)]',
          'font-[family-name:var(--body-font-family)]',
          'font-[var(--body-font-weight-strong)]',
          'text-[length:var(--body-sizeM)]',
        ],

        // ============================================================================
        // ICON BUTTONS
        // ============================================================================

        // Icon - Contained, Secondary (current implementation)
        // IMPORTANT: In Figma, Secondary icon buttons use reverse logic:
        // - Hovered uses: --background-gray-secondary-pressed
        // - Pressed uses: --background-gray-secondary-hover
        // Border radius: rounded-200 for md/lg, rounded-100 for sm
        icon: [
          'bg-[var(--background-gray-default)]',
          'hover:bg-[var(--background-gray-secondary-pressed)]', // Reverse logic from Figma!
          'active:bg-[var(--background-gray-secondary-hover)]', // Reverse logic from Figma!
          'disabled:bg-[var(--background-gray-default-disabled)]',
        ],

        // Icon - Contained, Primary
        // Border radius: rounded-200 for all sizes
        'icon-primary': [
          'bg-[var(--background-primary-default)]',
          'hover:bg-[var(--background-primary-default-hover)]',
          'active:bg-[var(--background-primary-default-pressed)]',
          'disabled:bg-[var(--background-gray-default-disabled)]',
        ],

        // Icon - Contained, Tertiary
        // Uses rounded-100 for all sizes (only 24px in design)
        'icon-tertiary': [
          'bg-[var(--background-gray-default)]',
          'hover:bg-[var(--background-primary-secondary-hover)]',
          'active:bg-[var(--background-primary-secondary-pressed)]',
          'disabled:bg-[var(--background-gray-default)]',
          'rounded-[var(--radius-100)]',
        ],

        // Icon - Outlined, Secondary
        // Border radius: rounded-200 for md/lg, rounded-100 for sm
        'icon-outlined': [
          'bg-[var(--background-gray-default)]',
          'border border-[var(--border-gray-default)]',
          'hover:border-[var(--border-gray-secondary)]',
          'active:border-[var(--border-gray-tertiary)]',
          'disabled:border-[var(--border-gray-default)]',
        ],

        // Icon - Danger (Contained)
        // Uses danger colors with icon sizing
        // Border radius: rounded-200 for md/lg, rounded-100 for sm
        'icon-danger': [
          'bg-[var(--background-error-default)]',
          'text-[var(--text-primary-on-primary)]',
          '[&_svg]:text-[var(--text-primary-on-primary)]',
          'hover:bg-[var(--background-error-default-hovered)]',
          'active:bg-[var(--background-error-default-pressed)]',
          'disabled:bg-[var(--background-gray-default-disabled)]',
          'disabled:text-[var(--text-error-disabled)]',
          'disabled:[&_svg]:text-[var(--text-error-disabled)]',
        ],

        // ============================================================================
        // GRADIENT BUTTONS
        // ============================================================================

        gradient: [
          'bg-gradient-to-r',
          'from-[rgba(255,242,201,1)]',
          'to-[rgba(203,216,255,1)]',
          'hover:from-[rgba(246,255,195,1)]',
          'hover:to-[rgba(255,137,139,1)]',
          'active:from-[rgba(255,242,201,1)]',
          'active:to-[rgba(203,216,255,1)]',
          'disabled:bg-[var(--background-gray-default)]',
          'text-[var(--text-gray-default)]',
          'disabled:text-[var(--text-gray-default-disabled)]',
          'rounded-[var(--radius-200)]',
          'font-[family-name:var(--body-font-family)]',
          'font-[var(--body-font-weight-strong)]',
          // Text size is applied conditionally in component
        ],

        // ============================================================================
        // DANGER BUTTONS
        // ============================================================================

        // Danger - Contained
        // Text sizes are applied conditionally in component
        danger: [
          'bg-[var(--background-error-default)]',
          'text-[var(--text-primary-on-primary)]',
          'hover:bg-[var(--background-error-default-hovered)]',
          'active:bg-[var(--background-error-default-pressed)]',
          'disabled:bg-[var(--background-gray-default-disabled)]',
          'disabled:text-[var(--text-error-disabled)]',
          'rounded-[var(--radius-200)]',
          'font-[family-name:var(--body-font-family)]',
          'font-[var(--body-font-weight-strong)]',
        ],

        // Danger - Outlined
        // Text sizes are applied conditionally in component
        'danger-outlined': [
          'bg-[var(--background-gray-default)]',
          'border border-[var(--border-gray-default)]',
          'text-[var(--text-error-default)]',
          'hover:border-[var(--border-error-default)]',
          'active:bg-[var(--background-error-secondary)]',
          'active:border-[var(--border-error-default)]',
          'disabled:border-[var(--border-gray-default)]',
          'disabled:text-[var(--text-error-disabled)]',
          'rounded-[var(--radius-200)]',
          'font-[family-name:var(--body-font-family)]',
          'font-[var(--body-font-weight-strong)]',
        ],
      },
      size: {
        // Original from Figma for size="sm" (24px):
        // h-[24px] px-[var(--space\/200,8px)] py-[var(--space\/100,4px)]
        sm: [
          'h-[24px]', // Exact height from original
          'px-[var(--space-200)]', // 8px
          'py-[var(--space-100)]', // 4px
          '[&_svg]:size-4',
        ],
        md: [
          'h-8', // 32px
          'px-[var(--space-300)]',
          'py-[var(--space-200)]',
          '[&_svg]:size-4',
        ],
        lg: [
          'h-10', // 40px
          'px-[var(--space-400)]',
          'py-[var(--space-250)]',
          '[&_svg]:size-4',
        ],
      },
      // For icon buttons, padding is used on all sides (p-[...])
      // This is applied conditionally through className in component
    },
    defaultVariants: {
      variant: 'cta',
      size: 'md',
    },
  },
);

export interface ButtonProps
  extends
    Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'variant'>,
    VariantProps<typeof buttonVariants> {
  /**
   * Button variant from Figma
   */
  variant?: ButtonVariant;
  /**
   * Button size
   */
  size?: ButtonSize;
  /**
   * Use as child component (Radix Slot)
   */
  asChild?: boolean;
  /**
   * Loading state: the button looks disabled and a spinner replaces the
   * content; the size stays the same. Not applied together with `asChild`.
   */
  loading?: boolean;
}

/**
 * Button - button with Figma design tokens applied
 *
 * @version 1.0.0
 * @figmaVersion 1.0.0
 *
 * Supports all variants from Figma design kit:
 * - CTA: cta (Contained), outlined (Outlined), text (Text)
 * - Icon: icon (Secondary), icon-primary (Primary), icon-tertiary (Tertiary), icon-outlined (Outlined), icon-danger (Danger)
 * - Gradient: gradient
 * - Danger: danger (Contained), danger-outlined (Outlined)
 *
 * @example
 * // CTA Buttons
 * <Button variant="cta" size="md">Click me</Button>
 * <Button variant="outlined" size="md">Outlined</Button>
 * <Button variant="text" size="md">Text Button</Button>
 *
 * // Icon Buttons
 * <Button variant="icon" size="sm"><Icon /></Button>
 * <Button variant="icon-primary" size="md"><Icon /></Button>
 * <Button variant="icon-tertiary" size="sm"><Icon /></Button>
 * <Button variant="icon-outlined" size="md"><Icon /></Button>
 * <Button variant="icon-danger" size="sm"><Icon /></Button>
 *
 * // Other
 * <Button variant="gradient" size="lg">Gradient</Button>
 * <Button variant="danger" size="md">Delete</Button>
 * <Button variant="danger-outlined" size="md">Delete</Button>
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : 'button';
    const showSpinner = loading && !asChild;

    // Use default size if not provided
    const effectiveSize = size || 'md';

    // For all icon buttons, padding is used on all sides (p-[...])
    // instead of px/py, according to Figma design kit
    // Also icon buttons should be square (width = height) and center content
    const isIconVariant = variant?.startsWith('icon');
    const iconPaddingClass =
      isIconVariant && effectiveSize === 'sm'
        ? 'p-[var(--space-100)] w-[24px] h-[24px] min-w-[24px] min-h-[24px]' // 24px: p-4px, square
        : isIconVariant && effectiveSize === 'md'
          ? 'p-[var(--space-200)] w-8 h-8 min-w-8 min-h-8' // 32px: p-8px, square
          : isIconVariant && effectiveSize === 'lg'
            ? 'p-[var(--space-300)] w-10 h-10 min-w-10 min-h-10' // 40px: p-12px, square
            : '';

    // For gradient buttons, correct text sizes are needed
    const gradientTextSizeClass =
      variant === 'gradient' && effectiveSize === 'lg'
        ? 'text-[length:var(--body-sizeL)]'
        : variant === 'gradient' && effectiveSize === 'md'
          ? 'text-[length:var(--body-sizeM)]'
          : variant === 'gradient' && effectiveSize === 'sm'
            ? 'text-[length:var(--body-sizeS)]'
            : '';

    // For CTA buttons, correct text sizes and border radius are needed
    const ctaTextSizeClass =
      variant === 'cta' && effectiveSize === 'lg'
        ? 'text-[length:var(--body-sizeL)] rounded-[var(--radius-200)]'
        : variant === 'cta' && effectiveSize === 'md'
          ? 'text-[length:var(--body-sizeM)] rounded-[var(--radius-200)]'
          : variant === 'cta' && effectiveSize === 'sm'
            ? 'text-[length:var(--body-sizeS)] rounded-[var(--radius-100)]'
            : '';

    // For text buttons, correct text sizes are needed
    const textButtonSizeClass =
      variant === 'text' && effectiveSize === 'lg'
        ? 'text-[length:var(--body-sizeL)]'
        : variant === 'text' && effectiveSize === 'md'
          ? 'text-[length:var(--body-sizeM)]'
          : variant === 'text' && effectiveSize === 'sm'
            ? 'text-[length:var(--body-sizeS)]'
            : '';

    // For outlined buttons, correct text sizes are needed
    const outlinedTextSizeClass =
      variant === 'outlined' && effectiveSize === 'lg'
        ? 'text-[length:var(--body-sizeL)]'
        : variant === 'outlined' && effectiveSize === 'md'
          ? 'text-[length:var(--body-sizeM)]'
          : variant === 'outlined' && effectiveSize === 'sm'
            ? 'text-[length:var(--body-sizeS)]'
            : '';

    // For danger buttons, correct text sizes are needed
    const dangerTextSizeClass =
      (variant === 'danger' || variant === 'danger-outlined') &&
      effectiveSize === 'lg'
        ? 'text-[length:var(--body-sizeL)]'
        : (variant === 'danger' || variant === 'danger-outlined') &&
            effectiveSize === 'md'
          ? 'text-[length:var(--body-sizeM)]'
          : (variant === 'danger' || variant === 'danger-outlined') &&
              effectiveSize === 'sm'
            ? 'text-[length:var(--body-sizeS)]'
            : '';

    // For icon buttons, border radius depends on size according to design kit:
    // - icon-primary: rounded-200 for all sizes
    // - icon (Secondary): rounded-200 for md/lg, rounded-100 for sm
    // - icon-outlined: rounded-200 for md/lg, rounded-100 for sm
    // - icon-danger: rounded-200 for md/lg, rounded-100 for sm
    // - icon-tertiary: rounded-100 (already in variant)
    const iconRadiusClass =
      variant === 'icon-primary'
        ? 'rounded-[var(--radius-200)]' // All sizes: radius-200
        : (variant === 'icon' ||
              variant === 'icon-outlined' ||
              variant === 'icon-danger') &&
            effectiveSize === 'sm'
          ? 'rounded-[var(--radius-100)]' // 24px: radius-100
          : (variant === 'icon' ||
                variant === 'icon-outlined' ||
                variant === 'icon-danger') &&
              (effectiveSize === 'md' || effectiveSize === 'lg')
            ? 'rounded-[var(--radius-200)]' // 32px, 40px: radius-200
            : '';

    return (
      <Comp
        className={cn(
          buttonVariants({ variant, size }),
          iconPaddingClass,
          isIconVariant && 'px-0 py-0 gap-0', // Remove px/py and gap for all icon buttons
          !isIconVariant && 'gap-2', // Add gap only for non-icon buttons
          gradientTextSizeClass,
          ctaTextSizeClass,
          textButtonSizeClass,
          outlinedTextSizeClass,
          dangerTextSizeClass,
          iconRadiusClass,
          showSpinner && 'relative',
          className,
        )}
        ref={ref}
        aria-busy={showSpinner || undefined}
        disabled={disabled || showSpinner}
        {...props}
      >
        {showSpinner ? (
          <>
            <span className="invisible inline-flex items-center gap-2">
              {children}
            </span>
            <LoaderCircle
              className="absolute size-5 animate-spin text-[var(--icons-gray-default)]"
              aria-hidden
            />
          </>
        ) : (
          children
        )}
      </Comp>
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
