/**
 * One-shot slide-to-verify human check (no quiz).
 * Track is dir=ltr so thumb/fill share a consistent physical axis on RTL pages.
 */
"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { KeyRound, ShieldCheck } from "lucide-react";
import { cn } from "@/shared/lib/utils";

export function HumanSlideCheck({ onPass }: { onPass: () => void }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [ratio, setRatio] = useState(0);
  const [dragging, setDragging] = useState(false);
  const passedRef = useRef(false);

  const updateFromClientX = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const thumb = 40;
    const max = Math.max(1, rect.width - thumb);
    const x = Math.min(max, Math.max(0, clientX - rect.left - thumb / 2));
    setRatio(x / max);
  };

  const onPointerDown = (e: ReactPointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    updateFromClientX(e.clientX);
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    if (!dragging) return;
    updateFromClientX(e.clientX);
  };

  const onPointerUp = () => {
    setDragging(false);
    if (ratio >= 0.92 && !passedRef.current) {
      passedRef.current = true;
      setRatio(1);
      setTimeout(onPass, 220);
    } else if (ratio < 0.92) {
      setRatio(0);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-primary/25 bg-gradient-to-b from-primary/10 to-primary/5 p-3.5 shadow-[0_0_0_1px_hsl(var(--primary)/0.06)]">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
          <ShieldCheck className="h-3.5 w-3.5" />
        </span>
        <div>
          <p className="text-xs font-medium">تأیید انسانی</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            کلید را تا انتهای مسیر بکشید تا قفل باز شود.
          </p>
        </div>
      </div>
      <div
        ref={trackRef}
        className="relative h-11 select-none rounded-full border border-border bg-background/80"
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        dir="ltr"
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-primary/20 transition-[width] duration-75"
          style={{ width: `${Math.max(ratio * 100, 10)}%` }}
        />
        <div
          className={cn(
            "pointer-events-none absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-dashed text-[10px] transition-colors",
            ratio >= 0.92
              ? "border-primary bg-primary/15 text-primary"
              : "border-primary/40 text-primary/50"
          )}
        >
          قفل
        </div>
        <button
          type="button"
          aria-label="کشیدن کلید"
          className={cn(
            "absolute top-1/2 flex h-9 w-10 -translate-y-1/2 cursor-grab items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-transform active:cursor-grabbing",
            dragging && "scale-105 shadow-lg"
          )}
          style={{ left: `calc(${ratio * 100}% - ${ratio * 40}px)` }}
          onPointerDown={onPointerDown}
        >
          <KeyRound className="h-4 w-4" />
        </button>
      </div>
      <p className="text-center text-[10px] text-muted-foreground">
        {ratio >= 0.92 ? "عالی — در حال ادامه…" : "انگشت را نگه دارید و بکشید"}
      </p>
    </div>
  );
}
