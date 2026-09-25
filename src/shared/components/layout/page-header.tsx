/**
 * Standard page header for module pages inside the shell.
 * Back control: explicit backHref, or parent crumb with href, or history.back().
 */

"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import {
  Breadcrumb,
  type BreadcrumbItem,
} from "@/shared/components/layout/breadcrumb";

export function PageHeader({
  title,
  description,
  actions,
  breadcrumbs,
  backHref,
  showBack,
  icon,
  className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  /** Explicit parent path. If omitted, uses last breadcrumb that has href. */
  backHref?: string;
  /** Force show/hide. Default: true when back target exists or history can go back. */
  showBack?: boolean;
  /** Optional module icon (same as hub card) so user knows which section they are in */
  icon?: ReactNode;
  className?: string;
}) {
  const router = useRouter();

  const crumbBack =
    backHref ??
    [...(breadcrumbs ?? [])].reverse().find((b) => Boolean(b.href))?.href;

  const shouldShowBack = showBack ?? Boolean(crumbBack || breadcrumbs?.length);

  return (
    <div className={cn("space-y-1", className)}>
      {breadcrumbs && breadcrumbs.length > 0 ? (
        <Breadcrumb items={breadcrumbs} />
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            {shouldShowBack ? (
              crumbBack ? (
                <Link
                  href={crumbBack}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="بازگشت"
                  title="بازگشت"
                >
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="بازگشت"
                  title="بازگشت"
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
              )
            ) : null}
            {icon ? (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {icon}
              </div>
            ) : null}
            <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
              {title}
            </h1>
          </div>
          {description ? (
            <p
              className={cn(
                "text-sm text-muted-foreground",
                (shouldShowBack || icon) && "ps-10"
              )}
            >
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </div>
  );
}
