/** تخصیص نقش به عضو سازمان — ویرایش درون‌کارت */

"use client";

import { useState } from "react";
import { Loader2, Pencil, Shield, X, Check } from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { usePermission } from "@/auth";
import { ApiClientError } from "@/api";
import { useRoles, useAssignRoleToUser } from "../hooks/use-roles";
import { IdentityPermissions } from "../types";
import { MSG_GENERIC_ERROR } from "../lib/ui-copy";

export function AssignRolesCard({ userId }: { userId: string }) {
  const canAssign = usePermission(IdentityPermissions.roleAssign);
  const { data: roles, isLoading } = useRoles();
  const assignMutation = useAssignRoleToUser();
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const startEdit = () => {
    setSelected(new Set());
    setEditing(true);
  };

  const cancelEdit = () => {
    setSelected(new Set());
    setEditing(false);
  };

  const onAssign = async () => {
    if (selected.size === 0) {
      toast.error("دست‌کم یک نقش را انتخاب کنید.");
      return;
    }
    try {
      await assignMutation.mutateAsync({
        userId,
        roleIds: Array.from(selected),
      });
      toast.success("نقش‌ها برای این کاربر ذخیره شد.");
      setSelected(new Set());
      setEditing(false);
    } catch (e) {
      toast.error(
        e instanceof ApiClientError && e.message
          ? e.message
          : MSG_GENERIC_ERROR
      );
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-base">نقش‌ها</CardTitle>
          <CardDescription>
            نقش‌های سازمانی این کاربر را مدیریت کنید
          </CardDescription>
        </div>
        {canAssign && !editing ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 shrink-0"
            onClick={startEdit}
          >
            <Pencil className="h-3.5 w-3.5" />
            ویرایش
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            در حال بارگذاری نقش‌ها…
          </div>
        ) : (roles ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">
            هنوز نقشی تعریف نشده است. ابتدا از بخش نقش‌ها یک نقش بسازید.
          </p>
        ) : editing ? (
          <>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {(roles ?? []).map((r) => (
                <label
                  key={r.tenant_role_id}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-border/60 p-2.5 text-sm transition hover:bg-muted/40"
                >
                  <Checkbox
                    checked={selected.has(r.tenant_role_id)}
                    onCheckedChange={() => toggle(r.tenant_role_id)}
                  />
                  <span className="flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                    {r.name}
                  </span>
                </label>
              ))}
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={assignMutation.isPending}
                onClick={cancelEdit}
              >
                <X className="h-3.5 w-3.5" />
                انصراف
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={assignMutation.isPending || selected.size === 0}
                onClick={() => void onAssign()}
              >
                {assignMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
                ذخیره نقش‌ها
              </Button>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            {canAssign
              ? "برای افزودن نقش، روی ویرایش بزنید و نقش‌های موردنظر را انتخاب کنید."
              : "برای تغییر نقش‌ها مجوز لازم را ندارید."}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
