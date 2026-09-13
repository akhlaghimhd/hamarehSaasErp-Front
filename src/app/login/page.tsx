/**
 * Login — split layout (form + living ERP visual), password + OTP,
 * improved hierarchy, creative method switch, conceptual loading,
 * soft anti-bot after repeated OTP, forgot-password entry.
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

const passwordSchema = z.object({
  identifier: z
    .string()
    .min(3, "ایمیل یا شماره موبایل را وارد کنید")
    .refine(
      (v) => {
        const t = v.trim();
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
        const isMobile = /^0?9\d{9}$/.test(t.replace(/[\s-]/g, ""));
        return isEmail || isMobile;
      },
      {
        message:
          "فرمت ایمیل یا موبایل معتبر نیست (مثال: 0912... یا name@domain.com)",
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
      ? "ایمیل/موبایل یا رمز عبور اشتباه است. دوباره بررسی کنید."
      : "اطلاعات واردشده صحیح نیست.";
  }
  if (m.includes("not found") || (m.includes("user") && m.includes("exist"))) {
    return "حسابی با این مشخصات پیدا نشد. شماره یا ایمیل را دوباره چک کنید.";
  }
  if (m.includes("mobile") || m.includes("phone") || m.includes("شماره")) {
    return "شماره موبایل نامعتبر است. لطفاً با فرمت ۰۹۱۲xxxxxxxx وارد کنید.";
  }
  if (m.includes("too many") || m.includes("rate") || m.includes("throttle")) {
    return "تعداد درخواست‌ها زیاد شده. کمی صبر کنید و دوباره تلاش کنید.";
  }
  if (m.includes("expired") || m.includes("expire")) {
    return "کد منقضی شده. یک کد جدید درخواست کنید.";
  }
  if (m.includes("code") && (m.includes("invalid") || m.includes("wrong"))) {
    return "کد واردشده نادرست است. دوباره امتحان کنید.";
  }
  return raw || "عملیات ناموفق بود. لطفاً دوباره تلاش کنید.";
}

function StoryLoader({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg
        width="22"
        height="22"
        viewBox="0 0 32 32"
        className="shrink-0"
        aria-hidden
      >
        <circle cx="16" cy="16" r="3.5" fill="currentColor" className="opacity-90">
          <animate
            attributeName="r"
            values="3;4.2;3"
            dur="1.1s"
            repeatCount="indefinite"
          />
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
        <circle
          cx="16"
          cy="16"
          r="12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="8 28"
          className="opacity-40"
        >
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="360 16 16"
            to="0 16 16"
            dur="2.2s"
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
    <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
      <div className="flex items-start gap-2">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div>
          <p className="text-sm font-medium">یک لحظه صبر کنید</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            برای محافظت از حساب‌ها، کدام مورد بخشی از یک سیستم ERP عملیاتی است؟
          </p>
        </div>
      </div>
      <div className="grid gap-2">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => {
              setPicked(o.id);
              if (o.correct) {
                setTimeout(onPass, 280);
              } else {
                toast.error("گزینهٔ درست را انتخاب کنید");
              }
            }}
            className={cn(
              "rounded-lg border px-3 py-2.5 text-right text-sm transition-all",
              picked === o.id && o.correct
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background hover:border-primary/40 hover:bg-accent/50"
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function LoginPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const hydrate = useAuthStore((s) => s.hydrate);

  const [mode, setMode] = useState<"password" | "otp">("password");
  const [formError, setFormError] = useState<string | null>(null);
  const [formFocused, setFormFocused] = useState(false);

  const [otpStep, setOtpStep] = useState<"mobile" | "code">("mobile");
  const [otpMobile, setOtpMobile] = useState("");
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
    if (isHydrated && isAuthenticated && !orgs) {
      goToDashboard();
    }
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
    setFormError(null);
    setOtpBusy(true);
    setDebugCode(null);
    try {
      const data = await authService.requestOtp(otpMobile);
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
      const result = await authService.verifyOtp(otpMobile, otpCode);
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
      <main className="flex min-h-screen items-center justify-center p-6">
        <StoryLoader label="در حال آماده‌سازی..." />
      </main>
    );
  }

  if (orgs && orgs.length > 0) {
    return (
      <main className="flex min-h-screen">
        <div className="flex w-full flex-col lg:w-[48%] lg:max-w-xl">
          <div className="flex flex-1 flex-col justify-center px-6 py-10 sm:px-10">
            <div className="mb-8">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl brand-mark text-sm font-bold text-white">
                ه
              </div>
              <h1 className="text-2xl font-semibold tracking-tight">
                انتخاب سازمان
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                بیش از یک سازمان برای شما فعال است. یکی را انتخاب کنید تا ادامه
                دهید.
              </p>
            </div>

            <div className="space-y-2.5">
              {orgs.map((o) => (
                <button
                  key={o.tenant_id}
                  type="button"
                  disabled={orgBusy}
                  onClick={() => void onSelectOrg(o.tenant_id)}
                  className={cn(
                    "group flex w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5 text-right transition-all",
                    "hover:border-primary/35 hover:bg-accent/40 hover:shadow-[var(--shadow-sm)]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    "disabled:opacity-60"
                  )}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Building2 className="h-4 w-4" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate font-medium">{o.tenant_name}</span>
                    <span
                      className="truncate text-xs text-muted-foreground"
                      dir="ltr"
                    >
                      {o.tenant_code}
                    </span>
                  </span>
                  <ArrowLeft className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
                </button>
              ))}
            </div>

            {formError && (
              <p className="mt-4 text-sm text-destructive" role="alert">
                {formError}
              </p>
            )}
            {orgBusy && (
              <div className="mt-4 flex justify-center text-muted-foreground">
                <StoryLoader label="در حال ورود به سازمان..." />
              </div>
            )}
          </div>
        </div>
        <div className="hidden flex-1 p-5 lg:block">
          <LoginVisual active className="h-full min-h-[calc(100vh-2.5rem)]" />
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen">
      <div className="flex w-full flex-col lg:w-[48%] lg:max-w-xl">
        <div className="flex flex-1 flex-col justify-center px-6 py-10 sm:px-10">
          <div className="mb-8">
            <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl brand-mark text-base font-bold text-white shadow-[var(--shadow-primary)]">
              ه
            </div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-[1.65rem]">
              ورود به هماره
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              به فضای یکپارچه مدیریت سازمان خوش آمدید.
            </p>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-2 rounded-xl border border-border bg-muted/40 p-1.5">
            <button
              type="button"
              onClick={() => {
                setMode("password");
                setFormError(null);
              }}
              className={cn(
                "flex flex-col items-center gap-1 rounded-lg px-3 py-2.5 text-center transition-all",
                mode === "password"
                  ? "bg-card text-foreground shadow-[var(--shadow-sm)]"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <KeyRound className="h-4 w-4" />
              <span className="text-xs font-medium">رمز ثابت</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("otp");
                setFormError(null);
              }}
              className={cn(
                "flex flex-col items-center gap-1 rounded-lg px-3 py-2.5 text-center transition-all",
                mode === "otp"
                  ? "bg-card text-foreground shadow-[var(--shadow-sm)]"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Smartphone className="h-4 w-4" />
              <span className="text-xs font-medium">رمز یک‌بارمصرف</span>
            </button>
          </div>

          {mode === "password" && (
            <form
              onSubmit={handleSubmit(onPasswordSubmit)}
              className="space-y-5"
              noValidate
              onFocus={() => setFormFocused(true)}
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setFormFocused(false);
                }
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="identifier" className="text-sm font-medium">
                  ایمیل یا موبایل{" "}
                  <span className="text-destructive" aria-hidden>
                    *
                  </span>
                </Label>
                <Input
                  id="identifier"
                  dir="ltr"
                  autoComplete="username"
                  className="h-11 text-left text-[15px]"
                  placeholder="0912... یا user@company.com"
                  {...register("identifier")}
                />
                {errors.identifier && (
                  <p className="text-xs text-destructive" role="alert">
                    {errors.identifier.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="password" className="text-sm font-medium">
                    رمز عبور{" "}
                    <span className="text-destructive" aria-hidden>
                      *
                    </span>
                  </Label>
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline"
                    onClick={() =>
                      toast.message("بازیابی رمز عبور به زودی فعال می‌شود")
                    }
                  >
                    فراموشی رمز عبور؟
                  </button>
                </div>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  dir="ltr"
                  className="h-11 text-left text-[15px]"
                  placeholder="••••••••"
                  {...register("password")}
                />
                {errors.password && (
                  <p className="text-xs text-destructive" role="alert">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {formError && (
                <div
                  className="rounded-lg border border-destructive/25 bg-destructive/5 px-3.5 py-2.5 text-sm text-destructive"
                  role="alert"
                >
                  {formError}
                </div>
              )}

              <Button
                type="submit"
                className="h-11 w-full text-[15px]"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <StoryLoader label="در حال بررسی اطلاعات..." />
                ) : (
                  "ورود به سیستم"
                )}
              </Button>
            </form>
          )}

          {mode === "otp" && (
            <div
              className="space-y-5"
              onFocus={() => setFormFocused(true)}
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setFormFocused(false);
                }
              }}
            >
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
                  <div className="space-y-2">
                    <Label htmlFor="otp-mobile" className="text-sm font-medium">
                      شماره موبایل{" "}
                      <span className="text-destructive" aria-hidden>
                        *
                      </span>
                    </Label>
                    <Input
                      id="otp-mobile"
                      dir="ltr"
                      inputMode="numeric"
                      autoComplete="tel"
                      className="h-11 text-left text-[15px] tracking-wide"
                      placeholder="0912xxxxxxxx"
                      value={otpMobile}
                      onChange={(e) => setOtpMobile(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      کد تأیید فقط به شمارهٔ ثبت‌شده در سیستم ارسال می‌شود.
                    </p>
                  </div>

                  {formError && (
                    <div
                      className="rounded-lg border border-destructive/25 bg-destructive/5 px-3.5 py-2.5 text-sm text-destructive"
                      role="alert"
                    >
                      {formError}
                    </div>
                  )}

                  <Button
                    type="button"
                    className="h-11 w-full text-[15px]"
                    disabled={otpBusy || otpMobile.trim().length < 10}
                    onClick={() => void onRequestOtp()}
                  >
                    {otpBusy ? (
                      <StoryLoader label="در حال ارسال کد..." />
                    ) : (
                      "دریافت کد تأیید"
                    )}
                  </Button>
                </>
              ) : (
                <>
                  <div className="rounded-lg border border-border bg-muted/30 px-3.5 py-2.5 text-sm">
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
                      اصلاح شماره
                    </button>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="otp-code" className="text-sm font-medium">
                      کد یک‌بارمصرف
                    </Label>
                    <Input
                      id="otp-code"
                      dir="ltr"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      className="h-11 text-center text-lg tracking-[0.35em]"
                      maxLength={8}
                      value={otpCode}
                      onChange={(e) =>
                        setOtpCode(e.target.value.replace(/\D/g, ""))
                      }
                    />
                  </div>

                  {debugCode && (
                    <p className="text-xs text-muted-foreground" dir="ltr">
                      debug (local): {debugCode}
                    </p>
                  )}

                  <p className="text-xs text-muted-foreground">
                    {otpSeconds > 0
                      ? `ارسال مجدد تا ${otpSeconds} ثانیه دیگر امکان‌پذیر نیست.`
                      : "می‌توانید دوباره کد درخواست کنید."}
                  </p>

                  {formError && (
                    <div
                      className="rounded-lg border border-destructive/25 bg-destructive/5 px-3.5 py-2.5 text-sm text-destructive"
                      role="alert"
                    >
                      {formError}
                    </div>
                  )}

                  <div className="flex gap-2.5">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 flex-1"
                      disabled={otpBusy || otpSeconds > 0}
                      onClick={() => void onRequestOtp()}
                    >
                      ارسال مجدد
                    </Button>
                    <Button
                      type="button"
                      className="h-11 flex-1"
                      disabled={otpBusy || otpCode.trim().length < 4}
                      onClick={() => void onVerifyOtp()}
                    >
                      {otpBusy ? (
                        <StoryLoader label="در حال تأیید..." />
                      ) : (
                        "تأیید و ورود"
                      )}
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          <p className="mt-8 text-center text-xs text-muted-foreground">
            با ورود، شرایط استفاده و حریم خصوصی هماره را می‌پذیرید.
          </p>
        </div>
      </div>

      <div className="hidden flex-1 p-5 lg:block">
        <LoginVisual
          active={formFocused || isSubmitting || otpBusy}
          className="h-full min-h-[calc(100vh-2.5rem)]"
        />
      </div>
    </main>
  );
}
