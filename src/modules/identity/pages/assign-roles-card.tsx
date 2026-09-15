/** FE-P1-T15 — Assign roles to a tenant member (by user_id). */

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
      toast.error("حداقل یک نقش انتخاب کنید");
      return;
    }
    try {
      await assignMutation.mutateAsync({
        userId,
        roleIds: Array.from(selected),
      });
      toast.success("نقش‌ها به عضو تخصیص داده شد");
      setSelected(new Set());
    } catch (e) {
      toast.error(
        e instanceof ApiClientError ? e.message : "تخصیص نقش ناموفق بود"
      );
    }
  };

  return (
    <Card className="lg:col-span-12">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">تخصیص نقش</CardTitle>
        <CardDescription>
          API فهرست نقش‌های فعلی عضو هنوز ندارد؛ از اینجا نقش جدید تخصیص دهید
          (POST /roles/assign).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            بارگذاری نقش‌ها…
          </div>
        ) : (roles ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">
            نقشی تعریف نشده. ابتدا از بخش نقش‌ها یک نقش بسازید.
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
              "تخصیص نقش‌های انتخاب‌شده"
            )}
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground">
            نیاز به مجوز identity.role.assign
          </p>
        )}
      </CardContent>
    </Card>
  );
}
