/** نقش‌های کاربر — جستجو، درخت، تمایز ملایم افزودن/حذف */

"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  Loader2,
  Pencil,
  Search,
  Shield,
  X,
  Check,
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
  useRoles,
  useUserRoles,
  useAssignRoleToUser,
} from "../hooks/use-roles";
import type { RoleDto } from "../services/role-service";
import { IdentityPermissions } from "../types";
import { MSG_GENERIC_ERROR } from "../lib/ui-copy";
import { cn } from "@/shared/lib/utils";

type RoleNode = RoleDto & {
  parent_role_id?: string | null;
  children: RoleNode[];
};

function buildTree(roles: RoleDto[]): RoleNode[] {
  const map = new Map<string, RoleNode>();
  for (const r of roles) {
    map.set(r.tenant_role_id, {
      ...r,
      parent_role_id:
        (r as RoleDto & { parent_role_id?: string | null }).parent_role_id ??
        null,
      children: [],
    });
  }
  const roots: RoleNode[] = [];
  for (const node of map.values()) {
    const pid = node.parent_role_id;
    if (pid && map.has(pid)) {
      map.get(pid)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  const sortFn = (a: RoleNode, b: RoleNode) =>
    (a.name || "").localeCompare(b.name || "", "fa");
  const sortRec = (nodes: RoleNode[]) => {
    nodes.sort(sortFn);
    nodes.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);
  return roots;
}

function filterTree(nodes: RoleNode[], q: string): RoleNode[] {
  if (!q.trim()) return nodes;
  const needle = q.trim().toLowerCase();
  const walk = (list: RoleNode[]): RoleNode[] => {
    const out: RoleNode[] = [];
    for (const n of list) {
      const kids = walk(n.children);
      const selfMatch =
        (n.name || "").toLowerCase().includes(needle) ||
        (n.code || "").toLowerCase().includes(needle) ||
        (n.description || "").toLowerCase().includes(needle);
      if (selfMatch || kids.length > 0) {
        out.push({ ...n, children: kids });
      }
    }
    return out;
  };
  return walk(nodes);
}

function collectDescendantIds(node: RoleNode): string[] {
  const ids: string[] = [];
  for (const c of node.children) {
    ids.push(c.tenant_role_id, ...collectDescendantIds(c));
  }
  return ids;
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

function parentCheckState(
  node: RoleNode,
  selected: Set<string>
): "all" | "some" | "none" {
  const childIds = collectDescendantIds(node);
  const focus = childIds.length > 0 ? childIds : [node.tenant_role_id];
  const count = focus.filter((id) => selected.has(id)).length;
  if (count === 0) return "none";
  if (count === focus.length) return "all";
  return "some";
}

function RoleTreeRow({
  node,
  depth,
  selected,
  initial,
  expanded,
  onToggleExpand,
  onToggle,
  onToggleMany,
}: {
  node: RoleNode;
  depth: number;
  selected: Set<string>;
  initial: Set<string>;
  expanded: Set<string>;
  onToggleExpand: (id: string) => void;
  onToggle: (id: string) => void;
  onToggleMany: (ids: string[], select: boolean) => void;
}) {
  const hasChildren = node.children.length > 0;
  const isOpen = expanded.has(node.tenant_role_id);
  const state = selectionState(node.tenant_role_id, selected, initial);
  const parentState = hasChildren ? parentCheckState(node, selected) : null;

  const onParentToggle = () => {
    if (!hasChildren) {
      onToggle(node.tenant_role_id);
      return;
    }
    const ids = collectDescendantIds(node);
    const allOn = ids.every((id) => selected.has(id));
    onToggleMany(ids, !allOn);
  };

  return (
    <div>
      <div
        className="flex items-center gap-2 py-1.5 text-sm"
        style={{ paddingInlineStart: `${depth * 1.15 + 0.25}rem` }}
      >
        {hasChildren ? (
          <button
            type="button"
            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted"
            onClick={() => onToggleExpand(node.tenant_role_id)}
            aria-label={isOpen ? "بستن" : "باز کردن"}
          >
            {isOpen ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronLeft className="h-3.5 w-3.5" />
            )}
          </button>
        ) : (
          <span className="inline-block w-6 shrink-0" />
        )}

        <Checkbox
          checked={
            hasChildren
              ? parentState === "all"
                ? true
                : parentState === "some"
                  ? "indeterminate"
                  : false
              : selected.has(node.tenant_role_id)
          }
          onCheckedChange={() => {
            if (hasChildren) onParentToggle();
            else onToggle(node.tenant_role_id);
          }}
        />

        <span
          className={cn(
            "min-w-0 flex-1 truncate",
            state === "added" && "text-emerald-700 dark:text-emerald-400",
            state === "removed" &&
              "text-destructive/80 line-through decoration-destructive/50"
          )}
        >
          {node.name}
        </span>
      </div>

      {hasChildren && isOpen
        ? node.children.map((c) => (
            <RoleTreeRow
              key={c.tenant_role_id}
              node={c}
              depth={depth + 1}
              selected={selected}
              initial={initial}
              expanded={expanded}
              onToggleExpand={onToggleExpand}
              onToggle={onToggle}
              onToggleMany={onToggleMany}
            />
          ))
        : null}
    </div>
  );
}

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
  const [initial, setInitial] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!editing && userRoles) {
      const ids = new Set(userRoles.map((r) => r.tenant_role_id));
      setSelected(ids);
      setInitial(ids);
    }
  }, [userRoles, editing]);

  const tree = useMemo(() => buildTree(allRoles ?? []), [allRoles]);
  const filtered = useMemo(() => filterTree(tree, query), [tree, query]);

  useEffect(() => {
    if (!editing) return;
    const next = new Set<string>();
    const walk = (nodes: RoleNode[]) => {
      for (const n of nodes) {
        if (n.children.length > 0) {
          next.add(n.tenant_role_id);
          walk(n.children);
        }
      }
    };
    walk(filtered);
    setExpanded(next);
  }, [editing, query, filtered]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleMany = (ids: string[], select: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (select) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const startEdit = () => {
    const ids = new Set((userRoles ?? []).map((r) => r.tenant_role_id));
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
            <div className="relative">
              <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-9 ps-8"
                placeholder="جستجوی نقش…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            {(allRoles ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                نقشی تعریف نشده است. از بخش نقش‌ها یک نقش بسازید.
              </p>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                نقشی با این جستجو پیدا نشد.
              </p>
            ) : (
              <div className="max-h-72 overflow-y-auto rounded-lg border border-border/40 px-1 py-1">
                {filtered.map((n) => (
                  <RoleTreeRow
                    key={n.tenant_role_id}
                    node={n}
                    depth={0}
                    selected={selected}
                    initial={initial}
                    expanded={expanded}
                    onToggleExpand={toggleExpand}
                    onToggle={toggle}
                    onToggleMany={toggleMany}
                  />
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
