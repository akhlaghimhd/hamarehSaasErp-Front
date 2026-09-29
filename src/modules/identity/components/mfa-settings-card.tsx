/**
 * ID-W1-04 FE — TOTP MFA enable / confirm / disable on profile.
 */

"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";
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

export function MfaSettingsCard() {
  const { data: status, isLoading } = useMfaStatus();
  const begin = useMfaBeginEnable();
  const confirm = useMfaConfirmEnable();
  const disable = useMfaDisable();

  const [secret, setSecret] = useState<string | null>(null);
  const [otpauthUri, setOtpauthUri] = useState<string | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [code, setCode] = useState("");
  const [disableCode, setDisableCode] = useState("");

  const enabled = Boolean(status?.enabled);

  const onBegin = async () => {
    try {
      const res = await begin.mutateAsync();
      setSecret(res.secret);
      setOtpauthUri(res.otpauth_uri);
      setRecoveryCodes(res.recovery_codes ?? null);
      setCode("");
      toast.success("کد محرمانه ساخته شد. آن را در اپلیکیشن Authenticator اسکن کنید.");
    } catch (err) {
      toast.error(
        err instanceof ApiClientError ? err.message : "شروع فعال‌سازی MFA ناموفق بود."
      );
    }
  };

  const onConfirm = async () => {
    if (!code.trim()) {
      toast.error("کد شش‌رقمی را وارد کنید.");
      return;
    }
    try {
      await confirm.mutateAsync(code.trim());
      toast.success("احراز هویت دو مرحله‌ای فعال شد.");
      setSecret(null);
      setOtpauthUri(null);
      setCode("");
    } catch (err) {
      toast.error(
        err instanceof ApiClientError ? err.message : "تأیید کد ناموفق بود."
      );
    }
  };

  const onDisable = async () => {
    if (!disableCode.trim()) {
      toast.error("کد فعلی Authenticator یا recovery را وارد کنید.");
      return;
    }
    try {
      await disable.mutateAsync(disableCode.trim());
      toast.success("MFA غیرفعال شد.");
      setDisableCode("");
      setRecoveryCodes(null);
    } catch (err) {
      toast.error(
        err instanceof ApiClientError ? err.message : "غیرفعال‌سازی ناموفق بود."
      );
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
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            در حال بررسی وضعیت…
          </div>
        ) : enabled ? (
          <>
            <p className="text-sm text-emerald-700 dark:text-emerald-400">
              MFA فعال است.
            </p>
            <div className="space-y-2">
              <Label htmlFor="mfa-disable-code">کد برای غیرفعال‌سازی</Label>
              <Input
                id="mfa-disable-code"
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value)}
                placeholder="کد ۶ رقمی یا recovery"
                autoComplete="one-time-code"
                disabled={disable.isPending}
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
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              با فعال‌سازی MFA، هنگام ورود علاوه بر رمز، کد اپلیکیشن Authenticator هم
              لازم است.
            </p>
            {!secret ? (
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
                  "شروع فعال‌سازی MFA"
                )}
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="rounded-md border bg-muted/40 p-3 text-xs break-all">
                  <div className="mb-1 font-medium">Secret</div>
                  <code>{secret}</code>
                  {otpauthUri ? (
                    <>
                      <div className="mt-2 mb-1 font-medium">otpauth URI</div>
                      <code className="text-[10px]">{otpauthUri}</code>
                    </>
                  ) : null}
                </div>
                {recoveryCodes && recoveryCodes.length > 0 ? (
                  <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-xs">
                    <div className="mb-1 font-medium">کدهای بازیابی (یک‌بارمصرف)</div>
                    <ul className="list-disc ps-4 space-y-0.5">
                      {recoveryCodes.map((c) => (
                        <li key={c}>
                          <code>{c}</code>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <div className="space-y-2">
                  <Label htmlFor="mfa-confirm-code">کد تأیید از Authenticator</Label>
                  <Input
                    id="mfa-confirm-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="۶ رقم"
                    autoComplete="one-time-code"
                    disabled={confirm.isPending}
                  />
                  <Button
                    type="button"
                    size="sm"
                    disabled={confirm.isPending}
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
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
