/**
 * Login visual panel — pure CSS/SVG living data network (ERP concept).
 * Lightweight, fun, responsive. Reacts subtly when form is active.
 */

"use client";

import { useEffect, useState } from "react";
import { cn } from "@/shared/lib/utils";

interface LoginVisualProps {
  active?: boolean;
  className?: string;
}

const NODES = [
  { id: 1, x: 22, y: 28, label: "فروش", delay: "0s" },
  { id: 2, x: 78, y: 22, label: "انبار", delay: "0.4s" },
  { id: 3, x: 18, y: 68, label: "مالی", delay: "0.8s" },
  { id: 4, x: 82, y: 72, label: "منابع", delay: "1.2s" },
  { id: 5, x: 50, y: 48, label: "هسته", delay: "0.2s", core: true },
];

const LINKS: [number, number][] = [
  [1, 5],
  [2, 5],
  [3, 5],
  [4, 5],
  [1, 2],
  [3, 4],
];

export function LoginVisual({ active = false, className }: LoginVisualProps) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = window.setInterval(() => setTick((p) => p + 1), 2800);
    return () => window.clearInterval(t);
  }, []);

  return (
    <div
      className={cn(
        "relative hidden h-full min-h-[420px] overflow-hidden rounded-2xl lg:flex lg:flex-col",
        "bg-[hsl(150_28%_9%)] text-white",
        className
      )}
    >
      {/* ambient glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 40%, hsl(142 55% 28% / 0.35), transparent 70%), radial-gradient(ellipse 50% 40% at 80% 80%, hsl(95 40% 30% / 0.2), transparent 60%)",
        }}
      />

      {/* subtle grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(0 0% 100% / 0.5) 1px, transparent 1px), linear-gradient(90deg, hsl(0 0% 100% / 0.5) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden
      >
        <defs>
          <linearGradient id="loginLinkGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(142 70% 55%)" stopOpacity="0.15" />
            <stop offset="50%" stopColor="hsl(142 70% 60%)" stopOpacity="0.55" />
            <stop offset="100%" stopColor="hsl(95 60% 50%)" stopOpacity="0.15" />
          </linearGradient>
          <filter id="loginGlow">
            <feGaussianBlur stdDeviation="1.2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {LINKS.map(([a, b], i) => {
          const na = NODES.find((n) => n.id === a)!;
          const nb = NODES.find((n) => n.id === b)!;
          return (
            <line
              key={`l-${i}`}
              x1={na.x}
              y1={na.y}
              x2={nb.x}
              y2={nb.y}
              stroke="url(#loginLinkGrad)"
              strokeWidth={0.35}
              className={cn(
                "transition-opacity duration-700",
                active ? "opacity-100" : "opacity-70"
              )}
              style={{
                animation: `loginLinkPulse 3.6s ease-in-out ${i * 0.35}s infinite`,
              }}
            />
          );
        })}

        {NODES.map((n) => (
          <g key={n.id}>
            {n.core && (
              <circle
                cx={n.x}
                cy={n.y}
                r={8}
                fill="none"
                stroke="hsl(142 70% 55% / 0.35)"
                strokeWidth={0.4}
                style={{ animation: "loginCoreRing 2.8s ease-out infinite" }}
              />
            )}
            <circle
              cx={n.x}
              cy={n.y}
              r={n.core ? 4.2 : 2.6}
              fill={n.core ? "hsl(142 70% 52%)" : "hsl(142 50% 42%)"}
              filter="url(#loginGlow)"
              style={{
                animation: n.core
                  ? "loginCorePulse 2.4s ease-in-out infinite"
                  : `loginNodeFloat 4s ease-in-out ${n.delay} infinite`,
                transformOrigin: `${n.x}px ${n.y}px`,
              }}
            />
            {n.core &&
              [0, 1, 2].map((p) => {
                const angle = (tick + p * 2.1) * 0.9;
                return (
                  <circle
                    key={p}
                    cx={n.x + Math.cos(angle) * 7}
                    cy={n.y + Math.sin(angle) * 7}
                    r={0.7}
                    fill="hsl(95 70% 65% / 0.85)"
                  />
                );
              })}
          </g>
        ))}
      </svg>

      <div className="pointer-events-none absolute inset-0">
        {NODES.filter((n) => !n.core).map((n) => (
          <span
            key={n.id}
            className="absolute text-[10px] font-medium tracking-wide text-white/55"
            style={{
              left: `${n.x}%`,
              top: `${n.y + 6}%`,
              transform: "translateX(-50%)",
              animation: `loginLabelFade 5s ease-in-out ${n.delay} infinite`,
            }}
          >
            {n.label}
          </span>
        ))}
      </div>

      <div className="relative z-10 mt-auto flex flex-col gap-2 p-8 pb-10">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-sm font-bold backdrop-blur">
            ه
          </span>
          <span className="text-lg font-semibold tracking-tight">هماره ERP</span>
        </div>
        <p className="max-w-[240px] text-sm leading-relaxed text-white/70">
          یکپارچگی ماژول‌ها، شفافیت داده و کنترل هوشمند — همه در یک نقطه ورود.
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {["فروش", "انبار", "مالی", "منابع"].map((t) => (
            <span
              key={t}
              className="rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-[10px] text-white/60"
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
