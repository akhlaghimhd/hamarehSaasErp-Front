/**
 * FE-ORG companies list — confirm + create/edit sheets
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/components/ui/select";
import {
  ENTITY_KIND_LABELS, ENTITY_KIND_FIELD_LABEL, ENTITY_KIND_OPTIONS,
} from "../types";
import {
  confirmTitle, confirmBody, confirmActionLabel,
} from "./companies-list-helpers";
import type { useCompaniesListPage } from "./use-companies-list-page";

type Ctx = ReturnType<typeof useCompaniesListPage>;

export function CompaniesListDialogs({ c }: { c: Ctx }) {
  return (
    <>
      <Dialog open={!!c.confirm} onOpenChange={(o) => !o && !c.bulkBusy && c.setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{c.confirm ? confirmTitle(c.confirm.kind, c.confirm.count) : ""}</DialogTitle>
            <DialogDescription>{c.confirm ? confirmBody(c.confirm.kind, c.confirm.count) : ""}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={c.bulkBusy} onClick={() => c.setConfirm(null)}>انصراف</Button>
            <Button type="button" variant={c.confirm?.kind === "delete" ? "destructive" : "default"} disabled={c.bulkBusy}
              onClick={() => c.confirm && void c.runBulk(c.confirm.kind, c.confirm.targets)}>
              {c.bulkBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : c.confirm ? confirmActionLabel(c.confirm.kind) : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={c.createOpen} onOpenChange={(o) => { if (!o) { if (c.isDirty && !window.confirm("تغییرات ذخیره نشده. انصراف؟")) return; c.forceCloseCreate(); } }}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader><SheetTitle>شرکت جدید</SheetTitle></SheetHeader>
          <form className="mt-4 space-y-3" onSubmit={c.onCreate}>
            <div className="space-y-1.5"><Label>کد *</Label><Input className="h-9" dir="ltr" {...c.form.register("code", { required: true })} /></div>
            <div className="space-y-1.5"><Label>نام نمایشی *</Label><Input className="h-9" {...c.form.register("name", { required: true })} /></div>
            <div className="space-y-1.5"><Label>نام حقوقی</Label><Input className="h-9" {...c.form.register("legal_name")} /></div>
            <div className="space-y-1.5"><Label>نام تجاری</Label><Input className="h-9" {...c.form.register("trade_name")} /></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5"><Label>شماره ثبت</Label><Input className="h-9" dir="ltr" {...c.form.register("registration_number")} /></div>
              <div className="space-y-1.5"><Label>کد اقتصادی</Label><Input className="h-9" dir="ltr" {...c.form.register("economic_code")} /></div>
            </div>
            <div className="space-y-1.5"><Label>شناسه مالیاتی</Label><Input className="h-9" dir="ltr" {...c.form.register("tax_identifier")} /></div>
            <div className="space-y-1.5">
              <Label>{ENTITY_KIND_FIELD_LABEL ?? "نوع"}</Label>
              <Select value={c.selectedKind} onValueChange={(v) => c.form.setValue("entity_kind", v, { shouldDirty: true })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(ENTITY_KIND_OPTIONS ?? Object.keys(ENTITY_KIND_LABELS)).map((k: string) => (
                    <SelectItem key={k} value={k}>{ENTITY_KIND_LABELS[k] ?? k}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between gap-2 rounded-lg border border-border/80 px-3 py-2">
              <Label>فعال</Label>
              <Switch checked={c.form.watch("is_active")} onCheckedChange={(v) => c.form.setValue("is_active", v, { shouldDirty: true })} />
            </div>
            <SheetFooter>
              <Button type="button" variant="outline" size="sm" onClick={c.forceCloseCreate}>انصراف</Button>
              <Button type="submit" size="sm" disabled={c.createMutation.isPending}>
                {c.createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "ایجاد"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <Sheet open={c.editOpen} onOpenChange={(o) => { if (!o) { if (c.isDirty && !window.confirm("تغییرات ذخیره نشده. انصراف؟")) return; c.forceCloseEdit(); } }}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader><SheetTitle>ویرایش شرکت</SheetTitle></SheetHeader>
          <form className="mt-4 space-y-3" onSubmit={c.onEdit}>
            <div className="space-y-1.5"><Label>کد *</Label><Input className="h-9" dir="ltr" {...c.form.register("code", { required: true })} /></div>
            <div className="space-y-1.5"><Label>نام نمایشی *</Label><Input className="h-9" {...c.form.register("name", { required: true })} /></div>
            <div className="space-y-1.5"><Label>نام حقوقی</Label><Input className="h-9" {...c.form.register("legal_name")} /></div>
            <div className="space-y-1.5"><Label>نام تجاری</Label><Input className="h-9" {...c.form.register("trade_name")} /></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5"><Label>شماره ثبت</Label><Input className="h-9" dir="ltr" {...c.form.register("registration_number")} /></div>
              <div className="space-y-1.5"><Label>کد اقتصادی</Label><Input className="h-9" dir="ltr" {...c.form.register("economic_code")} /></div>
            </div>
            <div className="space-y-1.5"><Label>شناسه مالیاتی</Label><Input className="h-9" dir="ltr" {...c.form.register("tax_identifier")} /></div>
            <div className="flex items-center justify-between gap-2 rounded-lg border border-border/80 px-3 py-2">
              <Label>فعال</Label>
              <Switch checked={c.form.watch("is_active")} onCheckedChange={(v) => c.form.setValue("is_active", v, { shouldDirty: true })} />
            </div>
            <SheetFooter>
              <Button type="button" variant="outline" size="sm" onClick={c.forceCloseEdit}>انصراف</Button>
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
