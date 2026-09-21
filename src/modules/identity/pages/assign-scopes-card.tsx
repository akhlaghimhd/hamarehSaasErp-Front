/** محدوده‌های دسترسی کاربر — مشاهده و تخصیص (assign/unassign) */

"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Loader2,
  MapPin,
  Pencil,
  Search,
  X,
} from "lucide-react";
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
import { Input } from "@/shared/components/ui/input";
import { usePermission } from "@/auth";
import { ApiClientError } from "@/api";
import {
  useScopes,
  useUserScopes,
  useAssignScopesToUser,
  useUnassignScopesFromUser,
} from "../hooks/use-scopes";
import type { ScopeDto } from "../services/scope-service";
import { IdentityPermissions } from "../types";
import { MSG_GENERIC_ERROR } from "../lib/ui-copy";
import { cn } from "@/shared/lib/utils";

const SCOPE_TYPE_FA: Record<string, string> = {
  COMPANY: "شرکت",
  BRANCH: "شعبه",
  WAREHOUSE: "انبار",
  DEPARTMENT: "دپارتمان",
  COST_CENTER: "مرکز هزینه",
  CUSTOM: "سفارشی",
};

function typeLabel(t?: string): string {
  if (!t) return "—";
  return SCOPE_TYPE_FA[t] ?? t;
}

type SelectionState = "kept" | "added" | "removed" | "none";

function selectionState(
  id: string,
  selected: Set<string>,
  initial: Set<string>
): SelectionState {
  const on = selected.has(id);
  const was = initial.has(id);
  if (on && was) return "kept";
  if (on && !was) return "added";
  if (!on && was) return "removed";
  return "none";
}

export function AssignScopesCard({ tenantUserId }: { tenantUserId: string }) {
  const canView = usePermission(IdentityPermissions.scopeView);
  const canAssign = usePermission(IdentityPermissions.scopeAssign);
  const { data: allScopes, isLoading: loadingAll } = useScopes();
  const {
    data: userScopes,
    isLoading: loadingUser,
    refetch: refetchUserScopes,
  } = useUserScopes(tenantUserId);
  const assignMutation = useAssignScopesToUser();
  const unassignMutation = useUnassignScopesFromUser();

  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [initial, setInitial] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing && userScopes) {
      const ids = new Set(userScopes.map((s) => s.scope_id));
      setSelected(ids);
      setInitial(ids);
    }
  }, [userScopes, editing]);

  const filtered = useMemo(() => {
    const list = (allScopes ?? []).filter((s) => s.is_active !== false);
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((s) => {
      const name = (s.scope_name || "").toLowerCase();
      const type = (s.scope_type || "").toLowerCase();
      const desc = (s.description || "").toLowerCase();
      const typeFa = typeLabel(s.scope_type).toLowerCase();
      return (
        name.includes(q) ||
        type.includes(q) ||
        typeFa.includes(q) ||
        desc.includes(q)
      );
    });
  }, [allScopes, query]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const startEdit = () => {
    const ids = new Set((userScopes ?? []).map((s) => s.scope_id));
    setSelected(ids);
    setInitial(ids);
    setQuery("");
    setEditing(true);
  };

  const cancelEdit = () => {
    setSelected(new Set(initial));
    setQuery("");
    setEditing(false);
  };

  const onSave = async () => {
    const toAdd: string[] = [];
    const toRemove: string[] = [];
    for (const id of selected) {
      if (!initial.has(id)) toAdd.push(id);
    }
    for (const id of initial) {
      if (!selected.has(id)) toRemove.push(id);
    }
    if (toAdd.length === 0 && toRemove.length === 0) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      if (toAdd.length > 0) {
        await assignMutation.mutateAsync({
          tenantUserId,
          scopeIds: toAdd,
        });
      }
      if (toRemove.length > 0) {
        await unassignMutation.mutateAsync({
          tenantUserId,
          scopeIds: toRemove,
        });
      }
      toast.success("محدوده‌ها ذخیره شد.");
      setEditing(false);
      void refetchUserScopes();
    } catch (e) {
      toast.error(
        e instanceof ApiClientError && e.message
          ? e.message
          : MSG_GENERIC_ERROR
      );
    } finally {
      setSaving(false);
    }
  };

  if (!canView) {
    return null;
  }

  const isLoading = loadingAll || loadingUser;
  const assigned = userScopes ?? [];
  const busy = saving || assignMutation.isPending || unassignMutation.isPending;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-base">محدوده‌های دسترسی</CardTitle>
          <CardDescription>
            مرز دادهٔ این کاربر (شعبه / شرکت / سفارشی و …)
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
            در حال بارگذاری…
          </div>
        ) : editing ? (
          <>
            <div className="relative">
              <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-9 ps-8"
                placeholder="جستجوی محدوده…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            {(allScopes ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                محدوده‌ای تعریف نشده است. از بخش محدوده‌های دسترسی یک مورد
                بسازید (نوع سفارشی بدون وابستگی به سازمان قابل استفاده است).
              </p>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                محدوده‌ای با این جستجو پیدا نشد.
              </p>
            ) : (
              <div className="max-h-72 space-y-0.5 overflow-y-auto rounded-lg border border-border/40 px-2 py-1">
                {filtered.map((s: ScopeDto) => {
                  const state = selectionState(s.scope_id, selected, initial);
                  const isChecked = selected.has(s.scope_id);
                  return (
                    <label
                      key={s.scope_id}
                      className="flex cursor-pointer items-center gap-2 py-1.5 text-sm"
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => toggle(s.scope_id)}
                      />
                      <span
                        className={cn(
                          "min-w-0 flex-1 truncate",
                          state === "added" &&
                            "text-emerald-700 dark:text-emerald-400",
                          state === "removed" &&
                            "text-destructive/80 line-through decoration-destructive/50"
                        )}
                      >
                        {s.scope_name}
                      </span>
                      <span className="shrink-0 rounded-full border border-border/50 bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground">
                        {typeLabel(s.scope_type)}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={cancelEdit}
              >
                <X className="h-3.5 w-3.5" />
                انصراف
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={busy}
                onClick={() => void onSave()}
              >
                {busy ? (
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
            هنوز محدوده‌ای برای این کاربر ثبت نشده است.
            {canAssign ? " با ویرایش می‌توانید محدوده اضافه کنید." : ""}
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {assigned.map((s) => (
              <span
                key={s.scope_id}
                className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-muted/30 px-2.5 py-1 text-xs text-foreground/90"
              >
                <MapPin className="h-3 w-3 text-muted-foreground" />
                {s.scope_name}
                <span className="text-[10px] text-muted-foreground">
                  ({typeLabel(s.scope_type)})
                </span>
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
