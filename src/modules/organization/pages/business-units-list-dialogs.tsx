/**
 * FE-ORG business units — create/edit sheet, assign sheet, confirm dialogs (FINAL)
 */
"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
import { Checkbox } from "@/shared/components/ui/checkbox";
import {
  Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle,
} from "@/shared/components/ui/sheet";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/shared/components/ui/dialog";
import { toFaDigits } from "@/shared/lib/utils";
import type { useBusinessUnitsListPage } from "./use-business-units-list-page";

type Ctx = ReturnType<typeof useBusinessUnitsListPage>;

function resolveCompanyLabel(
  id: string,
  companyList: Ctx["companies"],
  assignTarget: Ctx["assignTarget"]
): string {
  const fromList = companyList.find((x) => x.company_id === id);
  if (fromList) return (fromList.legal_name || fromList.name || "").trim() || id;
  const fromAssign = assignTarget?.company_assignments?.find((a) => a.company_id === id);
  if (fromAssign) {
    const n = (fromAssign.company?.legal_name || fromAssign.company?.name || "").trim();
    if (n) return n;
  }
  return id;
}

export function BusinessUnitsListDialogs({ c }: { c: Ctx }) {
  const companyList = c.companies;

  return (
    <>
      <Sheet open={c.sheetOpen} onOpenChange={c.setSheetOpen}>
        <SheetContent side="right" className="flex w-full flex-col sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{c.editing ? "ویرایش واحد کسب‌وکار" : "واحد کسب‌وکار جدید"}</SheetTitle>
          </SheetHeader>
          <form className="flex flex-1 flex-col" onSubmit={c.form.handleSubmit(c.submitForm)}>
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>کد *</Label>
                  <Input dir="ltr" className="h-9" {...c.form.register("code", { required: true })} />
                </div>
                <div className="space-y-1.5">
                  <Label>نام *</Label>
                  <Input className="h-9" {...c.form.register("name", { required: true })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>توضیح</Label>
                <Input className="h-9" {...c.form.register("description")} />
              </div>
              <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <Label>فعال</Label>
                <Switch
                  checked={c.form.watch("is_active")}
                  onCheckedChange={(v) => c.form.setValue("is_active", !!v)}
                />
              </div>
            </div>
            <SheetFooter className="gap-2 border-t px-5 py-3">
              <Button type="button" variant="outline" onClick={() => c.setSheetOpen(false)}>
                انصراف
              </Button>
              <Button type="submit" disabled={c.busy || !c.canManage}>
                {c.busy ? <Loader2 className="h-4 w-4 animate-spin" /> : c.editing ? "ذخیره" : "ثبت"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <Sheet open={c.assignOpen} onOpenChange={c.setAssignOpen}>
        <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
          <SheetHeader>
            <SheetTitle>
              {c.assignTarget
                ? `مدیریت اتصال «${c.assignTarget.name}»`
                : c.assignTargets.length > 1
                  ? `اتصال / انفصال ${toFaDigits(c.assignTargets.length)} واحد`
                  : c.assignTargets.length === 1
                    ? `اتصال / انفصال «${c.assignTargets[0].name}»`
                    : "اتصال شرکت"}
            </SheetTitle>
          </SheetHeader>
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-5 py-4">
            {!c.assignTarget && c.assignTargets.length > 0 ? (
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={c.bulkLinkMode === "connect" ? "default" : "outline"}
                  onClick={() => c.setBulkLinkMode("connect")}
                >
                  اتصال
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={c.bulkLinkMode === "disconnect" ? "default" : "outline"}
                  onClick={() => c.setBulkLinkMode("disconnect")}
                >
                  انفصال
                </Button>
              </div>
            ) : null}
            <div className="space-y-2">
              {companyList.map((co) => {
                const id = co.company_id;
                const checked = c.selectedCompanyIds.has(id);
                return (
                  <label
                    key={id}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-border/80 px-3 py-2 hover:bg-muted/40"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(v) => {
                        c.setSelectedCompanyIds((prev) => {
                          const n = new Set(prev);
                          if (v) n.add(id);
                          else {
                            n.delete(id);
                            if (c.primaryCompanyId === id) c.setPrimaryCompanyId("");
                          }
                          return n;
                        });
                      }}
                    />
                    <span className="flex-1 truncate text-sm">{co.legal_name || co.name}</span>
                    {co.is_primary ? (
                      <span className="shrink-0 text-[10px] text-muted-foreground">شرکت اصلی</span>
                    ) : null}
                  </label>
                );
              })}
            </div>
            {c.selectedCompanyIds.size > 0 ? (
              <div className="space-y-1.5">
                <Label>شرکت اصلی (اختیاری)</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={
                    c.primaryCompanyId && c.selectedCompanyIds.has(c.primaryCompanyId)
                      ? c.primaryCompanyId
                      : ""
                  }
                  onChange={(e) => c.setPrimaryCompanyId(e.target.value)}
                >
                  <option value="">— بدون تغییر / خودکار —</option>
                  {[...c.selectedCompanyIds].map((id) => (
                    <option key={id} value={id}>
                      {resolveCompanyLabel(id, companyList, c.assignTarget)}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>
          <SheetFooter className="gap-2 border-t px-5 py-3">
            <Button type="button" variant="outline" onClick={() => c.setAssignOpen(false)}>
              انصراف
            </Button>
            <Button
              type="button"
              disabled={c.busy || !c.canManage}
              onClick={() => void c.submitAssign()}
            >
              {c.busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "اعمال"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Dialog open={!!c.confirm} onOpenChange={(o) => !o && c.setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {c.confirm?.kind === "delete"
                ? "تأیید حذف"
                : c.confirm?.kind === "restore"
                  ? "تأیید بازگردانی"
                  : c.confirm?.kind === "activate"
                    ? "تأیید فعال‌سازی"
                    : "تأیید غیرفعال‌سازی"}
            </DialogTitle>
            <DialogDescription>
              {c.confirm
                ? `${toFaDigits(c.confirm.targets.length)} واحد تحت تأثیر قرار می‌گیرند.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={c.busy} onClick={() => c.setConfirm(null)}>
              انصراف
            </Button>
            <Button
              type="button"
              variant={c.confirm?.kind === "delete" ? "destructive" : "default"}
              disabled={c.busy}
              onClick={() => void c.runBulk()}
            >
              {c.busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "تأیید"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!c.linkConfirm} onOpenChange={(o) => !o && c.setLinkConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {c.linkConfirm?.kind === "leave_all"
                ? "قطع همهٔ اتصالات"
                : c.linkConfirm?.kind === "swap_primary"
                  ? "تغییر شرکت اصلی"
                  : "قطع شرکت اصلی"}
            </DialogTitle>
            <DialogDescription>
              {c.linkConfirm?.kind === "leave_all"
                ? "با این کار همهٔ اتصالات این واحد قطع می‌شود و دیگر شرکت اصلی نخواهد داشت. ادامه می‌دهید؟"
                : c.linkConfirm?.kind === "swap_primary"
                  ? "شرکت اصلی فعلی قطع می‌شود و شرکت انتخاب‌شده به‌عنوان اصلی جدید ثبت می‌شود. ادامه می‌دهید؟"
                  : c.linkConfirm?.kind === "bulk_disconnect_primary"
                    ? (() => {
                        const names = c.linkConfirm.names;
                        const sample = names.slice(0, 5).join("، ");
                        const more =
                          names.length > 5 ? ` و ${toFaDigits(names.length - 5)} مورد دیگر` : "";
                        return `برای ${toFaDigits(names.length)} واحد، شرکت اصلی در حال قطع است (${sample}${more}). ادامه می‌دهید؟`;
                      })()
                    : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => c.setLinkConfirm(null)}>
              انصراف
            </Button>
            <Button
              disabled={c.busy}
              onClick={() => {
                c.setLinkConfirm(null);
                void c.submitAssign({ skipLinkConfirm: true });
              }}
            >
              {c.busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "تأیید"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
