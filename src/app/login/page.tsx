/**
 * Login — compact card, collapsing error slots, Enter-submit,
 * OTP same-number resume + timer, segmented 6-digit code,
 * soft bot check: OTP 2nd attempt / password 3rd fail.
 */

"use client";

import {
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
  ShieldCheck,
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

const IR_MOBILE_RE = /^09\d{9}$/;
const OTP_LENGTH = 6;

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

function StoryLoader({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg width="18" height="18" viewBox="0 0 32 32" className="shrink-0" aria-hidden>
        <circle cx="16" cy="16" r="3.5" fill="currentColor" className="opacity-90">
          <animate attributeName="r" values="3;4.2;3" dur="1.1s" repeatCount="indefinite" />
        </circle>
        <circle
          cx="16"
          cy="16"
          r="8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeDasharray="12 20"
          className="opacity-70"
        >
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 16 16"
            to="360 16 16"
            dur="1.4s"
            repeatCount="indefinite"
          />
        </circle>
      </svg>
      <span className="text-sm">{label}</span>
    </span>
  );
}

function SoftHumanCheck({ onPass }: { onPass: () => void }) {
  const [picked, setPicked] = useState<string | null>(null);
  const options = [
    { id: "inv", label: "موجودی انبار", correct: true },
    { id: "hr", label: "تقویم تعطیلات", correct: false },
    { id: "mkt", label: "کمپین تبلیغاتی", correct: false },
  ];

  return (
    <div className="space-y-2.5 rounded-lg border border-primary/20 bg-primary/5 p-3">
      <div className="flex items-start gap-2">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
        <div>
          <p className="text-xs font-medium">یک لحظه صبر کنید</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            کدام مورد بخشی از سیستم ERP است؟
          </p>
        </div>
      </div>
      <div className="grid gap-1.5">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => {
              setPicked(o.id);
              if (o.correct) setTimeout(onPass, 250);
              else toast.error("گزینهٔ درست را انتخاب کنید");
            }}
            className={cn(
              "rounded-md border px-2.5 py-2 text-right text-xs transition-all",
              picked === o.id && o.correct
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background hover:border-primary/40"
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Only takes space when there is a message */
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

/** 6-digit OTP with visual separators: □ - □ - □ - □ - □ - □ */
function OtpCodeInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(OTP_LENGTH, " ").slice(0, OTP_LENGTH).split("");

  const focusAt = (i: number) => {
    const el = refs.current[i];
    if (el) el.focus();
  };

  const setDigit = (index: number, char: string) => {
    const next = value.split("");
    while (next.length < OTP_LENGTH) next.push("");
    next[index] = char;
    const joined = next.join("").replace(/\s/g, "").slice(0, OTP_LENGTH);
    onChange(joined);
    if (char && index < OTP_LENGTH - 1) focusAt(index + 1);
  };

  const onKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (value[index]) {
        setDigit(index, "");
      } else if (index > 0) {
        setDigit(index - 1, "");
        focusAt(index - 1);
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      focusAt(index - 1);
    } else if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      focusAt(index + 1);
    }
  };

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;
    onChange(pasted);
    focusAt(Math.min(pasted.length, OTP_LENGTH - 1));
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
      <LoginBackground />

      <div
        className={cn(
          "relative z-10 w-full overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-md)]",
          showVisual ? "max-w-[720px]" : "max-w-sm"
        )}
      >
        <div className={cn("flex", showVisual && "lg:min-h-[400px]")}>
          {children}
        </div>
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

  const [otpStep, setOtpStep] = useState<"mobile" | "code">("mobile");
  const [otpMobile, setOtpMobile] = useState("");
  const [otpMobileError, setOtpMobileError] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [otpBusy, setOtpBusy] = useState(false);
  const [otpSeconds, setOtpSeconds] = useState(0);
  const [debugCode, setDebugCode] = useState<string | null>(null);
  const [otpSendCount, setOtpSendCount] = useState(0);
  /** Last successfully requested mobile + absolute expiry (ms) */
  const [lastOtpSession, setLastOtpSession] = useState<{
    mobile: string;
    expiresAt: number;
    debugCode?: string;
  } | null>(null);

  const [orgs, setOrgs] = useState<OrganizationOption[] | null>(null);
  const [preAuth, setPreAuth] = useState<string | null>(null);
  const [orgBusy, setOrgBusy] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { identifier: "", password: "" },
  });

  const identifierReg = register("identifier");

  useEffect(() => {
    if (!isHydrated) hydrate();
  }, [isHydrated, hydrate]);

  useEffect(() => {
    if (isHydrated && isAuthenticated && !orgs) goToDashboard();
  }, [isHydrated, isAuthenticated, orgs]);

  useEffect(() => {
    if (otpSeconds <= 0) return;
    const t = window.setInterval(
      () => setOtpSeconds((s) => Math.max(0, s - 1)),
      1000
    );
    return () => window.clearInterval(t);
  }, [otpSeconds]);

  const remainingFor = (mobile: string): number => {
    if (!lastOtpSession || lastOtpSession.mobile !== mobile) return 0;
    return Math.max(0, Math.floor((lastOtpSession.expiresAt - Date.now()) / 1000));
  };

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
      const result = await authService.loginWithPassword(
        values.identifier,
        values.password
      );
      setPasswordFails(0);
      await handleLoginResult(result);
    } catch (err) {
      const raw =
        err instanceof ApiClientError ? err.message : "ورود ناموفق بود.";
      const message = friendlyError(raw, "password");
      setFormError(message);
      toast.error(message);
      const next = passwordFails + 1;
      setPasswordFails(next);
      // Bot check on 3rd failed password attempt
      if (next >= 3) {
        setPendingAfterCheck("password");
        setNeedHumanCheck(true);
      }
    }
  };

  const onPasswordSubmit = async (values: PasswordForm) => {
    if (needHumanCheck && pendingAfterCheck === "password") return;
    if (passwordFails >= 3 && !needHumanCheck) {
      setPendingAfterCheck("password");
      setNeedHumanCheck(true);
      return;
    }
    await runPasswordLogin(values);
  };

  const doRequestOtp = async (forceNew: boolean) => {
    const normalized = normalizeMobile(otpMobile);
    setFormError(null);
    setOtpBusy(true);
    setDebugCode(null);
    try {
      const data = await authService.requestOtp(normalized);
      const expiresIn = data.expires_in ?? 180;
      setOtpMobile(normalized);
      setOtpStep("code");
      setOtpSeconds(expiresIn);
      setOtpCode("");
      if (data.debug_code) setDebugCode(data.debug_code);
      setLastOtpSession({
        mobile: normalized,
        expiresAt: Date.now() + expiresIn * 1000,
        debugCode: data.debug_code,
      });
      setOtpSendCount((c) => c + 1);
      toast.success(forceNew ? "کد جدید ارسال شد" : "کد تأیید ارسال شد");
    } catch (err) {
      const raw =
        err instanceof ApiClientError ? err.message : "ارسال کد ناموفق بود.";
      const message = friendlyError(raw, "otp-mobile");
      setFormError(message);
      toast.error(message);
    } finally {
      setOtpBusy(false);
    }
  };

  const onRequestOtp = async () => {
    setOtpMobileError(null);
    setFormError(null);

    if (!otpMobile.trim()) {
      setOtpMobileError("شماره موبایل الزامی است");
      return;
    }
    if (!isValidIranMobile(otpMobile)) {
      setOtpMobileError("فرمت صحیح: ۰۹۱۲xxxxxxxx");
      return;
    }

    const normalized = normalizeMobile(otpMobile);
    const left = remainingFor(normalized);

    // Same number + still valid token → resume without SMS
    if (left > 0) {
      setOtpMobile(normalized);
      setOtpStep("code");
      setOtpSeconds(left);
      setDebugCode(lastOtpSession?.debugCode ?? null);
      toast.message("کد قبلی هنوز معتبر است");
      return;
    }

    const isNewNumber =
      !lastOtpSession || lastOtpSession.mobile !== normalized;

    // Bot: 2nd OTP send attempt, or changing number after a prior send
    if (
      (otpSendCount >= 1 || isNewNumber && otpSendCount >= 1) &&
      !needHumanCheck
    ) {
      // On 2nd attempt (otpSendCount will be >=1 after first success)
      if (otpSendCount >= 1) {
        setPendingAfterCheck("otp");
        setNeedHumanCheck(true);
        return;
      }
    }

    // Changing number after previous send → reset timer context (force new)
    if (isNewNumber && lastOtpSession) {
      setLastOtpSession(null);
      setOtpSeconds(0);
      // Changing number counts toward bot sensitivity
      if (otpSendCount >= 1) {
        setPendingAfterCheck("otp");
        setNeedHumanCheck(true);
        return;
      }
    }

    await doRequestOtp(false);
  };

  const onVerifyOtp = async () => {
    setFormError(null);
    setOtpBusy(true);
    try {
      const result = await authService.verifyOtp(
        normalizeMobile(otpMobile),
        otpCode
      );
      await handleLoginResult(result);
    } catch (err) {
      const raw =
        err instanceof ApiClientError ? err.message : "تأیید کد ناموفق بود.";
      const message = friendlyError(raw, "otp-code");
      setFormError(message);
      toast.error(message);
    } finally {
      setOtpBusy(false);
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
        err instanceof ApiClientError
          ? err.message
          : "انتخاب سازمان ناموفق بود.";
      const message = friendlyError(raw, "org");
      setFormError(message);
      toast.error(message);
    } finally {
      setOrgBusy(false);
    }
  };

  const onHumanCheckPass = () => {
    setNeedHumanCheck(false);
    const pending = pendingAfterCheck;
    setPendingAfterCheck(null);
    if (pending === "otp") {
      void doRequestOtp(true);
    } else if (pending === "password") {
      const values = getValues();
      void runPasswordLogin(values);
    }
  };

  if (!isHydrated) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <StoryLoader label="در حال آماده‌سازی..." />
      </main>
    );
  }

  if (orgs && orgs.length > 0) {
    return (
      <LoginShell showVisual={false}>
        <div className="flex w-full flex-col justify-center px-5 py-6 sm:px-6">
          <div className="mb-5">
            <div className="mb-2.5 inline-flex h-9 w-9 items-center justify-center rounded-lg brand-mark text-sm font-bold text-white">
              ه
            </div>
            <h1 className="text-lg font-semibold tracking-tight">انتخاب سازمان</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              بیش از یک سازمان فعال است. یکی را انتخاب کنید.
            </p>
          </div>

          <div className="space-y-2">
            {orgs.map((o) => (
              <button
                key={o.tenant_id}
                type="button"
                disabled={orgBusy}
                onClick={() => void onSelectOrg(o.tenant_id)}
                className={cn(
                  "group flex w-full items-center gap-2.5 rounded-lg border border-border bg-background px-3 py-2.5 text-right transition-all",
                  "hover:border-primary/35 hover:bg-accent/40",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  "disabled:opacity-60"
                )}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Building2 className="h-3.5 w-3.5" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-sm font-medium">{o.tenant_name}</span>
                  <span className="truncate text-[11px] text-muted-foreground" dir="ltr">
                    {o.tenant_code}
                  </span>
                </span>
                <ArrowLeft className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
              </button>
            ))}
          </div>

          {formError && (
            <div className="mt-3">
              <ErrorSlot message={formError} />
            </div>
          )}
          {orgBusy && (
            <div className="mt-2 flex justify-center text-muted-foreground">
              <StoryLoader label="در حال ورود..." />
            </div>
          )}
        </div>
      </LoginShell>
    );
  }

  return (
    <LoginShell>
      <div className="flex w-full flex-col justify-center px-5 pb-7 pt-5 sm:px-6 lg:w-[54%]">
        <div className="mb-4">
          <div className="mb-2.5 inline-flex h-9 w-9 items-center justify-center rounded-lg brand-mark text-sm font-bold text-white shadow-[var(--shadow-primary)]">
            ه
          </div>
          <h1 className="text-lg font-semibold tracking-tight">ورود به هماره</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            فضای یکپارچه مدیریت سازمان
          </p>
        </div>

        <div className="mb-4 flex gap-0.5 border-b border-border">
          <button
            type="button"
            onClick={() => {
              setMode("password");
              setFormError(null);
              setOtpMobileError(null);
              setNeedHumanCheck(false);
              setPendingAfterCheck(null);
            }}
            className={cn(
              "relative flex flex-1 items-center justify-center gap-1.5 pb-2.5 pt-0.5 text-xs font-medium transition-colors",
              mode === "password"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <KeyRound className="h-3.5 w-3.5" />
            رمز ثابت
            {mode === "password" && (
              <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-primary" />
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("otp");
              setFormError(null);
              setOtpMobileError(null);
              setNeedHumanCheck(false);
              setPendingAfterCheck(null);
            }}
            className={cn(
              "relative flex flex-1 items-center justify-center gap-1.5 pb-2.5 pt-0.5 text-xs font-medium transition-colors",
              mode === "otp"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Smartphone className="h-3.5 w-3.5" />
            رمز یک‌بارمصرف
            {mode === "otp" && (
              <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-primary" />
            )}
          </button>
        </div>

        {needHumanCheck ? (
          <SoftHumanCheck onPass={onHumanCheckPass} />
        ) : mode === "password" ? (
          <form
            onSubmit={handleSubmit(onPasswordSubmit)}
            className="flex flex-col gap-3"
            noValidate
          >
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
                onChange={(e) => {
                  const next = sanitizeIdentifierInput(e.target.value);
                  e.target.value = next;
                  void identifierReg.onChange(e);
                  setValue("identifier", next, { shouldValidate: false });
                }}
              />
              {errors.identifier && (
                <p className="text-[11px] text-destructive">
                  {errors.identifier.message}
                </p>
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
                  onClick={() =>
                    toast.message("بازیابی رمز عبور به زودی فعال می‌شود")
                  }
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
                {...register("password")}
              />
              {errors.password && (
                <p className="text-[11px] text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>

            <ErrorSlot message={formError} />

            <Button type="submit" className="h-9 w-full text-sm" disabled={isSubmitting}>
              {isSubmitting ? (
                <StoryLoader label="در حال بررسی..." />
              ) : (
                "ورود به سیستم"
              )}
            </Button>
          </form>
        ) : otpStep === "mobile" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void onRequestOtp();
            }}
            className="flex flex-col gap-3"
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
                }}
                onBlur={() => {
                  if (otpMobile.trim() && !isValidIranMobile(otpMobile)) {
                    setOtpMobileError("فرمت صحیح: ۰۹۱۲xxxxxxxx");
                  }
                }}
              />
              {otpMobileError && (
                <p className="text-[11px] text-destructive">{otpMobileError}</p>
              )}
            </div>

            <ErrorSlot message={formError} />

            <Button
              type="submit"
              className="h-9 w-full text-sm"
              disabled={otpBusy || !otpMobile.trim()}
            >
              {otpBusy ? (
                <StoryLoader label="در حال ارسال..." />
              ) : (
                "دریافت کد تأیید"
              )}
            </Button>
          </form>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!otpBusy && otpCode.trim().length >= 4) void onVerifyOtp();
            }}
            className="flex flex-col gap-3"
            noValidate
          >
            <div className="rounded-md border border-border bg-muted/30 px-2.5 py-2 text-xs">
              کد به{" "}
              <span dir="ltr" className="font-medium tracking-wide">
                {otpMobile}
              </span>{" "}
              ارسال شد.{" "}
              <button
                type="button"
                className="text-primary underline-offset-2 hover:underline"
                onClick={() => {
                  setOtpStep("mobile");
                  setOtpCode("");
                  setFormError(null);
                  // keep lastOtpSession + otpSeconds so same number can resume
                }}
              >
                اصلاح شماره
              </button>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium">کد یک‌بارمصرف</Label>
              <OtpCodeInput
                value={otpCode}
                onChange={setOtpCode}
                disabled={otpBusy}
              />
            </div>

            {debugCode && (
              <p className="text-[11px] text-muted-foreground" dir="ltr">
                debug: {debugCode}
              </p>
            )}

            <p className="text-[11px] text-muted-foreground">
              {otpSeconds > 0
                ? `کد تا ${otpSeconds} ثانیه دیگر معتبر است`
                : "کد منقضی شده — می‌توانید دوباره درخواست کنید."}
            </p>

            <ErrorSlot message={formError} />

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-9 flex-1 text-sm"
                disabled={otpBusy || otpSeconds > 0}
                onClick={() => void onRequestOtp()}
              >
                ارسال مجدد
              </Button>
              <Button
                type="submit"
                className="h-9 flex-1 text-sm"
                disabled={otpBusy || otpCode.trim().length < OTP_LENGTH}
              >
                {otpBusy ? <StoryLoader label="تأیید..." /> : "تأیید و ورود"}
              </Button>
            </div>
          </form>
        )}
      </div>

      <div className="hidden lg:block lg:w-[46%]">
        <LoginVisual className="h-full min-h-[400px]" />
      </div>
    </LoginShell>
  );
}
