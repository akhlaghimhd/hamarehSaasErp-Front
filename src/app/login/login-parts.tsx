/**
 * Login UI building blocks
 */
"use client";

import { useRef, type KeyboardEvent, type ClipboardEvent } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import { LoginBackground } from "./login-background";

export const OTP_LENGTH = 6;
/** Align with backend OtpLoginService::TTL_SECONDS (5 minutes). Code validity window. */
export const OTP_TIMER_SEC = 300;
/** Minimum seconds between resend clicks (UX). Abuse/force limits are enforced by backend. */
export const OTP_RESEND_MIN_SEC = 30;

export function toFa(v: string | number) {
  return String(v).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
}
/** Convert Persian/Arabic-Indic digits back to ASCII 0-9 (for API payloads). */
export function fromFa(v: string) {
  return String(v)
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}
export function formatMmSs(totalSec: number) {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${toFa(m)}:${toFa(String(s).padStart(2, "0"))}`;
}

export function SoftRingLoader({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const s = size === "sm" ? "h-8 w-8" : size === "lg" ? "h-14 w-14" : "h-11 w-11";
  return (
    <span className={cn("relative inline-flex items-center justify-center", s)}>
      <span className="absolute inset-0 rounded-full border-2 border-primary/15" />
      <span className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary/80" style={{ animation: "login-spin 0.9s linear infinite" }} />
      <span className="absolute inset-1 rounded-full bg-primary/10" style={{ animation: "login-breathe 2s ease-in-out infinite" }} />
    </span>
  );
}

export function BreathingDots({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)} aria-hidden>
      {[0, 1, 2].map((i) => (
        <span key={i} className="h-1.5 w-1.5 rounded-full bg-primary/70" style={{ animation: "login-breathe 1.4s ease-in-out infinite", animationDelay: `${i * 0.18}s` }} />
      ))}
    </span>
  );
}

export function ErrorSlot({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="rounded-md border border-destructive/25 bg-destructive/5 px-2.5 py-1.5 text-xs text-destructive" role="alert" aria-live="polite">
      {message}
    </div>
  );
}

export function ActionButton({ loading, loadingLabel, children, className, disabled, type = "submit" }: {
  loading?: boolean; loadingLabel?: string; children: React.ReactNode; className?: string; disabled?: boolean; type?: "submit" | "button";
}) {
  return (
    <Button type={type} className={cn("relative h-10 w-full overflow-hidden text-sm", loading && "pointer-events-none", className)} disabled={disabled || loading}>
      {loading && (
        <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent" style={{ animation: "login-shimmer 1.4s ease-in-out infinite" }} aria-hidden />
      )}
      {loading ? (
        <span className="inline-flex items-center gap-1.5"><Loader2 className="h-3.5 w-3.5 animate-spin" />{loadingLabel ?? "لطفاً صبر کنید…"}</span>
      ) : children}
    </Button>
  );
}

export function ResendButton({ cooldownSec, totalSec, disabled, busy, onClick, minLockSec = OTP_RESEND_MIN_SEC }: {
  cooldownSec: number; totalSec: number; disabled?: boolean; busy?: boolean; onClick: () => void; minLockSec?: number;
}) {
  // Only lock for the first minLockSec after send — NOT the full code TTL.
  // Full 5-minute validity is server-side; force-resend + abuse lock live on backend.
  const elapsed = Math.max(0, totalSec - cooldownSec);
  const lockLeft = Math.max(0, minLockSec - elapsed);
  const locked = lockLeft > 0;
  const progress = locked ? 1 - lockLeft / minLockSec : 1;
  const r = 18;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - progress);
  return (
    <button type="button" disabled={disabled || locked || busy} onClick={onClick}
      className={cn(
        "relative inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-input bg-background text-sm font-medium transition-all",
        "hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "disabled:pointer-events-none disabled:opacity-60", locked && "border-primary/30"
      )}>
      <span className="relative flex h-8 w-8 shrink-0 items-center justify-center">
        <svg className="absolute h-8 w-8 -rotate-90" viewBox="0 0 40 40" aria-hidden>
          <circle cx="20" cy="20" r={r} fill="none" stroke="hsl(var(--border))" strokeWidth="2.5" />
          <circle cx="20" cy="20" r={r} fill="none" stroke="hsl(var(--primary))" strokeWidth="2.5" strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={offset}
            className="transition-[stroke-dashoffset] duration-1000 linear"
            style={locked ? {
              filter: "drop-shadow(0 0 4px hsl(var(--primary) / 0.55))",
              animation: "login-ring-pulse 1.6s ease-in-out infinite",
            } : undefined}
          />
        </svg>
        {busy ? (
          <Loader2 className="relative h-3.5 w-3.5 animate-spin text-primary" />
        ) : locked ? (
          <span
            className="relative h-2 w-2 rounded-full bg-primary"
            style={{ animation: "login-breathe 1.2s ease-in-out infinite, login-ring-pulse 1.6s ease-in-out infinite" }}
          />
        ) : (
          <span className="absolute inset-0 rounded-full bg-primary/10" style={{ animation: "login-breathe 2s ease-in-out infinite" }} />
        )}
      </span>
      <span className="tabular-nums">{locked ? `ارسال مجدد · ${formatMmSs(lockLeft)}` : busy ? "در حال ارسال…" : "ارسال مجدد"}</span>
    </button>
  );
}

export function OtpCodeInput({ value, onChange, disabled, onComplete }: {
  value: string; onChange: (v: string) => void; disabled?: boolean; onComplete?: (code: string) => void;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(OTP_LENGTH, " ").slice(0, OTP_LENGTH).split("");
  const completedRef = useRef(false);
  const focusAt = (i: number) => refs.current[i]?.focus();
  const setDigit = (index: number, char: string) => {
    const next = value.split("");
    while (next.length < OTP_LENGTH) next.push("");
    next[index] = char;
    const joined = next.join("").replace(/\s/g, "").slice(0, OTP_LENGTH);
    onChange(joined);
    if (char && index < OTP_LENGTH - 1) focusAt(index + 1);
    if (joined.length === OTP_LENGTH && onComplete && !completedRef.current) {
      completedRef.current = true;
      onComplete(joined);
    }
    if (joined.length < OTP_LENGTH) completedRef.current = false;
  };
  const onKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      completedRef.current = false;
      if (value[index]) setDigit(index, "");
      else if (index > 0) { setDigit(index - 1, ""); focusAt(index - 1); }
    } else if (e.key === "ArrowLeft" && index > 0) focusAt(index - 1);
    else if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) focusAt(index + 1);
  };
  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = fromFa(e.clipboardData.getData("text")).replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;
    onChange(pasted);
    focusAt(Math.min(pasted.length, OTP_LENGTH - 1));
    if (pasted.length === OTP_LENGTH && onComplete) { completedRef.current = true; onComplete(pasted); }
  };
  return (
    <div className="flex items-center justify-center gap-1" dir="ltr" onPaste={onPaste}>
      {Array.from({ length: OTP_LENGTH }).map((_, i) => (
        <div key={i} className="flex items-center gap-1">
          {i > 0 && <span className="select-none text-muted-foreground/50" aria-hidden>-</span>}
          <input
            ref={(el) => { refs.current[i] = el; }}
            type="text" inputMode="numeric" autoComplete={i === 0 ? "one-time-code" : "off"} maxLength={1}
            disabled={disabled} aria-label={`رقم ${i + 1}`}
            className={cn(
              "h-10 w-9 rounded-md border border-input bg-background text-center text-base font-semibold shadow-[var(--shadow-xs)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            )}
            value={digits[i]?.trim() ? toFa(digits[i].trim()) : ""}
            onChange={(e) => setDigit(i, fromFa(e.target.value).replace(/\D/g, "").slice(-1))}
            onKeyDown={(e) => onKeyDown(i, e)}
            onFocus={(e) => e.target.select()}
          />
        </div>
      ))}
    </div>
  );
}

export function LoginShell({ children, showVisual = true }: { children: React.ReactNode; showVisual?: boolean }) {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center gap-5 p-3 sm:p-6">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes login-breathe { 0%, 100% { opacity: 0.35; transform: scale(0.85); } 50% { opacity: 1; transform: scale(1); } }
        @keyframes login-spin { to { transform: rotate(360deg); } }
        @keyframes login-shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        @keyframes login-ring-pulse { 0%, 100% { opacity: 0.75; } 50% { opacity: 1; } }
        @keyframes login-ring-rotate { to { transform: rotate(360deg); } }
        @keyframes login-card-in { from { opacity: 0; transform: translateY(10px) scale(0.985); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes login-glow {
          0%, 100% { box-shadow: 0 0 0 1px hsl(var(--border)), 0 12px 40px -12px hsl(var(--primary) / 0.18); }
          50% { box-shadow: 0 0 0 1px hsl(var(--primary) / 0.25), 0 16px 48px -10px hsl(var(--primary) / 0.28); }
        }
      `}} />
      <LoginBackground />
      <div
        className={cn("relative z-10 w-full overflow-hidden rounded-2xl border border-border/80 bg-card/95 backdrop-blur-sm", showVisual ? "max-w-[760px]" : "max-w-sm")}
        style={{ animation: "login-card-in 0.45s ease-out, login-glow 6s ease-in-out infinite" }}
      >
        <div className={cn("flex", showVisual && "lg:min-h-[440px]")}>{children}</div>
      </div>
      <footer className="relative z-10 flex max-w-[760px] flex-col items-center gap-1.5 px-4 text-center">
        <nav className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <span className="opacity-70">تعرفه <span className="text-[9px] opacity-60">(به‌زودی)</span></span>
          <span className="text-border">·</span>
          <span className="opacity-70">راهنما <span className="text-[9px] opacity-60">(به‌زودی)</span></span>
          <span className="text-border">·</span>
          <span className="opacity-70">حریم خصوصی <span className="text-[9px] opacity-60">(به‌زودی)</span></span>
        </nav>
        <p className="text-[10px] text-muted-foreground/80">قدرت‌گرفته از هماره · تمامی حقوق محفوظ است © {toFa(new Date().getFullYear())}</p>
      </footer>
    </main>
  );
}
