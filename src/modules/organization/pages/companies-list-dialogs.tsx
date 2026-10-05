/**
 * FE-ORG companies list — confirm + create/edit sheets (FINAL layout)
 */
"use client";

import { CircleHelp, Loader2 } from "lucide-react";
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
  Tooltip, TooltipContent, TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import {
  ENTITY_KIND_FIELD_LABEL, ENTITY_KIND_OPTIONS,
} from "../types";
import {
  confirmTitle, confirmBody, confirmActionLabel, displayName,
} from "./companies-list-helpers";
import type { useCompaniesListPage } from "./use-companies-list-page";

type Ctx = ReturnType<typeof useCompaniesListPage>;

export function CompaniesListDialogs({ c }: { c: Ctx }) {
  /** SME بدون multi_company: فقط عملیاتی. با multi_company: هر سه نقش (هلدینگ/حذفی هم). */
  const kindOptions = c.hasMultiCompany
    ? ENTITY_KIND_OPTIONS
    : ENTITY_KIND_OPTIONS.filter((o) => o.value === "OPERATING");

  /** ADR-ID-ORG-003 §3.2: پس از شرکت اصلی، والد اجباری است. */
  const parentRequired = c.hasMultiCompany && c.rows.length >= 1;
  const parentChoices = c.rows.filter((r) => r.is_active !== false);

  return (
    <>
      <Dialog open={!!c.confirm} onOpenChange={(o) => !o && !c.bulkBusy && c.setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{c.confirm ? confirmTitle(c.confirm.kind, c.confirm.count) : ""}</DialogTitle>
            <DialogDescription>
              {c.confirm ? confirmBody(c.confirm.kind, c.confirm.count) : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={c.bulkBusy} onClick={() => c.setConfirm(null)}>
              انصراف
            </Button>
            <Button
              type="button"
              variant={c.confirm?.kind === "delete" ? "destructive" : "default"}
              disabled={c.bulkBusy}
              onClick={() => c.confirm && void c.runBulk(c.confirm.kind, c.confirm.targets)}
            >
              {c.bulkBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : c.confirm ? (
                confirmActionLabel(c.confirm.kind)
              ) : (
                ""
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet
        open={c.createOpen}
        onOpenChange={(open) => {
          if (!open) {
            if (c.isDirty && !window.confirm("تغییرات ذخیره نشده. انصراف؟")) return;
            c.forceCloseCreate();
          } else {
            c.setCreateOpen(true);
          }
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
            <SheetTitle>شرکت جدید</SheetTitle>
          </SheetHeader>
          <form className="flex min-h-0 flex-1 flex-col" onSubmit={c.onCreate}>
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>کد *</Label>
                  <Input className="h-9" dir="ltr" {...c.form.register("code", { required: true })} />
                </div>
                <div className="space-y-1.5">
                  <Label>نام نمایشی *</Label>
                  <Input className="h-9" {...c.form.register("name", { required: true })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>نام حقوقی</Label>
                <Input className="h-9" {...c.form.register("legal_name")} />
              </div>
              <div className="space-y-1.5">
                <Label>نام تجاری</Label>
                <Input className="h-9" {...c.form.register("trade_name")} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>شماره ثبت</Label>
                  <Input className="h-9" dir="ltr" {...c.form.register("registration_number")} />
                </div>
                <div className="space-y-1.5">
                  <Label>کد اقتصادی</Label>
                  <Input className="h-9" dir="ltr" {...c.form.register("economic_code")} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>شناسه مالیاتی</Label>
                <Input className="h-9" dir="ltr" {...c.form.register("tax_identifier")} />
              </div>
              {parentRequired ? (
                <div className="space-y-1.5">
                  <Label>شرکت والد *</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm"
                    value={c.form.watch("parent_company_id") || ""}
                    onChange={(e) =>
                      c.form.setValue("parent_company_id", e.target.value, { shouldDirty: true })
                    }
                    required
                  >
                    <option value="">انتخاب شرکت والد…</option>
                    {parentChoices.map((p) => (
                      <option key={p.company_id} value={p.company_id}>
                        {displayName(p)}
                        {p.is_primary ? " (اصلی)" : ""}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    شرکت اصلی گروه ریشه است و جابه‌جا نمی‌شود. شرکت جدید باید زیر یک والد در همین
                    مستأجر ثبت شود.
                  </p>
                </div>
              ) : null}
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">{ENTITY_KIND_FIELD_LABEL}</legend>
                <div className="space-y-1.5">
                  {kindOptions.map((opt) => (
                    <label
                      key={opt.value}
                      className="flex cursor-pointer items-start gap-2 rounded-lg border border-border/80 px-3 py-2 hover:bg-muted/40"
                    >
                      <input
                        type="radio"
                        className="mt-1"
                        checked={c.selectedKind === opt.value}
                        onChange={() =>
                          c.form.setValue("entity_kind", opt.value, { shouldDirty: true })
                        }
                      />
                      <span className="min-w-0 flex-1 text-sm leading-snug">{opt.label}</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="mt-0.5 shrink-0 rounded-full p-0.5 text-muted-foreground hover:text-foreground"
                            aria-label={`راهنمای ${opt.label}`}
                            onClick={(e) => e.preventDefault()}
                          >
                            <CircleHelp className="h-3.5 w-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[16rem] text-right leading-relaxed">
                          {opt.tooltip}
                        </TooltipContent>
                      </Tooltip>
                    </label>
                  ))}
                </div>
                {c.selectedKind === "ELIMINATION" ? (
                  <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-900 dark:text-amber-200">
                    این نوع فقط برای اسناد حذف معاملات درون‌گروهی است. تراکنش روزمره
                    (فروش، خرید، انبار) روی آن ثبت نکنید؛ معمولاً تیم مالی مرکزی آن را می‌سازد.
                  </p>
                ) : null}
                {c.selectedKind === "CONSOLIDATION" ? (
                  <p className="rounded-md border border-border/80 bg-muted/40 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                    مناسب هلدینگ یا سطح گزارش تلفیقی. اگر این شرکت فعالیت عملیاتی دارد،
                    «شرکت عملیاتی» را انتخاب کنید.
                  </p>
                ) : null}
              </fieldset>
              <div className="flex items-center justify-between gap-2 rounded-lg border border-border/80 px-3 py-2">
                <Label>فعال</Label>
                <Switch
                  checked={c.form.watch("is_active")}
                  onCheckedChange={(v) => c.form.setValue("is_active", v, { shouldDirty: true })}
                />
              </div>
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
          if (!open) {
            if (c.isDirty && !window.confirm("تغییرات ذخیره نشده. انصراف؟")) return;
            c.forceCloseEdit();
          } else {
            c.setEditOpen(true);
          }
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
            <SheetTitle>ویرایش شرکت</SheetTitle>
          </SheetHeader>
          <form className="flex min-h-0 flex-1 flex-col" onSubmit={c.onEdit}>
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>کد *</Label>
                  <Input className="h-9" dir="ltr" {...c.form.register("code", { required: true })} />
                </div>
                <div className="space-y-1.5">
                  <Label>نام نمایشی *</Label>
                  <Input className="h-9" {...c.form.register("name", { required: true })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>نام حقوقی</Label>
                <Input className="h-9" {...c.form.register("legal_name")} />
              </div>
              <div className="space-y-1.5">
                <Label>نام تجاری</Label>
                <Input className="h-9" {...c.form.register("trade_name")} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>شماره ثبت</Label>
                  <Input className="h-9" dir="ltr" {...c.form.register("registration_number")} />
                </div>
                <div className="space-y-1.5">
                  <Label>کد اقتصادی</Label>
                  <Input className="h-9" dir="ltr" {...c.form.register("economic_code")} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>شناسه مالیاتی</Label>
                <Input className="h-9" dir="ltr" {...c.form.register("tax_identifier")} />
              </div>
              <div className="flex items-center justify-between gap-2 rounded-lg border border-border/80 px-3 py-2">
                <Label>فعال</Label>
                <Switch
                  checked={c.form.watch("is_active")}
                  onCheckedChange={(v) => c.form.setValue("is_active", v, { shouldDirty: true })}
                />
              </div>
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
