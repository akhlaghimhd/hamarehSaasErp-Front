"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
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
import { Checkbox } from "@/shared/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Label } from "@/shared/components/ui/label";
import { Separator } from "@/shared/components/ui/separator";
import { ApiClientError } from "@/api";
import { useCreateRole, useRoles } from "../hooks/use-roles";
import { usePermissions } from "../hooks/use-permissions";
import { roleService, type RoleDto } from "../services/role-service";
import { MSG_GENERIC_ERROR } from "../lib/ui-copy";
import { toFaDigits } from "@/shared/lib/utils";

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
  /** Called after successful create; list stays open — do not hard-navigate away. */
  onCreated?: (role: RoleDto) => void;
};

type TreeOption = { id: string; label: string; depth: number };

function buildTreeOptions(roles: RoleDto[]): TreeOption[] {
  const byParent = new Map<string | null, RoleDto[]>();
  for (const r of roles) {
    const key = r.parent_role_id ?? null;
    const list = byParent.get(key) ?? [];
    list.push(r);
    byParent.set(key, list);
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name, "fa"));
  }
  const out: TreeOption[] = [];
  const walk = (parentId: string | null, depth: number, path: Set<string>) => {
    const kids = byParent.get(parentId) ?? [];
    for (const r of kids) {
      if (path.has(r.tenant_role_id)) continue;
      const prefix = depth > 0 ? `${"\u2003".repeat(depth)}└ ` : "";
      out.push({
        id: r.tenant_role_id,
        label: `${prefix}${r.name}`,
        depth,
      });
      const next = new Set(path);
      next.add(r.tenant_role_id);
      walk(r.tenant_role_id, depth + 1, next);
    }
  };
  walk(null, 0, new Set());
  // orphans (parent missing from list)
  const listed = new Set(out.map((o) => o.id));
  for (const r of roles) {
    if (!listed.has(r.tenant_role_id)) {
      out.push({ id: r.tenant_role_id, label: r.name, depth: 0 });
    }
  }
  return out;
}

export function RoleCreateDrawer({
  open,
  onOpenChange,
  defaultParentId = null,
  onCreated,
}: Props) {
  const createMutation = useCreateRole();
  const { data: roles } = useRoles();
  const { data: allPerms } = usePermissions();

  const form = useForm<FormValues>({
    defaultValues: {
      role_name: "",
      description: "",
      parent_role_id: undefined,
      inherit_from_role_id: undefined,
    },
  });

  const { isDirty } = form.formState;
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set());
  const [inheritBusy, setInheritBusy] = useState(false);

  const inheritFromId = useWatch({
    control: form.control,
    name: "inherit_from_role_id",
  });

  const activeRoles = useMemo(
    () =>
      (roles ?? []).filter(
        (r) => r.status === undefined || Number(r.status) === 1
      ),
    [roles]
  );

  const treeOptions = useMemo(() => buildTreeOptions(activeRoles), [activeRoles]);

  useEffect(() => {
    if (!open) return;
    form.reset({
      role_name: "",
      description: "",
      parent_role_id: defaultParentId || undefined,
      inherit_from_role_id: undefined,
    });
    setSelectedPerms(new Set());
  }, [open, defaultParentId, form]);

  useEffect(() => {
    if (!open || !inheritFromId) return;
    let cancelled = false;
    setInheritBusy(true);
    roleService
      .getById(inheritFromId)
      .then((role) => {
        if (cancelled) return;
        const ids = (role.permissions ?? [])
          .map((p) => p.tenant_permission_id)
          .filter(Boolean);
        setSelectedPerms(new Set(ids));
        toast.message(
          ids.length
            ? `${toFaDigits(ids.length)} مجوز از نقش انتخاب‌شده کپی شد (فقط برای راحتی؛ ارث‌بری زنده نیست)`
            : "نقش انتخاب‌شده مجوزی ندارد"
        );
      })
      .catch(() => {
        if (!cancelled) toast.error("بارگذاری مجوزهای نقش مبدأ ممکن نشد");
      })
      .finally(() => {
        if (!cancelled) setInheritBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [inheritFromId, open]);

  const togglePerm = (id: string) => {
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleOpenChange = (next: boolean) => {
    if (!next && (isDirty || selectedPerms.size > 0)) {
      return;
    }
    if (!next) {
      form.reset();
      setSelectedPerms(new Set());
    }
    onOpenChange(next);
  };

  const closeForced = () => {
    form.reset();
    setSelectedPerms(new Set());
    onOpenChange(false);
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
        permission_ids: Array.from(selectedPerms),
      });
      toast.success(`نقش «${role.name}» ساخته شد`);
      form.reset();
      setSelectedPerms(new Set());
      onOpenChange(false);
      onCreated?.(role);
    } catch (e) {
      toast.error(
        e instanceof ApiClientError && e.message ? e.message : MSG_GENERIC_ERROR
      );
    }
  });

  const formDirty = isDirty || selectedPerms.size > 0;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col sm:max-w-lg"
        onInteractOutside={(e) => {
          if (formDirty) e.preventDefault();
        }}
        onPointerDownOutside={(e) => {
          if (formDirty) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (formDirty) e.preventDefault();
        }}
      >
        <SheetHeader>
          <SheetTitle>نقش جدید</SheetTitle>
          <SheetDescription>
            والد فقط برای سلسله‌مراتب است. می‌توانید نقش ریشه بسازید یا زیر یک نقش
            موجود. کپی مجوز فقط تیک‌ها را پر می‌کند و ارث‌بری زنده نیست.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col" noValidate>
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

            <div className="space-y-1.5">
              <Label>نقش والد</Label>
              <Select
                value={form.watch("parent_role_id") ?? "__none__"}
                onValueChange={(v) =>
                  form.setValue(
                    "parent_role_id",
                    v === "__none__" ? undefined : v,
                    { shouldDirty: true }
                  )
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="بدون والد (نقش ریشه)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">بدون والد — نقش ریشه</SelectItem>
                  {treeOptions.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                زیرمجموعه‌ها با تورفتگی زیر والد نشان داده می‌شوند. انتخاب «بدون
                والد» نقش را در ریشه قرار می‌دهد.
              </p>
            </div>

            <Separator />

            <div className="space-y-1.5">
              <Label>کپی مجوزها از نقش دیگر</Label>
              <Select
                value={form.watch("inherit_from_role_id") ?? "__none__"}
                onValueChange={(v) =>
                  form.setValue(
                    "inherit_from_role_id",
                    v === "__none__" ? undefined : v,
                    { shouldDirty: true }
                  )
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="انتخاب نقش مبدأ (اختیاری)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">بدون کپی</SelectItem>
                  {treeOptions.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                تیک‌ها یک‌بار کپی می‌شوند؛ تغییر بعدی نقش مبدأ روی این نقش اثر
                ندارد.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>مجوزهای این نقش</Label>
                <span className="text-[11px] text-muted-foreground">
                  {toFaDigits(selectedPerms.size)} انتخاب‌شده
                  {inheritBusy ? " · در حال کپی…" : ""}
                </span>
              </div>
              <div className="grid max-h-56 gap-1.5 overflow-y-auto rounded-md border border-border/60 p-2">
                {(allPerms ?? []).map((p) => (
                  <label
                    key={p.tenant_permission_id}
                    className="flex cursor-pointer items-start gap-2 rounded-md px-1.5 py-1 text-sm hover:bg-muted/50"
                  >
                    <Checkbox
                      className="mt-0.5"
                      checked={selectedPerms.has(p.tenant_permission_id)}
                      onCheckedChange={() => togglePerm(p.tenant_permission_id)}
                      disabled={inheritBusy || createMutation.isPending}
                    />
                    <span className="leading-snug">
                      <span className="font-medium">{p.name}</span>
                      {p.code ? (
                        <span className="ms-1 font-mono text-[10px] text-muted-foreground">
                          {p.code}
                        </span>
                      ) : null}
                    </span>
                  </label>
                ))}
                {(allPerms ?? []).length === 0 ? (
                  <p className="px-1 py-2 text-xs text-muted-foreground">
                    هنوز مجوزی در سازمان تعریف نشده است.
                  </p>
                ) : null}
              </div>
            </div>
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
            <Button type="submit" size="sm" disabled={createMutation.isPending || inheritBusy}>
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
