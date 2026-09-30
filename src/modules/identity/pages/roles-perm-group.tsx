/**
 * Permission picker for roles:
 * - Level 1: module drawer (هویت / سازمان / شرکا …) + select-all module
 * - Level 2: use-case subgroup (کاربران، نقش‌ها، شرکت‌ها …) + select-all subgroup
 * Avoids a flat wall of checkboxes while keeping bulk select practical.
 */
"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronLeft } from "lucide-react";
import { Checkbox } from "@/shared/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import { cn, toFaDigits } from "@/shared/lib/utils";
import {
  displayPermissionName,
  moduleIcon,
  permissionUseCaseGroup,
  sortUseCaseGroups,
} from "../lib/permission-labels";

type PermRow = {
  tenant_permission_id: string;
  name: string;
  code?: string;
  action_type?: string | null;
  description?: string | null;
  module_name?: string | null;
};

export function PermissionModuleGroup({
  moduleName,
  permissions,
  draftPerms,
  canAssign,
  busy,
  defaultOpen,
  forceOpenSubgroups = false,
  onToggle,
  onToggleMany,
}: {
  moduleName: string;
  permissions: PermRow[];
  draftPerms: Set<string>;
  canAssign: boolean;
  busy: boolean;
  defaultOpen: boolean;
  /** When searching, open all use-case drawers that have matches. */
  forceOpenSubgroups?: boolean;
  onToggle: (id: string) => void;
  onToggleMany: (ids: string[], checked: boolean) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [openSub, setOpenSub] = useState<Set<string>>(new Set());

  const ids = useMemo(
    () => permissions.map((p) => p.tenant_permission_id),
    [permissions]
  );
  const selectedInGroup = permissions.filter((p) =>
    draftPerms.has(p.tenant_permission_id)
  ).length;
  const allSelected = ids.length > 0 && selectedInGroup === ids.length;
  const someSelected = selectedInGroup > 0 && !allSelected;
  const Icon = moduleIcon(moduleName);

  const subgroups = useMemo(() => {
    const map = new Map<string, PermRow[]>();
    for (const p of permissions) {
      const g = permissionUseCaseGroup(p.code, p.module_name ?? moduleName);
      const list = map.get(g) ?? [];
      list.push(p);
      map.set(g, list);
    }
    const names = sortUseCaseGroups(Array.from(map.keys()));
    return names.map((name) => ({
      name,
      perms: (map.get(name) ?? []).sort((a, b) =>
        displayPermissionName(a.name, a.code).localeCompare(
          displayPermissionName(b.name, b.code),
          "fa"
        )
      ),
    }));
  }, [permissions, moduleName]);

  // Sync open state when parent forces open (search) or defaultOpen changes
  useEffect(() => {
    setOpen(defaultOpen || forceOpenSubgroups);
  }, [defaultOpen, forceOpenSubgroups]);

  useEffect(() => {
    if (!subgroups.length) {
      setOpenSub(new Set());
      return;
    }
    if (forceOpenSubgroups) {
      setOpenSub(new Set(subgroups.map((s) => s.name)));
      return;
    }
    // Comfort default: only first use-case open when module expands
    setOpenSub(new Set([subgroups[0].name]));
  }, [subgroups, forceOpenSubgroups, moduleName]);

  function toggleSub(name: string) {
    setOpenSub((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border/60">
      {/* —— Module header —— */}
      <div className="flex w-full items-center gap-2 bg-muted/30 px-3 py-2">
        <Checkbox
          checked={allSelected ? true : someSelected ? "indeterminate" : false}
          disabled={!canAssign || busy || ids.length === 0}
          onCheckedChange={(v) => {
            if (!canAssign) return;
            onToggleMany(ids, v === true);
          }}
          aria-label={`انتخاب همه مجوزهای ${moduleName}`}
        />
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 text-start hover:opacity-90"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          {open ? (
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          )}
          <Icon
            className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
            aria-hidden
          />
          <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">
            {moduleName}
          </span>
          <span className="shrink-0 text-[10px] text-muted-foreground">
            {toFaDigits(selectedInGroup)}/{toFaDigits(permissions.length)}
          </span>
        </button>
      </div>

      {open ? (
        <div className="space-y-1.5 border-t border-border/50 bg-card p-2">
          {subgroups.map((sub) => {
            const subIds = sub.perms.map((p) => p.tenant_permission_id);
            const subSelected = sub.perms.filter((p) =>
              draftPerms.has(p.tenant_permission_id)
            ).length;
            const subAll = subIds.length > 0 && subSelected === subIds.length;
            const subSome = subSelected > 0 && !subAll;
            const subOpen = openSub.has(sub.name);

            return (
              <div
                key={sub.name}
                className="overflow-hidden rounded-md border border-border/50"
              >
                {/* —— Use-case header —— */}
                <div className="flex items-center gap-2 bg-muted/15 px-2.5 py-1.5">
                  <Checkbox
                    checked={
                      subAll ? true : subSome ? "indeterminate" : false
                    }
                    disabled={!canAssign || busy || subIds.length === 0}
                    onCheckedChange={(v) => {
                      if (!canAssign) return;
                      onToggleMany(subIds, v === true);
                    }}
                    aria-label={`انتخاب همه ${sub.name}`}
                  />
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-1.5 text-start hover:opacity-90"
                    onClick={() => toggleSub(sub.name)}
                    aria-expanded={subOpen}
                  >
                    {subOpen ? (
                      <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronLeft className="h-3 w-3 shrink-0 text-muted-foreground" />
                    )}
                    <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-foreground">
                      {sub.name}
                    </span>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {toFaDigits(subSelected)}/{toFaDigits(sub.perms.length)}
                    </span>
                  </button>
                </div>

                {subOpen ? (
                  <div className="space-y-0.5 border-t border-border/40 p-1.5">
                    {sub.perms.map((p) => {
                      const checked = draftPerms.has(p.tenant_permission_id);
                      const title = displayPermissionName(p.name, p.code);
                      const description =
                        p.description?.trim() ||
                        `مجوز «${title}» — دسترسی به این عملیات در سیستم.`;
                      return (
                        <Tooltip key={p.tenant_permission_id}>
                          <TooltipTrigger asChild>
                            <label
                              className={cn(
                                "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[13px] transition-colors",
                                checked
                                  ? "bg-primary/5 text-foreground"
                                  : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                                !canAssign && "cursor-default opacity-80"
                              )}
                            >
                              <Checkbox
                                checked={checked}
                                onCheckedChange={() =>
                                  canAssign && onToggle(p.tenant_permission_id)
                                }
                                disabled={!canAssign || busy}
                              />
                              <span className="min-w-0 flex-1 truncate font-normal">
                                {title}
                              </span>
                            </label>
                          </TooltipTrigger>
                          <TooltipContent
                            side="left"
                            className="max-w-xs text-xs leading-relaxed"
                          >
                            <p className="font-medium">{title}</p>
                            <p className="mt-1 opacity-90">{description}</p>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
