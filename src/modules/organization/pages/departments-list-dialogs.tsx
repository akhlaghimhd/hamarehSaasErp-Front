/**
 * FE-ORG departments list — confirm dialogs + create/edit sheets (FINAL)
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
import { toFaDigits } from "@/shared/lib/utils";
import type { useDepartmentsListPage } from "./use-departments-list-page";

type Ctx = ReturnType<typeof useDepartmentsListPage>;

function FormFields({ c }: { c: Ctx }) {
  const { form, editing, companyList, formCompanyId, formBranches } = c;
  return (
    <div className="space-y-4">
      {companyList.length === 1 ? (
        <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          شرکت:{" "}
          <span className="font-medium text-foreground">
            {companyList[0].legal_name || companyList[0].name}
          </span>
        </div>
      ) : (
        <div className="space-y-1.5">
          <Label htmlFor="dept-company">شرکت *</Label>
          <select
            id="dept-company"
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={form.watch("company_id")}
            disabled={Boolean(editing)}
            onChange={(e) => {
              form.setValue("company_id", e.target.value, { shouldDirty: true });
              form.setValue("branch_id", "", { shouldDirty: true });
            }}
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
      )}

      {formBranches.length === 1 ? (
        <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          شعبه: <span className="font-medium text-foreground">{formBranches[0].name}</span>
          <span className="ms-1">(تنها شعبه — خودکار)</span>
        </div>
      ) : (
        <div className="space-y-1.5">
          <Label htmlFor="dept-branch">شعبه *</Label>
          <select
            id="dept-branch"
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            {...form.register("branch_id", { required: true })}
            disabled={!formCompanyId}
          >
            <option value="">— انتخاب شعبه —</option>
            {formBranches.map((b) => (
              <option key={b.branch_id} value={b.branch_id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      )}

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
      <div className="flex items-center justify-between gap-2 rounded-lg border p-3">
        <Label>فعال</Label>
        <Switch
          checked={form.watch("is_active")}
          onCheckedChange={(v) => form.setValue("is_active", v, { shouldDirty: true })}
        />
      </div>
    </div>
  );
}

export function DepartmentsListDialogs({ c }: { c: Ctx }) {
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
                ? `${toFaDigits(c.confirmBulk.targets.length)} واحد انتخاب‌شده تحت تأثیر قرار می‌گیرند.`
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
            <DialogTitle>تأیید حذف واحد</DialogTitle>
            <DialogDescription>
              {c.confirmDelete
                ? `واحد «${c.confirmDelete.name}» حذف می‌شود و بعداً از فهرست حذف‌شده‌ها قابل بازگردانی است.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => c.setConfirmDelete(null)}>انصراف</Button>
            <Button type="button" variant="destructive" onClick={() => void c.doDelete()}>حذف</Button>
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
            <SheetTitle>واحد جدید</SheetTitle>
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
            <SheetTitle>ویرایش واحد</SheetTitle>
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
