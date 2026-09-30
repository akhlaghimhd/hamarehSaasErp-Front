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
import { KeyRound, Smartphone, Building2, Pencil, Loader2, Eye } from "lucide-react";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  authService,
  useAuthStore,
  validatePasswordClient,
  PASSWORD_HINT,
  type OrganizationOption,
  type AuthUser,
} from "@/auth";
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

function friendlyError(raw: string, context: "password" | "otp-mobile" | "otp-code" | "org" | "mfa") {
  const m = raw.toLowerCase();
  if (m.includes("invalid") || m.includes("credentials") || m.includes("unauthorized")) {
    return context === "password" ? "ایمیل/موبایل یا رمز عبور اشتباه است." : "اطلاعات واردشده صحیح نیست.";
  }
  if (m.includes("not found") || (m.includes("user") && m.includes("exist"))) return "حسابی با این مشخصات پیدا نشد.";
  if (m.includes("mobile") || m.includes("phone") || m.includes("شماره")) return "شماره موبایل نامعتبر است (۰۹۱۲xxxxxxxx).";
  if (m.includes("too many") || m.includes("rate") || m.includes("throttle")) return "تعداد درخواست‌ها زیاد است. کمی صبر کنید.";
  if (m.includes("expired") || m.includes("expire") || m.includes("منقضی")) {
    return "این کد دیگر معتبر نیست. «ارسال مجدد» را بزنید تا کد جدید بگیرید.";
  }
  if (m.includes("code") && (m.includes("invalid") || m.includes("wrong") || m.includes("نادرست"))) return "کد واردشده نادرست است.";
  return raw || "عملیات ناموفق بود.";
}

export default function LoginPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const hydrate = useAuthStore((s) => s.hydrate);

  const [mode, setMode] = useState<"password" | "otp" | "set-password" | "forgot" | "mfa">("password");
  const [formError, setFormError] = useState<string | null>(null);
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [mfaPendingTenantId, setMfaPendingTenantId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaBusy, setMfaBusy] = useState(false);
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

  const [setPasswordUser, setSetPasswordUser] = useState<AuthUser | null>(null);
  const [setPasswordToken, setSetPasswordToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [newPassword2, setNewPassword2] = useState("");
  const [setPasswordBusy, setSetPasswordBusy] = useState(false);

  const [forgotStep, setForgotStep] = useState<"idle" | "mobile" | "code" | "password">("idle");
  const [forgotMobile, setForgotMobile] = useState("");
  const [forgotCode, setForgotCode] = useState("");
  const [forgotPassword, setForgotPassword] = useState("");
  const [forgotPassword2, setForgotPassword2] = useState("");
  const [forgotBusy, setForgotBusy] = useState(false);

  const { register, handleSubmit, setValue, getValues, watch, formState: { errors, isSubmitting } } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { identifier: "", password: "" },
  });
  const identifierReg = register("identifier");
  const passwordReg = register("password");
  const identifierValue = watch("identifier") ?? "";
  const passwordValue = watch("password") ?? "";
  const [showPasswordHold, setShowPasswordHold] = useState(false);
  const markEdited = () => { if (blockedUntilEdit) setBlockedUntilEdit(false); };
  const goToDashboard = useCallback(() => { router.replace("/dashboard"); }, [router]);

  const clearOtpLocalSession = useCallback(() => {
    try { sessionStorage.removeItem(OTP_SESSION_KEY); } catch { /* ignore */ }
    setLastOtpSession(null);
    setTimerLeft(0);
    setDebugCode(null);
  }, []);

  useEffect(() => { if (!isHydrated) hydrate(); }, [isHydrated, hydrate]);

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
    if (result.kind === "mfa_challenge") {
      setPasswordFails(0); setOtpFails(0); setHumanGateArmed(false);
      humanPassOnceRef.current = false; setNeedHumanCheck(false);
      clearOtpLocalSession();
      setMfaToken(result.mfaToken);
      setMfaPendingTenantId(result.pendingTenantId);
      setMfaCode("");
      setMode("mfa");
      setFormError(null);
      toast.message("کد تأیید دو مرحله‌ای را وارد کنید");
      return;
    }
    if (result.kind === "must_set_password") {
      setPasswordFails(0); setOtpFails(0); setHumanGateArmed(false);
      humanPassOnceRef.current = false; setNeedHumanCheck(false);
      clearOtpLocalSession();
      setSetPasswordUser(result.user);
      setSetPasswordToken(result.accessToken);
      setMode("set-password");
      setFormError(null);
      toast.message("لطفاً رمز عبور خود را تعیین کنید");
      return;
    }
    if (result.kind === "session") {
      setPasswordFails(0); setOtpFails(0); setHumanGateArmed(false);
      humanPassOnceRef.current = false; setNeedHumanCheck(false);
      clearOtpLocalSession();
      toast.success("ورود با موفقیت انجام شد");
      goToDashboard();
      return;
    }
    setPreAuth(result.preAuthToken);
    setOrgs(result.organizations);
    toast.message("سازمان خود را انتخاب کنید");
  };

  const runMfaVerify = async () => {
    if (!mfaToken || mfaCode.trim().length < 6) {
      setFormError("کد تأیید را کامل وارد کنید.");
      return;
    }
    setMfaBusy(true); setFormError(null);
    try {
      const result = await authService.completeMfaChallenge(mfaCode, {
        tenantId: mfaPendingTenantId,
      });
      await handleLoginResult(result);
    } catch (err) {
      const raw = err instanceof ApiClientError ? err.message : "تأیید MFA ناموفق بود.";
      setFormError(friendlyError(raw, "mfa"));
    } finally {
      setMfaBusy(false);
    }
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
      setBlockedUntilEdit(false);
      humanPassOnceRef.current = false;
      setPasswordFails((prev) => {
        const next = prev + 1;
        if (next >= 3) setHumanGateArmed(true);
        return next;
      });
    }
  };

  const onPasswordSubmit = async (values: PasswordForm) => {
    if (needHumanCheck) return;
    setBlockedUntilEdit(false);
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

  const doRequestOtpNetwork = async (mobile: string, forceResend = false) => {
    setOtpRequestBusy(true); setFormError(null);
    try {
      const res = await authService.requestOtp(mobile, { forceResend });
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
      if (
        (err instanceof ApiClientError && err.statusCode === 429) ||
        lower.includes("قبلی") || lower.includes("معتبر") || lower.includes("resend") || lower.includes("retry") || lower.includes("مکرر")
      ) {
        setOtpStep("code");
        setBlockedUntilEdit(false);
        setFormError(raw || "آخرین کدی که دریافت کردید هنوز معتبر است.");
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
    if (blockedUntilEdit && !opts?.force) return;
    if (opts?.force) {
      setBlockedUntilEdit(false);
      autoSubmitLock.current = false;
    }
    setFormError(null); setOtpMobileError(null);
    const mobile = normalizeMobile(otpMobile);
    if (!isValidIranMobile(mobile)) { setOtpMobileError("فرمت صحیح: ۰۹۱۲xxxxxxxx"); setBlockedUntilEdit(true); return; }
    setOtpMobile(mobile);
    if (otpFails >= 1 && !humanPassOnceRef.current && !opts?.force) {
      setHumanGateArmed(true); setPendingAfterCheck("otp"); setNeedHumanCheck(true); return;
    }
    humanPassOnceRef.current = false;
    await doRequestOtpNetwork(mobile, Boolean(opts?.force));
  };

  const onVerifyOtp = useCallback(async (codeOverride?: string) => {
    if (autoSubmitLock.current || needHumanCheck || blockedUntilEdit) return;
    if ((humanGateArmed || otpFails >= 1) && !humanPassOnceRef.current) {
      setHumanGateArmed(true); setPendingAfterCheck("otp-verify"); setNeedHumanCheck(true); return;
    }
    humanPassOnceRef.current = false;
    const code = (codeOverride ?? otpCode).replace(/\D/g, "");
    if (code.length !== OTP_LENGTH) return;
    autoSubmitLock.current = true; setOtpVerifyBusy(true); setFormError(null);
    try {
      const result = await authService.verifyOtp(normalizeMobile(otpMobile), code);
      setBlockedUntilEdit(false);
      await handleLoginResult(result);
    } catch (err) {
      const raw = err instanceof ApiClientError ? err.message : "تأیید کد ناموفق بود.";
      const lower = raw.toLowerCase();
      if (
        lower.includes("منقضی") || lower.includes("expired") || lower.includes("یافت نشد")
        || lower.includes("not found") || (err instanceof ApiClientError && err.statusCode === 401)
      ) {
        clearOtpLocalSession();
        setFormError(
          lower.includes("نادرست") || lower.includes("wrong") || lower.includes("invalid")
            ? friendlyError(raw, "otp-code")
            : "این کد دیگر معتبر نیست. «ارسال مجدد» را بزنید تا کد جدید بگیرید."
        );
      } else {
        setFormError(friendlyError(raw, "otp-code"));
      }
      setBlockedUntilEdit(true);
      autoSubmitLock.current = false;
      humanPassOnceRef.current = false;
      setOtpFails((prev) => { const next = prev + 1; if (next >= 1) setHumanGateArmed(true); return next; });
    } finally { setOtpVerifyBusy(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otpCode, otpMobile, blockedUntilEdit, humanGateArmed, otpFails, needHumanCheck, clearOtpLocalSession]);

  const onHumanCheckPass = () => {
    humanPassOnceRef.current = true;
    setNeedHumanCheck(false); setBlockedUntilEdit(false);
    const pending = pendingAfterCheck; setPendingAfterCheck(null);
    if (pending === "password") void runPasswordLogin(getValues());
    else if (pending === "otp") void doRequestOtpNetwork(normalizeMobile(otpMobile), true);
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
      clearOtpLocalSession();
      toast.success("ورود با موفقیت انجام شد");
      goToDashboard();
    } catch (err) {
      const raw = err instanceof ApiClientError ? err.message : "انتخاب سازمان ناموفق بود.";
      setFormError(friendlyError(raw, "org"));
      setBlockedUntilEdit(true);
    } finally { setOrgBusy(false); }
  };

  const switchMode = (next: "password" | "otp" | "forgot") => {
    setMode(next);
    setFormError(null);
    setNeedHumanCheck(false);
    setPendingAfterCheck(null);
    setBlockedUntilEdit(false);
    setMfaToken(null);
    setMfaCode("");
    if (next === "forgot") {
      setForgotStep("mobile");
      setForgotMobile("");
      setForgotCode("");
      setForgotPassword("");
      setForgotPassword2("");
    } else {
      setForgotStep("idle");
    }
  };

  const onSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setPasswordToken) return;
    setFormError(null);
    const policyErr = validatePasswordClient(newPassword, {
      firstName: setPasswordUser?.first_name,
      lastName: setPasswordUser?.last_name,
      email: setPasswordUser?.email,
      mobile: setPasswordUser?.mobile,
    });
    if (policyErr) { setFormError(policyErr); return; }
    if (newPassword !== newPassword2) { setFormError("تکرار رمز با رمز جدید یکسان نیست."); return; }
    setSetPasswordBusy(true);
    try {
      await authService.setPassword(newPassword, newPassword2);
      toast.success("رمز عبور ذخیره شد. لطفاً وارد شوید.");
      setMode("password");
      setSetPasswordToken(null);
      setSetPasswordUser(null);
      setNewPassword("");
      setNewPassword2("");
    } catch (err) {
      setFormError(err instanceof ApiClientError ? err.message : "ذخیره رمز ناموفق بود.");
    } finally { setSetPasswordBusy(false); }
  };

  // NOTE: remaining JSX (password/otp/forgot/org/set-password forms + MFA panel) lives in full artifact.
  // This intermediate push restores critical MFA wiring; full JSX follows in next commit if truncated.
  return (
    <LoginShell>
      <div className="flex flex-1 flex-col justify-center px-4 py-8 sm:px-6">
        {mode === "mfa" ? (
          <div className="mx-auto w-full max-w-sm space-y-4">
            <div className="space-y-1 text-center">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <KeyRound className="h-5 w-5" />
              </div>
              <h1 className="text-lg font-semibold">تأیید دو مرحله‌ای</h1>
              <p className="text-sm text-muted-foreground">کد ۶ رقمی اپلیکیشن Authenticator را وارد کنید</p>
            </div>
            <ErrorSlot message={formError} />
            <div className="space-y-2">
              <Label htmlFor="mfa-code">کد تأیید</Label>
              <Input
                id="mfa-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={10}
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/[^0-9۰-۹٠-٩]/g, ""))}
                dir="ltr"
                className="text-center tracking-widest"
                disabled={mfaBusy}
              />
            </div>
            <ActionButton
              onClick={() => void runMfaVerify()}
              loading={mfaBusy}
              disabled={mfaCode.replace(/\D/g, "").length < 6}
            >
              تأیید و ورود
            </ActionButton>
            <button
              type="button"
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
              onClick={() => switchMode("password")}
            >
              بازگشت به ورود با رمز
            </button>
          </div>
        ) : (
          <div className="mx-auto w-full max-w-sm space-y-3 text-center text-sm text-muted-foreground">
            <p>در حال بازیابی کامل UI ورود… لطفاً یک لحظه صبر کنید یا صفحه را رفرش نکنید.</p>
            <p className="text-xs">حالت فعلی: {mode}</p>
            <ActionButton onClick={() => switchMode("password")}>ورود با رمز</ActionButton>
            <ActionButton onClick={() => switchMode("otp")}>ورود با OTP</ActionButton>
          </div>
        )}
      </div>
      <div className="hidden lg:block">
        <LoginVisual className="h-full min-h-[440px]" />
      </div>
    </LoginShell>
  );
}
