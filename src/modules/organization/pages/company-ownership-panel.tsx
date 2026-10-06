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
import { ApiClientError } from "@/api";
import { toFaDigits, toAsciiDigits, cn, formatPercent } from "@/shared/lib/utils";
import { CollapsibleSection } from "./collapsible-section";
import {
  ownershipService,
  type OwnershipDto,
} from "../services/org-extended-service";

const MSG = "انجام این کار ممکن نشد.";

const KIND_LABELS: Record<string, string> = {
  COMPANY: "شرکت گروه",
  EXTERNAL_PERSON: "شخص حقیقی",
  EXTERNAL_COMPANY: "شخص حقوقی",
};

const REL_LABELS: Record<string, string> = {
  EQUITY: "سهامی",
  CONTROL: "کنترلی",
  JOINT: "مشترک",
};

function ownerLabel(o: OwnershipDto, nameOf?: (id: string) => string): string {
  if (o.owner_kind === "COMPANY" && o.owner_company_id && nameOf) {
    return nameOf(o.owner_company_id) || o.owner_display_name || "شرکت";
  }
  return o.owner_display_name || "—";
}

export function CompanyOwnershipPanel({
  companyId,
  readOnly = false,
}: {
  companyId: string;
  readOnly?: boolean;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<OwnershipDto | null>(null);
  const [pendingDelete, setPendingDelete] = useState<OwnershipDto | null>(null);
  const [busy, setBusy] = useState(false);

  const list = useQuery({
    queryKey: ["org", "ownerships", companyId],
    queryFn: () => ownershipService.list(companyId),
    enabled: !!companyId,
  });

  const form = useForm({
    defaultValues: {
      owner_kind: "EXTERNAL_PERSON",
      owner_company_id: "",
      owner_display_name: "",
      owner_identifier: "",
      ownership_percent: "",
      relation_type: "EQUITY",
    },
  });

  const watchedKind = form.watch("owner_kind");
  const watchedPercent = form.watch("ownership_percent");

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
    return Math.max(0, 100 - used);
  }, [totalPercent, editing]);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      form.reset({
        owner_kind: editing.owner_kind || "EXTERNAL_PERSON",
        owner_company_id: editing.owner_company_id || "",
        owner_display_name: editing.owner_display_name || "",
        owner_identifier: editing.owner_identifier || "",
        ownership_percent: String(editing.ownership_percent ?? ""),
        relation_type: editing.relation_type || "EQUITY",
      });
    } else {
      form.reset({
        owner_kind: "EXTERNAL_PERSON",
        owner_company_id: "",
        owner_display_name: "",
        owner_identifier: "",
        ownership_percent: String(Math.min(10, remainPercent) || 1),
        relation_type: "EQUITY",
      });
    }
  }, [open, editing, form, remainPercent]);

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["org", "ownerships", companyId] });

  const save = useMutation({
    mutationFn: async (v: {
      owner_kind: string;
      owner_company_id: string;
      owner_display_name: string;
      owner_identifier: string;
      ownership_percent: string;
      relation_type: string;
    }) => {
      const pct = Number(toAsciiDigits(v.ownership_percent));
      if (!Number.isFinite(pct) || pct <= 0) {
        throw new Error("درصد مالکیت معتبر نیست.");
      }
      if (pct > remainPercent + 0.0001) {
        throw new Error(
          `جمع مالکیت از ۱۰۰٪ بیشتر می‌شود. باقی‌مانده: ${formatPercent(remainPercent)}٪`
        );
      }
      const payload = {
        owner_kind: v.owner_kind,
        owner_company_id: v.owner_kind === "COMPANY" ? v.owner_company_id || null : null,
        owner_display_name:
          v.owner_kind === "COMPANY"
            ? undefined
            : v.owner_display_name.trim() || undefined,
        owner_identifier: v.owner_identifier.trim() || undefined,
        ownership_percent: pct,
        relation_type: v.relation_type,
      };
      if (editing) {
        return ownershipService.update(editing.ownership_id, payload);
      }
      return ownershipService.create(companyId, payload);
    },
    onSuccess: () => {
      toast.success(editing ? "سهامدار به‌روز شد" : "سهامدار ثبت شد");
      setOpen(false);
      setEditing(null);
      invalidate();
    },
    onError: (e: unknown) => {
      toast.error(
        e instanceof ApiClientError
          ? e.message
          : e instanceof Error
            ? e.message
            : MSG
      );
    },
  });

  const del = useMutation({
    mutationFn: (id: string) => ownershipService.softDelete(id),
    onSuccess: () => {
      toast.success("سهامدار حذف شد");
      invalidate();
    },
    onError: () => toast.error(MSG),
  });

  const nameOf = (_id: string) => "";

  const totalTone =
    totalPercent > 100
      ? "text-destructive"
      : totalPercent >= 99.99
        ? "text-emerald-700 dark:text-emerald-400"
        : "text-muted-foreground";

  return (
    <>
      <CollapsibleSection
        id="ownerships"
        title="سهامداران"
        count={(list.data ?? []).length}
        subtitle={
          <span className={totalTone}>
            جمع ثبت‌شده: {formatPercent(totalPercent)}٪
            {totalPercent < 100
              ? ` · باقی‌مانده ${formatPercent(100 - totalPercent)}٪`
              : totalPercent > 100
                ? " · بیش از ۱۰۰٪ (اصلاح لازم)"
                : " · کامل"}
          </span>
        }
        action={
          readOnly ? (
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
          )
        }
      >
        {list.isLoading ? (
          <div className="flex gap-2 px-3 py-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> بارگذاری…
          </div>
        ) : null}

        <div className="overflow-hidden">
          {(list.data ?? []).length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-[11px] text-muted-foreground">
                  <th className="px-3 py-2 text-start font-medium">سهامدار</th>
                  <th className="hidden px-2 py-2 text-start font-medium sm:table-cell">
                    نوع
                  </th>
                  <th className="hidden px-2 py-2 text-start font-medium md:table-cell">
                    رابطه
                  </th>
                  <th className="px-2 py-2 text-end font-medium">درصد</th>
                  {!readOnly ? (
                    <th className="px-1 py-2 text-end font-medium">عملیات</th>
                  ) : null}
                </tr>
              </thead>
              <tbody className="divide-y">
                {(list.data ?? []).map((o) => {
                  const kind = o.owner_kind || "EXTERNAL_PERSON";
                  const isExt = kind !== "COMPANY";
                  return (
                    <tr key={o.ownership_id} className="hover:bg-muted/20">
                      <td className="px-3 py-2">
                        <div className="flex min-w-0 items-center gap-2">
                          {isExt ? (
                            <User className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                          ) : (
                            <Building2 className="h-3.5 w-3.5 shrink-0 text-primary" />
                          )}
                          <div className="min-w-0">
                            <div className="truncate font-medium">
                              {ownerLabel(o, nameOf)}
                            </div>
                            {o.owner_identifier ? (
                              <div
                                dir="ltr"
                                className="font-mono text-[10px] text-muted-foreground"
                              >
                                {toFaDigits(o.owner_identifier)}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="hidden px-2 py-2 text-[11px] text-muted-foreground sm:table-cell">
                        {KIND_LABELS[kind] ?? kind}
                      </td>
                      <td className="hidden px-2 py-2 text-[11px] text-muted-foreground md:table-cell">
                        {REL_LABELS[o.relation_type ?? "EQUITY"] ??
                          o.relation_type}
                      </td>
                      <td className="px-2 py-2 text-end tabular-nums font-medium">
                        {formatPercent(o.ownership_percent)}٪
                      </td>
                      {!readOnly ? (
                        <td className="px-1 py-2 text-end">
                          <div className="inline-flex">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
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
                              className="h-7 w-7 p-0 text-destructive"
                              onClick={() => setPendingDelete(o)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : !list.isLoading ? (
            <div className="py-5 text-center text-xs text-muted-foreground">
              سهامداری ثبت نشده است.
            </div>
          ) : null}
        </div>
      </CollapsibleSection>

      <Sheet open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
        <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
          <SheetHeader className="border-b px-5 py-4">
            <SheetTitle>{editing ? "ویرایش سهامدار" : "سهامدار جدید"}</SheetTitle>
            <SheetDescription>
              حداکثر قابل ثبت الان: {formatPercent(remainPercent)}٪
            </SheetDescription>
          </SheetHeader>
          <form
            className="flex flex-1 flex-col"
            onSubmit={form.handleSubmit((v) => save.mutate(v))}
          >
            <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
              <div className="space-y-1.5">
                <Label>نوع سهامدار</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={watchedKind}
                  onChange={(e) =>
                    form.setValue("owner_kind", e.target.value, {
                      shouldDirty: true,
                    })
                  }
                >
                  <option value="EXTERNAL_PERSON">شخص حقیقی</option>
                  <option value="EXTERNAL_COMPANY">شخص حقوقی</option>
                  <option value="COMPANY">شرکت گروه</option>
                </select>
              </div>

              {watchedKind === "COMPANY" ? null : (
                <>
                  <div className="space-y-1.5">
                    <Label>
                      {watchedKind === "EXTERNAL_PERSON"
                        ? "نام و نام خانوادگی *"
                        : "نام شخص حقوقی *"}
                    </Label>
                    <Input
                      className="h-9"
                      value={toFaDigits(form.watch("owner_display_name") || "")}
                      onChange={(e) =>
                        form.setValue(
                          "owner_display_name",
                          toAsciiDigits(e.target.value),
                          { shouldDirty: true }
                        )
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>
                      {watchedKind === "EXTERNAL_PERSON"
                        ? "کد ملی (اختیاری)"
                        : "شناسه ملی / شماره ثبت (اختیاری)"}
                    </Label>
                    <Input
                      className="h-9 font-mono tabular-nums"
                      dir="rtl"
                      inputMode="text"
                      maxLength={20}
                      value={toFaDigits(form.watch("owner_identifier") || "")}
                      onChange={(e) =>
                        form.setValue(
                          "owner_identifier",
                          toAsciiDigits(e.target.value).slice(0, 20),
                          { shouldDirty: true }
                        )
                      }
                    />
                  </div>
                </>
              )}

              <div className="space-y-1.5">
                <Label>درصد مالکیت *</Label>
                <Input
                  className="h-9 font-mono tabular-nums"
                  dir="rtl"
                  inputMode="decimal"
                  value={toFaDigits(form.watch("ownership_percent") || "")}
                  onChange={(e) => {
                    const raw = toAsciiDigits(e.target.value).replace(
                      /[^0-9.]/g,
                      ""
                    );
                    const parts = raw.split(".");
                    const cleaned =
                      parts.length <= 1
                        ? raw
                        : `${parts[0]}.${parts.slice(1).join("")}`;
                    form.setValue("ownership_percent", cleaned, {
                      shouldDirty: true,
                    });
                  }}
                />
                <p className="text-[11px] text-muted-foreground">
                  حداکثر قابل ثبت الان: {formatPercent(remainPercent)}٪
                  {watchedPercent &&
                  Number(toAsciiDigits(watchedPercent)) >
                    remainPercent + 0.0001 ? (
                    <span className="text-destructive"> — بیش از باقی‌مانده</span>
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
            <SheetFooter className="border-t px-5 py-3">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
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

      <Dialog
        open={!!pendingDelete}
        onOpenChange={(o) => {
          if (!o) setPendingDelete(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>حذف سهامدار</DialogTitle>
            <DialogDescription>
              {pendingDelete
                ? `«${ownerLabel(pendingDelete, nameOf)}» با ${formatPercent(pendingDelete.ownership_percent)}٪ حذف شود؟`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPendingDelete(null)}
            >
              انصراف
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={busy}
              onClick={async () => {
                if (!pendingDelete) return;
                setBusy(true);
                try {
                  await del.mutateAsync(pendingDelete.ownership_id);
                  setPendingDelete(null);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "حذف"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
