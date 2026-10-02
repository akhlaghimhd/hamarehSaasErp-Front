/** FE-P1-T11 — مدیریت نقش‌ها: پنل درختی + مجوزهای گروه‌بندی‌شده */

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Loader2,
  Plus,
  Search,
  Shield,
  X,
  Save,
  RotateCcw,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/shared/components/layout/page-header";
import { EmptyState } from "@/shared/components/feedback/empty-state";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { TooltipProvider } from "@/shared/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Label } from "@/shared/components/ui/label";
import { usePermission } from "@/auth";
import { ApiClientError } from "@/api";
import { cn, toFaDigits } from "@/shared/lib/utils";
import {
  useRoles,
  useRole,
  useSoftDeleteRole,
  useUpdateRole,
  useAssignPermissionsToRole,
  useMarkRolePrivileged,
} from "../hooks/use-roles";
import { usePermissions } from "../hooks/use-permissions";
import { IdentityPermissions } from "../types";
import type { RoleDto } from "../services/role-service";
import { MSG_LOAD_ERROR, MSG_NO_ACCESS, MSG_GENERIC_ERROR } from "../lib/ui-copy";
import { RoleCreateDrawer } from "../components/role-create-drawer";
import {
  RoleTreeItem,
  buildTree,
  buildChildrenMap,
  filterRolesKeepAncestors,
} from "./roles-tree";
import { PermissionModuleGroup } from "./roles-perm-group";
import {
  localizeModuleName,
  permissionUseCaseGroup,
  displayPermissionName,
} from "../lib/permission-labels";

type StatusFilter = "all" | "active" | "inactive";

export function RolesListPage() {
  const canView = usePermission(IdentityPermissions.roleView);
  const canCreate = usePermission(IdentityPermissions.roleCreate);
  const canUpdate = usePermission(IdentityPermissions.roleUpdate);
  const canDelete = usePermission(IdentityPermissions.roleDelete);
  const canAssignPerms = usePermission(
    IdentityPermissions.roleAssignPermissions
  );
  const canMarkPrivileged = usePermission(
    IdentityPermissions.privilegedApprove
  );

  const { data, isLoading, isError, error, refetch, isFetching } = useRoles();
  const { data: allPerms, isLoading: permsLoading } = usePermissions();
  const updateMutation = useUpdateRole();
  const deleteMutation = useSoftDeleteRole();
  const assignMutation = useAssignPermissionsToRole();
  const markPrivMutation = useMarkRolePrivileged();

  const [roleQuery, setRoleQuery] = useState("");
  const [permQuery, setPermQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [createOpen, setCreateOpen] = useState(false);
  const [defaultParentId, setDefaultParentId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RoleDto | null>(null);
  const [renameTarget, setRenameTarget] = useState<RoleDto | null>(null);
  const [renameName, setRenameName] = useState("");
  const [draftPerms, setDraftPerms] = useState<Set<string>>(new Set());
  const [baselinePerms, setBaselinePerms] = useState<Set<string>>(new Set());
  const [permsDirty, setPermsDirty] = useState(false);
  const [pendingSelectId, setPendingSelectId] = useState<string | null>(null);
  const expandedInitRef = useRef(false);

  const rows = data ?? [];

  const {
    data: selectedRoleDetail,
    isLoading: detailLoading,
    isFetching: detailFetching,
    refetch: refetchDetail,
  } = useRole(selectedId);

  useEffect(() => {
    if (expandedInitRef.current || !rows.length) return;
    expandedInitRef.current = true;
    const children = buildChildrenMap(rows);
    const rootsWithKids = new Set<string>();
    for (const r of rows) {
      if ((children.get(r.tenant_role_id) ?? []).length) {
        rootsWithKids.add(r.tenant_role_id);
      }
    }
    setExpanded(rootsWithKids);
  }, [rows]);

  useEffect(() => {
    if (!rows.length) {
      setSelectedId(null);
      return;
    }
    if (selectedId && rows.some((r) => r.tenant_role_id === selectedId)) return;
    setSelectedId(rows[0].tenant_role_id);
  }, [rows, selectedId]);

  useEffect(() => {
    if (!selectedRoleDetail) {
      setDraftPerms(new Set());
      setBaselinePerms(new Set());
      setPermsDirty(false);
      return;
    }
    const ids = (selectedRoleDetail.permissions ?? [])
      .map((p) => p.tenant_permission_id)
      .filter(Boolean);
    const set = new Set(ids);
    setDraftPerms(set);
    setBaselinePerms(new Set(ids));
    setPermsDirty(false);
  }, [selectedRoleDetail?.tenant_role_id, selectedRoleDetail?.permissions]);

  const filteredRoles = useMemo(
    () =>
      filterRolesKeepAncestors(
        rows,
        roleQuery.trim().toLowerCase(),
        statusFilter
      ),
    [rows, roleQuery, statusFilter]
  );

  const tree = useMemo(() => buildTree(filteredRoles), [filteredRoles]);
  const searchingRoles =
    roleQuery.trim().length > 0 || statusFilter !== "all";

  const filteredPerms = useMemo(() => {
    const list = allPerms ?? [];
    const q = permQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter((p) =>
      [
        p.name,
        p.code,
        p.module_name,
        p.description,
        localizeModuleName(p.module_name),
        displayPermissionName(p.name, p.code),
        permissionUseCaseGroup(p.code, p.module_name),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [allPerms, permQuery]);

  const permsByModule = useMemo(() => {
    const map = new Map<string, typeof filteredPerms>();
    for (const p of filteredPerms) {
      const mod = localizeModuleName(p.module_name);
      const list = map.get(mod) ?? [];
      list.push(p);
      map.set(mod, list);
    }
    return Array.from(map.entries()).sort((a, b) =>
      a[0].localeCompare(b[0], "fa")
    );
  }, [filteredPerms]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    const all = new Set<string>();
    const children = buildChildrenMap(filteredRoles);
    for (const r of filteredRoles) {
      if ((children.get(r.tenant_role_id) ?? []).length)
        all.add(r.tenant_role_id);
    }
    setExpanded(all);
  };

  const collapseAll = () => setExpanded(new Set());

  const selectRole = (id: string) => {
    if (permsDirty && selectedId && selectedId !== id) {
      setPendingSelectId(id);
      return;
    }
    setSelectedId(id);
  };

  const confirmDiscardAndSelect = () => {
    if (!pendingSelectId) return;
    setSelectedId(pendingSelectId);
    setPendingSelectId(null);
  };

  const activateOne = async (row: RoleDto) => {
    try {
      await updateMutation.mutateAsync({
        id: row.tenant_role_id,
        payload: { status: 1 },
      });
      toast.success("نقش فعال شد");
      void refetch();
      if (selectedId === row.tenant_role_id) void refetchDetail();
    } catch (e) {
      toast.error(
        e instanceof ApiClientError && e.message
          ? e.message
          : "فعال‌سازی ممکن نشد"
      );
    }
  };

  const deactivateOne = async (row: RoleDto) => {
    try {
      await updateMutation.mutateAsync({
        id: row.tenant_role_id,
        payload: { status: 0 },
      });
      toast.success("نقش غیرفعال شد");
      void refetch();
      if (selectedId === row.tenant_role_id) void refetchDetail();
    } catch (e) {
      toast.error(
        e instanceof ApiClientError && e.message
          ? e.message
          : "غیرفعال‌سازی ممکن نشد"
      );
    }
  };

  const requestDelete = (row: RoleDto) => setDeleteTarget(row);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.tenant_role_id);
      toast.success("نقش حذف شد");
      if (selectedId === deleteTarget.tenant_role_id) setSelectedId(null);
      setDeleteTarget(null);
    } catch (e) {
      toast.error(
        e instanceof ApiClientError && e.message ? e.message : "حذف ممکن نشد"
      );
    }
  };

  const requestRename = (row: RoleDto) => {
    setRenameTarget(row);
    setRenameName(row.name);
  };

  const confirmRename = async () => {
    if (!renameTarget) return;
    const name = renameName.trim();
    if (!name) {
      toast.error("عنوان نقش را وارد کنید");
      return;
    }
    const duplicate = rows.some(
      (r) =>
        r.tenant_role_id !== renameTarget.tenant_role_id &&
        r.name.trim().toLowerCase() === name.toLowerCase()
    );
    if (duplicate) {
      toast.error("نقشی با این نام از قبل وجود دارد. نام نقش باید یکتا باشد.");
      return;
    }
    try {
      await updateMutation.mutateAsync({
        id: renameTarget.tenant_role_id,
        payload: { name },
      });
      toast.success("عنوان نقش به‌روز شد");
      setRenameTarget(null);
      void refetch();
      if (selectedId === renameTarget.tenant_role_id) void refetchDetail();
    } catch (e) {
      toast.error(
        e instanceof ApiClientError && e.message ? e.message : "ویرایش ممکن نشد"
      );
    }
  };

  const openCreate = (parentId?: string | null) => {
    setDefaultParentId(parentId ?? null);
    setCreateOpen(true);
  };

  const togglePerm = (id: string) => {
    setDraftPerms((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setPermsDirty(true);
  };

  const toggleManyPerms = (ids: string[], checked: boolean) => {
    setDraftPerms((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
    setPermsDirty(true);
  };

  const resetPermissions = () => {
    setDraftPerms(new Set(baselinePerms));
    setPermsDirty(false);
    toast.message("انتخاب مجوزها به آخرین ذخیره برگشت");
  };

  const savePermissions = async () => {
    if (!selectedId) return;
    const status =
      selectedRoleDetail?.status ??
      rows.find((r) => r.tenant_role_id === selectedId)?.status ??
      null;
    if (Number(status) !== 1) {
      toast.error(
        "امکان تخصیص مجوز به نقش غیرفعال وجود ندارد. ابتدا نقش را فعال کنید."
      );
      return;
    }
    try {
      await assignMutation.mutateAsync({
        tenantRoleId: selectedId,
        permissionIds: Array.from(draftPerms),
      });
      toast.success("مجوزهای نقش ذخیره شد");
      setBaselinePerms(new Set(draftPerms));
      setPermsDirty(false);
      void refetchDetail();
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
          title="نقش‌ها"
          breadcrumbs={[
            { label: "داشبورد", href: "/dashboard" },
            { label: "هویت و دسترسی", href: "/dashboard/identity" },
            { label: "نقش‌ها" },
          ]}
        />
        <div className="rounded-xl border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">
          {MSG_NO_ACCESS}
        </div>
      </div>
    );
  }

  const selectedName =
    selectedRoleDetail?.name ??
    rows.find((r) => r.tenant_role_id === selectedId)?.name ??
    null;

  const selectedStatus =
    rows.find((r) => r.tenant_role_id === selectedId)?.status ??
    selectedRoleDetail?.status ??
    null;
  const selectedIsActive = Number(selectedStatus) === 1;
  const canEditPerms = Boolean(canAssignPerms && selectedId && selectedIsActive);
  const selectedIsPrivileged = Boolean(
    rows.find((r) => r.tenant_role_id === selectedId)?.is_privileged ??
      selectedRoleDetail?.is_privileged
  );

  async function togglePrivileged() {
    if (!selectedId || !canMarkPrivileged || markPrivMutation.isPending) return;
    const next = !selectedIsPrivileged;
    try {
      await markPrivMutation.mutateAsync({
        tenantRoleId: selectedId,
        isPrivileged: next,
      });
      toast.success(
        next
          ? "نقش به‌عنوان ممتاز علامت خورد (مسیر دسترسی اضطراری)"
          : "علامت ممتاز از نقش برداشته شد"
      );
      void refetch();
      void refetchDetail();
    } catch (e) {
      toast.error(
        e instanceof ApiClientError && e.message ? e.message : MSG_GENERIC_ERROR
      );
    }
  }

  return (
    <TooltipProvider delayDuration={250}>
      <div className="flex min-h-0 flex-col gap-3">
        <PageHeader
          title="نقش‌ها"
          description="درخت نقش‌ها راست؛ مجوزها با حوزه و دستهٔ کاربردی در چپ"
          breadcrumbs={[
            { label: "داشبورد", href: "/dashboard" },
            { label: "هویت و دسترسی", href: "/dashboard/identity" },
            { label: "نقش‌ها" },
          ]}
          actions={
            canCreate ? (
              <Button
                type="button"
                size="sm"
                className="h-8 gap-1.5"
                onClick={() => openCreate(null)}
              >
                <Plus className="h-4 w-4" />
                نقش جدید
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
          <section className="flex min-h-[20rem] flex-col overflow-hidden rounded-xl border border-border/70 bg-card lg:order-1">
            <div className="flex flex-wrap items-center gap-2 border-b border-border/60 bg-muted/20 px-3 py-2.5">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">نقش‌ها</h2>
              <span className="text-xs text-muted-foreground">
                {toFaDigits(filteredRoles.length)} مورد
              </span>
              {isFetching && !isLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              ) : null}
              <div className="ms-auto flex gap-1">
                <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={expandAll}>
                  باز کردن همه
                </Button>
                <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={collapseAll}>
                  جمع کردن
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-b border-border/40 px-3 py-2">
              <div className="relative min-w-[10rem] flex-1">
                <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className={cn("h-8 ps-8 text-sm", roleQuery && "pe-8")}
                  placeholder="جستجوی نقش…"
                  value={roleQuery}
                  onChange={(e) => setRoleQuery(e.target.value)}
                />
                {roleQuery ? (
                  <button
                    type="button"
                    className="absolute end-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-muted"
                    aria-label="پاک کردن"
                    onClick={() => setRoleQuery("")}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as StatusFilter)}
              >
                <SelectTrigger className="h-8 w-[8rem]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">همه وضعیت‌ها</SelectItem>
                  <SelectItem value="active">فعال</SelectItem>
                  <SelectItem value="inactive">غیرفعال</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {isLoading ? (
                <div className="space-y-2 p-2">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : tree.length === 0 ? (
                <EmptyState
                  title={searchingRoles ? "نتیجه‌ای پیدا نشد" : "هنوز نقشی تعریف نشده"}
                />
              ) : (
                <div>
                  {tree.map((node, idx) => (
                    <RoleTreeItem
                      key={node.role.tenant_role_id}
                      node={node}
                      isLast={idx === tree.length - 1}
                      ancestorContinues={[]}
                      expanded={expanded}
                      selectedId={selectedId}
                      searching={searchingRoles}
                      onToggleExpand={toggleExpand}
                      onSelect={selectRole}
                      canCreate={canCreate}
                      canUpdate={canUpdate}
                      canDelete={canDelete}
                      bulkBusy={updateMutation.isPending || deleteMutation.isPending}
                      onCreateChild={(id) => openCreate(id)}
                      onActivate={(r) => void activateOne(r)}
                      onDeactivate={(r) => void deactivateOne(r)}
                      onDelete={requestDelete}
                      onRename={requestRename}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="flex min-h-[20rem] flex-col overflow-hidden rounded-xl border border-border/70 bg-card lg:order-2">
            <div className="flex flex-wrap items-center gap-2 border-b border-border/60 bg-muted/20 px-3 py-2.5">
              <h2 className="text-sm font-semibold">
                {selectedName ? `مجوزهای «${selectedName}»` : "مجوزهای نقش"}
              </h2>
              {detailFetching || detailLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              ) : null}
              <span className="text-xs text-muted-foreground">
                {toFaDigits(draftPerms.size)} انتخاب‌شده
              </span>
              {selectedId && selectedIsPrivileged ? (
                <span className="inline-flex items-center gap-0.5 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                  <Star className="h-2.5 w-2.5 fill-current" />
                  ممتاز
                </span>
              ) : null}
              {selectedId && !selectedIsActive ? (
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  نقش غیرفعال — ویرایش مجوز ممکن نیست
                </span>
              ) : null}
              {permsDirty ? (
                <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                  ذخیره‌نشده
                </span>
              ) : null}
              <div className="ms-auto flex gap-1">
                {selectedId && canMarkPrivileged ? (
                  <Button
                    type="button"
                    variant={selectedIsPrivileged ? "secondary" : "outline"}
                    size="sm"
                    className="h-7 gap-1"
                    disabled={markPrivMutation.isPending}
                    onClick={() => void togglePrivileged()}
                    title={
                      selectedIsPrivileged
                        ? "برداشتن علامت ممتاز"
                        : "علامت‌گذاری به‌عنوان نقش ممتاز (دسترسی اضطراری)"
                    }
                  >
                    {markPrivMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Star
                        className={
                          selectedIsPrivileged
                            ? "h-3.5 w-3.5 fill-current text-amber-600"
                            : "h-3.5 w-3.5"
                        }
                      />
                    )}
                    {selectedIsPrivileged ? "ممتاز است" : "ممتاز کردن"}
                  </Button>
                ) : null}
                {canEditPerms && permsDirty ? (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1"
                      disabled={assignMutation.isPending}
                      onClick={resetPermissions}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      برگشت
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="h-7 gap-1"
                      disabled={assignMutation.isPending}
                      onClick={() => void savePermissions()}
                    >
                      {assignMutation.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Save className="h-3.5 w-3.5" />
                      )}
                      ذخیره
                    </Button>
                  </>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-b border-border/40 px-3 py-2">
              <div className="relative min-w-[10rem] flex-1">
                <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className={cn("h-8 ps-8 text-sm", permQuery && "pe-8")}
                  placeholder="جستجوی مجوز یا دسته…"
                  value={permQuery}
                  onChange={(e) => setPermQuery(e.target.value)}
                />
                {permQuery ? (
                  <button
                    type="button"
                    className="absolute end-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-muted"
                    aria-label="پاک کردن"
                    onClick={() => setPermQuery("")}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {!selectedId ? (
                <EmptyState title="نقشی انتخاب نشده" />
              ) : detailLoading && !selectedRoleDetail ? (
                <div className="space-y-2 p-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : permsLoading ? (
                <div className="space-y-2 p-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : permsByModule.length === 0 ? (
                <EmptyState title="مجوزی یافت نشد" />
              ) : (
                <div className="space-y-2">
                  {permsByModule.map(([mod, list], idx) => (
                    <PermissionModuleGroup
                      key={mod}
                      moduleName={mod}
                      permissions={list}
                      draftPerms={draftPerms}
                      canAssign={canEditPerms}
                      busy={assignMutation.isPending}
                      defaultOpen={idx === 0 || permQuery.trim().length > 0}
                      forceOpenSubgroups={permQuery.trim().length > 0}
                      onToggle={togglePerm}
                      onToggleMany={toggleManyPerms}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>

        <Dialog
          open={Boolean(deleteTarget)}
          onOpenChange={(o) => !o && setDeleteTarget(null)}
        >
          <DialogContent className="sm:max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle>حذف نقش</DialogTitle>
            </DialogHeader>
            <p className="text-sm leading-relaxed text-muted-foreground">
              نقش «{deleteTarget?.name}» حذف نرم شود؟ اگر زیرنقش داشته باشد یا به
              کاربری وصل باشد، سیستم اجازه نمی‌دهد.
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
                {deleteMutation.isPending ? "در حال حذف…" : "حذف نقش"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={Boolean(renameTarget)}
          onOpenChange={(o) => !o && setRenameTarget(null)}
        >
          <DialogContent className="sm:max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle>ویرایش عنوان نقش</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="role-rename">عنوان</Label>
              <Input
                id="role-rename"
                value={renameName}
                onChange={(e) => setRenameName(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") void confirmRename();
                }}
              />
            </div>
            <DialogFooter className="gap-2 sm:justify-start">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRenameTarget(null)}
                disabled={updateMutation.isPending}
              >
                انصراف
              </Button>
              <Button
                type="button"
                onClick={() => void confirmRename()}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? "در حال ذخیره…" : "ذخیره"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={Boolean(pendingSelectId)}
          onOpenChange={(o) => !o && setPendingSelectId(null)}
        >
          <DialogContent className="sm:max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle>تغییرات ذخیره‌نشده</DialogTitle>
            </DialogHeader>
            <p className="text-sm leading-relaxed text-muted-foreground">
              تغییرات مجوز ذخیره نشده. بدون ذخیره نقش دیگری انتخاب شود؟
            </p>
            <DialogFooter className="gap-2 sm:justify-start">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPendingSelectId(null)}
              >
                انصراف
              </Button>
              <Button type="button" onClick={confirmDiscardAndSelect}>
                ادامه بدون ذخیره
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <RoleCreateDrawer
          open={createOpen}
          onOpenChange={setCreateOpen}
          defaultParentId={defaultParentId}
          roles={rows}
          onCreated={(id) => {
            setSelectedId(id);
            void refetch();
          }}
        />
      </div>
    </TooltipProvider>
  );
}
