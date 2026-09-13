/**
 * Login visual — static conceptual illustration (secure access / ERP portal).
 * No continuous animation; calm and professional.
 */

"use client";

import { cn } from "@/shared/lib/utils";

interface LoginVisualProps {
  className?: string;
}

export function LoginVisual({ className }: LoginVisualProps) {
  return (
    <div
      className={cn(
        "relative hidden h-full min-h-[480px] overflow-hidden rounded-s-2xl lg:flex lg:flex-col",
        "bg-[hsl(150_28%_10%)] text-white",
        className
      )}
    >
      {/* soft gradient */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 90% 70% at 60% 30%, hsl(142 50% 28% / 0.45), transparent 65%), radial-gradient(ellipse 50% 40% at 20% 80%, hsl(95 35% 25% / 0.25), transparent 55%)",
        }}
      />

      {/* static illustration — portal + key + modules */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-8 pt-10">
        <svg
          viewBox="0 0 280 220"
          className="h-auto w-full max-w-[280px]"
          fill="none"
          aria-hidden
        >
          {/* outer frame */}
          <rect
            x="40"
            y="28"
            width="200"
            height="150"
            rx="16"
            stroke="hsl(142 40% 55% / 0.35)"
            strokeWidth="1.5"
          />
          <rect
            x="52"
            y="42"
            width="176"
            height="122"
            rx="10"
            fill="hsl(150 25% 14% / 0.6)"
            stroke="hsl(142 50% 45% / 0.25)"
            strokeWidth="1"
          />

          {/* header bar inside */}
          <rect
            x="60"
            y="50"
            width="160"
            height="18"
            rx="4"
            fill="hsl(142 45% 35% / 0.35)"
          />
          <circle cx="70" cy="59" r="3" fill="hsl(142 60% 55% / 0.7)" />
          <circle cx="82" cy="59" r="3" fill="hsl(95 50% 50% / 0.5)" />
          <circle cx="94" cy="59" r="3" fill="hsl(0 0% 100% / 0.25)" />

          {/* content rows */}
          <rect x="60" y="80" width="70" height="8" rx="2" fill="hsl(0 0% 100% / 0.12)" />
          <rect x="60" y="94" width="100" height="6" rx="2" fill="hsl(0 0% 100% / 0.08)" />
          <rect x="60" y="108" width="88" height="6" rx="2" fill="hsl(0 0% 100% / 0.08)" />

          {/* side modules */}
          <rect x="175" y="80" width="37" height="28" rx="4" fill="hsl(142 50% 40% / 0.3)" />
          <rect x="175" y="114" width="37" height="28" rx="4" fill="hsl(95 40% 40% / 0.25)" />

          {/* key / lock accent */}
          <g transform="translate(118, 145)">
            <circle cx="12" cy="8" r="10" stroke="hsl(142 60% 55%)" strokeWidth="2" fill="hsl(142 50% 30% / 0.4)" />
            <rect x="9" y="14" width="6" height="14" rx="2" fill="hsl(142 60% 55%)" />
            <circle cx="12" cy="8" r="3" fill="hsl(150 20% 12%)" />
          </g>

          {/* floating dots (static) */}
          <circle cx="28" cy="60" r="2.5" fill="hsl(142 60% 55% / 0.35)" />
          <circle cx="252" cy="90" r="2" fill="hsl(95 50% 55% / 0.3)" />
          <circle cx="35" cy="160" r="1.5" fill="hsl(0 0% 100% / 0.2)" />
          <circle cx="248" cy="50" r="1.8" fill="hsl(142 50% 50% / 0.25)" />
        </svg>

        <div className="mt-6 text-center">
          <p className="text-base font-semibold tracking-tight">ورود امن</p>
          <p className="mt-1.5 max-w-[200px] text-xs leading-relaxed text-white/55">
            دسترسی یکپارچه به ماژول‌های سازمان با کنترل هویت و محدوده.
          </p>
        </div>
      </div>

      {/* bottom brand strip */}
      <div className="relative z-10 border-t border-white/10 px-8 py-5">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-sm font-bold">
            ه
          </span>
          <div>
            <p className="text-sm font-medium">هماره ERP</p>
            <p className="text-[11px] text-white/45">یکپارچگی · شفافیت · کنترل</p>
          </div>
        </div>
      </div>
    </div>
  );
}
