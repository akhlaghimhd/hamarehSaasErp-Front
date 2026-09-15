/** FE-P1-T13/T14 — جزئیات نقش و تخصیص مجوز */

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/shared/components/layout/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { StatusChip } from "@/shared/components/data-display/status-chip";
import { usePermission } from "@/auth";
import { ApiClientError } from "@/api";
import {
  useAssignPermissionsToRole,
  useRole,
  useUpdateRole,
} from "../hooks/use-roles";
import { usePermissions } from "../hooks/use-permissions";
import { IdentityPermissions } from "../types";
import { MSG_GENERIC_ERROR, MSG_NO_ACCESS } from "../lib/ui-copy";

export function RoleDetailPage() {
  const params = useParams();
  const rawId = params?.id;
  const roleId =
    typeof rawId === "string" ? rawId : Array.isArray(rawId) ? rawId[0] : "";

  const canView = usePermission(IdentityPermissions.roleView);
  const canUpdate = usePermission(IdentityPermissions.roleUpdate);
  const canAssignPerms = usePermission(
    IdentityPermissions.roleAssignPermissions
  );

  const { data: role, isLoading, isError, error, refetch } = useRole(roleId || null);
  const { data: allPerms } = usePermissions();
  const updateMutation = useUpdateRole();
  const assignMutation = useAssignPermissionsToRole();

  const linkedIds = useMemo(() => {
    const fromRel = (role?.permissions ?? [])
      .map((p) => p.tenant_permission_id)
      .filter(Boolean);
    return new Set(fromRel);
  }, [role]);

  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    setSelected(new Set(linkedIds));
  }, [linkedIds]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onSavePermissions = async () => {
    if (!roleId) return;
    try {
      await assignMutation.mutateAsync({
        tenantRoleId: roleId,
        permissionIds: Array.from(selected),
      });
      toast.success("مجوزهای این نقش ذخیره شد");
      void refetch();
    } catch (e) {
      toast.error(
        e instanceof ApiClientError && e.message ? e.message : MSG_GENERIC_ERROR
      );
    }
  };

  const onToggleStatus = async () => {
    if (!role) return;
    const next = Number(role.status) === 1 ? 0 : 1;
    try {
      await updateMutation.mutateAsync({
        id: role.tenant_role_id,
        payload: { status: next },
      });
      toast.success(next === 1 ? "نقش فعال شد" : "نقش غیرفعال شد");
    } catch (e) {
      toast.error(
        e instanceof ApiClientError && e.message ? e.message : MSG_GENERIC_ERROR
      );
    }
  };

  if (!canView) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="جزئیات نقش"
          breadcrumbs={[
            { label: "نقش‌ها", href: "/dashboard/identity/roles" },
            { label: "جزئیات" },
          ]}
        />
        <div className="rounded-xl border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">
          {MSG_NO_ACCESS}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={role?.name ?? "جزئیات نقش"}
        description={role?.description?.trim() || "مشاهده وضعیت نقش و تنظیم مجوزهای آن"}
        breadcrumbs={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "هویت و دسترسی", href: "/dashboard/identity" },
          { label: "نقش‌ها", href: "/dashboard/identity/roles" },
          { label: "جزئیات" },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/identity/roles">بازگشت به فهرست</Link>
            </Button>
            {canUpdate && role ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => void onToggleStatus()}
                disabled={updateMutation.isPending}
              >
                {Number(role.status) === 1 ? "غیرفعال کردن" : "فعال کردن"}
              </Button>
            ) : null}
          </div>
        }
      />

      {isLoading ? (
        <div className="flex items-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          در حال بارگذاری…
        </div>
      ) : isError || !role ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-destructive">
            {error instanceof ApiClientError && error.message
              ? error.message
              : "این نقش پیدا نشد یا دیگر در دسترس نیست."}
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">وضعیت نقش</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-2 text-sm">
              {Number(role.status) === 1 || role.status === undefined ? (
                <StatusChip label="فعال" tone="success" />
              ) : (
                <StatusChip label="غیرفعال" tone="neutral" />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">مجوزهای این نقش</CardTitle>
              <CardDescription>
                مواردی را که دارندگان این نقش باید به آن‌ها دسترسی داشته باشند انتخاب و ذخیره کنید.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid max-h-80 gap-2 overflow-y-auto sm:grid-cols-2">
                {(allPerms ?? []).map((p) => (
                  <label
                    key={p.tenant_permission_id}
                    className="flex cursor-pointer items-start gap-2 rounded-lg border border-border/60 p-2 text-sm"
                  >
                    <Checkbox
                      checked={selected.has(p.tenant_permission_id)}
                      onCheckedChange={() => toggle(p.tenant_permission_id)}
                      disabled={!canAssignPerms}
                    />
                    <span className="font-medium">{p.name}</span>
                  </label>
                ))}
              </div>
              {canAssignPerms ? (
                <Button
                  size="sm"
                  onClick={() => void onSavePermissions()}
                  disabled={assignMutation.isPending}
                >
                  {assignMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "ذخیره مجوزها"
                  )}
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground">
                  برای ویرایش مجوزهای نقش، دسترسی لازم را ندارید.
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
