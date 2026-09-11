"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/shared/lib/utils";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { ArrowRight, BookOpen } from "lucide-react";

export type GuideMeta = {
  code: string;
  title: string;
  description: string;
  phase: string;
  status?: "ready" | "in-progress" | "planned";
};

const statusLabel: Record<NonNullable<GuideMeta["status"]>, string> = {
  ready: "آماده",
  "in-progress": "در حال ساخت",
  planned: "برنامه‌ریزی‌شده",
};

const statusVariant: Record<
  NonNullable<GuideMeta["status"]>,
  "success" | "warning" | "secondary"
> = {
  ready: "success",
  "in-progress": "warning",
  planned: "secondary",
};

export function GuidePageHeader({ meta }: { meta: GuideMeta }) {
  return (
    <div className="space-y-3 border-b border-border/70 pb-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="font-mono text-[11px]">
          {meta.code}
        </Badge>
        <Badge variant={statusVariant[meta.status ?? "planned"]}>
          {statusLabel[meta.status ?? "planned"]}
        </Badge>
        <span className="text-xs text-muted-foreground">{meta.phase}</span>
      </div>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">{meta.title}</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">{meta.description}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/ui-guide">
            <BookOpen className="ml-1.5 h-3.5 w-3.5" />
            فهرست راهنما
          </Link>
        </Button>
      </div>
    </div>
  );
}

export function GuideRulesBox({
  title = "قوانین کلیدی این صفحه",
  children,
  className,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm",
        className
      )}
    >
      <div className="mb-2 font-medium text-primary">{title}</div>
      <div className="space-y-1.5 text-muted-foreground">{children}</div>
    </div>
  );
}

export function GuideSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-3", className)}>
      <div className="space-y-1">
        <h2 className="text-base font-semibold">{title}</h2>
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function GuideBackLink() {
  return (
    <Button asChild variant="ghost" size="sm" className="-mr-2">
      <Link href="/dashboard/ui-guide">
        <ArrowRight className="ml-1 h-3.5 w-3.5" />
        بازگشت به فهرست
      </Link>
    </Button>
  );
}
