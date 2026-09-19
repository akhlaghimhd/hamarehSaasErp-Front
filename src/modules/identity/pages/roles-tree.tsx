/** Shared role tree item */
"use client";

import {
  ChevronDown,
  ChevronLeft,
  Plus,
  Trash2,
  Pencil,
  UserCheck,
  UserMinus,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import { cn, toFaDigits } from "@/shared/lib/utils";
import type { RoleDto } from "../services/role-service";

const TREE_INDENT = 20;

export type TreeNode = { role: RoleDto; children: TreeNode[] };

export function buildChildrenMap(roles: RoleDto[]): Map<string, RoleDto[]> {
  const map = new Map<string, RoleDto[]>();
  for (const r of roles) {
    const pid = r.parent_role_id ?? "";
    const list = map.get(pid) ?? [];
    list.push(r);
    map.set(pid, list);
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name, "fa"));
  }
  return map;
}

export function buildTree(roles: RoleDto[]): TreeNode[] {
  const byId = new Map(roles.map((r) => [r.tenant_role_id, r]));
  const children = buildChildrenMap(roles);
  const roots: RoleDto[] = [];
  for (const r of roles) {
    const pid = r.parent_role_id;
    if (!pid || !byId.has(pid)) roots.push(r);
  }
  roots.sort((a, b) => a.name.localeCompare(b.name, "fa"));
  const walk = (role: RoleDto): TreeNode => ({
    role,
    children: (children.get(role.tenant_role_id) ?? []).map(walk),
  });
  return roots.map(walk);
}

export function filterRolesKeepAncestors(
  roles: RoleDto[],
  q: string,
  status: "all" | "active" | "inactive"
): RoleDto[] {
  const byId = new Map(roles.map((r) => [r.tenant_role_id, r]));
  const match = (r: RoleDto) => {
    if (status === "active" && r.status !== 1) return false;
    if (status === "inactive" && r.status === 1) return false;
    if (!q) return true;
    return [r.name, r.code, r.description]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(q);
  };
  const keep = new Set<string>();
  for (const r of roles) {
    if (!match(r)) continue;
    keep.add(r.tenant_role_id);
    let pid = r.parent_role_id;
    while (pid && byId.has(pid)) {
      keep.add(pid);
      pid = byId.get(pid)?.parent_role_id ?? null;
    }
  }
  return roles.filter((r) => keep.has(r.tenant_role_id));
}

export function RoleTreeItem({
  node,
  isLast,
  ancestorContinues,
  expanded,
  selectedId,
  searching,
  onToggleExpand,
  onSelect,
  canCreate,
  canUpdate,
  canDelete,
  bulkBusy,
  onCreateChild,
  onActivate,
  onDeactivate,
  onDelete,
  onRename,
}: {
  node: TreeNode;
  isLast: boolean;
  ancestorContinues: boolean[];
  expanded: Set<string>;
  selectedId: string | null;
  searching: boolean;
  onToggleExpand: (id: string) => void;
  onSelect: (id: string) => void;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  bulkBusy: boolean;
  onCreateChild: (parentId: string) => void;
  onActivate: (role: RoleDto) => void;
  onDeactivate: (role: RoleDto) => void;
  onDelete: (role: RoleDto) => void;
  onRename: (role: RoleDto) => void;
}) {
  const { role, children } = node;
  const depth = ancestorContinues.length;
  const hasChildren = children.length > 0;
  const open = searching || expanded.has(role.tenant_role_id);
  const selected = selectedId === role.tenant_role_id;
  const isActive = role.status === 1;

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelect(role.tenant_role_id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect(role.tenant_role_id);
          }
        }}
        className={cn(
          "group relative flex cursor-pointer items-center gap-1 rounded-md pe-1 transition-colors",
          selected ? "bg-primary/10" : "hover:bg-muted/50"
        )}
      >
        <div className="relative shrink-0 self-stretch" style={{ width: (depth + 1) * TREE_INDENT }}>
          {ancestorContinues.map((cont, i) =>
            cont ? (
              <span
                key={i}
                className="absolute top-0 bottom-0 w-px bg-border/70"
                style={{ insetInlineStart: i * TREE_INDENT + TREE_INDENT / 2 }}
              />
            ) : null
          )}
          {depth > 0 ? (
            <span
              className="absolute top-0 h-1/2 w-px bg-border/70"
              style={{ insetInlineStart: (depth - 1) * TREE_INDENT + TREE_INDENT / 2 }}
            />
          ) : null}
          {depth > 0 && !isLast ? (
            <span
              className="absolute top-1/2 bottom-0 w-px bg-border/70"
              style={{ insetInlineStart: (depth - 1) * TREE_INDENT + TREE_INDENT / 2 }}
            />
          ) : null}
          {depth > 0 ? (
            <span
              className="absolute top-1/2 h-px bg-border/70"
              style={{
                insetInlineStart: (depth - 1) * TREE_INDENT + TREE_INDENT / 2,
                width: TREE_INDENT / 2,
              }}
            />
          ) : null}
          <div
            className="absolute top-1/2 z-[1] flex -translate-y-1/2 items-center justify-center"
            style={{ insetInlineStart: depth * TREE_INDENT, width: TREE_INDENT }}
          >
            {hasChildren ? (
              <button
                type="button"
                className="inline-flex h-5 w-5 items-center justify-center rounded-sm border border-border/60 bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!searching) onToggleExpand(role.tenant_role_id);
                }}
                aria-label={open ? "جمع کردن" : "باز کردن"}
                disabled={searching}
              >
                {open ? <ChevronDown className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
              </button>
            ) : (
              <span className="h-1.5 w-1.5 rounded-full bg-border" />
            )}
          </div>
        </div>

        <div className={cn("min-w-0 flex-1 py-1", depth > 0 && "text-[13px] text-muted-foreground")}>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "truncate",
                depth === 0 ? "text-sm font-medium text-foreground" : "font-normal"
              )}
            >
              {role.name}
            </span>
            <span
              className={cn(
                "h-1.5 w-1.5 shrink-0 rounded-full",
                isActive ? "bg-emerald-500" : "bg-muted-foreground/40"
              )}
              title={isActive ? "فعال" : "غیرفعال"}
            />
            <span className="ms-auto flex shrink-0 items-center gap-2 text-[10px] tabular-nums text-muted-foreground">
              {hasChildren ? (
                <span title="زیرنقش">{toFaDigits(children.length)} زیرنقش</span>
              ) : null}
              <span title="مجوز">{toFaDigits(role.permissions?.length ?? 0)} مجوز</span>
            </span>
          </div>
        </div>

        <div
          className="flex shrink-0 items-center gap-0.5 opacity-60 group-hover:opacity-100"
          onClick={(e) => e.stopPropagation()}
        >
          {canCreate ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  disabled={bulkBusy}
                  onClick={() => onCreateChild(role.tenant_role_id)}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>زیرنقش</TooltipContent>
            </Tooltip>
          ) : null}
          {canUpdate ? (
            isActive ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={bulkBusy}
                    onClick={() => onDeactivate(role)}
                  >
                    <UserMinus className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>غیرفعال</TooltipContent>
              </Tooltip>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={bulkBusy}
                    onClick={() => onActivate(role)}
                  >
                    <UserCheck className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>فعال</TooltipContent>
              </Tooltip>
            )
          ) : null}
          {canUpdate ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  disabled={bulkBusy}
                  onClick={() => onRename(role)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>ویرایش عنوان</TooltipContent>
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
                  disabled={bulkBusy}
                  onClick={() => onDelete(role)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>حذف</TooltipContent>
            </Tooltip>
          ) : null}
        </div>
      </div>

      {hasChildren && open
        ? children.map((child, idx) => (
            <RoleTreeItem
              key={child.role.tenant_role_id}
              node={child}
              isLast={idx === children.length - 1}
              ancestorContinues={[...ancestorContinues, !isLast]}
              expanded={expanded}
              selectedId={selectedId}
              searching={searching}
              onToggleExpand={onToggleExpand}
              onSelect={onSelect}
              canCreate={canCreate}
              canUpdate={canUpdate}
              canDelete={canDelete}
              bulkBusy={bulkBusy}
              onCreateChild={onCreateChild}
              onActivate={onActivate}
              onDeactivate={onDeactivate}
              onDelete={onDelete}
              onRename={onRename}
            />
          ))
        : null}
    </div>
  );
}
