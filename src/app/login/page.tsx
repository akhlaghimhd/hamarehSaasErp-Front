/**
 * Login — compact centered card, visible icon background,
 * fixed error slot (no layout jump), mobile maxLength,
 * legal footer, room for future links.
 */

"use client";

import { useEffect, useState } from "react";
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
      {
        message: "فرمت ایمیل یا موبایل معتبر نیست",
      }
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

/** Fixed-height error slot — prevents layout jump when messages appear */
function ErrorSlot({ message }: { message: string | null }) {
  return (
    <div className="min-h-[2.25rem]" aria-live="polite">
      {message ? (
        <div
          className="rounded-md border border-destructive/25 bg-destructive/5 px-2.5 py-1.5 text-xs text-destructive"
          role="alert"
        >
          {message}
        </div>
      ) : null}
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

      {/* Legal + future links area */}
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

  const [otpStep, setOtpStep] = useState<"mobile" | "code">("mobile");
  const [otpMobile, setOtpMobile] = useState("");
  const [otpMobileError, setOtpMobileError] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [otpBusy, setOtpBusy] = useState(false);
  const [otpSeconds, setOtpSeconds] = useState(0);
  const [debugCode, setDebugCode] = useState<string | null>(null);
  const [otpAttempts, setOtpAttempts] = useState(0);
  const [needHumanCheck, setNeedHumanCheck] = useState(false);

  const [orgs, setOrgs] = useState<OrganizationOption[] | null>(null);
  const [preAuth, setPreAuth] = useState<string | null>(null);
  const [orgBusy, setOrgBusy] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { identifier: "", password: "" },
  });

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

  const onPasswordSubmit = async (values: PasswordForm) => {
    setFormError(null);
    try {
      const result = await authService.loginWithPassword(
        values.identifier,
        values.password
      );
      await handleLoginResult(result);
    } catch (err) {
      const raw =
        err instanceof ApiClientError ? err.message : "ورود ناموفق بود.";
      const message = friendlyError(raw, "password");
      setFormError(message);
      toast.error(message);
    }
  };

  const doRequestOtp = async () => {
    const normalized = normalizeMobile(otpMobile);
    setFormError(null);
    setOtpBusy(true);
    setDebugCode(null);
    try {
      const data = await authService.requestOtp(normalized);
      setOtpMobile(normalized);
      setOtpStep("code");
      setOtpSeconds(data.expires_in ?? 180);
      if (data.debug_code) setDebugCode(data.debug_code);
      setOtpAttempts((a) => a + 1);
      toast.success("کد تأیید ارسال شد");
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

    if (otpAttempts >= 3 && !needHumanCheck) {
      setNeedHumanCheck(true);
      return;
    }
    await doRequestOtp();
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

          <div className="mt-3">
            <ErrorSlot message={formError} />
          </div>
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
      {/* Form */}
      <div className="flex w-full flex-col justify-center px-5 py-5 sm:px-6 lg:w-[54%]">
        <div className="mb-4">
          <div className="mb-2.5 inline-flex h-9 w-9 items-center justify-center rounded-lg brand-mark text-sm font-bold text-white shadow-[var(--shadow-primary)]">
            ه
          </div>
          <h1 className="text-lg font-semibold tracking-tight">ورود به هماره</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            فضای یکپارچه مدیریت سازمان
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-4 flex gap-0.5 border-b border-border">
          <button
            type="button"
            onClick={() => {
              setMode("password");
              setFormError(null);
              setOtpMobileError(null);
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

        {mode === "password" && (
          <form
            onSubmit={handleSubmit(onPasswordSubmit)}
            className="space-y-3"
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
                {...register("identifier")}
              />
              <p className="min-h-[1rem] text-[11px] text-destructive">
                {errors.identifier?.message ?? "\u00a0"}
              </p>
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
              <p className="min-h-[1rem] text-[11px] text-destructive">
                {errors.password?.message ?? "\u00a0"}
              </p>
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
        )}

        {mode === "otp" && (
          <div className="space-y-3">
            {needHumanCheck ? (
              <SoftHumanCheck
                onPass={() => {
                  setNeedHumanCheck(false);
                  setOtpAttempts(0);
                  void doRequestOtp();
                }}
              />
            ) : otpStep === "mobile" ? (
              <>
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
                  <p className="min-h-[1rem] text-[11px] text-destructive">
                    {otpMobileError ?? "\u00a0"}
                  </p>
                </div>

                <ErrorSlot message={formError} />

                <Button
                  type="button"
                  className="h-9 w-full text-sm"
                  disabled={otpBusy || !otpMobile.trim()}
                  onClick={() => void onRequestOtp()}
                >
                  {otpBusy ? (
                    <StoryLoader label="در حال ارسال..." />
                  ) : (
                    "دریافت کد تأیید"
                  )}
                </Button>
              </>
            ) : (
              <>
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
                      setOtpSeconds(0);
                      setFormError(null);
                    }}
                  >
                    اصلاح
                  </button>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="otp-code" className="text-xs font-medium">
                    کد یک‌بارمصرف
                  </Label>
                  <Input
                    id="otp-code"
                    dir="ltr"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    className="h-9 text-center text-base tracking-[0.3em]"
                    value={otpCode}
                    onChange={(e) =>
                      setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                  />
                </div>

                {debugCode && (
                  <p className="text-[11px] text-muted-foreground" dir="ltr">
                    debug: {debugCode}
                  </p>
                )}

                <p className="text-[11px] text-muted-foreground">
                  {otpSeconds > 0
                    ? `ارسال مجدد تا ${otpSeconds} ثانیه`
                    : "می‌توانید دوباره کد بخواهید."}
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
                    type="button"
                    className="h-9 flex-1 text-sm"
                    disabled={otpBusy || otpCode.trim().length < 4}
                    onClick={() => void onVerifyOtp()}
                  >
                    {otpBusy ? <StoryLoader label="تأیید..." /> : "تأیید و ورود"}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Visual */}
      <div className="hidden lg:block lg:w-[46%]">
        <LoginVisual className="h-full min-h-[400px]" />
      </div>
    </LoginShell>
  );
}
