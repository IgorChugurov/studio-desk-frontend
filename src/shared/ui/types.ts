/** Types of the kit components. Ported from starter-kit components/figma/types.ts. */

export type ButtonVariant =
  | 'cta'
  | 'outlined'
  | 'text'
  | 'icon'
  | 'icon-primary'
  | 'icon-tertiary'
  | 'icon-outlined'
  | 'icon-danger'
  | 'gradient'
  | 'danger'
  | 'danger-outlined';

export type ButtonSize = 'sm' | 'md' | 'lg';
export type InputVariant = 'outlined' | 'standard';

/**
 * Input types
 *
 * - text: Text field
 * - textarea: Multiline field
 * - number: Number input
 * - date: Date picker
 * - time: Time picker
 * - datetime-local: Date and time picker
 * - email: Email input
 * - tel: Telephone input
 * - url: URL input
 */
export type InputType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'time'
  | 'datetime-local'
  | 'email'
  | 'tel'
  | 'url';

/**
 * Input sizes
 *
 * - sm: 32px (for Search)
 * - md: 40px (for Text field)
 * - lg: min 64px (for Text area)
 */
export type InputSize = 'sm' | 'md' | 'lg';
