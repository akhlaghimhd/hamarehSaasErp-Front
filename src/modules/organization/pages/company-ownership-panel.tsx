"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, Loader2, Pencil, Plus, Trash2, User } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { StatusChip } from "@/shared/components/data-display/status-chip";
import { ApiClientError, apiPut } from "@/api";
import { toFaDigits, cn } from "@/shared/lib/utils";
import {
  ownershipService,
  type OwnershipDto,
} from "../services/org-extended-service";
import { organizationPaths } from "../services/paths";
import { useCompanies } from "../hooks/use-companies";

type OwnerKind = "COMPANY" | "EXTERNAL_PERSON" | "EXTERNAL_ORG";

type FormV = {
  owner_kind: OwnerKind;
  owner_company_id: string;
  owner_display_name: string;
  owner_identifier: string;
  ownership_percent: string;
  relation_type: string;
};

const REL_LABELS: Record<string, string> = {
  EQUITY: "سهامی",
  CONTROL: "کنترلی",
  JOINT: "مشترک",
};

const KIND_LABELS: Record<OwnerKind, string> = {
  COMPANY: "شرکت داخل پلتفرم",
  EXTERNAL_PERSON: "شخص حقیقی (خارج از پلتفرم)",
  EXTERNAL_ORG: "شخص حقوقی (خارج از پلتفرم)",
};

function ownerLabel(
  o: OwnershipDto,
  nameOf: (id: string) => string
): string {
  const kind = (o.owner_kind || "COMPANY") as OwnerKind;
  if (kind === "COMPANY" && o.owner_company_id) {
    return nameOf(o.owner_company_id);
  }
  return o.owner_display_name || "سهامدار خارجی";
}

export function CompanyOwnershipPanel({
  companyId,
  readOnly = false,
}: {
  companyId: string;
  readOnly?: boolean;
}) {
  const qc = useQueryClient();
  const { data: companies } = useCompanies();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<OwnershipDto | null>(null);
  const [pendingDelete, setPendingDelete] = useState<OwnershipDto | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const form = useForm<FormV>({
    defaultValues: {
      owner_kind: "COMPANY",
      owner_company_id: "",
      owner_display_name: "",
      owner_identifier: "",
      ownership_percent: "10",
      relation_type: "EQUITY",
    },
  });
  const { isDirty } = form.formState;
  const watchedKind = form.watch("owner_kind");
  const watchedPercent = form.watch("ownership_percent");

  const list = useQuery({
    queryKey: ["org", "ownerships", companyId],
    queryFn: () => ownershipService.list(companyId),
    enabled: !!companyId,
  });

  const totalPercent = useMemo(() => {
    return (list.data ?? []).reduce(
      (s, o) => s + Number(o.ownership_percent || 0),
      0
    );
  }, [list.data]);

  const remainPercent = useMemo(() => {
    let used = totalPercent;
    if (editing) {
      used -= Number(editing.ownership_percent || 0);
    }
    return Math.max(0, Math.round((100 - used) * 10000) / 10000);
  }, [totalPercent, editing]);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      const kind = (editing.owner_kind || "COMPANY") as OwnerKind;
      form.reset({
        owner_kind: kind,
        owner_company_id: editing.owner_company_id || "",
        owner_display_name: editing.owner_display_name || "",
        owner_identifier: editing.owner_identifier || "",
        ownership_percent: String(editing.ownership_percent),
        relation_type: editing.relation_type ?? "EQUITY",
      });
    } else {
      form.reset({
        owner_kind: "COMPANY",
        owner_company_id: "",
        owner_display_name: "",
        owner_identifier: "",
        ownership_percent: String(Math.min(10, remainPercent) || 1),
        relation_type: "EQUITY",
      });
    }
  }, [open, editing, form, remainPercent]);

  const nameOf = (id: string) =>
    (companies ?? []).find((c) => c.company_id === id)?.legal_name ||
    (companies ?? []).find((c) => c.company_id === id)?.name ||
    id.slice(0, 8);

  const save = useMutation({
    mutationFn: async (v: FormV) => {
      const pct = Number(v.ownership_percent);
      if (!(pct > 0) || pct > 100) {
        throw new Error("درصد باید بیشتر از ۰ و حداکثر ۱۰۰ باشد.");
      }
      if (pct > remainPercent + 0.0001) {
        throw new Error(
          `جمع مالکیت از ۱۰۰٪ بیشتر می‌شود. باقی‌مانده: ${toFaDigits(remainPercent)}٪`
        );
      }
      const kind = v.owner_kind;
      const payload: Record<string, unknown> = {
        owner_kind: kind,
        ownership_percent: pct,
        relation_type: v.relation_type || "EQUITY",
      };
      if (kind === "COMPANY") {
        if (!v.owner_company_id) throw new Error("شرکت مالک را انتخاب کنید.");
        payload.owner_company_id = v.owner_company_id;
        payload.owner_display_name = null;
        payload.owner_identifier = null;
      } else {
        const name = v.owner_display_name.trim();
        if (!name) throw new Error("نام سهامدار خارجی الزامی است.");
        payload.owner_company_id = null;
        payload.owner_display_name = name;
        payload.owner_identifier = v.owner_identifier.trim() || null;
      }
      if (editing) {
        await apiPut(organizationPaths.ownership(editing.ownership_id), payload);
        return;
      }
      await ownershipService.create(companyId, payload as never);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["org", "ownerships", companyId] });
      toast.success(editing ? "مالکیت به‌روز شد" : "مالکیت ثبت شد");
      setOpen(false);
      setEditing(null);
      form.reset();
    },
    onError: (e) =>
      toast.error(
        e instanceof ApiClientError && e.message
          ? e.message
          : e instanceof Error
            ? e.message
            : "خطا"
      ),
  });

  const handleOpen = (next: boolean) => {
    if (!next) {
      form.reset();
      setEditing(null);
    }
    setOpen(next);
  };

  const runDelete = async () => {
    if (!pendingDelete) return;
    setDeleteBusy(true);
    try {
      await ownershipService.softDelete(pendingDelete.ownership_id);
      void qc.invalidateQueries({ queryKey: ["org", "ownerships", companyId] });
      toast.success("مالکیت حذف شد");
      setPendingDelete(null);
    } catch (e) {
      toast.error(
        e instanceof ApiClientError && e.message ? e.message : "خطا در حذف"
      );
    } finally {
      setDeleteBusy(false);
    }
  };

  const totalTone =
    totalPercent > 100
      ? "text-destructive"
      : totalPercent >= 99.99
        ? "text-emerald-700 dark:text-emerald-400"
        : "text-muted-foreground";

  return (
    <section id="ownerships" className="scroll-mt-20 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">سهامداران</h2>
          <p className={cn("text-[11px]", totalTone)}>
            جمع ثبت‌شده: {toFaDigits(Number(totalPercent.toFixed(2)))}٪
            {totalPercent < 100
              ? ` · باقی‌مانده ${toFaDigits(Number((100 - totalPercent).toFixed(2)))}٪`
              : totalPercent > 100
                ? " · بیش از ۱۰۰٪ (اصلاح لازم)"
                : " · کامل"}
          </p>
        </div>
        {readOnly ? (
          <p className="text-xs text-amber-700 dark:text-amber-400">
            ثبت غیرفعال
          </p>
        ) : (
          <Button
            size="sm"
            disabled={remainPercent <= 0 && !editing}
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> سهامدار
          </Button>
        )}
      </div>

      {list.isLoading ? (
        <div className="flex gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> بارگذاری…
        </div>
      ) : null}

      <div className="grid gap-2">
        {(list.data ?? []).map((o) => {
          const kind = (o.owner_kind || "COMPANY") as OwnerKind;
          const isExt = kind !== "COMPANY";
          return (
            <div
              key={o.ownership_id}
              className="flex items-center gap-3 rounded-xl border border-border/80 bg-card px-3 py-2.5"
            >
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                  isExt
                    ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                    : "bg-primary/10 text-primary"
                )}
              >
                {isExt ? (
                  <User className="h-4 w-4" />
                ) : (
                  <Building2 className="h-4 w-4" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">
                  {ownerLabel(o, nameOf)}
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span>{KIND_LABELS[kind] ?? kind}</span>
                  <span>·</span>
                  <span>
                    {REL_LABELS[o.relation_type ?? "EQUITY"] ?? o.relation_type}
                  </span>
                  {o.owner_identifier ? (
                    <>
                      <span>·</span>
                      <span dir="ltr" className="font-mono">
                        {toFaDigits(o.owner_identifier)}
                      </span>
                    </>
                  ) : null}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <StatusChip
                  label={`${toFaDigits(o.ownership_percent)}٪`}
                  tone="neutral"
                />
                {!readOnly ? (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => {
                        setEditing(o);
                        setOpen(true);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive"
                      onClick={() => setPendingDelete(o)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
          );
        })}
        {!list.isLoading && (list.data ?? []).length === 0 ? (
          <div className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
            سهامداری ثبت نشده است.
          </div>
        ) : null}
      </div>

      <Dialog
        open={!!pendingDelete}
        onOpenChange={(o) => {
          if (!o && !deleteBusy) setPendingDelete(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>حذف سهامدار</DialogTitle>
            <DialogDescription>
              {pendingDelete
                ? `«${ownerLabel(pendingDelete, nameOf)}» با ${toFaDigits(pendingDelete.ownership_percent)}٪ حذف شود؟`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={deleteBusy}
              onClick={() => setPendingDelete(null)}
            >
              انصراف
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteBusy}
              onClick={() => void runDelete()}
            >
              {deleteBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "حذف"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={open && !readOnly} onOpenChange={handleOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 overflow-hidden sm:max-w-md"
          onInteractOutside={(e) => {
            if (isDirty) e.preventDefault();
          }}
          onPointerDownOutside={(e) => {
            if (isDirty) e.preventDefault();
          }}
        >
          <SheetHeader>
            <SheetTitle>
              {editing ? "ویرایش سهامدار" : "سهامدار جدید"}
            </SheetTitle>
            <SheetDescription>
              شرکت داخل پلتفرم یا شخص حقیقی/حقوقی خارج از سیستم — بدون ساخت
              کاربر یا شرکت
            </SheetDescription>
          </SheetHeader>
          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={form.handleSubmit((v) => save.mutate(v))}
          >
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              <div className="space-y-1.5">
                <Label>نوع سهامدار *</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={watchedKind}
                  onChange={(e) => {
                    form.setValue("owner_kind", e.target.value as OwnerKind, {
                      shouldDirty: true,
                    });
                  }}
                >
                  <option value="COMPANY">شرکت داخل پلتفرم</option>
                  <option value="EXTERNAL_PERSON">
                    شخص حقیقی (خارج از پلتفرم)
                  </option>
                  <option value="EXTERNAL_ORG">
                    شخص حقوقی (خارج از پلتفرم)
                  </option>
                </select>
              </div>

              {watchedKind === "COMPANY" ? (
                <div className="space-y-1.5">
                  <Label>شرکت مالک *</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    {...form.register("owner_company_id")}
                  >
                    <option value="">— انتخاب —</option>
                    {(companies ?? [])
                      .filter((c) => c.company_id !== companyId)
                      .map((c) => (
                        <option key={c.company_id} value={c.company_id}>
                          {c.legal_name || c.name}
                        </option>
                      ))}
                  </select>
                </div>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <Label>
                      {watchedKind === "EXTERNAL_PERSON"
                        ? "نام و نام خانوادگی *"
                        : "نام شخص حقوقی *"}
                    </Label>
                    <Input
                      className="h-9"
                      {...form.register("owner_display_name")}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>
                      {watchedKind === "EXTERNAL_PERSON"
                        ? "کد ملی (اختیاری)"
                        : "شناسه ملی / شماره ثبت (اختیاری)"}
                    </Label>
                    <Input
                      className="h-9 font-mono"
                      dir="ltr"
                      maxLength={20}
                      {...form.register("owner_identifier")}
                    />
                  </div>
                </>
              )}

              <div className="space-y-1.5">
                <Label>درصد مالکیت *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min={0.01}
                  max={remainPercent || 100}
                  className="h-9"
                  dir="ltr"
                  {...form.register("ownership_percent", { required: true })}
                />
                <p className="text-[11px] text-muted-foreground">
                  حداکثر قابل ثبت الان: {toFaDigits(remainPercent)}٪
                  {watchedPercent &&
                  Number(watchedPercent) > remainPercent + 0.0001 ? (
                    <span className="ms-1 text-destructive">
                      (از سقف بیشتر است)
                    </span>
                  ) : null}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label>نوع رابطه</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  {...form.register("relation_type")}
                >
                  <option value="EQUITY">سهامی</option>
                  <option value="CONTROL">کنترلی</option>
                  <option value="JOINT">مشترک</option>
                </select>
              </div>
            </div>
            <SheetFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpen(false)}
              >
                انصراف
              </Button>
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "ذخیره"
                )}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </section>
  );
}
