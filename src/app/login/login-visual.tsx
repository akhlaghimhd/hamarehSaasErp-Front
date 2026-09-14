/**
 * Login visual — compact illustration with soft ambient glow (secure access / ERP portal).
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
        "relative hidden h-full min-h-full overflow-hidden lg:flex lg:flex-col",
        "bg-[hsl(150_28%_10%)] text-white",
        className
      )}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 90% 70% at 60% 30%, hsl(142 50% 28% / 0.45), transparent 65%), radial-gradient(ellipse 50% 40% at 20% 80%, hsl(95 35% 25% / 0.25), transparent 55%)",
        }}
      />
      <div
        className="pointer-events-none absolute -left-8 top-16 h-32 w-32 rounded-full bg-emerald-400/10 blur-2xl"
        style={{ animation: "login-orb 8s ease-in-out infinite" }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-6 bottom-20 h-40 w-40 rounded-full bg-lime-300/10 blur-3xl"
        style={{ animation: "login-orb 10s ease-in-out infinite reverse" }}
        aria-hidden
      />
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes login-orb {
              0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.55; }
              50% { transform: translate(12px, -16px) scale(1.08); opacity: 0.9; }
            }
          `,
        }}
      />

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-6">
        <svg
          viewBox="0 0 280 200"
          className="h-auto w-full max-w-[200px] drop-shadow-[0_8px_24px_rgba(0,0,0,0.25)]"
          fill="none"
          aria-hidden
        >
          <rect
            x="40"
            y="24"
            width="200"
            height="140"
            rx="14"
            stroke="hsl(142 40% 55% / 0.35)"
            strokeWidth="1.5"
          />
          <rect
            x="52"
            y="36"
            width="176"
            height="116"
            rx="9"
            fill="hsl(150 25% 14% / 0.6)"
            stroke="hsl(142 50% 45% / 0.25)"
            strokeWidth="1"
          />
          <rect
            x="60"
            y="44"
            width="160"
            height="16"
            rx="3"
            fill="hsl(142 45% 35% / 0.35)"
          />
          <circle cx="70" cy="52" r="2.5" fill="hsl(142 60% 55% / 0.7)" />
          <circle cx="81" cy="52" r="2.5" fill="hsl(95 50% 50% / 0.5)" />
          <circle cx="92" cy="52" r="2.5" fill="hsl(0 0% 100% / 0.25)" />
          <rect x="60" y="72" width="68" height="7" rx="2" fill="hsl(0 0% 100% / 0.12)" />
          <rect x="60" y="85" width="96" height="5" rx="1.5" fill="hsl(0 0% 100% / 0.08)" />
          <rect x="60" y="96" width="84" height="5" rx="1.5" fill="hsl(0 0% 100% / 0.08)" />
          <rect x="175" y="72" width="37" height="24" rx="4" fill="hsl(142 50% 40% / 0.3)" />
          <rect x="175" y="102" width="37" height="24" rx="4" fill="hsl(95 40% 40% / 0.25)" />
          <g transform="translate(118, 130)">
            <circle
              cx="12"
              cy="8"
              r="9"
              stroke="hsl(142 60% 55%)"
              strokeWidth="2"
              fill="hsl(142 50% 30% / 0.4)"
            />
            <rect x="9.5" y="13" width="5" height="12" rx="1.5" fill="hsl(142 60% 55%)" />
            <circle cx="12" cy="8" r="2.5" fill="hsl(150 20% 12%)" />
          </g>
          <circle cx="28" cy="55" r="2.2" fill="hsl(142 60% 55% / 0.35)" />
          <circle cx="252" cy="80" r="1.8" fill="hsl(95 50% 55% / 0.3)" />
        </svg>

        <div className="mt-4 text-center">
          <p className="text-sm font-semibold tracking-tight">ورود امن</p>
          <p className="mt-1 max-w-[180px] text-[11px] leading-relaxed text-white/55">
            دسترسی یکپارچه به ماژول‌ها با کنترل هویت و محدوده.
          </p>
        </div>
      </div>

      <div className="relative z-10 border-t border-white/10 px-6 py-3.5">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-white/10 text-xs font-bold">
            ه
          </span>
          <div>
            <p className="text-xs font-medium">هماره ERP</p>
            <p className="text-[10px] text-white/45">یکپارچگی · شفافیت · کنترل</p>
          </div>
        </div>
      </div>
    </div>
  );
}
