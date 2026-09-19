/** Permissions catalog — read-only for tenant admins. Source of truth = platform seeders. */

"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Search, KeyRound, X, Info } from "lucide-react";
import { PageHeader } from "@/shared/components/layout/page-header";
import { EmptyState } from "@/shared/components/feedback/empty-state";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import { usePermission } from "@/auth";
import { ApiClientError } from "@/api";
import { cn, toFaDigits } from "@/shared/lib/utils";
import { usePermissions } from "../hooks/use-permissions";
import { IdentityPermissions } from "../types";
import type { PermissionDto } from "../services/permission-service";
import {
  actionTypeLabel,
  MSG_LOAD_ERROR,
  MSG_NO_ACCESS,
} from "../lib/ui-copy";
import {
  displayPermissionName,
  localizeModuleName,
  moduleIcon,
} from "../lib/permission-labels";

export function PermissionsListPage() {
  const canView = usePermission(IdentityPermissions.permissionView);

  const { data, isLoading, isError, error, refetch, isFetching } =
    usePermissions();

  const [moduleQuery, setModuleQuery] = useState("");
  const [permQuery, setPermQuery] = useState("");
  const [selectedModule, setSelectedModule] = useState<string | null>(null);

  const rows = data ?? [];

  const modules = useMemo(() => {
    const map = new Map<string, PermissionDto[]>();
    for (const p of rows) {
      const mod = localizeModuleName(p.module_name);
      const list = map.get(mod) ?? [];
      list.push(p);
      map.set(mod, list);
    }
    const entries = Array.from(map.entries()).map(([name, perms]) => ({
      name,
      perms: perms.sort((a, b) =>
        displayPermissionName(a.name, a.code).localeCompare(
          displayPermissionName(b.name, b.code),
          "fa"
        )
      ),
      count: perms.length,
      activeCount: perms.filter((p) => (p.status ?? 1) === 1).length,
    }));
    entries.sort((a, b) => a.name.localeCompare(b.name, "fa"));
    return entries;
  }, [rows]);

  useEffect(() => {
    if (!modules.length) {
      setSelectedModule(null);
      return;
    }
    if (selectedModule && modules.some((m) => m.name === selectedModule)) return;
    setSelectedModule(modules[0].name);
  }, [modules, selectedModule]);

  const filteredModules = useMemo(() => {
    const q = moduleQuery.trim().toLowerCase();
    if (!q) return modules;
    return modules.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.perms.some((p) =>
          [p.name, p.code, p.description]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(q)
        )
    );
  }, [modules, moduleQuery]);

  const selectedPerms = useMemo(() => {
    const mod = modules.find((m) => m.name === selectedModule);
    if (!mod) return [];
    const q = permQuery.trim().toLowerCase();
    if (!q) return mod.perms;
    return mod.perms.filter((p) =>
      [
        displayPermissionName(p.name, p.code),
        p.code,
        p.description,
        actionTypeLabel(p.action_type),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [modules, selectedModule, permQuery]);

  if (!canView) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="مجوزها"
          breadcrumbs={[
            { label: "داشبورد", href: "/dashboard" },
            { label: "هویت و دسترسی", href: "/dashboard/identity" },
            { label: "مجوزها" },
          ]}
        />
        <div className="rounded-xl border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">
          {MSG_NO_ACCESS}
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={250}>
      <div className="flex min-h-0 flex-col gap-3">
        <PageHeader
          title="مجوزها"
          description="کاتالوگ عملیات سیستم — فقط مشاهده. ایجاد و حذف فقط از طریق تیم توسعه (سیدر) انجام می‌شود."
          breadcrumbs={[
            { label: "داشبورد", href: "/dashboard" },
            { label: "هویت و دسترسی", href: "/dashboard/identity" },
            { label: "مجوزها" },
          ]}
        />

        <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <p className="leading-relaxed">
            مجوزها عملیات تعریف‌شده در نرم‌افزار هستند. مدیر سازمان فقط از صفحهٔ
            «نقش‌ها» مشخص می‌کند هر نقش به کدام عملیات دسترسی دارد. فعال یا
            غیرفعال بودن گروه‌ها برای هر مشتری توسط مالک پلتفرم بر اساس طرح
            اشتراک تنظیم می‌شود.
          </p>
        </div>

        {isError ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <p className="font-medium">بارگذاری فهرست ممکن نشد</p>
            <p className="mt-1 text-xs">
              {error instanceof ApiClientError && error.message
                ? error.message
                : MSG_LOAD_ERROR}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 h-8"
              onClick={() => void refetch()}
            >
              تلاش مجدد
            </Button>
          </div>
        ) : null}

        <div className="grid min-h-[calc(100vh-14rem)] grid-cols-1 gap-3 lg:grid-cols-2">
          <section className="flex min-h-[20rem] flex-col overflow-hidden rounded-xl border border-border/70 bg-card lg:order-1">
            <div className="flex items-center gap-2 border-b border-border/60 bg-muted/20 px-3 py-2.5">
              <KeyRound className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">سرگروه‌ها</h2>
              <span className="text-xs text-muted-foreground">
                {toFaDigits(filteredModules.length)} گروه
              </span>
              {isFetching && !isLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              ) : null}
            </div>

            <div className="border-b border-border/40 px-3 py-2">
              <div className="relative">
                <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className={cn("h-8 ps-8 text-sm", moduleQuery && "pe-8")}
                  placeholder="جستجوی سرگروه یا مجوز…"
                  value={moduleQuery}
                  onChange={(e) => setModuleQuery(e.target.value)}
                />
                {moduleQuery ? (
                  <button
                    type="button"
                    className="absolute end-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-muted"
                    onClick={() => setModuleQuery("")}
                    aria-label="پاک کردن"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {isLoading ? (
                <div className="space-y-2 p-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : filteredModules.length === 0 ? (
                <EmptyState title={moduleQuery ? "گروهی پیدا نشد" : "کاتالوگ خالی است"} />
              ) : (
                <ul className="space-y-0.5">
                  {filteredModules.map((m) => {
                    const Icon = moduleIcon(m.name);
                    const selected = selectedModule === m.name;
                    return (
                      <li key={m.name}>
                        <button
                          type="button"
                          onClick={() => setSelectedModule(m.name)}
                          className={cn(
                            "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-start transition-colors",
                            selected
                              ? "bg-primary/10 text-foreground"
                              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0 opacity-80" />
                          <span className="min-w-0 flex-1 truncate text-sm font-medium">
                            {m.name}
                          </span>
                          <span className="shrink-0 text-[10px] tabular-nums opacity-70">
                            {toFaDigits(m.count)}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>

          <section className="flex min-h-[20rem] flex-col overflow-hidden rounded-xl border border-border/70 bg-card lg:order-2">
            <div className="flex flex-wrap items-center gap-2 border-b border-border/60 bg-muted/20 px-3 py-2.5">
              <h2 className="text-sm font-semibold">
                {selectedModule
                  ? `عملیات «${selectedModule}»`
                  : "عملیات گروه"}
              </h2>
              <span className="text-xs text-muted-foreground">
                {toFaDigits(selectedPerms.length)} مورد
              </span>
            </div>

            <div className="border-b border-border/40 px-3 py-2">
              <div className="relative">
                <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className={cn("h-8 ps-8 text-sm", permQuery && "pe-8")}
                  placeholder="جستجو در این گروه…"
                  value={permQuery}
                  onChange={(e) => setPermQuery(e.target.value)}
                  disabled={!selectedModule}
                />
                {permQuery ? (
                  <button
                    type="button"
                    className="absolute end-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-muted"
                    onClick={() => setPermQuery("")}
                    aria-label="پاک کردن"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {!selectedModule ? (
                <EmptyState title="گروهی انتخاب نشده" />
              ) : isLoading ? (
                <div className="space-y-2 p-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-11 w-full" />
                  ))}
                </div>
              ) : selectedPerms.length === 0 ? (
                <EmptyState
                  title={permQuery ? "موردی با این جستجو نیست" : "این گروه خالی است"}
                />
              ) : (
                <ul className="space-y-0.5">
                  {selectedPerms.map((p) => {
                    const title = displayPermissionName(p.name, p.code);
                    const hint =
                      p.description?.trim() ||
                      `عملیات «${title}» در سیستم تعریف شده است.`;
                    const active = (p.status ?? 1) === 1;
                    return (
                      <li key={p.tenant_permission_id}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                "flex items-center gap-2 rounded-md px-2.5 py-2",
                                !active && "opacity-50"
                              )}
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="truncate text-[13px] font-medium text-foreground">
                                    {title}
                                  </span>
                                  <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                    {actionTypeLabel(p.action_type)}
                                  </span>
                                  {!active ? (
                                    <span className="shrink-0 text-[10px] text-amber-700 dark:text-amber-300">
                                      غیرفعال در این سازمان
                                    </span>
                                  ) : null}
                                </div>
                                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                                  {hint}
                                </p>
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent
                            side="left"
                            className="max-w-xs text-xs leading-relaxed"
                          >
                            <p className="font-medium">{title}</p>
                            <p className="mt-1 opacity-90">{hint}</p>
                          </TooltipContent>
                        </Tooltip>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>
        </div>
      </div>
    </TooltipProvider>
  );
}
