/**
 * Shared presentational pieces for the login page (loaders, buttons, OTP input, shell).
 */
"use client";

import {
  useEffect,
  useRef,
  type KeyboardEvent,
  type ClipboardEvent,
} from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import { LoginBackground } from "./login-background";
import { LoginVisual } from "./login-visual";

export const OTP_LENGTH = 6;
export const OTP_TIMER_SEC = 600;
/** Hard resend cooldown — matches backend OTP multi-use policy (10 min). */
export const OTP_RESEND_MIN_SEC = 600;

export function toFa(raw: string | number) {
  return String(raw).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)] ?? d);
}

export function fromFa(raw: string) {
  return raw
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

export function SoftRingLoader({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary/30 border-t-primary",
        className
      )}
      aria-hidden
    />
  );
}

export function BreathingDots() {
  return (
    <span className="inline-flex items-center gap-1" aria-hidden>
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary/70" />
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary/50 [animation-delay:120ms]" />
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary/30 [animation-delay:240ms]" />
    </span>
  );
}

export function ErrorSlot({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
    >
      {message}
    </div>
  );
}

export function ActionButton({
  loading,
  loadingLabel,
  children,
  className,
  disabled,
  type = "submit",
  onClick,
}: {
  loading?: boolean;
  loadingLabel?: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  type?: "submit" | "button";
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <Button
      type={type}
      onClick={onClick}
      className={cn(
        "relative h-10 w-full overflow-hidden text-sm",
        loading && "pointer-events-none",
        className
      )}
      disabled={disabled || loading}
    >
      {loading && (
        <span
          className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent"
          style={{ animation: "login-shimmer 1.4s ease-in-out infinite" }}
          aria-hidden
        />
      )}
      {loading ? (
        <span className="inline-flex items-center gap-1.5">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {loadingLabel ?? "لطفاً صبر کنید…"}
        </span>
      ) : (
        children
      )}
    </Button>
  );
}

export function ResendButton({
  cooldownSec,
  totalSec,
  disabled,
  busy,
  onClick,
  minLockSec = OTP_RESEND_MIN_SEC,
}: {
  cooldownSec: number;
  totalSec: number;
  disabled?: boolean;
  busy?: boolean;
  onClick: () => void;
  minLockSec?: number;
}) {
  const elapsed = Math.max(0, totalSec - cooldownSec);
  const lockLeft = minLockSec > 0 ? Math.max(0, minLockSec - elapsed) : 0;
  const locked = lockLeft > 0;
  const progress = locked && minLockSec > 0 ? 1 - lockLeft / minLockSec : 1;
  const r = 18;
  const c = 2 * Math.PI * r;
  const dash = c * progress;
  const mm = Math.floor(lockLeft / 60);
  const ss = String(lockLeft % 60).padStart(2, "0");

  return (
    <div className="flex items-center justify-center gap-3">
      {locked ? (
        <div className="relative flex h-11 w-11 items-center justify-center">
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 44 44" aria-hidden>
            <circle
              cx="22"
              cy="22"
              r={r}
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              className="text-muted/40"
            />
            <circle
              cx="22"
              cy="22"
              r={r}
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${c}`}
              className="text-primary transition-[stroke-dasharray] duration-1000 ease-linear"
            />
          </svg>
          <span className="text-[10px] tabular-nums text-muted-foreground">
            {toFa(`${mm}:${ss}`)}
          </span>
        </div>
      ) : null}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-9 text-xs"
        disabled={disabled || busy || locked}
        onClick={onClick}
      >
        {busy ? (
          <span className="inline-flex items-center gap-1.5">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            در حال ارسال…
          </span>
        ) : locked ? (
          `ارسال مجدد · ${toFa(`${mm}:${ss}`)}`
        ) : (
          "ارسال مجدد کد"
        )}
      </Button>
    </div>
  );
}

export function OtpCodeInput({
  value,
  onChange,
  onComplete,
  disabled,
  length = OTP_LENGTH,
}: {
  value: string;
  onChange: (v: string) => void;
  onComplete?: (code: string) => void;
  disabled?: boolean;
  length?: number;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const ascii = fromFa(value).replace(/\D/g, "").slice(0, length);
  const digits = ascii.split("");

  useEffect(() => {
    if (ascii.length === length) onComplete?.(ascii);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ascii]);

  const setAt = (idx: number, char: string) => {
    const next = Array.from({ length }, (_, i) => digits[i] ?? "");
    next[idx] = char;
    const joined = next.join("").replace(/\D/g, "").slice(0, length);
    onChange(joined);
  };

  const onKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (digits[index]) setAt(index, "");
      else if (index > 0) {
        setAt(index - 1, "");
        refs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) refs.current[index - 1]?.focus();
    else if (e.key === "ArrowRight" && index < length - 1) refs.current[index + 1]?.focus();
  };

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = fromFa(e.clipboardData.getData("text")).replace(/\D/g, "").slice(0, length);
    if (!pasted) return;
    onChange(pasted);
    refs.current[Math.min(pasted.length, length - 1)]?.focus();
  };

  return (
    <div className="flex items-center justify-center gap-1.5" dir="ltr" onPaste={onPaste}>
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={1}
          disabled={disabled}
          aria-label={`رقم ${toFa(i + 1)}`}
          value={digits[i] ? toFa(digits[i]) : ""}
          className={cn(
            "h-11 w-10 rounded-md border border-input bg-background text-center text-base font-semibold shadow-[var(--shadow-xs)]",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          )}
          onChange={(e) => {
            const d = fromFa(e.target.value).replace(/\D/g, "").slice(-1);
            if (!d) {
              setAt(i, "");
              return;
            }
            setAt(i, d);
            if (i < length - 1) refs.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => onKeyDown(i, e)}
          onFocus={(e) => e.target.select()}
        />
      ))}
    </div>
  );
}

export function LoginShell({
  children,
  showVisual = true,
}: {
  children: React.ReactNode;
  showVisual?: boolean;
}) {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center gap-5 p-3 sm:p-6">
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes login-breathe { 0%, 100% { opacity: 0.35; transform: scale(0.85); } 50% { opacity: 1; transform: scale(1); } }
        @keyframes login-spin { to { transform: rotate(360deg); } }
        @keyframes login-shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        @keyframes login-ring-pulse { 0%, 100% { opacity: 0.75; } 50% { opacity: 1; }
        }
        @keyframes login-card-in { from { opacity: 0; transform: translateY(10px) scale(0.985); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes login-glow {
          0%, 100% { box-shadow: 0 0 0 1px hsl(var(--border)), 0 12px 40px -12px hsl(var(--primary) / 0.18); }
          50% { box-shadow: 0 0 0 1px hsl(var(--primary) / 0.25), 0 16px 48px -10px hsl(var(--primary) / 0.28); }
        }
      `,
        }}
      />
      <LoginBackground />
      <div
        className={cn(
          "relative z-10 w-full overflow-hidden rounded-2xl border border-border/80 bg-card/95 backdrop-blur-sm",
          showVisual ? "max-w-[760px]" : "max-w-sm"
        )}
        style={{
          animation: "login-card-in 0.45s ease-out, login-glow 6s ease-in-out infinite",
        }}
      >
        <div className={cn("flex", showVisual && "lg:min-h-[440px]")}>{children}</div>
      </div>
      <footer className="relative z-10 flex max-w-[760px] flex-col items-center gap-1.5 px-4 text-center">
        <nav className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <span className="opacity-70">
            تعرفه <span className="text-[9px] opacity-60">(به‌زودی)</span>
          </span>
          <span className="text-border">·</span>
          <span className="opacity-70">
            راهنما <span className="text-[9px] opacity-60">(به‌زودی)</span>
          </span>
          <span className="text-border">·</span>
          <span className="opacity-70">
            حریم خصوصی <span className="text-[9px] opacity-60">(به‌زودی)</span>
          </span>
        </nav>
        <p className="text-[10px] text-muted-foreground/80">
          قدرت‌گرفته از هماره · تمامی حقوق محفوظ است © {new Date().getFullYear()}
        </p>
      </footer>
    </main>
  );
}

/** Side panel used inside LoginShell when showVisual is true */
export function LoginVisualPanel() {
  return (
    <div className="relative hidden w-[min(100%,360px)] shrink-0 overflow-hidden lg:block">
      <LoginVisual className="h-full min-h-[440px]" />
    </div>
  );
}
