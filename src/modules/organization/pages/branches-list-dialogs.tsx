/**
 * FE-ORG branches list — confirm dialogs + create/edit sheets (FINAL)
 */
"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
import {
  Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle,
} from "@/shared/components/ui/sheet";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/shared/components/ui/dialog";
import { BRANCH_KIND_LABELS } from "../types";
import type { useBranchesListPage } from "./use-branches-list-page";
import { toFaDigits } from "@/shared/lib/utils";

type Ctx = ReturnType<typeof useBranchesListPage>;

function FormFields({ c }: { c: Ctx }) {
  const { form, editing, companyList, formCompanyId, parentBranchOptions } = c;
  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="branch-company">شرکت *</Label>
        <select
          id="branch-company"
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          {...form.register("company_id", { required: true })}
          disabled={Boolean(editing)}
        >
          <option value="">— انتخاب شرکت —</option>
          {companyList.map((co) => (
            <option key={co.company_id} value={co.company_id}>
              {co.legal_name || co.name}
              {co.is_primary ? " (اصلی)" : ""}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>کد *</Label>
          <Input className="h-9" dir="ltr" {...form.register("code", { required: true })} />
        </div>
        <div className="space-y-1.5">
          <Label>نام *</Label>
          <Input className="h-9" {...form.register("name", { required: true })} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>آدرس</Label>
        <Input className="h-9" {...form.register("address")} />
      </div>
      <div className="space-y-1.5">
        <Label>نوع شعبه</Label>
        <select
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          {...form.register("branch_kind")}
        >
          {Object.entries(BRANCH_KIND_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label>شعبه والد</Label>
        <select
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={form.watch("parent_branch_id") || ""}
          onChange={(e) => form.setValue("parent_branch_id", e.target.value, { shouldDirty: true })}
          disabled={!formCompanyId}
        >
          <option value="">— بدون والد —</option>
          {parentBranchOptions.map((b) => (
            <option key={b.branch_id} value={b.branch_id}>
              {b.name} ({b.code})
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label>انبار پیش‌فرض (شناسه اختیاری)</Label>
        <Input
          className="h-9 font-mono text-xs"
          dir="ltr"
          placeholder="UUID انبار"
          {...form.register("default_warehouse_id")}
        />
      </div>
      <div className="space-y-3 rounded-lg border p-3">
        <div className="flex items-center justify-between gap-2">
          <Label>فعال</Label>
          <Switch
            checked={form.watch("is_active")}
            onCheckedChange={(v) => form.setValue("is_active", v, { shouldDirty: true })}
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <Label>ارسال کالا</Label>
          <Switch
            checked={form.watch("supports_shipping")}
            onCheckedChange={(v) => form.setValue("supports_shipping", v, { shouldDirty: true })}
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <Label>دریافت کالا</Label>
          <Switch
            checked={form.watch("supports_receiving")}
            onCheckedChange={(v) => form.setValue("supports_receiving", v, { shouldDirty: true })}
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <Label>سایت تولید</Label>
          <Switch
            checked={form.watch("is_manufacturing_site")}
            onCheckedChange={(v) => form.setValue("is_manufacturing_site", v, { shouldDirty: true })}
          />
        </div>
      </div>
    </div>
  );
}

export function BranchesListDialogs({ c }: { c: Ctx }) {
  return (
    <>
      <Dialog open={!!c.confirmBulk} onOpenChange={(o) => !o && !c.bulkBusy && c.setConfirmBulk(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {c.confirmBulk?.kind === "delete"
                ? "تأیید حذف گروهی"
                : c.confirmBulk?.kind === "restore"
                  ? "تأیید بازگردانی گروهی"
                  : c.confirmBulk?.kind === "activate"
                    ? "تأیید فعال‌سازی گروهی"
                    : "تأیید غیرفعال‌سازی گروهی"}
            </DialogTitle>
            <DialogDescription>
              {c.confirmBulk
                ? `${toFaDigits(c.confirmBulk.targets.length)} شعبه انتخاب‌شده تحت تأثیر قرار می‌گیرند.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={c.bulkBusy} onClick={() => c.setConfirmBulk(null)}>
              انصراف
            </Button>
            <Button
              type="button"
              variant={c.confirmBulk?.kind === "delete" ? "destructive" : "default"}
              disabled={c.bulkBusy}
              onClick={() => c.confirmBulk && void c.runBulk(c.confirmBulk.kind, c.confirmBulk.targets)}
            >
              {c.bulkBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "تأیید"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!c.confirmDelete} onOpenChange={(o) => !o && c.setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تأیید حذف شعبه</DialogTitle>
            <DialogDescription>
              {c.confirmDelete
                ? `شعبه «${c.confirmDelete.name}» حذف می‌شود و بعداً از فهرست حذف‌شده‌ها قابل بازگردانی است.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => c.setConfirmDelete(null)}>انصراف</Button>
            <Button type="button" variant="destructive" onClick={() => void c.doDelete()}>حذف</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!c.confirmStatus} onOpenChange={(o) => !o && !c.rowBusyId && c.setConfirmStatus(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {c.confirmStatus?.active ? "تأیید فعال‌سازی" : "تأیید غیرفعال‌سازی"}
            </DialogTitle>
            <DialogDescription>
              {c.confirmStatus
                ? `شعبه «${c.confirmStatus.row.name}» ${c.confirmStatus.active ? "فعال" : "غیرفعال"} می‌شود.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={Boolean(c.rowBusyId)} onClick={() => c.setConfirmStatus(null)}>
              انصراف
            </Button>
            <Button
              type="button"
              disabled={Boolean(c.rowBusyId) || !c.confirmStatus}
              onClick={() => c.confirmStatus && void c.runSetActive(c.confirmStatus.row, c.confirmStatus.active)}
            >
              {c.rowBusyId ? <Loader2 className="h-4 w-4 animate-spin" /> : "تأیید"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet
        open={c.createOpen}
        onOpenChange={(open) => {
          if (!open) c.forceCloseCreate();
          else c.setCreateOpen(true);
        }}
      >
        <SheetContent
          className="flex w-full flex-col sm:max-w-lg"
          side="right"
          onInteractOutside={(e) => {
            if (c.isDirty) e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (c.isDirty) e.preventDefault();
          }}
        >
          <SheetHeader>
            <SheetTitle>شعبه جدید</SheetTitle>
          </SheetHeader>
          <form className="flex min-h-0 flex-1 flex-col" onSubmit={c.onCreate}>
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              <FormFields c={c} />
            </div>
            <SheetFooter>
              <Button type="button" variant="outline" size="sm" onClick={c.forceCloseCreate}>
                انصراف
              </Button>
              <Button type="submit" size="sm" disabled={c.createMutation.isPending}>
                {c.createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "ثبت"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <Sheet
        open={c.editOpen}
        onOpenChange={(open) => {
          if (!open) c.forceCloseEdit();
          else c.setEditOpen(true);
        }}
      >
        <SheetContent
          className="flex w-full flex-col sm:max-w-lg"
          side="right"
          onInteractOutside={(e) => {
            if (c.isDirty) e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (c.isDirty) e.preventDefault();
          }}
        >
          <SheetHeader>
            <SheetTitle>ویرایش شعبه</SheetTitle>
          </SheetHeader>
          <form className="flex min-h-0 flex-1 flex-col" onSubmit={c.onEdit}>
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              <FormFields c={c} />
            </div>
            <SheetFooter>
              <Button type="button" variant="outline" size="sm" onClick={c.forceCloseEdit}>
                انصراف
              </Button>
              <Button type="submit" size="sm" disabled={c.updateMutation.isPending}>
                {c.updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "ذخیره"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}
