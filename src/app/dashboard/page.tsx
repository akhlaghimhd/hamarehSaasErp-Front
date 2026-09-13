"use client";

import Link from "next/link";
import { Building2, BookOpen, Component } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { PageHeader } from "@/shared/components/layout/page-header";
import { useAuthStore } from "@/auth";

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const activeTenantId = useAuthStore((s) => s.activeTenantId);
  const securityContext = useAuthStore((s) => s.securityContext);

  const displayName = user
    ? `${user.first_name} ${user.last_name}`.trim() || user.email
    : "کاربر";

  return (
    <div className="space-y-6">
      <PageHeader
        title="داشبورد"
        description="Shell فاز FE-P0 آماده مصرف ماژول‌ها است"
      />

      <Alert className="border-primary/20 bg-gradient-to-l from-primary/5 to-transparent shadow-[var(--shadow-xs)]">
        <AlertTitle>نشست فعال</AlertTitle>
        <AlertDescription className="space-y-1 text-sm">
          <div>
            کاربر: <span className="font-medium">{displayName}</span>
            {user?.email ? (
              <span className="text-muted-foreground" dir="ltr">
                {" "}
                ({user.email})
              </span>
            ) : null}
          </div>
          {activeTenantId ? (
            <div dir="ltr" className="text-xs text-muted-foreground">
              Tenant: {activeTenantId}
            </div>
          ) : null}
          {securityContext?.roles?.length ? (
            <div className="flex flex-wrap gap-1 pt-1">
              {securityContext.roles.map((r) => (
                <Badge key={r.role_id} variant="secondary">
                  {r.name || r.code}
                </Badge>
              ))}
            </div>
          ) : null}
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>مسیر بعدی</CardDescription>
            <CardTitle className="text-base">ماژول سازمان</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              اسکلت ماژول در <code className="text-[11px]">src/modules/organization</code> آماده است.
            </p>
            <Button asChild size="sm" variant="outline" className="gap-1.5">
              <Link href="/dashboard/organization">
                <Building2 className="h-3.5 w-3.5" />
                رفتن به سازمان
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>مرجع UI</CardDescription>
            <CardTitle className="text-base">راهنمای UI</CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild size="sm" variant="outline" className="gap-1.5">
              <Link href="/dashboard/ui-guide">
                <BookOpen className="h-3.5 w-3.5" />
                باز کردن راهنما
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>نمونه‌ها</CardDescription>
            <CardTitle className="text-base">نمایشگاه UI</CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild size="sm" variant="outline" className="gap-1.5">
              <Link href="/dashboard/showcase">
                <Component className="h-3.5 w-3.5" />
                مشاهده نمونه‌ها
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
