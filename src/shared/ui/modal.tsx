'use client';

import type { ReactNode } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

/**
 * Modal window of the design kit (Modal window / MW S): header with the title
 * and a cross, the text, a footer with the buttons. On a phone the buttons
 * are full width, one under another, the main one on top (pass the buttons in
 * the order "Cancel", "Main action").
 */
export function Modal({
  open,
  onOpenChange,
  title,
  children,
  actions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  actions: ReactNode;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-32px)] w-[calc(100vw-32px)] max-w-[480px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[var(--radius-400)] bg-[var(--background-gray-default)] shadow-[0px_7px_16px_0px_rgba(52,46,72,0.1),0px_29px_29px_0px_rgba(52,46,72,0.09),0px_66px_40px_0px_rgba(52,46,72,0.05)] outline-none"
        >
          <div className="relative border-b border-[var(--border-gray-default)] bg-[var(--background-gray-secondary)] px-[var(--space-600)] py-[var(--space-300)] pr-14">
            <DialogPrimitive.Title className="font-[family-name:var(--heading-font-family)] text-[length:var(--heading-size-s)] font-[var(--heading-font-weight)] text-[var(--text-gray-default)]">
              {title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              aria-label="Close"
              className="absolute top-1/2 right-[var(--space-400)] -translate-y-1/2 cursor-pointer text-[var(--icons-gray-default)]"
            >
              <X aria-hidden className="size-5" />
            </DialogPrimitive.Close>
          </div>

          <div className="flex flex-col gap-[var(--space-300)] overflow-y-auto px-[var(--space-600)] py-[var(--space-400)] font-[family-name:var(--body-font-family)] text-[length:var(--body-sizeM)] text-[var(--text-gray-default)]">
            {children}
          </div>

          <div className="flex flex-col-reverse gap-[var(--space-300)] border-t border-[var(--border-gray-default)] px-[var(--space-600)] py-[var(--space-300)] sm:flex-row sm:justify-end">
            {actions}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
