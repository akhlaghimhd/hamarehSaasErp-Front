/**
 * One-shot slide-to-verify human check (no quiz).
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
    <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-3.5">
      <div className="flex items-start gap-2">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div>
          <p className="text-xs font-medium">تأیید انسانی</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            کلید را تا انتهای مسیر بکشید تا قفل باز شود.
          </p>
        </div>
      </div>
      <div
        ref={trackRef}
        className="relative h-11 select-none rounded-full border border-border bg-background"
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          className="absolute inset-y-0 start-0 rounded-full bg-primary/15 transition-[width] duration-75"
          style={{ width: `${Math.max(ratio * 100, 8)}%` }}
        />
        <div className="pointer-events-none absolute end-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-dashed border-primary/40 text-primary/50">
          <span className="text-[10px]">قفل</span>
        </div>
        <button
          type="button"
          aria-label="کشیدن کلید"
          className={cn(
            "absolute top-1/2 flex h-9 w-10 -translate-y-1/2 cursor-grab items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md active:cursor-grabbing",
            dragging && "scale-105"
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
