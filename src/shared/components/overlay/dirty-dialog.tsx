/**
 * FE-P0-T11 — Overlay Dirty-Lock (UI-02 §4.2 Non-Negotiable)
 *
 * Clean form  → Escape / backdrop / close allowed
 * Dirty form  → only explicit Save or Cancel may close
 */

"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/shared/components/ui/dialog";

export type DirtyDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When true, dismiss via Escape / backdrop / X is blocked. */
  isDirty?: boolean;
  /** Called when user explicitly cancels (allowed even if dirty). */
  onCancel?: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: contentClassName;
  contentClassName?: string;
  showCloseButton?: boolean;
};

type contentClassName = string;

export function DirtyDialog({
  open,
  onOpenChange,
  isDirty = false,
  onCancel,
  title,
  description,
  children,
  footer,
  contentClassName,
  showCloseButton = true,
}: DirtyDialogProps) {
  const requestClose = React.useCallback(
    (force = false) => {
      if (isDirty && !force) return;
      if (force && onCancel) {
        onCancel();
        return;
      }
      onOpenChange(false);
    },
    [isDirty, onCancel, onOpenChange]
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          // Block programmatic/outside close while dirty
          if (isDirty) return;
          onOpenChange(false);
          return;
        }
        onOpenChange(true);
      }}
    >
      <DialogPortal>
        <DialogOverlay
          onClick={(e) => {
            if (isDirty) {
              e.preventDefault();
              e.stopPropagation();
            }
          }}
        />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 border bg-background p-6 shadow-[var(--shadow-lg)] duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-xl",
            contentClassName
          )}
          onEscapeKeyDown={(e) => {
            if (isDirty) {
              e.preventDefault();
            }
          }}
          onPointerDownOutside={(e) => {
            if (isDirty) {
              e.preventDefault();
            }
          }}
          onInteractOutside={(e) => {
            if (isDirty) {
              e.preventDefault();
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description ? (
              <DialogDescription>{description}</DialogDescription>
            ) : null}
          </DialogHeader>

          <div className="min-w-0">{children}</div>

          {footer ? <DialogFooter>{footer}</DialogFooter> : null}

          {showCloseButton ? (
            <button
              type="button"
              className="absolute left-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40"
              aria-label="بستن"
              disabled={isDirty}
              onClick={() => requestClose(false)}
              title={isDirty ? "ابتدا ذخیره یا انصراف کنید" : "بستن"}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">بستن</span>
            </button>
          ) : null}
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}

/** Explicit cancel action — always allowed even when dirty. */
export function dirtyDialogCancel(
  onOpenChange: (open: boolean) => void,
  onCancel?: () => void
) {
  return () => {
    onCancel?.();
    onOpenChange(false);
  };
}
