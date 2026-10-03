/** Permissions catalog — module list + collapsible use-case drawers. */

"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Search,
  KeyRound,
  X,
  Info,
  Pencil,
  ChevronDown,
  ChevronLeft,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/shared/components/layout/page-header";
import { EmptyState } from "@/shared/components/feedback/empty-state";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Textarea } from "@/shared/components/ui/textarea";
import { Label } from "@/shared/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import { useAuthStore, usePermission } from "@/auth";
import { ApiClientError } from "@/api";
import { cn, toFaDigits } from "@/shared/lib/utils";
import { usePermissions, useUpdatePermission } from "../hooks/use-permissions";
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
  permissionUseCaseGroup,
  sortUseCaseGroups,
} from "../lib/permission-labels";

/** Stable empty list — avoids `data ?? []` identity churn every render. */
const EMPTY_PERMISSIONS: PermissionDto[] = [];

export function PermissionsListPage() {
  const canView = usePermission(IdentityPermissions.permissionView);
  const isOwner = useAuthStore((s) => s.securityContext?.is_owner === true);
  const canRelabel = isOwner;

  const { data, isLoading, isError, error, refetch, isFetching } =
    usePermissions();
  const updateMutation = useUpdatePermission();

  const [moduleQuery, setModuleQuery] = useState("");
  const [permQuery, setPermQuery] = useState("");
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  /** Open use-case drawer names (accordion). */
  const [openDrawers, setOpenDrawers] = useState<Set<string>>(new Set());

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<PermissionDto | null>(null);
  const [editName, setEditName] = useState("");
  const [editHint, setEditHint] = useState("");

  const rows = data ?? EMPTY_PERMISSIONS;

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
    }));
    entries.sort((a, b) => a.name.localeCompare(b.name, "fa"));
    return entries;
  }, [rows]);

  useEffect(() => {
    if (!modules.length) {
      setSelectedModule((prev) => (prev === null ? prev : null));
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
        permissionUseCaseGroup(p.code, p.module_name),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [modules, selectedModule, permQuery]);

  const useCaseSections = useMemo(() => {
    const map = new Map<string, PermissionDto[]>();
    for (const p of selectedPerms) {
      const g = permissionUseCaseGroup(p.code, p.module_name);
      const list = map.get(g) ?? [];
      list.push(p);
      map.set(g, list);
    }
    const names = sortUseCaseGroups(Array.from(map.keys()));
    return names.map((name) => ({
      name,
      perms: (map.get(name) ?? []).sort((a, b) =>
        displayPermissionName(a.name, a.code).localeCompare(
          displayPermissionName(b.name, b.code),
          "fa"
        )
      ),
    }));
  }, [selectedPerms]);

  // When module changes: open only the first drawer. When searching: open all matches.
  // Guard: only replace Set when membership actually changes (avoids max-update-depth).
  useEffect(() => {
    if (!useCaseSections.length) {
      setOpenDrawers((prev) => (prev.size === 0 ? prev : new Set()));
      return;
    }
    if (permQuery.trim()) {
      const names = useCaseSections.map((s) => s.name);
      setOpenDrawers((prev) => {
        if (prev.size === names.length && names.every((n) => prev.has(n))) {
          return prev;
        }
        return new Set(names);
      });
      return;
    }
    const first = useCaseSections[0].name;
    setOpenDrawers((prev) => {
      if (prev.size === 1 && prev.has(first)) return prev;
      return new Set([first]);
    });
  }, [selectedModule, permQuery, useCaseSections]);

  function toggleDrawer(name: string) {
    setOpenDrawers((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function expandAll() {
    setOpenDrawers(new Set(useCaseSections.map((s) => s.name)));
  }

  function collapseAll() {
    setOpenDrawers(new Set());
  }

  function openEdit(p: PermissionDto) {
    setEditing(p);
    setEditName(p.name?.trim() || displayPermissionName(p.name, p.code));
    setEditHint(p.description?.trim() || "");
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!editing) return;
    const name = editName.trim();
    if (!name) {
      toast.error("عنوان مجوز نمی‌تواند خالی باشد.");
      return;
    }
    try {
      await updateMutation.mutateAsync({
        id: editing.tenant_permission_id,
        payload: {
          name,
          description: editHint.trim() || null,
        },
      });
      toast.success("عنوان و راهنمای مجوز ذخیره شد.");
      setEditOpen(false);
      setEditing(null);
    } catch (e) {
      const msg =
        e instanceof ApiClientError && e.message
          ? e.message
          : "ذخیره ممکن نشد.";
      toast.error(msg);
    }
  }

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
          description={
            canRelabel
              ? "کاتالوگ عملیات سیستم به‌صورت کشوهای بازشونده. مالک می‌تواند عنوان و راهنما را ویرایش کند."
              : "کاتالوگ عملیات — حوزه‌ها در سمت راست؛ داخل هر حوزه کشوهای کاربرد (باز/بسته)."
          }
          breadcrumbs={[
            { label: "داشبورد", href: "/dashboard" },
            { label: "هویت و دسترسی", href: "/dashboard/identity" },
            { label: "مجوزها" },
          ]}
        />

        <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <p className="leading-relaxed">
            حوزه را انتخاب کنید، سپس فقط کشوی موردنیاز را باز کنید. با جستجو،
            همه دسته‌های دارای نتیجه به‌طور خودکار باز می‌شوند.
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
              <h2 className="text-sm font-semibold">حوزه‌ها</h2>
              <span className="text-xs text-muted-foreground">
                {toFaDigits(filteredModules.length)} حوزه
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
                  placeholder="جستجوی حوزه یا مجوز…"
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
                <EmptyState
                  title={moduleQuery ? "حوزه‌ای پیدا نشد" : "کاتالوگ خالی است"}
                />
              ) : (
                <ul className="space-y-0.5">
                  {filteredModules.map((m) => {
                    const Icon = moduleIcon(m.name);
                    const selected = selectedModule === m.name;
                    return (
                      <li key={m.name}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedModule(m.name);
                            setPermQuery("");
                          }}
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
                  ? `کاربردهای «${selectedModule}»`
                  : "کاربردهای حوزه"}
              </h2>
              <span className="text-xs text-muted-foreground">
                {toFaDigits(selectedPerms.length)} مجوز ·{" "}
                {toFaDigits(useCaseSections.length)} کشو
              </span>
              {useCaseSections.length > 0 ? (
                <div className="ms-auto flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-[11px]"
                    onClick={expandAll}
                  >
                    باز کردن همه
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-[11px]"
                    onClick={collapseAll}
                  >
                    بستن همه
                  </Button>
                </div>
              ) : null}
            </div>

            <div className="border-b border-border/40 px-3 py-2">
              <div className="relative">
                <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className={cn("h-8 ps-8 text-sm", permQuery && "pe-8")}
                  placeholder="جستجو در این حوزه…"
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
                <EmptyState title="حوزه‌ای انتخاب نشده" />
              ) : isLoading ? (
                <div className="space-y-2 p-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-11 w-full" />
                  ))}
                </div>
              ) : selectedPerms.length === 0 ? (
                <EmptyState
                  title={permQuery ? "موردی با این جستجو نیست" : "این حوزه خالی است"}
                />
              ) : (
                <div className="space-y-2">
                  {useCaseSections.map((section) => {
                    const open = openDrawers.has(section.name);
                    return (
                      <div
                        key={section.name}
                        className="overflow-hidden rounded-lg border border-border/60"
                      >
                        <button
                          type="button"
                          onClick={() => toggleDrawer(section.name)}
                          className="flex w-full items-center gap-2 bg-muted/25 px-3 py-2.5 text-start transition-colors hover:bg-muted/40"
                          aria-expanded={open}
                        >
                          {open ? (
                            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                          ) : (
                            <ChevronLeft className="h-4 w-4 shrink-0 text-muted-foreground" />
                          )}
                          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                            {section.name}
                          </span>
                          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] tabular-nums text-muted-foreground">
                            {toFaDigits(section.perms.length)} مجوز
                          </span>
                        </button>

                        {open ? (
                          <ul className="space-y-0.5 border-t border-border/50 p-2">
                            {section.perms.map((p) => {
                              const title = displayPermissionName(
                                p.name,
                                p.code
                              );
                              const hint =
                                p.description?.trim() ||
                                `عملیات «${title}» در سیستم تعریف شده است.`;
                              const active = (p.status ?? 1) === 1;
                              return (
                                <li key={p.tenant_permission_id}>
                                  <div
                                    className={cn(
                                      "flex items-start gap-2 rounded-md px-2.5 py-2",
                                      !active && "opacity-50"
                                    )}
                                  >
                                    <div className="min-w-0 flex-1">
                                      <div className="flex flex-wrap items-center gap-1.5">
                                        <span className="text-sm font-medium text-foreground">
                                          {title}
                                        </span>
                                        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                          {actionTypeLabel(p.action_type)}
                                        </span>
                                        {!active ? (
                                          <span className="text-[10px] text-destructive">
                                            غیرفعال
                                          </span>
                                        ) : null}
                                      </div>
                                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                                        {hint}
                                      </p>
                                      <p className="mt-0.5 font-mono text-[10px] text-muted-foreground/80" dir="ltr">
                                        {p.code}
                                      </p>
                                    </div>
                                    {canRelabel ? (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 shrink-0"
                                            onClick={() => openEdit(p)}
                                          >
                                            <Pencil className="h-3.5 w-3.5" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>ویرایش عنوان و راهنما</TooltipContent>
                                      </Tooltip>
                                    ) : null}
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>ویرایش عنوان و راهنما</DialogTitle>
            </DialogHeader>
            {editing ? (
              <div className="space-y-3">
                <p className="font-mono text-xs text-muted-foreground" dir="ltr">
                  {editing.code}
                </p>
                <div className="space-y-1.5">
                  <Label htmlFor="perm-edit-name">عنوان</Label>
                  <Input
                    id="perm-edit-name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="perm-edit-hint">راهنما</Label>
                  <Textarea
                    id="perm-edit-hint"
                    rows={3}
                    value={editHint}
                    onChange={(e) => setEditHint(e.target.value)}
                  />
                </div>
              </div>
            ) : null}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
              >
                انصراف
              </Button>
              <Button
                type="button"
                onClick={() => void saveEdit()}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="me-1.5 h-4 w-4 animate-spin" />
                    ذخیره…
                  </>
                ) : (
                  "ذخیره"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
