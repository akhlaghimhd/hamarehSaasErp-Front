"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Check, ChevronsUpDown, Loader2, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Separator } from "@/shared/components/ui/separator";
import { ApiClientError } from "@/api";
import { useCreateRole, useRoles } from "../hooks/use-roles";
import { roleService, type RoleDto } from "../services/role-service";
import { MSG_GENERIC_ERROR } from "../lib/ui-copy";
import { toFaDigits } from "@/shared/lib/utils";
import { cn } from "@/shared/lib/utils";

type FormValues = {
  role_name: string;
  description: string;
  parent_role_id: string | undefined;
  inherit_from_role_id: string | undefined;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-select parent when creating a child from a row action. */
  defaultParentId?: string | null;
  /** After create: parent should select the new role so permissions can be set in the side panel. */
  onCreated?: (role: RoleDto) => void;
};

type TreeOption = {
  id: string;
  name: string;
  depth: number;
  childCount: number;
};

function buildTreeOptions(roles: RoleDto[]): TreeOption[] {
  const byParent = new Map<string | null, RoleDto[]>();
  const childCount = new Map<string, number>();
  for (const r of roles) {
    const key = r.parent_role_id ?? null;
    const list = byParent.get(key) ?? [];
    list.push(r);
    byParent.set(key, list);
    if (r.parent_role_id) {
      childCount.set(
        r.parent_role_id,
        (childCount.get(r.parent_role_id) ?? 0) + 1
      );
    }
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name, "fa"));
  }
  const out: TreeOption[] = [];
  const walk = (parentId: string | null, depth: number, path: Set<string>) => {
    const kids = byParent.get(parentId) ?? [];
    for (const r of kids) {
      if (path.has(r.tenant_role_id)) continue;
      out.push({
        id: r.tenant_role_id,
        name: r.name,
        depth,
        childCount: childCount.get(r.tenant_role_id) ?? 0,
      });
      const next = new Set(path);
      next.add(r.tenant_role_id);
      walk(r.tenant_role_id, depth + 1, next);
    }
  };
  walk(null, 0, new Set());
  const listed = new Set(out.map((o) => o.id));
  for (const r of roles) {
    if (!listed.has(r.tenant_role_id)) {
      out.push({
        id: r.tenant_role_id,
        name: r.name,
        depth: 0,
        childCount: childCount.get(r.tenant_role_id) ?? 0,
      });
    }
  }
  return out;
}

/** Searchable tree picker — replaces flat Select for long role hierarchies. */
function RoleTreePicker({
  label,
  value,
  onChange,
  options,
  noneLabel,
  placeholder,
  disabled,
}: {
  label: string;
  value: string | undefined;
  onChange: (id: string | undefined) => void;
  options: TreeOption[];
  noneLabel: string;
  placeholder: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const selected = options.find((o) => o.id === value);
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((o) => o.name.toLowerCase().includes(needle));
  }, [options, q]);

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-sm",
            "hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-50"
          )}
        >
          <span className={cn("truncate", !selected && "text-muted-foreground")}>
            {selected ? selected.name : placeholder}
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
        </button>

        {open ? (
          <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-border bg-popover shadow-md">
            <div className="border-b border-border/60 p-2">
              <Input
                className="h-8"
                placeholder="جستجوی نقش…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                autoFocus
              />
            </div>
            <div className="max-h-56 overflow-y-auto py-1">
              <button
                type="button"
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-1.5 text-start text-sm hover:bg-muted/60",
                  !value && "bg-muted/40 font-medium"
                )}
                onClick={() => {
                  onChange(undefined);
                  setOpen(false);
                  setQ("");
                }}
              >
                <span className="w-4 shrink-0">
                  {!value ? <Check className="h-3.5 w-3.5" /> : null}
                </span>
                {noneLabel}
              </button>
              {filtered.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-1 px-3 py-1.5 text-start text-sm hover:bg-muted/60",
                    value === o.id && "bg-muted/40 font-medium",
                    o.depth > 0 && "text-muted-foreground"
                  )}
                  style={{ paddingInlineStart: 12 + o.depth * 14 }}
                  onClick={() => {
                    onChange(o.id);
                    setOpen(false);
                    setQ("");
                  }}
                >
                  <span className="w-4 shrink-0">
                    {value === o.id ? <Check className="h-3.5 w-3.5" /> : null}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{o.name}</span>
                  {o.childCount > 0 ? (
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {toFaDigits(o.childCount)} زیر
                    </span>
                  ) : null}
                </button>
              ))}
              {filtered.length === 0 ? (
                <p className="px-3 py-2 text-xs text-muted-foreground">
                  نقشی یافت نشد.
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function RoleCreateDrawer({
  open,
  onOpenChange,
  defaultParentId = null,
  onCreated,
}: Props) {
  const createMutation = useCreateRole();
  const { data: roles } = useRoles();

  const form = useForm<FormValues>({
    defaultValues: {
      role_name: "",
      description: "",
      parent_role_id: undefined,
      inherit_from_role_id: undefined,
    },
    mode: "onTouched",
  });

  const { isDirty } = form.formState;
  const inheritFromId = useWatch({
    control: form.control,
    name: "inherit_from_role_id",
  });
  const [inheritBusy, setInheritBusy] = useState(false);
  const [copiedPermIds, setCopiedPermIds] = useState<string[]>([]);
  const [copyHint, setCopyHint] = useState<string | null>(null);

  const treeOptions = useMemo(
    () => buildTreeOptions(roles ?? []),
    [roles]
  );

  useEffect(() => {
    if (!open) return;
    form.reset({
      role_name: "",
      description: "",
      parent_role_id: defaultParentId || undefined,
      inherit_from_role_id: undefined,
    });
    setCopiedPermIds([]);
    setCopyHint(null);
  }, [open, defaultParentId, form]);

  // Snapshot copy of permission IDs from another role (not live inheritance).
  useEffect(() => {
    if (!open || !inheritFromId) {
      if (!inheritFromId) {
        setCopiedPermIds([]);
        setCopyHint(null);
      }
      return;
    }
    let cancelled = false;
    setInheritBusy(true);
    setCopyHint(null);
    roleService
      .getById(inheritFromId)
      .then((role) => {
        if (cancelled) return;
        const ids = (role.permissions ?? [])
          .map((p) => p.tenant_permission_id)
          .filter(Boolean) as string[];
        setCopiedPermIds(ids);
        setCopyHint(
          ids.length > 0
            ? `${toFaDigits(ids.length)} مجوز از «${role.name}» برای ذخیره اولیه کپی می‌شود (ارث‌بری زنده نیست)`
            : `نقش «${role.name}» مجوزی ندارد`
        );
      })
      .catch(() => {
        if (!cancelled) {
          setCopiedPermIds([]);
          setCopyHint("کپی مجوز ممکن نشد");
        }
      })
      .finally(() => {
        if (!cancelled) setInheritBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [inheritFromId, open]);

  const closeForced = () => {
    form.reset();
    setCopiedPermIds([]);
    setCopyHint(null);
    onOpenChange(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      // Always allow close via X / Escape — reset dirty form
      form.reset();
      setCopiedPermIds([]);
      setCopyHint(null);
    }
    onOpenChange(next);
  };

  const onSubmit = form.handleSubmit(async (values) => {
    const name = values.role_name.trim();
    if (!name) {
      toast.error("نام نقش الزامی است");
      return;
    }
    try {
      const role = await createMutation.mutateAsync({
        role_name: name,
        description: values.description.trim() || null,
        parent_role_id: values.parent_role_id || null,
        // Optional snapshot at create — further edits happen in the side panel
        permission_ids: copiedPermIds,
      });
      toast.success(
        `نقش «${role.name}» ساخته شد — از پنل مجوزها تخصیص را کامل کنید`
      );
      form.reset();
      setCopiedPermIds([]);
      setCopyHint(null);
      onOpenChange(false);
      onCreated?.(role);
    } catch (e) {
      toast.error(
        e instanceof ApiClientError && e.message ? e.message : MSG_GENERIC_ERROR
      );
    }
  });

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col sm:max-w-md"
        // X / Escape always close; only block accidental outside click when dirty
        onInteractOutside={(e) => {
          if (isDirty || copiedPermIds.length > 0) e.preventDefault();
        }}
        onPointerDownOutside={(e) => {
          if (isDirty || copiedPermIds.length > 0) e.preventDefault();
        }}
      >
        {/* Explicit close — always works (Radix default X can be blocked by overlays) */}
        <button
          type="button"
          className="absolute end-3 top-3 z-10 rounded-md p-1.5 text-muted-foreground opacity-80 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring"
          onClick={closeForced}
          aria-label="بستن"
        >
          <X className="h-4 w-4" />
        </button>

        <SheetHeader>
          <SheetTitle>نقش جدید</SheetTitle>
          <SheetDescription>
            فقط نام، والد و در صورت نیاز کپی اولیه مجوز. پس از ایجاد، نقش در درخت
            انتخاب می‌شود تا مجوزها را در پنل کناری تنظیم کنید.
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={onSubmit}
          className="flex min-h-0 flex-1 flex-col"
          noValidate
        >
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="role_name">نام نقش *</Label>
              <Input
                id="role_name"
                className="h-9"
                {...form.register("role_name", { required: true })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">توضیح</Label>
              <Input
                id="description"
                className="h-9"
                {...form.register("description")}
              />
            </div>

            <RoleTreePicker
              label="نقش والد (سلسله‌مراتب)"
              value={form.watch("parent_role_id")}
              onChange={(id) =>
                form.setValue("parent_role_id", id, { shouldDirty: true })
              }
              options={treeOptions}
              noneLabel="بدون والد — نقش ریشه"
              placeholder="انتخاب والد یا ریشه"
              disabled={createMutation.isPending}
            />
            <p className="text-[11px] text-muted-foreground">
              تورفتگی = زیرنقش. عدد «فر» تعداد فرزند مستقیم است. این فقط ساختار
              درختی است و مجوز را خودکار منتقل نمی‌کند.
            </p>

            <Separator />

            <RoleTreePicker
              label="کپی اولیه مجوز از نقش دیگر (اختیاری)"
              value={form.watch("inherit_from_role_id")}
              onChange={(id) =>
                form.setValue("inherit_from_role_id", id, { shouldDirty: true })
              }
              options={treeOptions}
              noneLabel="بدون کپی — مجوزها را بعداً از پنل تنظیم کنید"
              placeholder="انتخاب نقش مبدأ"
              disabled={createMutation.isPending || inheritBusy}
            />
            {inheritBusy ? (
              <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                در حال خواندن مجوزهای نقش مبدأ…
              </p>
            ) : copyHint ? (
              <p className="text-[11px] text-muted-foreground">{copyHint}</p>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                کپی فقط یک‌بار در لحظه ایجاد است؛ بعداً از پنل کناری ویرایش کنید.
              </p>
            )}
          </div>

          <SheetFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={closeForced}
              disabled={createMutation.isPending}
            >
              انصراف
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={createMutation.isPending || inheritBusy}
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  در حال ایجاد…
                </>
              ) : (
                "ایجاد نقش"
              )}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
