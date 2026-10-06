/**
 * Legal officers panel (company detail).
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
import { Switch } from "@/shared/components/ui/switch";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/shared/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { StatusChip } from "@/shared/components/data-display/status-chip";
import { ApiClientError, apiPut } from "@/api";
import { toFaDigits, formatJalaliDate, formatPercent } from "@/shared/lib/utils";
import { ShamsiDatePicker } from "@/shared/components/ui/shamsi-date-picker";
import { CollapsibleSection } from "./collapsible-section";
import { officerService, ownershipService, type OfficerDto, type OwnershipDto } from "../services/org-extended-service";
import { organizationPaths } from "../services/paths";

const MSG = "انجام این کار ممکن نشد.";
const ROLES = [
  { value: "CHAIRMAN", label: "رئیس هیئت‌مدیره" },
  { value: "VICE_CHAIRMAN", label: "نایب‌رئیس هیئت‌مدیره" },
  { value: "BOARD_MEMBER", label: "عضو هیئت‌مدیره" },
  { value: "CEO", label: "مدیرعامل" },
  { value: "INSPECTOR", label: "بازرس اصلی" },
  { value: "ALT_INSPECTOR", label: "بازرس علی‌البدل" },
  { value: "OTHER", label: "سایر" },
] as const;
const ROLE_L: Record<string, string> = Object.fromEntries(ROLES.map((x) => [x.value, x.label]));

function asciiDigits(raw: string): string {
  const m: Record<string, string> = {"۰":"0","۱":"1","۲":"2","۳":"3","۴":"4","۵":"5","۶":"6","۷":"7","۸":"8","۹":"9","٠":"0","١":"1","٢":"2","٣":"3","٤":"4","٥":"5","٦":"6","٧":"7","٨":"8","٩":"9"};
  return Array.from(raw).map((c) => m[c] ?? c).filter((c) => c >= "0" && c <= "9").join("");
}

export function CompanyOfficerPanels({ companyId, readOnly = false }: { companyId: string; readOnly?: boolean }) {
  const qc = useQueryClient();
  const [officerOpen, setOfficerOpen] = useState(false);
  const [editOff, setEditOff] = useState<OfficerDto | null>(null);
  const [delOff, setDelOff] = useState<OfficerDto | null>(null);
  const [busy, setBusy] = useState(false);

  const offsQ = useQuery({ queryKey: ["org", "officers", companyId], queryFn: () => officerService.list(companyId), enabled: !!companyId });
  const ownsQ = useQuery({ queryKey: ["org", "ownerships", companyId], queryFn: () => ownershipService.list(companyId), enabled: !!companyId });
  const offForm = useForm({ defaultValues: { role_code: "CEO", role_title: "", full_name: "", national_id: "", ownership_id: "", has_signing_authority: false, mandate_from: "", mandate_to: "", is_active: true } });

  useEffect(() => {
    if (!officerOpen) return;
    if (editOff) {
      offForm.reset({
        role_code: editOff.role_code || "CEO",
        role_title: editOff.role_title || editOff.title || "",
        full_name: editOff.full_name || "",
        national_id: editOff.national_id || "",
        ownership_id: editOff.ownership_id || "",
        has_signing_authority: !!editOff.has_signing_authority,
        mandate_from: editOff.mandate_from ? String(editOff.mandate_from).slice(0, 10) : "",
        mandate_to: editOff.mandate_to ? String(editOff.mandate_to).slice(0, 10) : "",
        is_active: editOff.is_active !== false,
      });
    } else {
      offForm.reset({ role_code: "CEO", role_title: "", full_name: "", national_id: "", ownership_id: "", has_signing_authority: false, mandate_from: "", mandate_to: "", is_active: true });
    }
  }, [officerOpen, editOff, offForm]);

  const saveOff = useMutation({
    mutationFn: async (v: { role_code: string; role_title: string; full_name: string; national_id: string; ownership_id: string; has_signing_authority: boolean; mandate_from: string; mandate_to: string; is_active: boolean }) => {
      if (!v.full_name.trim()) throw new Error("نام مقام الزامی است.");
      if (v.role_code === "OTHER" && !v.role_title.trim()) throw new Error("عنوان نقش سایر الزامی است.");
      const payload = {
        role_code: v.role_code,
        role_title: v.role_code === "OTHER" ? v.role_title.trim() : undefined,
        full_name: v.full_name.trim(),
        national_id: asciiDigits(v.national_id) || undefined,
        ownership_id: v.ownership_id || null,
        has_signing_authority: v.has_signing_authority,
        mandate_from: v.mandate_from || null,
        mandate_to: v.mandate_to || null,
        is_active: v.is_active,
      };
      if (editOff) return apiPut(organizationPaths.officer(editOff.officer_id), payload);
      return officerService.create(companyId, payload);
    },
    onSuccess: () => {
      toast.success(editOff ? "مقام به‌روز شد" : "مقام ثبت شد");
      setOfficerOpen(false);
      setEditOff(null);
      qc.invalidateQueries({ queryKey: ["org", "officers", companyId] });
    },
    onError: (e: unknown) => toast.error(e instanceof ApiClientError ? e.message : e instanceof Error ? e.message : MSG),
  });

  const delOffM = useMutation({
    mutationFn: (id: string) => officerService.softDelete(id),
    onSuccess: () => { toast.success("مقام حذف شد"); qc.invalidateQueries({ queryKey: ["org", "officers", companyId] }); },
    onError: () => toast.error(MSG),
  });

  return (
    <>
      <CollapsibleSection id="officers" title="مقامات حقوقی شرکت" subtitle="هیئت‌مدیره، مدیرعامل و بازرسان" count={(offsQ.data ?? []).length}
        actions={!readOnly ? <Button type="button" size="sm" className="h-8 gap-1" onClick={() => { setEditOff(null); setOfficerOpen(true); }}><Plus className="h-4 w-4" /> مقام</Button> : null}>
        {offsQ.isLoading ? <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          : (offsQ.data ?? []).length === 0 ? <div className="py-5 text-center text-xs text-muted-foreground">مقام حقوقی ثبت نشده است.</div>
          : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse text-sm">
                <thead><tr className="border-b bg-muted/30 text-xs text-muted-foreground">
                  <th className="px-2 py-1.5 text-start font-medium">نقش</th>
                  <th className="px-2 py-1.5 text-start font-medium">نام</th>
                  <th className="px-2 py-1.5 text-start font-medium">سهامدار</th>
                  <th className="px-2 py-1.5 text-start font-medium">حق امضا</th>
                  <th className="px-2 py-1.5 text-start font-medium">دوره</th>
                  {!readOnly ? <th className="border-s px-2 py-1.5 text-start font-medium w-[88px]">عملیات</th> : null}
                </tr></thead>
                <tbody>
                  {(offsQ.data ?? []).map((o) => {
                    const role = o.role_code === "OTHER" ? (o.role_title || o.title || "سایر") : (ROLE_L[o.role_code || ""] || o.role_code || "—");
                    const from = o.mandate_from ? formatJalaliDate(o.mandate_from) : "";
                    const to = o.mandate_to ? formatJalaliDate(o.mandate_to) : "";
                    const period = from || to ? `${from || "…"} تا ${to || "…"}` : "—";
                    const own = o.ownership;
                    const ownL = own ? `${own.owner_display_name || "سهامدار"}${own.ownership_percent != null ? ` (${formatPercent(Number(own.ownership_percent))}٪)` : ""}` : "—";
                    return (
                      <tr key={o.officer_id} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="px-2 py-1.5 text-start text-xs">{role}</td>
                        <td className="px-2 py-1.5 text-start"><span className="font-medium">{o.full_name}</span>{o.national_id ? <span className="ms-1 font-mono text-[10px] text-muted-foreground" dir="ltr">({toFaDigits(o.national_id)})</span> : null}</td>
                        <td className="px-2 py-1.5 text-start text-xs text-muted-foreground">{ownL}</td>
                        <td className="px-2 py-1.5 text-start">{o.has_signing_authority ? <StatusChip status="active" label="دارد" /> : "—"}</td>
                        <td className="px-2 py-1.5 text-start text-xs tabular-nums">{period}</td>
                        {!readOnly ? <td className="border-s px-2 py-1.5"><div className="flex gap-0.5">
                          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditOff(o); setOfficerOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDelOff(o)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div></td> : null}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
      </CollapsibleSection>

      <Sheet open={officerOpen} onOpenChange={(o) => { setOfficerOpen(o); if (!o) setEditOff(null); }}>
        <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
          <SheetHeader className="border-b px-5 py-4">
            <SheetTitle>{editOff ? "ویرایش مقام" : "مقام حقوقی جدید"}</SheetTitle>
          </SheetHeader>
          <form className="flex flex-1 flex-col" onSubmit={offForm.handleSubmit((v) => saveOff.mutate(v))}>
            <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
              <div className="space-y-1"><Label>نقش *</Label>
                <select className="h-9 w-full rounded-md border px-3 text-sm" {...offForm.register("role_code")}>
                  {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              {offForm.watch("role_code") === "OTHER" ? <div className="space-y-1"><Label>عنوان *</Label><Input className="h-9" {...offForm.register("role_title")} /></div> : null}
              <div className="space-y-1"><Label>نام *</Label><Input className="h-9" {...offForm.register("full_name", { required: true })} /></div>
              <div className="space-y-1"><Label>کد ملی</Label>
                <Input className="h-9 font-mono" dir="rtl" inputMode="numeric" value={toFaDigits(offForm.watch("national_id") || "")}
                  onChange={(e) => offForm.setValue("national_id", asciiDigits(e.target.value).slice(0, 10), { shouldDirty: true })} />
              </div>
              <div className="space-y-1"><Label>سهامدار</Label>
                <select className="h-9 w-full rounded-md border px-3 text-sm" {...offForm.register("ownership_id")}>
                  <option value="">—</option>
                  {(ownsQ.data ?? []).map((ow: OwnershipDto) => (
                    <option key={ow.ownership_id} value={ow.ownership_id}>{ow.owner_display_name || "سهامدار"} ({formatPercent(Number(ow.ownership_percent))}٪)</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1"><Label>شروع</Label><ShamsiDatePicker value={offForm.watch("mandate_from") || ""} onChange={(iso) => offForm.setValue("mandate_from", iso, { shouldDirty: true })} /></div>
                <div className="space-y-1"><Label>پایان</Label><ShamsiDatePicker value={offForm.watch("mandate_to") || ""} onChange={(iso) => offForm.setValue("mandate_to", iso, { shouldDirty: true })} /></div>
              </div>
              <div className="flex items-center justify-between rounded-md border px-3 py-2">
                <Label>حق امضا</Label>
                <Switch checked={offForm.watch("has_signing_authority")} onCheckedChange={(checked) => offForm.setValue("has_signing_authority", checked, { shouldDirty: true })} />
              </div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4" {...offForm.register("is_active")} /> سمت فعال است</label>
            </div>
            <SheetFooter className="border-t px-5 py-3">
              <Button type="button" variant="outline" onClick={() => setOfficerOpen(false)}>انصراف</Button>
              <Button type="submit" disabled={saveOff.isPending}>{saveOff.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "ذخیره"}</Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <Dialog open={!!delOff} onOpenChange={(o) => { if (!o) setDelOff(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>حذف مقام</DialogTitle><DialogDescription>{delOff ? `«${delOff.full_name}» حذف شود؟` : ""}</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDelOff(null)}>انصراف</Button>
            <Button type="button" variant="destructive" disabled={busy} onClick={async () => { if (!delOff) return; setBusy(true); try { await delOffM.mutateAsync(delOff.officer_id); setDelOff(null); } finally { setBusy(false); } }}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "حذف"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
