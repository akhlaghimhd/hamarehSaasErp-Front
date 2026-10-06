/**
 * Cost centers panel for company detail (v1.0 model).
 */
"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
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
import { ApiClientError } from "@/api";
import { toFaDigits } from "@/shared/lib/utils";
import { ShamsiDatePicker } from "@/shared/components/ui/shamsi-date-picker";
import { CollapsibleSection } from "./collapsible-section";
import {
  costCenterService,
  COST_CENTER_TYPES,
  type CostCenterDto,
} from "../services/org-extended-service";

const MSG_ERR = "انجام این کار ممکن نشد.";

type CcForm = {
  code: string;
  name: string;
  cost_center_type: string;
  parent_cost_center_id: string;
  description: string;
  valid_from: string;
  valid_to: string;
  is_active: boolean;
};

export function CostCentersPanel({
  companyId,
  readOnly = false,
}: {
  companyId: string;
  readOnly?: boolean;
}) {
  const qc = useQueryClient();
  const [ccOpen, setCcOpen] = useState(false);
  const [editingCc, setEditingCc] = useState<CostCenterDto | null>(null);
  const [pendingDeleteCc, setPendingDeleteCc] = useState<CostCenterDto | null>(null);
  const [deleteCcBusy, setDeleteCcBusy] = useState(false);

  const costCenters = useQuery({
    queryKey: ["org", "cost-centers", companyId],
    queryFn: () => costCenterService.list(companyId),
    enabled: !!companyId,
  });

  const ccForm = useForm<CcForm>({
    defaultValues: {
      code: "",
      name: "",
      cost_center_type: "ADMIN",
      parent_cost_center_id: "",
      description: "",
      valid_from: "",
      valid_to: "",
      is_active: true,
    },
  });

  useEffect(() => {
    if (!ccOpen) return;
    if (editingCc) {
      ccForm.reset({
        code: editingCc.code || "",
        name: editingCc.name || "",
        cost_center_type: editingCc.cost_center_type || "ADMIN",
        parent_cost_center_id: editingCc.parent_cost_center_id || "",
        description: editingCc.description || "",
        valid_from: editingCc.valid_from ? String(editingCc.valid_from).slice(0, 10) : "",
        valid_to: editingCc.valid_to ? String(editingCc.valid_to).slice(0, 10) : "",
        is_active: editingCc.is_active !== false,
      });
    } else {
      ccForm.reset({
        code: "",
        name: "",
        cost_center_type: "ADMIN",
        parent_cost_center_id: "",
        description: "",
        valid_from: "",
        valid_to: "",
        is_active: true,
      });
    }
  }, [ccOpen, editingCc, ccForm]);

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["org", "cost-centers", companyId] });

  const saveCc = useMutation({
    mutationFn: async (v: CcForm) => {
      if (!v.code.trim() || !v.name.trim()) {
        throw new Error("کد و نام الزامی است.");
      }
      const payload = {
        code: v.code.trim(),
        name: v.name.trim(),
        cost_center_type: v.cost_center_type || "ADMIN",
        parent_cost_center_id: v.parent_cost_center_id || null,
        description: v.description.trim() || null,
        valid_from: v.valid_from || null,
        valid_to: v.valid_to || null,
        is_active: v.is_active,
      };
      if (editingCc) {
        return costCenterService.update(editingCc.cost_center_id, payload);
      }
      return costCenterService.create(companyId, payload);
    },
    onSuccess: () => {
      toast.success(editingCc ? "مرکز هزینه به‌روز شد" : "مرکز هزینه ثبت شد");
      setCcOpen(false);
      setEditingCc(null);
      ccForm.reset();
      invalidate();
    },
    onError: (e: unknown) => {
      const msg =
        e instanceof ApiClientError
          ? e.message
          : e instanceof Error
            ? e.message
            : MSG_ERR;
      toast.error(msg || MSG_ERR);
    },
  });

  const deleteCc = useMutation({
    mutationFn: (id: string) => costCenterService.softDelete(id),
    onSuccess: () => {
      toast.success("مرکز هزینه حذف شد");
      invalidate();
    },
    onError: (e: unknown) => {
      const msg = e instanceof ApiClientError ? e.message : MSG_ERR;
      toast.error(msg || MSG_ERR);
    },
  });

  const rows = costCenters.data ?? [];
  const parentOptions = rows.filter(
    (c) => !editingCc || c.cost_center_id !== editingCc.cost_center_id
  );

  return (
    <>
      <CollapsibleSection
        id="cost-centers"
        title="مراکز هزینه"
        subtitle="بعد گزارشگری هزینه — مصرف در حسابداری/خرید/حقوق"
        count={rows.length}
        action={
          !readOnly ? (
            <Button
              type="button"
              size="sm"
              className="h-8 gap-1"
              onClick={() => {
                setEditingCc(null);
                setCcOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> مرکز هزینه
            </Button>
          ) : null
        }
      >
        {costCenters.isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <div className="py-5 text-center text-xs text-muted-foreground">
            مرکز هزینه ثبت نشده است.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-sm">
              <thead>
                <tr className="border-b bg-muted/30 text-xs text-muted-foreground">
                  <th className="px-2 py-1.5 text-start font-medium">کد</th>
                  <th className="px-2 py-1.5 text-start font-medium">نام</th>
                  <th className="px-2 py-1.5 text-start font-medium">نوع</th>
                  <th className="px-2 py-1.5 text-start font-medium">وضعیت</th>
                  {!readOnly ? (
                    <th className="border-s px-2 py-1.5 text-start font-medium w-[88px]">
                      عملیات
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => {
                  const typeLabel =
                    COST_CENTER_TYPES.find(
                      (t) => t.value === (c.cost_center_type || "ADMIN")
                    )?.label ??
                    c.cost_center_type ??
                    "—";
                  return (
                    <tr key={c.cost_center_id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-2 py-1.5 text-start">
                        <span className="inline-block font-mono text-xs tabular-nums" dir="ltr">
                          {toFaDigits(c.code)}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 text-start">{toFaDigits(c.name)}</td>
                      <td className="px-2 py-1.5 text-start text-xs text-muted-foreground">
                        {typeLabel}
                      </td>
                      <td className="px-2 py-1.5 text-start">
                        <StatusChip
                          label={c.is_active === false ? "غیرفعال" : "فعال"}
                          tone={c.is_active === false ? "warning" : "success"}
                        />
                      </td>
                      {!readOnly ? (
                        <td className="border-s px-2 py-1.5">
                          <div className="flex items-center gap-0.5">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => {
                                setEditingCc(c);
                                setCcOpen(true);
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={() => setPendingDeleteCc(c)}
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
          </div>
        )}
      </CollapsibleSection>

      <Sheet
        open={ccOpen}
        onOpenChange={(o) => {
          setCcOpen(o);
          if (!o) setEditingCc(null);
        }}
      >
        <SheetContent
          className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <SheetHeader className="border-b px-5 py-4">
            <SheetTitle>
              {editingCc ? "ویرایش مرکز هزینه" : "مرکز هزینه جدید"}
            </SheetTitle>
            <SheetDescription>
              کد یکتا در سطح شرکت؛ نوع و دوره اعتبار اختیاری است.
            </SheetDescription>
          </SheetHeader>
          <form
            className="flex flex-1 flex-col"
            onSubmit={ccForm.handleSubmit((v) => saveCc.mutate(v))}
          >
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>کد *</Label>
                  <Input
                    className="h-9 font-mono tabular-nums"
                    dir="rtl"
                    inputMode="text"
                    value={toFaDigits(ccForm.watch("code") || "")}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const map: Record<string, string> = {
                        "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
                        "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
                        "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
                        "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
                      };
                      let out = "";
                      for (const ch of raw) out += map[ch] ?? ch;
                      ccForm.setValue("code", out, { shouldDirty: true, shouldValidate: true });
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>نوع</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    {...ccForm.register("cost_center_type")}
                  >
                    {COST_CENTER_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>نام *</Label>
                <Input
                  className="h-9"
                  value={toFaDigits(ccForm.watch("name") || "")}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const map: Record<string, string> = {
                      "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
                      "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
                      "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
                      "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
                    };
                    let out = "";
                    for (const ch of raw) out += map[ch] ?? ch;
                    ccForm.setValue("name", out, { shouldDirty: true, shouldValidate: true });
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label>مرکز والد</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  {...ccForm.register("parent_cost_center_id")}
                >
                  <option value="">— بدون والد —</option>
                  {parentOptions.map((p) => (
                    <option key={p.cost_center_id} value={p.cost_center_id}>
                      {toFaDigits(p.code)} — {toFaDigits(p.name)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>توضیح</Label>
                <textarea
                  className="min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  {...ccForm.register("description")}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>اعتبار از</Label>
                  <ShamsiDatePicker
                    value={ccForm.watch("valid_from") || ""}
                    onChange={(iso) =>
                      ccForm.setValue("valid_from", iso, { shouldDirty: true })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>اعتبار تا</Label>
                  <ShamsiDatePicker
                    value={ccForm.watch("valid_to") || ""}
                    onChange={(iso) =>
                      ccForm.setValue("valid_to", iso, { shouldDirty: true })
                    }
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  {...ccForm.register("is_active")}
                />
                فعال است
              </label>
            </div>
            <SheetFooter className="border-t px-5 py-3">
              <Button type="button" variant="outline" onClick={() => setCcOpen(false)}>
                انصراف
              </Button>
              <Button type="submit" disabled={saveCc.isPending}>
                {saveCc.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "ذخیره"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <Dialog
        open={!!pendingDeleteCc}
        onOpenChange={(o) => {
          if (!o) setPendingDeleteCc(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>حذف مرکز هزینه</DialogTitle>
            <DialogDescription>
              {pendingDeleteCc
                ? `«${toFaDigits(pendingDeleteCc.name)}» (${toFaDigits(pendingDeleteCc.code)}) حذف نرم شود؟`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={deleteCcBusy}
              onClick={() => setPendingDeleteCc(null)}
            >
              انصراف
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteCcBusy}
              onClick={async () => {
                if (!pendingDeleteCc) return;
                setDeleteCcBusy(true);
                try {
                  await deleteCc.mutateAsync(pendingDeleteCc.cost_center_id);
                  setPendingDeleteCc(null);
                } finally {
                  setDeleteCcBusy(false);
                }
              }}
            >
              {deleteCcBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "حذف"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
