"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Shield } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { adminAuthService } from "../services/admin-api";

export function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("platform.admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await adminAuthService.login(username.trim(), password);
      router.replace("/admin/feature-packs");
    } catch (err) {
      setError(err instanceof Error ? err.message : "ورود ناموفق بود");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md space-y-6 rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">ورود ادمین پلتفرم</h1>
            <p className="text-xs text-muted-foreground">
              جدا از داشبورد مستأجر — Layer 2 SaaS Admin
            </p>
          </div>
        </div>

        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-1.5">
            <Label htmlFor="username">نام کاربری</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              dir="ltr"
              className="text-left"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">رمز عبور</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              dir="ltr"
              className="text-left"
            />
          </div>

          {error ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "در حال ورود…" : "ورود"}
          </Button>
        </form>

        <p className="text-[11px] text-muted-foreground">
          دمو:{