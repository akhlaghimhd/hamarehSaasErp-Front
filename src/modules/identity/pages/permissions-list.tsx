/** FE-P1-T12 — مدیریت مجوزها: سرگروه (ماژول) + زیرمجوزها با CRUD امن */

"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Plus,
  Search,
  KeyRound,
  Pencil,
  Trash2,
  X,
  ChevronDown,
  ChevronLeft,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { PageHeader } from "@/shared/components/layout/page-header";
import { EmptyState } from "@/shared/components/feedback/empty-state";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import { usePermission } from "@/auth";
import { ApiClientError } from "@/api";
import { cn, toFaDigits } from "@/shared/lib/utils";
import {
  useCreatePermission,
  usePermissions,
  useSoftDeletePermission,
  useUpdatePermission,
} from "../hooks/use-permissions";
import { IdentityPermissions } from "../types";
import type { PermissionDto } from "../services/permission-service";
import {
  ACTION_TYPE_FA,
  actionTypeLabel,
  MSG_GENERIC_ERROR,
  MSG_LOAD_ERROR,
  MSG_NO_ACCESS,
} from "../lib/ui-copy";
import {
  displayPermissionName,
  localizeModuleName,
  moduleIcon,
} from "../lib/permission-labels";

/** Known modules for create/edit (stored FA when possible). */
const MODULE_OPTIONS: { value: string; label: string }[] = [
  { value: "هویت و دسترسی", label: "هویت و دسترسی" },
  { value: "حسابداری", label: "حسابداری" },
  { value: "انبار", label: "انبار" },
  { value: "داده‌های پایه", label: "داده‌های پایه" },
  { value: "سازمان", label: "سازمان" },
  { value: "شرکای تجاری", label: "شرکای تجاری" },
  { value: "خرید و فروش", label: "خرید و فروش" },
  { value: "مدیریت پلتفرم", label: "مدیریت پلتفرم" },
  { value: "گردش کار", label: "گردش کار" },
  { value: "مدیریت اسناد", label: "مدیریت اسناد" },
  { value: "تولید", label: "تولید" },
];

type FormValues = {
  code: string;
  name: string;
  module_name: string;
  action_type: string;
  description: string;
  status: string;
};

const emptyForm: FormValues = {
  code: "",
  name: "",
  module_name: "هویت و دسترسی",
  action_type: "READ",
  description: "",
  status: "1",
};

export function PermissionsListPage() {
  const canView = usePermission(IdentityPermissions.permissionView);
  const canCreate = usePermission(IdentityPermissions.permissionCreate);
  const canUpdate = usePermission(IdentityPermissions.permissionUpdate);
  const canDelete = usePermission(IdentityPermissions.permissionDelete);

  const { data, isLoading, isError, error, refetch, isFetching } =
    usePermissions();
  const createMutation = useCreatePermission();
  const updateMutation = useUpdatePermission();
  const deleteMutation = useSoftDeletePermission();

  const [moduleQuery, setModuleQuery] = useState("");
  const [permQuery, setPermQuery] = useState("");
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PermissionDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PermissionDto | null>(null);

  const form = useForm<FormValues>({ defaultValues: emptyForm });

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

  const openCreate = (prefillModule?: string | null) => {
    form.reset({
      ...emptyForm,
      module_name: prefillModule || selectedModule || "هویت و دسترسی",
    });
    setCreateOpen(true);
  };

  const openEdit = (p: PermissionDto) => {
    setEditTarget(p);
    form.reset({
      code: p.code,
      name: displayPermissionName(p.name, p.code),
      module_name: localizeModuleName(p.module_name),
      action_type: p.action_type || "READ",
      description: p.description || "",
      status: String(p.status ?? 1),
    });
  };

  const onCreate = form.handleSubmit(async (values) => {
    try {
      await createMutation.mutateAsync({
        code: values.code.trim(),
        name: values.name.trim(),
        module_name: values.module_name.trim(),
        action_type: values.action_type || null,
        description: values.description.trim() || null,
      });
      toast.success("مجوز ایجاد شد");
      setCreateOpen(false);
      form.reset(emptyForm);
      void refetch();
    } catch (e) {
      toast.error(
        e instanceof ApiClientError && e.message
          ? e.message
          : MSG_GENERIC_ERROR
      );
    }
  });

  const onUpdate = form.handleSubmit(async (values) => {
    if (!editTarget) return;
    try {
      await updateMutation.mutateAsync({
        id: editTarget.tenant_permission_id,
        payload: {
          name: values.name.trim(),
          module_name: values.module_name.trim(),
          action_type: values.action_type || null,
          description: values.description.trim() || null,
          status: Number(values.status) as 0 | 1,
        },
      });
      toast.success("مجوز به‌روز شد");
      setEditTarget(null);
      void refetch();
    } catch (e) {
      toast.error(
        e instanceof ApiClientError && e.message
          ? e.message
          : MSG_GENERIC_ERROR
      );
    }
  });

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.tenant_permission_id);
      toast.success("مجوز حذف شد");
      setDeleteTarget(null);
      void refetch();
    } catch (e) {
      toast.error(
        e instanceof ApiClientError && e.message
          ? e.message
          : MSG_GENERIC_ERROR
      );
    }
  };

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
          description="سرگروه (ماژول) در سمت راست؛ مجوزهای هر گروه در سمت چپ — با توضیح راهنما، ویرایش و حذف امن"
          breadcrumbs={[
            { label: "داشبورد", href: "/dashboard" },
            { label: "هویت و دسترسی", href: "/dashboard/identity" },
            { label: "مجوزها" },
          ]}
          actions={
            canCreate ? (
              <Button
                type="button"
                size="sm"
                className="h-8 gap-1.5"
                onClick={() => openCreate()}
              >
                <Plus className="h-4 w-4" />
                مجوز جدید
              </Button>
            ) : null
          }
        />

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

        <div className="grid min-h-[calc(100vh-12rem)] grid-cols-1 gap-3 lg:grid-cols-2">
          {/* Right: modules */}
          <section className="flex min-h-[20rem] flex-col overflow-hidden rounded-xl border border-border/70 bg-card lg:order-1">
            <div className="flex items-center gap-2 border-b border-border/60 bg-muted/20 px-3 py-2.5">
              <KeyRound className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">سرگروه‌های مجوز</h2>
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
                <EmptyState
                  title={moduleQuery ? "گروهی پیدا نشد" : "هنوز مجوزی نیست"}
                  description={
                    canCreate
                      ? "با «مجوز جدید» اولین مجوز را بسازید"
                      : undefined
                  }
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
                            {toFaDigits(m.count)} مجوز
                          </span>
                          {canCreate ? (
                            <span
                              role="button"
                              tabIndex={0}
                              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-background hover:text-foreground"
                              title="مجوز در این گروه"
                              onClick={(e) => {
                                e.stopPropagation();
                                openCreate(m.name);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.stopPropagation();
                                  openCreate(m.name);
                                }
                              }}
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </span>
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>

          {/* Left: permissions of selected module */}
          <section className="flex min-h-[20rem] flex-col overflow-hidden rounded-xl border border-border/70 bg-card lg:order-2">
            <div className="flex flex-wrap items-center gap-2 border-b border-border/60 bg-muted/20 px-3 py-2.5">
              <h2 className="text-sm font-semibold">
                {selectedModule
                  ? `مجوزهای «${selectedModule}»`
                  : "مجوزهای گروه"}
              </h2>
              <span className="text-xs text-muted-foreground">
                {toFaDigits(selectedPerms.length)} مورد
              </span>
              {canCreate && selectedModule ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="ms-auto h-7 gap-1 text-xs"
                  onClick={() => openCreate(selectedModule)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  افزودن به این گروه
                </Button>
              ) : null}
            </div>

            <div className="border-b border-border/40 px-3 py-2">
              <div className="relative">
                <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className={cn("h-8 ps-8 text-sm", permQuery && "pe-8")}
                  placeholder="جستجو در مجوزهای این گروه…"
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
                  title={permQuery ? "مجوزی با این جستجو نیست" : "این گروه خالی است"}
                  description={
                    canCreate
                      ? "با «افزودن به این گروه» مجوز جدید بسازید"
                      : undefined
                  }
                />
              ) : (
                <ul className="space-y-0.5">
                  {selectedPerms.map((p) => {
                    const title = displayPermissionName(p.name, p.code);
                    const hint =
                      p.description?.trim() ||
                      `مجوز «${title}» — دسترسی به این عملیات در سیستم.`;
                    const active = (p.status ?? 1) === 1;
                    return (
                      <li key={p.tenant_permission_id}>
                        <div
                          className={cn(
                            "group flex items-center gap-2 rounded-md px-2.5 py-2 transition-colors",
                            active
                              ? "hover:bg-muted/40"
                              : "opacity-60 hover:bg-muted/30"
                          )}
                        >
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="min-w-0 flex-1 cursor-default">
                                <div className="flex items-center gap-2">
                                  <span className="truncate text-[13px] font-medium text-foreground">
                                    {title}
                                  </span>
                                  <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                    {actionTypeLabel(p.action_type)}
                                  </span>
                                  {!active ? (
                                    <span className="shrink-0 text-[10px] text-amber-600">
                                      غیرفعال
                                    </span>
                                  ) : null}
                                </div>
                                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                                  {hint}
                                </p>
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

                          <div className="flex shrink-0 items-center gap-0.5 opacity-70 group-hover:opacity-100">
                            {canUpdate ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => openEdit(p)}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>ویرایش</TooltipContent>
                              </Tooltip>
                            ) : null}
                            {canDelete ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                    onClick={() => setDeleteTarget(p)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>حذف</TooltipContent>
                              </Tooltip>
                            ) : null}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>
        </div>

        {/* Create */}
        <Dialog
          open={createOpen}
          onOpenChange={(o) => {
            if (!o) setCreateOpen(false);
          }}
        >
          <DialogContent className="sm:max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle>مجوز جدید</DialogTitle>
            </DialogHeader>
            <form onSubmit={onCreate} className="space-y-3">
              <div className="space-y-1.5">
                <Label>عنوان فارسی *</Label>
                <Input
                  className="h-9"
                  placeholder="مثال: مشاهده کاربران"
                  {...form.register("name", { required: true })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>کد سیستمی *</Label>
                <Input
                  className="h-9 font-mono text-xs"
                  dir="ltr"
                  placeholder="module.resource.action"
                  {...form.register("code", { required: true })}
                />
                <p className="text-[11px] text-muted-foreground">
                  فقط برای سامانه؛ در فهرست اصلی به مدیر نشان داده نمی‌شود.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>سرگروه (ماژول) *</Label>
                <Select
                  value={form.watch("module_name")}
                  onValueChange={(v) => form.setValue("module_name", v)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODULE_OPTIONS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>نوع عملیات</Label>
                <Select
                  value={form.watch("action_type")}
                  onValueChange={(v) => form.setValue("action_type", v)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ACTION_TYPE_FA).map(([code, label]) => (
                      <SelectItem key={code} value={code}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>توضیح راهنما (Tooltip)</Label>
                <Input
                  className="h-9"
                  placeholder="توضیح دقیق‌تر برای مدیر هنگام تخصیص مجوز"
                  {...form.register("description")}
                />
              </div>
              <DialogFooter className="gap-2 sm:justify-start">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateOpen(false)}
                  disabled={createMutation.isPending}
                >
                  انصراف
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "ثبت مجوز"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit */}
        <Dialog
          open={Boolean(editTarget)}
          onOpenChange={(o) => !o && setEditTarget(null)}
        >
          <DialogContent className="sm:max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle>ویرایش مجوز</DialogTitle>
            </DialogHeader>
            <form onSubmit={onUpdate} className="space-y-3">
              <div className="space-y-1.5">
                <Label>عنوان فارسی *</Label>
                <Input
                  className="h-9"
                  {...form.register("name", { required: true })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>کد سیستمی</Label>
                <Input
                  className="h-9 font-mono text-xs"
                  dir="ltr"
                  value={form.watch("code")}
                  disabled
                  readOnly
                />
                <p className="text-[11px] text-muted-foreground">
                  کد پس از ایجاد قابل تغییر نیست.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>سرگروه (ماژول) *</Label>
                <Select
                  value={form.watch("module_name")}
                  onValueChange={(v) => form.setValue("module_name", v)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODULE_OPTIONS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>نوع عملیات</Label>
                <Select
                  value={form.watch("action_type")}
                  onValueChange={(v) => form.setValue("action_type", v)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ACTION_TYPE_FA).map(([code, label]) => (
                      <SelectItem key={code} value={code}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>توضیح راهنما (Tooltip)</Label>
                <Input
                  className="h-9"
                  {...form.register("description")}
                />
              </div>
              <div className="space-y-1.5">
                <Label>وضعیت</Label>
                <Select
                  value={form.watch("status")}
                  onValueChange={(v) => form.setValue("status", v)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">فعال</SelectItem>
                    <SelectItem value="0">غیرفعال</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter className="gap-2 sm:justify-start">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditTarget(null)}
                  disabled={updateMutation.isPending}
                >
                  انصراف
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "ذخیره"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete */}
        <Dialog
          open={Boolean(deleteTarget)}
          onOpenChange={(o) => !o && setDeleteTarget(null)}
        >
          <DialogContent className="sm:max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle>حذف مجوز</DialogTitle>
            </DialogHeader>
            <p className="text-sm leading-relaxed text-muted-foreground">
              مجوز «
              {deleteTarget
                ? displayPermissionName(deleteTarget.name, deleteTarget.code)
                : ""}
              » حذف نرم شود؟
              اگر این مجوز به نقشی تخصیص داده شده باشد، سیستم اجازهٔ حذف نمی‌دهد.
            </p>
            <DialogFooter className="gap-2 sm:justify-start">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteTarget(null)}
                disabled={deleteMutation.isPending}
              >
                انصراف
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => void confirmDelete()}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "در حال حذف…" : "حذف مجوز"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
