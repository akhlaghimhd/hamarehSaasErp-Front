/**
 * ID-W1-04 FE — User-friendly TOTP MFA enable / confirm / disable on profile.
 * Steps: 1) start  2) scan QR (or manual secret)  3) enter 6-digit code
 * Recovery codes shown only once after successful confirm.
 */

"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Loader2,
  ShieldCheck,
  Smartphone,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  KeyRound,
  AlertTriangle,
} from "lucide-react";
import QRCode from "qrcode";
import { ApiClientError } from "@/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  useMfaBeginEnable,
  useMfaConfirmEnable,
  useMfaDisable,
  useMfaStatus,
} from "../hooks/use-mfa";

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function MfaSettingsCard() {
  const { data: status, isLoading } = useMfaStatus();
  const begin = useMfaBeginEnable();
  const confirm = useMfaConfirmEnable();
  const disable = useMfaDisable();

  const [secret, setSecret] = useState<string | null>(null);
  const [otpauthUri, setOtpauthUri] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [code, setCode] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [secretCopied, setSecretCopied] = useState(false);
  const [recoveryCopied, setRecoveryCopied] = useState(false);

  const enabled = Boolean(status?.enabled);

  useEffect(() => {
    if (!otpauthUri) {
      setQrDataUrl(null);
      return;
    }
    let cancelled = false;
    void QRCode.toDataURL(otpauthUri, {
      width: 220,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#0f172a", light: "#ffffff" },
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [otpauthUri]);

  const onBegin = async () => {
    try {
      const res = await begin.mutateAsync();
      setSecret(res.secret);
      setOtpauthUri(res.otpauth_uri);
      setRecoveryCodes(null);
      setCode("");
      setShowManual(false);
      setSecretCopied(false);
      toast.success("کد QR آماده است. با اپ Authenticator اسکن کنید.");
    } catch (err) {
      toast.error(
        err instanceof ApiClientError ? err.message : "شروع فعال‌سازی MFA ناموفق بود."
      );
    }
  };

  const onConfirm = async () => {
    const trimmed = code.replace(/\s/g, "");
    if (!/^\d{6}$/.test(trimmed)) {
      toast.error("کد ۶ رقمی اپ Authenticator را وارد کنید.");
      return;
    }
    try {
      const res = await confirm.mutateAsync(trimmed);
      setSecret(null);
      setOtpauthUri(null);
      setQrDataUrl(null);
      setCode("");
      const codes = res?.recovery_codes ?? [];
      setRecoveryCodes(codes.length > 0 ? codes : null);
      toast.success("احراز هویت دو مرحله‌ای فعال شد.");
    } catch (err) {
      toast.error(
        err instanceof ApiClientError ? err.message : "تأیید کد ناموفق بود."
      );
    }
  };

  const onDisable = async () => {
    if (!disableCode.trim()) {
      toast.error("کد فعلی Authenticator یا یکی از کدهای بازیابی را وارد کنید.");
      return;
    }
    try {
      await disable.mutateAsync(disableCode.trim());
      toast.success("MFA غیرفعال شد.");
      setDisableCode("");
      setRecoveryCodes(null);
      setSecret(null);
      setOtpauthUri(null);
    } catch (err) {
      toast.error(
        err instanceof ApiClientError ? err.message : "غیرفعال‌سازی ناموفق بود."
      );
    }
  };

  const onCopySecret = async () => {
    if (!secret) return;
    const ok = await copyText(secret);
    if (ok) {
      setSecretCopied(true);
      toast.success("کلید کپی شد");
      setTimeout(() => setSecretCopied(false), 2000);
    } else {
      toast.error("کپی نشد؛ دستی انتخاب کنید.");
    }
  };

  const onCopyRecovery = async () => {
    if (!recoveryCodes?.length) return;
    const ok = await copyText(recoveryCodes.join("\n"));
    if (ok) {
      setRecoveryCopied(true);
      toast.success("کدهای بازیابی کپی شدند");
      setTimeout(() => setRecoveryCopied(false), 2000);
    } else {
      toast.error("کپی نشد؛ دستی ذخیره کنید.");
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-4 w-4" />
          احراز هویت دو مرحله‌ای (MFA)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            در حال بررسی وضعیت…
          </div>
        ) : recoveryCodes && recoveryCodes.length > 0 ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-3 text-sm text-emerald-800 dark:text-emerald-200">
              MFA با موفقیت فعال شد.
            </div>
            <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4 space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
                <div className="space-y-1 text-sm">
                  <p className="font-medium text-amber-900 dark:text-amber-100">
                    کدهای بازیابی را همین حالا ذخیره کنید
                  </p>
                  <p className="text-xs text-amber-800/90 dark:text-amber-200/90">
                    این کدها فقط یک‌بار نمایش داده می‌شوند. اگر موبایل یا اپ Authenticator را
                    از دست بدهید، با این کدها می‌توانید MFA را غیرفعال کنید. هر کد فقط یک‌بار
                    کار می‌کند.
                  </p>
                </div>
              </div>
              <ul className="grid gap-1.5 sm:grid-cols-2">
                {recoveryCodes.map((c) => (
                  <li
                    key={c}
                    className="rounded-md border border-border/70 bg-background px-3 py-1.5 font-mono text-sm tracking-wide"
                    dir="ltr"
                  >
                    {c}
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => void onCopyRecovery()}>
                  {recoveryCopied ? (
                    <>
                      <Check className="me-1.5 h-3.5 w-3.5" />
                      کپی شد
                    </>
                  ) : (
                    <>
                      <Copy className="me-1.5 h-3.5 w-3.5" />
                      کپی همه کدها
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setRecoveryCodes(null)}
                >
                  ذخیره کردم، بستن
                </Button>
              </div>
            </div>
          </div>
        ) : enabled ? (
          <div className="space-y-3">
            <p className="text-sm text-emerald-700 dark:text-emerald-400">
              MFA فعال است. هنگام ورود، علاوه بر رمز، کد اپ Authenticator هم لازم است.
            </p>
            <div className="space-y-2">
              <Label htmlFor="mfa-disable-code">غیرفعال‌سازی</Label>
              <p className="text-xs text-muted-foreground">
                کد ۶ رقمی فعلی اپ، یا یکی از کدهای بازیابی ذخیره‌شده را وارد کنید.
              </p>
              <Input
                id="mfa-disable-code"
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value)}
                placeholder="کد ۶ رقمی یا کد بازیابی"
                autoComplete="one-time-code"
                disabled={disable.isPending}
                dir="ltr"
                className="max-w-xs font-mono"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disable.isPending}
                onClick={() => void onDisable()}
              >
                {disable.isPending ? (
                  <>
                    <Loader2 className="me-1.5 h-3.5 w-3.5 animate-spin" />
                    در حال غیرفعال‌سازی…
                  </>
                ) : (
                  "غیرفعال کردن MFA"
                )}
              </Button>
            </div>
          </div>
        ) : !secret ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              با فعال‌سازی MFA، امنیت حساب بالاتر می‌رود. هنگام ورود علاوه بر رمز عبور،
              یک کد ۶ رقمی از اپلیکیشن Authenticator (مثل Google Authenticator) هم لازم است.
            </p>
            <ol className="space-y-1.5 text-xs text-muted-foreground list-decimal ps-4">
              <li>اپ Authenticator را روی موبایل نصب کنید (اگر ندارید).</li>
              <li>دکمه زیر را بزنید و QR را با اپ اسکن کنید.</li>
              <li>کد ۶ رقمی اپ را وارد کنید تا فعال شود.</li>
            </ol>
            <Button
              type="button"
              size="sm"
              disabled={begin.isPending}
              onClick={() => void onBegin()}
            >
              {begin.isPending ? (
                <>
                  <Loader2 className="me-1.5 h-3.5 w-3.5 animate-spin" />
                  در حال آماده‌سازی…
                </>
              ) : (
                <>
                  <Smartphone className="me-1.5 h-3.5 w-3.5" />
                  شروع فعال‌سازی MFA
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-xs text-primary">
                ۱
              </span>
              اپ Authenticator را باز کنید و این QR را اسکن کنید
            </div>

            <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
              <div className="rounded-xl border border-border bg-white p-3 shadow-sm">
                {qrDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qrDataUrl}
                    alt="QR کد MFA"
                    width={220}
                    height={220}
                    className="block"
                  />
                ) : (
                  <div className="flex h-[220px] w-[220px] items-center justify-center text-xs text-muted-foreground">
                    در حال ساخت QR…
                  </div>
                )}
              </div>
              <div className="space-y-2 text-xs text-muted-foreground max-w-sm">
                <p>
                  اپ‌های پیشنهادی: <strong>Google Authenticator</strong>،{" "}
                  <strong>Microsoft Authenticator</strong>، یا{" "}
                  <strong>Authy</strong>.
                </p>
                <p>
                  در اپ گزینه «افزودن حساب» / Scan QR را بزنید و این تصویر را اسکن کنید.
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-border/70">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-start text-sm hover:bg-muted/40"
                onClick={() => setShowManual((v) => !v)}
              >
                <span className="flex items-center gap-2">
                  <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
                  نمی‌توانم اسکن کنم — ورود دستی کلید
                </span>
                {showManual ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              {showManual && secret ? (
                <div className="space-y-2 border-t border-border/70 px-3 py-3">
                  <p className="text-xs text-muted-foreground">
                    در اپ Authenticator گزینه «Enter a setup key» را بزنید و این کلید را
                    وارد کنید:
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <code
                      className="rounded-md border bg-muted/50 px-2.5 py-1.5 font-mono text-xs break-all"
                      dir="ltr"
                    >
                      {secret}
                    </code>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8"
                      onClick={() => void onCopySecret()}
                    >
                      {secretCopied ? (
                        <>
                          <Check className="me-1 h-3.5 w-3.5" />
                          کپی شد
                        </>
                      ) : (
                        <>
                          <Copy className="me-1 h-3.5 w-3.5" />
                          کپی کلید
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="space-y-2 border-t border-border/60 pt-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-xs text-primary">
                  ۲
                </span>
                کد ۶ رقمی فعلی اپ را وارد کنید
              </div>
              <p className="text-xs text-muted-foreground">
                بعد از اسکن، اپ هر ۳۰ ثانیه یک کد جدید نشان می‌دهد. همان کد را اینجا بنویسید.
              </p>
              <div className="flex flex-wrap items-end gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="mfa-confirm-code">کد تأیید</Label>
                  <Input
                    id="mfa-confirm-code"
                    value={code}
                    onChange={(e) =>
                      setCode(e.target.value.replace(/[^\d]/g, "").slice(0, 6))
                    }
                    placeholder="۰۰۰۰۰۰"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    disabled={confirm.isPending}
                    dir="ltr"
                    className="w-36 font-mono text-center text-lg tracking-[0.3em]"
                    maxLength={6}
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="mb-0.5"
                  disabled={confirm.isPending || code.replace(/\s/g, "").length !== 6}
                  onClick={() => void onConfirm()}
                >
                  {confirm.isPending ? (
                    <>
                      <Loader2 className="me-1.5 h-3.5 w-3.5 animate-spin" />
                      در حال تأیید…
                    </>
                  ) : (
                    "تأیید و فعال‌سازی"
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
