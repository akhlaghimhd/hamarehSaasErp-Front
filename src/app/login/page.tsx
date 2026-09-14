/**
 * Temporary minimal login shell — full page restore in progress.
 */
"use client";

import Link from "next/link";
import { Button } from "@/shared/components/ui/button";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
      <div className="w-full max-w-sm space-y-3 rounded-xl border border-border bg-card p-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold">ورود به هماره</h1>
        <p className="text-sm text-muted-foreground">
          صفحهٔ ورود در حال بازگردانی کامل است. لطفاً یک دقیقه دیگر دوباره تلاش کنید.
        </p>
        <Button asChild className="w-full">
          <Link href="/">بازگشت به صفحه اصلی</Link>
        </Button>
      </div>
    </main>
  );
}
