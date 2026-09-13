/**
 * Login — OTP UX, SoftRing hydrate (UI-06), controlled identifier,
 * submit lock until edit after error, one-shot slide human check.
 * Button loading follows UI-06: Loader2 + label (no elapsed counter).
 */

"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ClipboardEvent,
} from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  KeyRound,
  Smartphone,
  Building2,
  ArrowLeft,
  Pencil,
  Loader2,
} from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  authService,
  useAuthStore,
  type OrganizationOption,
} from "@/auth";
import { ApiClientError } from "@/api";
import { cn } from "@/shared/lib/utils";
import { LoginVisual } from "./login-visual";
import { LoginBackground } from "./login-background";
import { HumanSlideCheck } from "./login-human-slide";

const IR_MOBILE_RE = /^09\d{9}$/;
const OTP_LENGTH = 6;
const OTP_VALIDITY_SEC = 300;
const OTP_RESEND_SEC = 120;

function toFa(value: string | number): string {
  return String(value).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
}

function normalizeMobile(raw: string): string {
  let t = raw.trim().replace(/[\s\-]/g, "");
  if (t.startsWith("+98")) t = "0" + t.slice(3);
  if (t.startsWith("98") && t.length === 12) t = "0" + t.slice(2);
  if (/^9\d{9}$/.test(t)) t = "0" + t;
  return t;
}

function isValidIranMobile(raw: string): boolean {
  return IR_MOBILE_RE.test(normalizeMobile(raw));
}

function sanitizeIdentifierInput(raw: string): string {
  const hasLetterOrAt = /[a-zA-Z@]/.test(raw);
  if (hasLetterOrAt) return raw.slice(0, 120);
  return raw.replace(/\D/g, "").slice(0, 11);
}

function formatMmSs(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${toFa(m)}:${toFa(String(s).padStart(2, "0"))}`;
}

const passwordSchema = z.object({
  identifier: z
    .string()
    .min(3, "ایمیل یا شماره موبایل را وارد کنید")
    .refine(
      (v) => {
        const t = v.trim();
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
        return isEmail || isValidIranMobile(t);
      },
      { message: "فرمت ایمیل یا موبایل معتبر نیست" }
    ),
  password: z.string().min(6, "رمز عبور حداقل ۶ کاراکتر باشد"),
});

type PasswordForm = z.infer<typeof passwordSchema>;

function goToDashboard() {
  if (typeof window !== "undefined") {
    window.location.assign("/dashboard");
  }
}

function friendlyError(
  raw: string,
  context: "password" | "otp-mobile" | "otp-code" | "org"
): string {
  const m = raw.toLowerCase();
  if (
    m.includes("invalid") ||
    m.includes("credentials") ||
    m.includes("unauthorized")
  ) {
    return context === "password"
      ? "ایمیل/موبایل یا رمز عبور اشتباه است."
      : "اطلاعات واردشده صحیح نیست.";
  }
  if (m.includes("not found") || (m.includes("user") && m.includes("exist"))) {
    return "حسابی با این مشخصات پیدا نشد.";
  }
  if (m.includes("mobile") || m.includes("phone") || m.includes("شماره")) {
    return "شماره موبایل نامعتبر است (۰۹۱۲xxxxxxxx).";
  }
  if (m.includes("too many") || m.includes("rate") || m.includes("throttle")) {
    return "تعداد درخواست‌ها زیاد است. کمی صبر کنید.";
  }
  if (m.includes("expired") || m.includes("expire")) {
    return "کد منقضی شده. کد جدید درخواست کنید.";
  }
  if (m.includes("code") && (m.includes("invalid") || m.includes("wrong"))) {
    return "کد واردشده نادرست است.";
  }
  return raw || "عملیات ناموفق بود.";
}

function SoftRingLoader({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const s = size === "sm" ? "h-8 w-8" : size === "lg" ? "h-14 w-14" : "h-11 w-11";
  return (
    <span className={cn("relative inline-flex items-center justify-center", s)}>
      <span className="absolute inset-0 rounded-full border-2 border-primary/15" />
      <span
        className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary/80"
        style={{ animation: "login-spin 0.9s linear infinite" }}
      />
      <span
        className="absolute inset-1 rounded-full bg-primary/10"
        style={{ animation: "login-breathe 2s ease-in-out infinite" }}
      />
    </span>
  );
}

function BreathingDots({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)} aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-primary/70"
          style={{
            animation: "login-breathe 1.4s ease-in-out infinite",
            animationDelay: `${i * 0.18}s`,
          }}
        />
      ))}
    </span>
  );
}

function ErrorSlot({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      className="rounded-md border border-destructive/25 bg-destructive/5 px-2.5 py-1.5 text-xs text-destructive"
      role="alert"
      aria-live="polite"
    >
      {message}
    </div>
  );
}

function ResendButton({
  cooldownSec,
  totalSec,
  disabled,
  busy,
  onClick,
}: {
  cooldownSec: number;
  totalSec: number;
  disabled?: boolean;
  busy?: boolean;
  onClick: () => void;
}) {
  const locked = cooldownSec > 0;
  const progress = locked ? 1 - cooldownSec / totalSec : 1;
  const r = 18;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - progress);

  return (
    <button
      type="button"
      disabled={disabled || locked || busy}
      onClick={onClick}
      className={cn(
        "relative inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-input bg-background text-sm font-medium transition-colors",
        "hover:bg-accent hover:text-accent-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "disabled:pointer-events-none disabled:opacity-60"
      )}
    >
      <span className="relative flex h-8 w-8 shrink-0 items-center justify-center">
        <svg className="absolute h-8 w-8 -rotate-90" viewBox="0 0 40 40" aria-hidden>
          <circle cx="20" cy="20" r={r} fill="none" stroke="hsl(var(--border))" strokeWidth="2.5" />
          <circle
            cx="20"
            cy="20"
            r={r}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            className="transition-[stroke-dashoffset] duration-1000 linear"
          />
        </svg>
      </span>
      <span className="tabular-nums">
        {locked
          ? `ارسال مجدد · ${formatMmSs(cooldownSec)}`
          : busy
            ? "در حال ارسال…"
            : "ارسال مجدد"}
      </span>
    </button>
  );
}

function OtpCodeInput({
  value,
  onChange,
  disabled,
  onComplete,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  onComplete?: (code: string) => void;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(OTP_LENGTH, " ").slice(0, OTP_LENGTH).split("");
  const completedRef = useRef(false);

  const focusAt = (i: number) => {
    refs.current[i]?.focus();
  };

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
      else if (index > 0) {
        setDigit(index - 1, "");
        focusAt(index - 1);
      }
    } else if (e.key === "ArrowLeft" && index > 0) focusAt(index - 1);
    else if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) focusAt(index + 1);
  };

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;
    onChange(pasted);
    focusAt(Math.min(pasted.length, OTP_LENGTH - 1));
    if (pasted.length === OTP_LENGTH && onComplete) {
      completedRef.current = true;
      onComplete(pasted);
    }
  };

  return (
    <div className="flex items-center justify-center gap-1" dir="ltr" onPaste={onPaste}>
      {Array.from({ length: OTP_LENGTH }).map((_, i) => (
        <div key={i} className="flex items-center gap-1">
          {i > 0 && (
            <span className="select-none text-muted-foreground/50" aria-hidden>
              -
            </span>
          )}
          <input
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            maxLength={1}
            disabled={disabled}
            aria-label={`رقم ${i + 1}`}
            className={cn(
              "h-10 w-9 rounded-md border border-input bg-background text-center text-base font-semibold shadow-[var(--shadow-xs)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              "disabled:opacity-50"
            )}
            value={digits[i]?.trim() ?? ""}
            onChange={(e) => {
              const d = e.target.value.replace(/\D/g, "").slice(-1);
              setDigit(i, d);
            }}
            onKeyDown={(e) => onKeyDown(i, e)}
            onFocus={(e) => e.target.select()}
          />
        </div>
      ))}
    </div>
  );
}

function LoginShell({
  children,
  showVisual = true,
}: {
  children: React.ReactNode;
  showVisual?: boolean;
}) {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center gap-4 p-3 sm:p-5">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes login-breathe {
              0%, 100% { opacity: 0.35; transform: scale(0.85); }
              50% { opacity: 1; transform: scale(1); }
            }
            @keyframes login-spin {
              to { transform: rotate(360deg); }
            }
          `,
        }}
      />
      <LoginBackground />
      <div
        className={cn(
          "relative z-10 w-full overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-md)]",
          showVisual ? "max-w-[720px]" : "max-w-sm"
        )}
      >
        <div className={cn("flex", showVisual && "lg:min-h-[400px]")}>{children}</div>
      </div>
      <footer className="relative z-10 flex max-w-[720px] flex-col items-center gap-1.5 px-4 text-center">
        <nav className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <span className="cursor-default opacity-60">تعرفه</span>
          <span className="text-border">·</span>
          <span className="cursor-default opacity-60">راهنما</span>
          <span className="text-border">·</span>
          <span className="cursor-default opacity-60">حریم خصوصی</span>
        </nav>
        <p className="text-[10px] text-muted-foreground/80">
          قدرت‌گرفته از هماره · تمامی حقوق محفوظ است © {new Date().getFullYear()}
        </p>
      </footer>
    </main>
  );
}

export default function LoginPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const hydrate = useAuthStore((s) => s.hydrate);

  const [mode, setMode] = useState<"password" | "otp">("password");
  const [formError, setFormError] = useState<string | null>(null);
  const [passwordFails, setPasswordFails] = useState(0);
  const [needHumanCheck, setNeedHumanCheck] = useState(false);
  const [pendingAfterCheck, setPendingAfterCheck] = useState<
    "password" | "otp" | null
  >(null);
  const [humanVerified, setHumanVerified] = useState(false);
  /** Sync flag — setState alone is too late when we immediately retry login */
  const humanVerifiedRef = useRef(false);
  const [blockedUntilEdit, setBlockedUntilEdit] = useState(false);

  const [otpStep, setOtpStep] = useState<"mobile" | "code">("mobile");
  const [otpMobile, setOtpMobile] = useState("");
  const [otpMobileError, setOtpMobileError] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [otpBusy, setOtpBusy] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [codeValidityLeft, setCodeValidityLeft] = useState(0);
  const [debugCode, setDebugCode] = useState<string | null>(null);
  const [otpSendCount, setOtpSendCount] = useState(0);
  const [lastOtpSession, setLastOtpSession] = useState<{
    mobile: string;
    validUntil: number;
    resendUntil: number;
    debugCode?: string;
  } | null>(null);

  const [orgs, setOrgs] = useState<OrganizationOption[] | null>(null);
  const [preAuth, setPreAuth] = useState<string | null>(null);
  const [orgBusy, setOrgBusy] = useState(false);

  const autoSubmitLock = useRef(false);

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { identifier: "", password: "" },
  });

  const identifierReg = register("identifier");
  const passwordReg = register("password");
  const identifierValue = watch("identifier") ?? "";
  const passwordValue = watch("password") ?? "";

  const markEdited = () => {
    if (blockedUntilEdit) setBlockedUntilEdit(false);
  };

  useEffect(() => {
    if (!isHydrated) hydrate();
  }, [isHydrated, hydrate]);

  useEffect(() => {
    if (isHydrated && isAuthenticated && !orgs) goToDashboard();
  }, [isHydrated, isAuthenticated, orgs]);

  useEffect(() => {
    if (!lastOtpSession) {
      setResendCooldown(0);
      setCodeValidityLeft(0);
      return;
    }
    const tick = () => {
      const now = Date.now();
      setResendCooldown(Math.max(0, Math.ceil((lastOtpSession.resendUntil - now) / 1000)));
      setCodeValidityLeft(Math.max(0, Math.ceil((lastOtpSession.validUntil - now) / 1000)));
    };
    tick();
    const t = window.setInterval(tick, 1000);
    return () => window.clearInterval(t);
  }, [lastOtpSession]);

  const handleLoginResult = async (
    result: Awaited<ReturnType<typeof authService.loginWithPassword>>
  ) => {
    if (result.kind === "session") {
      toast.success("ورود با موفقیت انجام شد");
      goToDashboard();
      return;
    }
    setPreAuth(result.preAuthToken);
    setOrgs(result.organizations);
    toast.message("سازمان خود را انتخاب کنید");
  };

  const runPasswordLogin = async (values: PasswordForm) => {
    setFormError(null);
    try {
      const result = await authService.loginWithPassword(values.identifier, values.password);
      setPasswordFails(0);
      setBlockedUntilEdit(false);
      await handleLoginResult(result);
    } catch (err) {
      const raw = err instanceof ApiClientError ? err.message : "ورود ناموفق بود.";
      const message = friendlyError(raw, "password");
      setFormError(message);
      toast.error(message);
      const nextFails = passwordFails + 1;
      setPasswordFails(nextFails);
      setBlockedUntilEdit(true);
      if (nextFails >= 3 && !humanVerifiedRef.current) {
        setPendingAfterCheck("password");
        setNeedHumanCheck(true);
      }
    }
  };

  const onPasswordSubmit = async (values: PasswordForm) => {
    if (needHumanCheck || blockedUntilEdit) return;
    if (passwordFails >= 3 && !humanVerifiedRef.current) {
      setPendingAfterCheck("password");
      setNeedHumanCheck(true);
      return;
    }
    await runPasswordLogin(values);
  };

  const startOtpSession = (mobile: string, debug?: string) => {
    const now = Date.now();
    setLastOtpSession({
      mobile,
      validUntil: now + OTP_VALIDITY_SEC * 1000,
      resendUntil: now + OTP_RESEND_SEC * 1000,
      debugCode: debug,
    });
    setDebugCode(debug ?? null);
    setOtpCode("");
    autoSubmitLock.current = false;
  };

  const doRequestOtpNetwork = async (mobile: string) => {
    setOtpBusy(true);
    setFormError(null);
    try {
      const res = await authService.requestOtp(mobile);
      setOtpSendCount((c) => c + 1);
      startOtpSession(mobile, res.debug_code);
      setOtpStep("code");
      setBlockedUntilEdit(false);
      toast.success("کد تأیید ارسال شد");
    } catch (err) {
      const raw = err instanceof ApiClientError ? err.message : "ارسال کد ناموفق بود.";
      const message = friendlyError(raw, "otp-mobile");
      setFormError(message);
      setBlockedUntilEdit(true);
      toast.error(message);
    } finally {
      setOtpBusy(false);
    }
  };

  const onRequestOtp = async (opts?: { force?: boolean }) => {
    if (blockedUntilEdit) return;
    setFormError(null);
    setOtpMobileError(null);
    const mobile = normalizeMobile(otpMobile);
    if (!isValidIranMobile(mobile)) {
      setOtpMobileError("فرمت صحیح: ۰۹۱۲xxxxxxxx");
      setBlockedUntilEdit(true);
      return;
    }
    setOtpMobile(mobile);

    if (
      !opts?.force &&
      lastOtpSession &&
      lastOtpSession.mobile === mobile &&
      lastOtpSession.validUntil > Date.now()
    ) {
      setOtpStep("code");
      setDebugCode(lastOtpSession.debugCode ?? null);
      return;
    }

    if (otpSendCount >= 1 && !humanVerifiedRef.current) {
      setPendingAfterCheck("otp");
      setNeedHumanCheck(true);
      return;
    }

    await doRequestOtpNetwork(mobile);
  };

  const onVerifyOtp = useCallback(
    async (codeOverride?: string) => {
      if (autoSubmitLock.current || blockedUntilEdit) return;
      const code = (codeOverride ?? otpCode).replace(/\D/g, "");
      if (code.length !== OTP_LENGTH) return;
      if (codeValidityLeft <= 0) {
        setFormError("کد منقضی شده. کد جدید درخواست کنید.");
        setBlockedUntilEdit(true);
        return;
      }
      autoSubmitLock.current = true;
      setOtpBusy(true);
      setFormError(null);
      try {
        const result = await authService.verifyOtp(normalizeMobile(otpMobile), code);
        setBlockedUntilEdit(false);
        await handleLoginResult(result);
      } catch (err) {
        const raw =
          err instanceof ApiClientError ? err.message : "تأیید کد ناموفق بود.";
        const message = friendlyError(raw, "otp-code");
        setFormError(message);
        setBlockedUntilEdit(true);
        toast.error(message);
        autoSubmitLock.current = false;
      } finally {
        setOtpBusy(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [otpCode, otpMobile, codeValidityLeft, blockedUntilEdit]
  );

  const onHumanCheckPass = () => {
    humanVerifiedRef.current = true;
    setHumanVerified(true);
    setNeedHumanCheck(false);
    const pending = pendingAfterCheck;
    setPendingAfterCheck(null);
    if (pending === "password") {
      void runPasswordLogin(getValues());
    } else if (pending === "otp") {
      void doRequestOtpNetwork(normalizeMobile(otpMobile));
    }
  };

  const onSelectOrg = async (tenantId: string) => {
    if (!preAuth) return;
    setOrgBusy(true);
    setFormError(null);
    try {
      await authService.selectOrganization(preAuth, tenantId);
      toast.success("ورود با موفقیت انجام شد");
      goToDashboard();
    } catch (err) {
      const raw =
        err instanceof ApiClientError ? err.message : "انتخاب سازمان ناموفق بود.";
      const message = friendlyError(raw, "org");
      setFormError(message);
      setBlockedUntilEdit(true);
      toast.error(message);
    } finally {
      setOrgBusy(false);
    }
  };

  if (!isHydrated) {
    return (
      <LoginShell showVisual={false}>
        <div className="flex w-full flex-col items-center justify-center gap-3 p-10">
          <SoftRingLoader size="lg" />
          <p className="text-sm text-muted-foreground">در حال آماده‌سازی…</p>
          <BreathingDots />
        </div>
      </LoginShell>
    );
  }

  if (orgs && preAuth) {
    return (
      <LoginShell showVisual={false}>
        <div className="flex w-full flex-col gap-4 p-6">
          <div className="space-y-1">
            <h1 className="text-base font-semibold">انتخاب سازمان</h1>
            <p className="text-xs text-muted-foreground">
              حساب شما به چند سازمان متصل است. یکی را انتخاب کنید.
            </p>
          </div>
          <ErrorSlot message={formError} />
          {orgBusy && (
            <div className="flex items-center justify-center gap-1.5 py-1 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              در حال ورود به سازمان…
            </div>
          )}
          <div className="grid gap-2">
            {orgs.map((o) => (
              <button
                key={o.tenant_id}
                type="button"
                disabled={orgBusy}
                onClick={() => void onSelectOrg(o.tenant_id)}
                className={cn(
                  "flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2.5 text-right transition-colors",
                  "hover:border-primary/40 hover:bg-primary/5",
                  "disabled:opacity-60"
                )}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Building2 className="h-4 w-4" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium">{o.tenant_name}</span>
                  <span className="truncate text-[11px] text-muted-foreground" dir="ltr">
                    {o.tenant_code}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </LoginShell>
    );
  }

  return (
    <LoginShell>
      <div className="flex w-full flex-1 flex-col justify-center gap-4 p-5 sm:p-6 lg:max-w-[380px]">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold tracking-tight">ورود به هماره</h1>
          <p className="text-xs text-muted-foreground">با رمز عبور یا کد یک‌بارمصرف وارد شوید</p>
        </div>

        <div className="flex rounded-lg border border-border bg-muted/40 p-0.5">
          <button
            type="button"
            onClick={() => {
              setMode("password");
              setFormError(null);
              setNeedHumanCheck(false);
              setPendingAfterCheck(null);
              setBlockedUntilEdit(false);
            }}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
              mode === "password"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <KeyRound className="h-3.5 w-3.5" />
            رمز عبور
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("otp");
              setFormError(null);
              setNeedHumanCheck(false);
              setPendingAfterCheck(null);
              setBlockedUntilEdit(false);
            }}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
              mode === "otp"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Smartphone className="h-3.5 w-3.5" />
            کد یک‌بارمصرف
          </button>
        </div>

        {needHumanCheck && !humanVerifiedRef.current ? (
          <HumanSlideCheck onPass={onHumanCheckPass} />
        ) : mode === "password" ? (
          <form onSubmit={handleSubmit(onPasswordSubmit)} className="flex flex-col gap-3.5" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="identifier" className="text-xs font-medium">
                ایمیل یا موبایل <span className="text-destructive">*</span>
              </Label>
              <Input
                id="identifier"
                dir="ltr"
                autoComplete="username"
                className="h-9 text-left text-sm"
                placeholder="0912... یا user@company.com"
                name={identifierReg.name}
                ref={identifierReg.ref}
                onBlur={identifierReg.onBlur}
                value={identifierValue}
                onChange={(e) => {
                  const next = sanitizeIdentifierInput(e.target.value);
                  setValue("identifier", next, { shouldValidate: false, shouldDirty: true });
                  markEdited();
                }}
              />
              {errors.identifier && (
                <p className="text-[11px] text-destructive">{errors.identifier.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="password" className="text-xs font-medium">
                  رمز عبور <span className="text-destructive">*</span>
                </Label>
                <button
                  type="button"
                  className="text-[11px] text-primary hover:underline"
                  onClick={() => toast.message("بازیابی رمز عبور به زودی فعال می‌شود")}
                >
                  فراموشی رمز؟
                </button>
              </div>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                dir="ltr"
                className="h-9 text-left text-sm"
                placeholder="••••••••"
                name={passwordReg.name}
                ref={passwordReg.ref}
                onBlur={passwordReg.onBlur}
                value={passwordValue}
                onChange={(e) => {
                  setValue("password", e.target.value, { shouldValidate: false, shouldDirty: true });
                  markEdited();
                }}
              />
              {errors.password && (
                <p className="text-[11px] text-destructive">{errors.password.message}</p>
              )}
            </div>

            <ErrorSlot message={formError} />

            <div className="pt-2">
              <Button type="submit" className="h-9 w-full text-sm" disabled={isSubmitting || blockedUntilEdit}>
                {isSubmitting ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    در حال ورود…
                  </span>
                ) : (
                  "ورود به سیستم"
                )}
              </Button>
            </div>
          </form>
        ) : otpStep === "mobile" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void onRequestOtp();
            }}
            className="flex flex-col gap-3.5"
            noValidate
          >
            <div className="space-y-1.5">
              <Label htmlFor="otp-mobile" className="text-xs font-medium">
                شماره موبایل <span className="text-destructive">*</span>
              </Label>
              <Input
                id="otp-mobile"
                dir="ltr"
                inputMode="numeric"
                autoComplete="tel"
                maxLength={11}
                className="h-9 text-left text-sm tracking-wide"
                placeholder="0912xxxxxxxx"
                value={otpMobile}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "").slice(0, 11);
                  setOtpMobile(digits);
                  setOtpMobileError(null);
                  markEdited();
                }}
                onBlur={() => {
                  if (otpMobile.trim() && !isValidIranMobile(otpMobile)) {
                    setOtpMobileError("فرمت صحیح: ۰۹۱۲xxxxxxxx");
                    setBlockedUntilEdit(true);
                  }
                }}
              />
              {otpMobileError && (
                <p className="text-[11px] text-destructive">{otpMobileError}</p>
              )}
            </div>

            <ErrorSlot message={formError} />

            <div className="pt-2">
              <Button
                type="submit"
                className="h-9 w-full text-sm"
                disabled={otpBusy || blockedUntilEdit || !otpMobile.trim()}
              >
                {otpBusy ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    در حال ارسال…
                  </span>
                ) : (
                  "دریافت کد تأیید"
                )}
              </Button>
            </div>
          </form>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void onVerifyOtp();
            }}
            className="flex flex-col gap-3.5"
            noValidate
          >
            <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-2.5 py-2">
              <div className="flex min-w-0 items-center gap-2">
                <Smartphone className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="truncate text-sm font-medium tabular-nums" dir="ltr">
                  {otpMobile}
                </span>
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                onClick={() => {
                  setOtpStep("mobile");
                  setOtpCode("");
                  setFormError(null);
                  setBlockedUntilEdit(false);
                  autoSubmitLock.current = false;
                }}
              >
                <Pencil className="h-3 w-3" />
                ویرایش
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs font-medium">کد یک‌بارمصرف</Label>
                {codeValidityLeft > 0 ? (
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    اعتبار کد · {formatMmSs(codeValidityLeft)}
                  </span>
                ) : (
                  <span className="text-[11px] text-destructive">کد منقضی شده</span>
                )}
              </div>
              <OtpCodeInput
                value={otpCode}
                onChange={(v) => {
                  setOtpCode(v);
                  setFormError(null);
                  autoSubmitLock.current = false;
                  markEdited();
                }}
                disabled={otpBusy}
                onComplete={(code) => {
                  if (!blockedUntilEdit) void onVerifyOtp(code);
                }}
              />
            </div>

            {debugCode && (
              <p className="text-[11px] text-muted-foreground" dir="ltr">
                debug: {debugCode}
              </p>
            )}

            <ErrorSlot message={formError} />

            <div className="flex items-center gap-2 pt-1">
              <Button
                type="submit"
                className="h-10 flex-1 text-sm"
                disabled={
                  otpBusy || blockedUntilEdit || otpCode.replace(/\D/g, "").length !== OTP_LENGTH
                }
              >
                {otpBusy ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    در حال تأیید…
                  </span>
                ) : (
                  "تأیید و ورود"
                )}
              </Button>
              <ResendButton
                cooldownSec={resendCooldown}
                totalSec={OTP_RESEND_SEC}
                busy={otpBusy}
                disabled={blockedUntilEdit}
                onClick={() => void onRequestOtp({ force: true })}
              />
            </div>

            <button
              type="button"
              className="inline-flex items-center justify-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
              onClick={() => {
                setOtpStep("mobile");
                setOtpCode("");
                setFormError(null);
                setBlockedUntilEdit(false);
              }}
            >
              <ArrowLeft className="h-3 w-3" />
              بازگشت به ورود شماره
            </button>
          </form>
        )}
      </div>

      <div className="hidden flex-1 border-r border-border lg:block">
        <LoginVisual className="h-full min-h-[400px]" />
      </div>
    </LoginShell>
  );
}
