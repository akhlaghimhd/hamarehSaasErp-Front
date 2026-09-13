/**
 * Login — password (email/mobile) + OTP. No tenant_id field for end users.
 */

"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import {
  authService,
  useAuthStore,
  type OrganizationOption,
} from "@/auth";
import { ApiClientError } from "@/api";

const passwordSchema = z.object({
  identifier: z.string().min(3, "ایمیل یا موبایل الزامی است"),
  password: z.string().min(6, "رمز عبور حداقل ۶ کاراکتر باشد"),
});

type PasswordForm = z.infer<typeof passwordSchema>;

function goToDashboard() {
  if (typeof window !== "undefined") {
    window.location.assign("/dashboard");
  }
}

export default function LoginPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const hydrate = useAuthStore((s) => s.hydrate);

  const [mode, setMode] = useState<"password" | "otp">("password");
  const [formError, setFormError] = useState<string | null>(null);

  // OTP state
  const [otpStep, setOtpStep] = useState<"mobile" | "code">("mobile");
  const [otpMobile, setOtpMobile] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpBusy, setOtpBusy] = useState(false);
  const [otpSeconds, setOtpSeconds] = useState(0);
  const [debugCode, setDebugCode] = useState<string | null>(null);

  // Org picker
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
    const t = window.setInterval(() => setOtpSeconds((s) => Math.max(0, s - 1)), 1000);
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
      const message =
        err instanceof ApiClientError ? err.message : "ورود ناموفق بود.";
      setFormError(message);
      toast.error(message);
    }
  };

  const onRequestOtp = async () => {
    setFormError(null);
    setOtpBusy(true);
    setDebugCode(null);
    try {
      const data = await authService.requestOtp(otpMobile);
      setOtpStep("code");
      setOtpSeconds(data.expires_in ?? 180);
      if (data.debug_code) setDebugCode(data.debug_code);
      toast.success("کد ارسال شد (در محیط محلی در لاگ/دیباگ)");
    } catch (err) {
      const message =
        err instanceof ApiClientError ? err.message : "ارسال کد ناموفق بود.";
      setFormError(message);
      toast.error(message);
    } finally {
      setOtpBusy(false);
    }
  };

  const onVerifyOtp = async () => {
    setFormError(null);
    setOtpBusy(true);
    try {
      const result = await authService.verifyOtp(otpMobile, otpCode);
      await handleLoginResult(result);
    } catch (err) {
      const message =
        err instanceof ApiClientError ? err.message : "تأیید کد ناموفق بود.";
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
      const message =
        err instanceof ApiClientError ? err.message : "انتخاب سازمان ناموفق بود.";
      setFormError(message);
      toast.error(message);
    } finally {
      setOrgBusy(false);
    }
  };

  if (!isHydrated) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">در حال آماده‌سازی...</p>
      </main>
    );
  }

  if (orgs && orgs.length > 0) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>انتخاب سازمان</CardTitle>
            <CardDescription>
              بیش از یک سازمان برای شما فعال است. یکی را انتخاب کنید.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {orgs.map((o) => (
              <Button
                key={o.tenant_id}
                variant="outline"
                className="h-auto w-full justify-start py-3"
                disabled={orgBusy}
                onClick={() => void onSelectOrg(o.tenant_id)}
              >
                <span className="flex flex-col items-start gap-0.5 text-right">
                  <span className="font-medium">{o.tenant_name}</span>
                  <span className="text-xs text-muted-foreground">{o.tenant_code}</span>
                </span>
              </Button>
            ))}
            {formError && (
              <p className="text-sm text-destructive" role="alert">
                {formError}
              </p>
            )}
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md shadow-[var(--shadow-md)]">
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl">ورود به هماره ERP</CardTitle>
          <CardDescription>روش ورود را انتخاب کنید.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={mode === "password" ? "default" : "outline"}
              onClick={() => setMode("password")}
            >
              رمز ثابت
            </Button>
            <Button
              type="button"
              variant={mode === "otp" ? "default" : "outline"}
              onClick={() => setMode("otp")}
            >
              رمز یک‌بارمصرف
            </Button>
          </div>

          {mode === "password" && (
            <form onSubmit={handleSubmit(onPasswordSubmit)} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="identifier">
                  ایمیل یا موبایل <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="identifier"
                  dir="ltr"
                  className="text-left"
                  placeholder="user@example.com یا 0912..."
                  {...register("identifier")}
                />
                {errors.identifier && (
                  <p className="text-xs text-destructive">{errors.identifier.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">
                  رمز عبور <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="password"
                  type="password"
                  dir="ltr"
                  className="text-left"
                  {...register("password")}
                />
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password.message}</p>
                )}
              </div>
              {formError && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  {formError}
                </div>
              )}
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    در حال ورود...
                  </>
                ) : (
                  "ورود"
                )}
              </Button>
            </form>
          )}

          {mode === "otp" && (
            <div className="space-y-4">
              {otpStep === "mobile" ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="otp-mobile">شماره موبایل</Label>
                    <Input
                      id="otp-mobile"
                      dir="ltr"
                      className="text-left"
                      placeholder="0912..."
                      value={otpMobile}
                      onChange={(e) => setOtpMobile(e.target.value)}
                    />
                  </div>
                  <Button
                    type="button"
                    className="w-full"
                    disabled={otpBusy || otpMobile.trim().length < 10}
                    onClick={() => void onRequestOtp()}
                  >
                    {otpBusy ? "در حال ارسال..." : "دریافت کد"}
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    کد به <span dir="ltr">{otpMobile}</span> ارسال شد.
                    {" "}
                    <button
                      type="button"
                      className="text-primary underline"
                      onClick={() => {
                        setOtpStep("mobile");
                        setOtpCode("");
                        setOtpSeconds(0);
                      }}
                    >
                      اصلاح شماره
                    </button>
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="otp-code">کد یک‌بارمصرف</Label>
                    <Input
                      id="otp-code"
                      dir="ltr"
                      className="text-left tracking-widest"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                    />
                  </div>
                  {debugCode && (
                    <p className="text-xs text-muted-foreground" dir="ltr">
                      debug code (local): {debugCode}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {otpSeconds > 0
                      ? `امکان درخواست مجدد تا ${otpSeconds} ثانیه دیگر نیست.`
                      : "می‌توانید دوباره کد درخواست کنید."}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      disabled={otpBusy || otpSeconds > 0}
                      onClick={() => void onRequestOtp()}
                    >
                      ارسال مجدد
                    </Button>
                    <Button
                      type="button"
                      className="flex-1"
                      disabled={otpBusy || otpCode.trim().length < 4}
                      onClick={() => void onVerifyOtp()}
                    >
                      تأیید و ورود
                    </Button>
                  </div>
                </>
              )}
              {formError && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  {formError}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
