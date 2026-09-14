/**
 * Login page — form logic + layout. UI blocks in login-parts.
 */
"use client";

import {
  useCallback, useEffect, useRef, useState,
} from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { KeyRound, Smartphone, Building2, Pencil, Loader2 } from "lucide-react";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { authService, useAuthStore, type OrganizationOption } from "@/auth";
import { ApiClientError } from "@/api";
import { cn } from "@/shared/lib/utils";
import { LoginVisual } from "./login-visual";
import { HumanSlideCheck } from "./login-human-slide";
import {
  SoftRingLoader, BreathingDots, ErrorSlot, ActionButton, ResendButton, OtpCodeInput, LoginShell,
  OTP_LENGTH, OTP_TIMER_SEC, toFa, fromFa,
} from "./login-parts";

const IR_MOBILE_RE = /^09\d{9}$/;
const OTP_SESSION_KEY = "hamareh.login.otp_session";

function toAsciiDigits(raw: string) {
  return raw
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}
function normalizeMobile(raw: string) {
  let t = toAsciiDigits(raw).trim().replace(/[\s\-]/g, "");
  if (t.startsWith("+98")) t = "0" + t.slice(3);
  if (t.startsWith("98") && t.length === 12) t = "0" + t.slice(2);
  if (/^9\d{9}$/.test(t)) t = "0" + t;
  return t;
}
function isValidIranMobile(raw: string) {
  return IR_MOBILE_RE.test(normalizeMobile(raw));
}
function sanitizeIdentifierInput(raw: string) {
  const normalized = toAsciiDigits(raw);
  if (/[a-zA-Z@]/.test(normalized)) return normalized.slice(0, 120);
  const digits = normalized.replace(/\D/g, "");
  if (normalized.trim().startsWith("+") && digits.length <= 12) return ("+" + digits).slice(0, 13);
  return digits.slice(0, 11);
}
function displayIdentifier(raw: string) {
  if (/[a-zA-Z@]/.test(raw)) return raw;
  return toFa(raw);
}

const passwordSchema = z.object({
  identifier: z.string().min(3, "ایمیل یا شماره موبایل را وارد کنید").refine(
    (v) => {
      const t = v.trim();
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t) || isValidIranMobile(t);
    },
    { message: "فرمت ایمیل یا موبایل معتبر نیست" }
  ),
  password: z.string().min(6, "رمز عبور حداقل ۶ کاراکتر باشد"),
});
type PasswordForm = z.infer<typeof passwordSchema>;

function friendlyError(raw: string, context: "password" | "otp-mobile" | "otp-code" | "org") {
  const m = raw.toLowerCase();
  if (m.includes("invalid") || m.includes("credentials") || m.includes("unauthorized")) {
    return context === "password" ? "ایمیل/موبایل یا رمز عبور اشتباه است." : "اطلاعات واردشده صحیح نیست.";
  }
  if (m.includes("not found") || (m.includes("user") && m.includes("exist"))) return "حسابی با این مشخصات پیدا نشد.";
  if (m.includes("mobile") || m.includes("phone") || m.includes("شماره")) return "شماره موبایل نامعتبر است (۰۹۱۲xxxxxxxx).";
  if (m.includes("too many") || m.includes("rate") || m.includes("throttle")) return "تعداد درخواست‌ها زیاد است. کمی صبر کنید.";
  if (m.includes("expired") || m.includes("expire")) return "کد منقضی شده. کد جدید درخواست کنید.";
  if (m.includes("code") && (m.includes("invalid") || m.includes("wrong"))) return "کد واردشده نادرست است.";
  return raw || "عملیات ناموفق بود.";
}

export default function LoginPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const hydrate = useAuthStore((s) => s.hydrate);

  const [mode, setMode] = useState<"password" | "otp">("password");
  const [formError, setFormError] = useState<string | null>(null);
  const [passwordFails, setPasswordFails] = useState(0);
  const [needHumanCheck, setNeedHumanCheck] = useState(false);
  const [pendingAfterCheck, setPendingAfterCheck] = useState<"password" | "otp" | "otp-verify" | null>(null);
  const [humanGateArmed, setHumanGateArmed] = useState(false);
  const humanPassOnceRef = useRef(false);
  const [blockedUntilEdit, setBlockedUntilEdit] = useState(false);
  const [otpFails, setOtpFails] = useState(0);
  const [otpStep, setOtpStep] = useState<"mobile" | "code">("mobile");
  const [otpMobile, setOtpMobile] = useState("");
  const [otpMobileError, setOtpMobileError] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [otpRequestBusy, setOtpRequestBusy] = useState(false);
  const [otpVerifyBusy, setOtpVerifyBusy] = useState(false);
  const [timerLeft, setTimerLeft] = useState(0);
  const [debugCode, setDebugCode] = useState<string | null>(null);
  const [lastOtpSession, setLastOtpSession] = useState<{ mobile: string; endsAt: number; debugCode?: string } | null>(null);
  const [orgs, setOrgs] = useState<OrganizationOption[] | null>(null);
  const [preAuth, setPreAuth] = useState<string | null>(null);
  const [orgBusy, setOrgBusy] = useState(false);
  const autoSubmitLock = useRef(false);

  const { register, handleSubmit, setValue, getValues, watch, formState: { errors, isSubmitting } } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { identifier: "", password: "" },
  });
  const identifierReg = register("identifier");
  const passwordReg = register("password");
  const identifierValue = watch("identifier") ?? "";
  const passwordValue = watch("password") ?? "";
  const markEdited = () => { if (blockedUntilEdit) setBlockedUntilEdit(false); };
  const goToDashboard = useCallback(() => { router.replace("/dashboard"); }, [router]);

  useEffect(() => { if (!isHydrated) hydrate(); }, [isHydrated, hydrate]);

  // Restore OTP session after refresh (allow code step without re-send while timer alive)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(OTP_SESSION_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { mobile?: string; endsAt?: number; debugCode?: string };
      if (!parsed?.mobile || !parsed?.endsAt || parsed.endsAt <= Date.now()) {
        sessionStorage.removeItem(OTP_SESSION_KEY);
        return;
      }
      setOtpMobile(parsed.mobile);
      setLastOtpSession({ mobile: parsed.mobile, endsAt: parsed.endsAt, debugCode: parsed.debugCode });
      setDebugCode(parsed.debugCode ?? null);
      setOtpStep("code");
      setMode("otp");
    } catch { /* ignore */ }
  }, []);

  // Keep sessionStorage in sync when timer dies
  useEffect(() => {
    if (!lastOtpSession) return;
    if (lastOtpSession.endsAt <= Date.now()) {
      try { sessionStorage.removeItem(OTP_SESSION_KEY); } catch { /* ignore */ }
    }
  }, [lastOtpSession, timerLeft]);

  useEffect(() => { if (isHydrated && isAuthenticated && !orgs) goToDashboard(); }, [isHydrated, isAuthenticated, orgs, goToDashboard]);
  useEffect(() => {
    if (!lastOtpSession) { setTimerLeft(0); return; }
    const tick = () => {
      const left = Math.max(0, Math.ceil((lastOtpSession.endsAt - Date.now()) / 1000));
      setTimerLeft(left);
      // When cooldown ends, unlock resend (do not keep form blocked)
      if (left === 0) {
        setBlockedUntilEdit(false);
        autoSubmitLock.current = false;
      }
    };
    tick();
    const t = window.setInterval(tick, 1000);
    return () => window.clearInterval(t);
  }, [lastOtpSession]);

  const handleLoginResult = async (result: Awaited<ReturnType<typeof authService.loginWithPassword>>) => {
    if (result.kind === "session") {
      setPasswordFails(0); setOtpFails(0); setHumanGateArmed(false);
      humanPassOnceRef.current = false; setNeedHumanCheck(false);
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
      setPasswordFails(0); setBlockedUntilEdit(false); setHumanGateArmed(false);
      humanPassOnceRef.current = false; setNeedHumanCheck(false);
      await handleLoginResult(result);
    } catch (err) {
      const raw = err instanceof ApiClientError ? err.message : "ورود ناموفق بود.";
      setFormError(friendlyError(raw, "password"));
      setBlockedUntilEdit(true);
      humanPassOnceRef.current = false;
      setPasswordFails((prev) => {
        const next = prev + 1;
        if (next >= 3) setHumanGateArmed(true);
        return next;
      });
    }
  };

  const onPasswordSubmit = async (values: PasswordForm) => {
    if (needHumanCheck || blockedUntilEdit) return;
    if ((humanGateArmed || passwordFails >= 3) && !humanPassOnceRef.current) {
      setHumanGateArmed(true); setPendingAfterCheck("password"); setNeedHumanCheck(true); return;
    }
    humanPassOnceRef.current = false;
    await runPasswordLogin(values);
  };

  const startOtpSession = (mobile: string, debug?: string, endsAtOverride?: number) => {
    const endsAt = endsAtOverride ?? (Date.now() + OTP_TIMER_SEC * 1000);
    const session = { mobile, endsAt, debugCode: debug };
    setLastOtpSession(session);
    setDebugCode(debug ?? null);
    setOtpCode("");
    autoSubmitLock.current = false;
    setBlockedUntilEdit(false);
    try {
      sessionStorage.setItem(OTP_SESSION_KEY, JSON.stringify(session));
    } catch { /* ignore */ }
  };

  const doRequestOtpNetwork = async (mobile: string) => {
    setOtpRequestBusy(true); setFormError(null);
    try {
      const res = await authService.requestOtp(mobile);
      const debug = typeof res.debug_code === "string" ? res.debug_code : undefined;
      const ttlSec =
        typeof res.expires_in === "number" && res.expires_in > 0
          ? res.expires_in
          : OTP_TIMER_SEC;
      startOtpSession(mobile, debug, Date.now() + ttlSec * 1000);
      setOtpStep("code");
      setBlockedUntilEdit(false);
    } catch (err) {
      const raw = err instanceof ApiClientError ? err.message : "ارسال کد ناموفق بود.";
      const lower = raw.toLowerCase();
      // Backend still has an active OTP — stay on code step; do NOT invent a new timer/debug as if resent
      if (
        (err instanceof ApiClientError && err.statusCode === 429) ||
        lower.includes("قبلی") || lower.includes("معتبر") || lower.includes("resend") || lower.includes("retry")
      ) {
        setOtpStep("code");
        setBlockedUntilEdit(false);
        if (lastOtpSession && lastOtpSession.mobile === mobile && lastOtpSession.endsAt > Date.now()) {
          setDebugCode(lastOtpSession.debugCode ?? null);
          setFormError("کد قبلی هنوز معتبر است؛ همان کد را وارد کنید.");
        } else {
          // Frontend timer ended but backend may still hold the OTP briefly — do not show stale debug as a new code
          setFormError("کد قبلی هنوز از سمت سرور فعال است. چند لحظه صبر کنید و دوباره «ارسال مجدد» را بزنید.");
        }
      } else {
        setFormError(friendlyError(raw, "otp-mobile"));
        setBlockedUntilEdit(true);
        humanPassOnceRef.current = false;
        setOtpFails((prev) => { const next = prev + 1; if (next >= 1) setHumanGateArmed(true); return next; });
      }
    } finally { setOtpRequestBusy(false); }
  };

  const onRequestOtp = async (opts?: { force?: boolean }) => {
    if (needHumanCheck) return;
    // force (resend) must work even if form was blocked after a failed verify / expired attempt
    if (blockedUntilEdit && !opts?.force) return;
    if (opts?.force) {
      setBlockedUntilEdit(false);
      autoSubmitLock.current = false;
    }
    setFormError(null); setOtpMobileError(null);
    const mobile = normalizeMobile(otpMobile);
    if (!isValidIranMobile(mobile)) { setOtpMobileError("فرمت صحیح: ۰۹۱۲xxxxxxxx"); setBlockedUntilEdit(true); return; }
    setOtpMobile(mobile);
    if (!opts?.force && lastOtpSession && lastOtpSession.mobile === mobile && lastOtpSession.endsAt > Date.now()) {
      setOtpStep("code"); setDebugCode(lastOtpSession.debugCode ?? null); return;
    }
    if (otpFails >= 1 && !humanPassOnceRef.current) {
      setHumanGateArmed(true); setPendingAfterCheck("otp"); setNeedHumanCheck(true); return;
    }
    humanPassOnceRef.current = false;
    await doRequestOtpNetwork(mobile);
  };

  const onVerifyOtp = useCallback(async (codeOverride?: string) => {
    if (autoSubmitLock.current || needHumanCheck || blockedUntilEdit) return;
    if ((humanGateArmed || otpFails >= 1) && !humanPassOnceRef.current) {
      setHumanGateArmed(true); setPendingAfterCheck("otp-verify"); setNeedHumanCheck(true); return;
    }
    humanPassOnceRef.current = false;
    const code = (codeOverride ?? otpCode).replace(/\D/g, "");
    if (code.length !== OTP_LENGTH) return;
    if (timerLeft <= 0) { setFormError("کد منقضی شده. کد جدید درخواست کنید."); setBlockedUntilEdit(true); return; }
    autoSubmitLock.current = true; setOtpVerifyBusy(true); setFormError(null);
    try {
      const result = await authService.verifyOtp(normalizeMobile(otpMobile), code);
      setBlockedUntilEdit(false);
      await handleLoginResult(result);
    } catch (err) {
      const raw = err instanceof ApiClientError ? err.message : "تأیید کد ناموفق بود.";
      setFormError(friendlyError(raw, "otp-code"));
      setBlockedUntilEdit(true);
      autoSubmitLock.current = false;
      humanPassOnceRef.current = false;
      setOtpFails((prev) => { const next = prev + 1; if (next >= 1) setHumanGateArmed(true); return next; });
    } finally { setOtpVerifyBusy(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otpCode, otpMobile, timerLeft, blockedUntilEdit, humanGateArmed, otpFails, needHumanCheck]);

  const onHumanCheckPass = () => {
    humanPassOnceRef.current = true;
    setNeedHumanCheck(false); setBlockedUntilEdit(false);
    const pending = pendingAfterCheck; setPendingAfterCheck(null);
    if (pending === "password") void runPasswordLogin(getValues());
    else if (pending === "otp") void doRequestOtpNetwork(normalizeMobile(otpMobile));
    else if (pending === "otp-verify") {
      const code = otpCode.replace(/\D/g, "");
      if (code.length === OTP_LENGTH) void onVerifyOtp(code);
      else { humanPassOnceRef.current = false; setFormError("کد را کامل وارد کنید."); }
    }
  };

  const onSelectOrg = async (tenantId: string) => {
    if (!preAuth) return;
    setOrgBusy(true); setFormError(null);
    try {
      await authService.selectOrganization(preAuth, tenantId);
      toast.success("ورود با موفقیت انجام شد");
      goToDashboard();
    } catch (err) {
      const raw = err instanceof ApiClientError ? err.message : "انتخاب سازمان ناموفق بود.";
      setFormError(friendlyError(raw, "org"));
      setBlockedUntilEdit(true);
    } finally { setOrgBusy(false); }
  };

  const switchMode = (next: "password" | "otp") => {
    setMode(next); setFormError(null); setNeedHumanCheck(false); setPendingAfterCheck(null); setBlockedUntilEdit(false);
  };

  if (!isHydrated) {
    return (
      <LoginShell showVisual={false}>
        <div className="flex w-full flex-col items-center justify-center gap-4 p-12">
          <div className="relative">
            <SoftRingLoader size="lg" />
            <span className="absolute inset-0 rounded-full bg-primary/5" style={{ animation: "login-breathe 2.4s ease-in-out infinite" }} />
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <p className="text-sm font-medium text-foreground/90">در حال آماده‌سازی</p>
            <p className="text-[11px] text-muted-foreground">بارگذاری نشست امن…</p>
            <BreathingDots className="mt-1" />
          </div>
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
            <p className="text-xs text-muted-foreground">حساب شما به چند سازمان متصل است. یکی را انتخاب کنید.</p>
          </div>
          <ErrorSlot message={formError} />
          {orgBusy && (
            <div className="flex items-center justify-center gap-1.5 py-1 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />در حال ورود به سازمان…
            </div>
          )}
          <div className="grid gap-2">
            {orgs.map((o) => (
              <button key={o.tenant_id} type="button" disabled={orgBusy} onClick={() => void onSelectOrg(o.tenant_id)}
                className={cn(
                  "flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2.5 text-right transition-all",
                  "hover:border-primary/40 hover:bg-primary/5 hover:shadow-sm disabled:pointer-events-none disabled:opacity-60"
                )}>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"><Building2 className="h-4 w-4" /></span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium">{o.tenant_name}</span>
                  <span className="truncate text-[11px] text-muted-foreground" dir="ltr">{o.tenant_code}</span>
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
      <div className="flex w-full flex-1 flex-col justify-center gap-4 p-5 sm:p-6 lg:max-w-[400px]">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold tracking-tight">ورود به هماره</h1>
          <p className="text-xs text-muted-foreground">با رمز عبور یا کد یک‌بارمصرف وارد شوید</p>
        </div>

        <div className="relative grid grid-cols-2 rounded-xl border border-border bg-muted/40 p-1 shadow-inner" role="tablist" aria-label="روش ورود">
          <span className="pointer-events-none absolute inset-y-1 w-[calc(50%-4px)] rounded-lg bg-background shadow-md ring-1 ring-primary/20 transition-transform duration-300 ease-out"
            style={{ transform: mode === "password" ? "translateX(0)" : "translateX(calc(-100% - 0px))", right: 4 }} aria-hidden />
          <button type="button" role="tab" aria-selected={mode === "password"} onClick={() => switchMode("password")}
            className={cn("relative z-10 flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs transition-colors",
              mode === "password" ? "font-semibold text-primary" : "font-medium text-muted-foreground hover:text-foreground")}>
            <KeyRound className={cn("h-3.5 w-3.5", mode === "password" ? "text-primary" : "opacity-70")} />رمز عبور
          </button>
          <button type="button" role="tab" aria-selected={mode === "otp"} onClick={() => switchMode("otp")}
            className={cn("relative z-10 flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs transition-colors",
              mode === "otp" ? "font-semibold text-primary" : "font-medium text-muted-foreground hover:text-foreground")}>
            <Smartphone className={cn("h-3.5 w-3.5", mode === "otp" ? "text-primary" : "opacity-70")} />کد یک‌بارمصرف
          </button>
        </div>

        {needHumanCheck && (
          <div className="space-y-2">
            <HumanSlideCheck onPass={onHumanCheckPass} />
            <p className="text-center text-[10px] text-muted-foreground">پس از تأیید، همان درخواست ورود ادامه می‌یابد.</p>
          </div>
        )}

        {!needHumanCheck && mode === "password" ? (
          <form onSubmit={handleSubmit(onPasswordSubmit)} className="flex flex-col gap-3.5" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="identifier" className="text-xs font-medium">ایمیل یا موبایل <span className="text-destructive">*</span></Label>
              <Input id="identifier" dir="ltr" autoComplete="username" className="h-10 text-left text-sm" placeholder={`${toFa("0912")}... یا user@company.com`}
                name={identifierReg.name} ref={identifierReg.ref} onBlur={identifierReg.onBlur} value={displayIdentifier(identifierValue)}
                onChange={(e) => { setValue("identifier", sanitizeIdentifierInput(e.target.value), { shouldValidate: false, shouldDirty: true }); markEdited(); }} />
              {errors.identifier && <p className="text-[11px] text-destructive">{errors.identifier.message}</p>}
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="password" className="text-xs font-medium">رمز عبور <span className="text-destructive">*</span></Label>
                <button type="button" className="text-[11px] text-primary hover:underline" onClick={() => toast.message("بازیابی رمز عبور به زودی فعال می‌شود")}>فراموشی رمز؟</button>
              </div>
              <Input id="password" type="password" autoComplete="current-password" dir="ltr" className="h-10 text-left text-sm" placeholder="••••••••"
                name={passwordReg.name} ref={passwordReg.ref} onBlur={passwordReg.onBlur} value={passwordValue}
                onChange={(e) => { setValue("password", e.target.value, { shouldValidate: false, shouldDirty: true }); markEdited(); }} />
              {errors.password && <p className="text-[11px] text-destructive">{errors.password.message}</p>}
            </div>
            <ErrorSlot message={formError} />
            <div className="pt-1">
              <ActionButton loading={isSubmitting} loadingLabel="در حال ورود…" disabled={blockedUntilEdit}>ورود به سیستم</ActionButton>
            </div>
          </form>
        ) : !needHumanCheck && otpStep === "mobile" ? (
          <form onSubmit={(e) => { e.preventDefault(); void onRequestOtp(); }} className="flex flex-col gap-3.5" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="otp-mobile" className="text-xs font-medium">شماره موبایل <span className="text-destructive">*</span></Label>
              <Input id="otp-mobile" dir="ltr" inputMode="numeric" autoComplete="tel" maxLength={11} className="h-10 text-left text-sm tracking-wide" placeholder={toFa("0912xxxxxxxx")}
                value={toFa(otpMobile)}
                onChange={(e) => { setOtpMobile(fromFa(e.target.value).replace(/\D/g, "").slice(0, 11)); setOtpMobileError(null); markEdited(); }}
                onBlur={() => { if (otpMobile.trim() && !isValidIranMobile(otpMobile)) { setOtpMobileError("فرمت صحیح: ۰۹۱۲xxxxxxxx"); setBlockedUntilEdit(true); } }} />
              {otpMobileError && <p className="text-[11px] text-destructive">{otpMobileError}</p>}
            </div>
            <ErrorSlot message={formError} />
            <div className="pt-1">
              <ActionButton loading={otpRequestBusy} loadingLabel="در حال ارسال…" disabled={blockedUntilEdit || !otpMobile.trim()}>دریافت کد تأیید</ActionButton>
            </div>
          </form>
        ) : !needHumanCheck ? (
          <form onSubmit={(e) => { e.preventDefault(); void onVerifyOtp(); }} className="flex flex-col gap-3.5" noValidate>
            <div className="flex h-11 items-center gap-2 rounded-xl border border-border/80 bg-gradient-to-l from-muted/40 to-muted/10 px-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Smartphone className="h-4 w-4" /></span>
              <p className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                کد به{" "}
                <span className="font-semibold tabular-nums tracking-wide text-foreground" dir="ltr">{toFa(otpMobile)}</span>
                {" "}ارسال شد
              </p>
              <button type="button" aria-label="ویرایش شماره"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
                onClick={() => { setOtpStep("mobile"); setOtpCode(""); setFormError(null); setBlockedUntilEdit(false); autoSubmitLock.current = false; }}>
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">کد تأیید</Label>
              <OtpCodeInput value={otpCode}
                onChange={(v) => { setOtpCode(v); setFormError(null); autoSubmitLock.current = false; markEdited(); }}
                disabled={otpVerifyBusy}
                onComplete={(code) => { if (!blockedUntilEdit && !needHumanCheck && !otpVerifyBusy) void onVerifyOtp(code); }} />
            </div>
            {process.env.NODE_ENV === "development" && debugCode && (
              <p className="text-[11px] text-muted-foreground" dir="ltr">debug: {toFa(debugCode)}</p>
            )}
            <ErrorSlot message={formError} />
            <div className="flex items-center gap-2 pt-1">
              <ActionButton type="submit" loading={otpVerifyBusy} loadingLabel="در حال تأیید…" disabled={blockedUntilEdit || otpRequestBusy || otpCode.replace(/\D/g, "").length !== OTP_LENGTH} className="flex-1">تأیید و ورود</ActionButton>
              <ResendButton cooldownSec={timerLeft} totalSec={OTP_TIMER_SEC} busy={otpRequestBusy} disabled={otpVerifyBusy} onClick={() => void onRequestOtp({ force: true })} />
            </div>
          </form>
        ) : null}
      </div>
      <div className="hidden flex-1 border-s border-border/70 lg:block">
        <LoginVisual className="h-full min-h-[440px]" />
      </div>
    </LoginShell>
  );
}
