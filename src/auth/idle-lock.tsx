/**
 * Soft standby / idle lock — does not full-logout.
 * On unlock, stays on the same route (no dashboard reset).
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuthStore } from "./auth-store";
import { authService } from "./auth-service";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { ApiClientError } from "@/api";

/** Idle timeout before soft lock (ms). 15 minutes for ERP continuous work. */
const IDLE_MS = 15 * 60 * 1000;

export function IdleLockProvider({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const pathname = usePathname();
  const [locked, setLocked] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const bump = useCallback(() => {
    if (!isAuthenticated || locked) return;
    window.sessionStorage.setItem("last_activity_at", String(Date.now()));
  }, [isAuthenticated, locked]);

  useEffect(() => {
    if (!isAuthenticated) {
      setLocked(false);
      return;
    }

    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    bump();

    const timer = window.setInterval(() => {
      const last = Number(window.sessionStorage.getItem("last_activity_at") || 0);
      if (last && Date.now() - last > IDLE_MS) {
        setLocked(true);
      }
    }, 15_000);

    return () => {
      events.forEach((e) => window.removeEventListener(e, bump));
      window.clearInterval(timer);
    };
  }, [isAuthenticated, bump]);

  const unlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    setError(null);
    try {
      const identifier = user.email || "";
      const result = await authService.loginWithPassword(identifier, password);
      if (result.kind === "session") {
        setPassword("");
        setLocked(false);
        bump();
        // Stay on same pathname — no navigation
        void pathname;
      } else {
        setError("برای باز کردن قفل، ورود کامل سازمان لازم است. از خروج استفاده کنید.");
      }
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "رمز نادرست است.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {children}
      {locked && isAuthenticated && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <form
            onSubmit={unlock}
            className="w-full max-w-sm space-y-4 rounded-xl border border-border bg-card p-6 shadow-lg"
          >
            <div>
              <h2 className="text-lg font-semibold">قفل موقت</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                به‌خاطر عدم فعالیت، صفحه قفل شد. با وارد کردن رمز، از همین صفحه ادامه دهید.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="idle-password">رمز عبور</Label>
              <Input
                id="idle-password"
                type="password"
                dir="ltr"
                className="text-left"
                value={password}
                onChange={(ev) => setPassword(ev.target.value)}
                autoFocus
              />
            </div>
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={busy || !password}>
              {busy ? "در حال بررسی..." : "ادامه کار"}
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
