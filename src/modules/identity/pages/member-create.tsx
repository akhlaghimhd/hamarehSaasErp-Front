/** مسیر قدیمی /members/new → هدایت به فهرست (فرم در دراور فهرست است) */

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export function MemberCreatePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/identity/members?create=1");
  }, [router]);

  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      انتقال به فهرست کاربران…
    </div>
  );
}
