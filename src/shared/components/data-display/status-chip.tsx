/**
 * FE-P0-T12 — Status Chip (text + color; never color alone — UI-06 / UI-11)
 */

import { cn } from "@/shared/lib/utils";

const toneClass: Record<string, string> = {
  neutral: "bg-muted text-muted-foreground border-border",
  success: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25 dark:text-emerald-400",
  warning: "bg-amber-500/10 text-amber-800 border-amber-500/25 dark:text-amber-400",
  danger: "bg-destructive/10 text-destructive border-destructive/25",
  info: "bg-sky-500/10 text-sky-800 border-sky-500/25 dark:text-sky-400",
  primary: "bg-primary/10 text-primary border-primary/25",
};

export type StatusChipTone = keyof typeof toneClass;

export function StatusChip({
  label,
  tone = "neutral",
  className,
}: {
  label: string;
  tone?: StatusChipTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
        toneClass[tone] ?? toneClass.neutral,
        className
      )}
    >
      {label}
    </span>
  );
}
