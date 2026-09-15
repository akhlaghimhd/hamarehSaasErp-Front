/** FE-P1-T15 — تخصیص نقش به عضو سازمان */

"use client";

import { useState } from "react";
import { Loader2, Shield } from "lucide-react";
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
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onAssign = async () => {
    if (selected.size === 0) {
      toast.error("دست‌کم یک نقش را انتخاب کنید");
      return;
    }
    try {
      await assignMutation.mutateAsync({
        userId,
        roleIds: Array.from(selected),
      });
      toast.success("نقش‌های انتخاب‌شده برای این کاربر ثبت شد");
      setSelected(new Set());
    } catch (e) {
      toast.error(
        e instanceof ApiClientError && e.message
          ? e.message
          : MSG_GENERIC_ERROR
      );
    }
  };

  return (
    <Card className="lg:col-span-12">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">تخصیص نقش</CardTitle>
        <CardDescription>
          نقش‌های موردنظر را انتخاب کنید و برای این کاربر اعمال کنید.
        </CardDescription>
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
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {(roles ?? []).map((r) => (
              <label
                key={r.tenant_role_id}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-border/60 p-2 text-sm"
              >
                <Checkbox
                  checked={selected.has(r.tenant_role_id)}
                  onCheckedChange={() => toggle(r.tenant_role_id)}
                  disabled={!canAssign}
                />
                <span className="flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                  {r.name}
                </span>
              </label>
            ))}
          </div>
        )}
        {canAssign ? (
          <Button
            size="sm"
            onClick={() => void onAssign()}
            disabled={assignMutation.isPending || selected.size === 0}
          >
            {assignMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "اعمال نقش‌های انتخاب‌شده"
            )}
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground">
            برای تخصیص نقش، مجوز لازم را ندارید.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
