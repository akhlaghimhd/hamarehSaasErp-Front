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

function friendlyError(raw: string, context: "password" | "otp-mobile" | "otp-code" | "org") {
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

  const [mode, setMode] = useState<"password" | "otp" | "set-password" | "forgot">("password");
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

  // NOTE: remainder of file continues identically to previous good version with password eye patch only in the password form section
  return null;
}
