/**
 * Shared presentational pieces for the login page (loaders, buttons, OTP input, shell).
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { cn } from "@/shared/lib/utils";
import { LoginVisual } from "./login-visual";

export const OTP_LENGTH = 6;
export const OTP_TIMER_SEC = 600;
/** Hard resend cooldown — matches backend OTP multi-use policy (10 min). */
export const OTP_RESEND_MIN_SEC = 600;

export function toFa(raw: string) {
  return raw.replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)] ?? d);
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
      className={cn("relative h-10 w-full overflow-hidden text-sm", loading && "pointer-events-none", className)}
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
  // Show waiting circle only during the 10-minute resend cooldown after a successful send.
  // Label "ارسال مجدد · m:ss" = wait before requesting a NEW code (not code expiry).
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
            <circle cx="22" cy="22" r={r} fill="none" stroke="currentColor" strokeWidth="3" className="text-muted/40" />
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
          <span className="text-[10px] tabular-nums text-muted-foreground">{toFa(`${mm}:${ss}`)}</span>
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
  const digits = value.replace(/\D/g, "").slice(0, length).split("");

  useEffect(() => {
    if (digits.length === length) onComplete?.(digits.join(""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const setAt = (idx: number, char: string) => {
    const next = Array.from({ length }, (_, i) => digits[i] ?? "");
    next[idx] = char;
    const joined = next.join("").replace(/\D/g, "").slice(0, length);
    onChange(joined);
  };

  return (
    <div className="flex justify-center gap-2" dir="ltr">
      {Array.from({ length }).map((_, i) => (
        <Input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          inputMode="numeric"
          maxLength={1}
          disabled={disabled}
          value={digits[i] ?? ""}
          className="h-11 w-10 text-center font-mono text-lg"
          onChange={(e) => {
            const d = e.target.value.replace(/\D/g, "").slice(-1);
            if (!d) {
              setAt(i, "");
              return;
            }
            setAt(i, d);
            if (i < length - 1) refs.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !digits[i] && i > 0) {
              refs.current[i - 1]?.focus();
            }
          }}
          onPaste={(e) => {
            e.preventDefault();
            const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
            if (!pasted) return;
            onChange(pasted);
            const focusIdx = Math.min(pasted.length, length - 1);
            refs.current[focusIdx]?.focus();
          }}
        />
      ))}
    </div>
  );
}

export function LoginShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="relative hidden lg:block">
        <LoginVisual />
      </div>
      <div className="flex min-h-dvh flex-col bg-background">{children}</div>
      <style jsx global>{`
        @keyframes login-shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
