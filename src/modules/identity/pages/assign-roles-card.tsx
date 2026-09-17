/** نقش‌های کاربر — نمایش فعلی + ویرایش درون‌کارت */

"use client";

import { useEffect, useState } from "react";
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
import {
  useRoles,
  useUserRoles,
  useAssignRoleToUser,
} from "../hooks/use-roles";
import { IdentityPermissions } from "../types";
import { MSG_GENERIC_ERROR } from "../lib/ui-copy";

export function AssignRolesCard({ userId }: { userId: string }) {
  const canAssign = usePermission(IdentityPermissions.roleAssign);
  const { data: allRoles, isLoading: loadingAll } = useRoles();
  const {
    data: userRoles,
    isLoading: loadingUser,
    refetch: refetchUserRoles,
  } = useUserRoles(userId);
  const assignMutation = useAssignRoleToUser();
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!editing && userRoles) {
      setSelected(new Set(userRoles.map((r) => r.tenant_role_id)));
    }
  }, [userRoles, editing]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const startEdit = () => {
    setSelected(new Set((userRoles ?? []).map((r) => r.tenant_role_id)));
    setEditing(true);
  };

  const cancelEdit = () => {
    setSelected(new Set((userRoles ?? []).map((r) => r.tenant_role_id)));
    setEditing(false);
  };

  const onSave = async () => {
    if (selected.size === 0) {
      toast.error("دست‌کم یک نقش را انتخاب کنید.");
      return;
    }
    try {
      await assignMutation.mutateAsync({
        userId,
        roleIds: Array.from(selected),
      });
      toast.success("نقش‌ها ذخیره شد.");
      setEditing(false);
      void refetchUserRoles();
    } catch (e) {
      toast.error(
        e instanceof ApiClientError && e.message
          ? e.message
          : MSG_GENERIC_ERROR
      );
    }
  };

  const isLoading = loadingAll || loadingUser;
  const assigned = userRoles ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-base">نقش‌ها</CardTitle>
          <CardDescription>نقش‌های سازمانی این کاربر</CardDescription>
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
            در حال بارگذاری…
          </div>
        ) : editing ? (
          <>
            {(allRoles ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                نقشی تعریف نشده است. از بخش نقش‌ها یک نقش بسازید.
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {(allRoles ?? []).map((r) => (
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
            )}
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
                onClick={() => void onSave()}
              >
                {assignMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
                ذخیره
              </Button>
            </div>
          </>
        ) : assigned.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            هنوز نقشی برای این کاربر ثبت نشده است.
            {canAssign ? " با ویرایش می‌توانید نقش اضافه کنید." : ""}
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {assigned.map((r) => (
              <span
                key={r.tenant_role_id}
                className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-muted/30 px-2.5 py-1 text-xs text-foreground/90"
              >
                <Shield className="h-3 w-3 text-muted-foreground" />
                {r.name}
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
