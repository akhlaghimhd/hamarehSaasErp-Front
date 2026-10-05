"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn, toFaDigits } from "@/shared/lib/utils";

/**
 * Simple bordered collapsible box for company-detail sections.
 * Header stays visible; body toggles. Action slot (e.g. Add button) stays on the right.
 * Body has horizontal padding so tables/lists sit inset from the outer border.
 */
export function CollapsibleSection({
  id,
  title,
  subtitle,
  count,
  defaultOpen = true,
  action,
  children,
}: {
  id?: string;
  title: string;
  subtitle?: ReactNode;
  count?: number | null;
  defaultOpen?: boolean;
  action?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section id={id} className="scroll-mt-20">
      <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
        <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2">
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-2 text-start"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
          >
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                !open && "-rotate-90"
              )}
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-semibold">{title}</h2>
                {typeof count === "number" && count > 0 ? (
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] tabular-nums text-muted-foreground">
                    {toFaDigits(count)}
                  </span>
                ) : null}
              </div>
              {subtitle ? (
                <div className="text-[11px] leading-5 text-muted-foreground">
                  {subtitle}
                </div>
              ) : null}
            </div>
          </button>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
        {open ? (
          <div className="px-3 py-2">{children}</div>
        ) : null}
      </div>
    </section>
  );
}
