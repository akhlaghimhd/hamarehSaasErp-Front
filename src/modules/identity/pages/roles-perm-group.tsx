/** Permission module collapsible group */
"use client";

import { useState } from "react";
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
} from "../lib/permission-labels";

export function PermissionModuleGroup({
  moduleName,
  permissions,
  draftPerms,
  canAssign,
  busy,
  defaultOpen,
  onToggle,
  onToggleMany,
}: {
  moduleName: string;
  permissions: Array<{
    tenant_permission_id: string;
    name: string;
    code?: string;
    action_type?: string | null;
    description?: string | null;
  }>;
  draftPerms: Set<string>;
  canAssign: boolean;
  busy: boolean;
  defaultOpen: boolean;
  onToggle: (id: string) => void;
  onToggleMany: (ids: string[], checked: boolean) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const ids = permissions.map((p) => p.tenant_permission_id);
  const selectedInGroup = permissions.filter((p) =>
    draftPerms.has(p.tenant_permission_id)
  ).length;
  const allSelected = ids.length > 0 && selectedInGroup === ids.length;
  const someSelected = selectedInGroup > 0 && !allSelected;
  const Icon = moduleIcon(moduleName);

  return (
    <div className="overflow-hidden rounded-lg border border-border/60">
      <div className="flex w-full items-center gap-2 bg-muted/25 px-3 py-2">
        <Checkbox
          checked={allSelected ? true : someSelected ? "indeterminate" : false}
          disabled={!canAssign || busy || ids.length === 0}
          onCheckedChange={(v) => {
            if (!canAssign) return;
            onToggleMany(ids, v === true);
          }}
          aria-label={`انتخاب همه ${moduleName}`}
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
          <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">
            {moduleName}
          </span>
          <span className="shrink-0 text-[10px] text-muted-foreground">
            {toFaDigits(selectedInGroup)}/{toFaDigits(permissions.length)}
          </span>
        </button>
      </div>
      {open ? (
        <div className="space-y-0.5 border-t border-border/50 p-2">
          {permissions.map((p) => {
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
}
