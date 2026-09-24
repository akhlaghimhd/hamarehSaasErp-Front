"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { StatusChip } from "@/shared/components/data-display/status-chip";
import { ApiClientError } from "@/api";
import {
  entityAddressService,
  entityContactService,
} from "../services/master-data-entity-service";

const MSG_ERR = "انجام این کار ممکن نشد.";

/** Law 5.1 — addresses/contacts owned by MasterData, scoped to COMPANY. */
export function CompanyAddressContactPanel({ companyId }: { companyId: string }) {
  const qc = useQueryClient();
  const [addrOpen, setAddrOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);

  const addrForm = useForm({
    defaultValues: { address_text: "", postal_code: "", is_primary: false },
  });
  const contactForm = useForm({
    defaultValues: {
      contact_type: "PHONE",
      contact_value: "",
      is_primary: false,
    },
  });

  const addresses = useQuery({
    queryKey: ["md", "addresses", "COMPANY", companyId],
    queryFn: () => entityAddressService.listForCompany(companyId),
    enabled: !!companyId,
  });
  const contacts = useQuery({
    queryKey: ["md", "contacts", "COMPANY", companyId],
    queryFn: () => entityContactService.listForCompany(companyId),
    enabled: !!companyId,
  });

  const createAddr = useMutation({
    mutationFn: (v: { address_text: string; postal_code?: string; is_primary?: boolean }) =>
      entityAddressService.createForCompany(companyId, v),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["md", "addresses", "COMPANY", companyId] });
      toast.success("آدرس ثبت شد");
      setAddrOpen(false);
      addrForm.reset();
    },
    onError: (e) =>
      toast.error(e instanceof ApiClientError && e.message ? e.message : MSG_ERR),
  });

  const deleteAddr = useMutation({
    mutationFn: (id: string) => entityAddressService.softDelete(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["md", "addresses", "COMPANY", companyId] });
      toast.success("آدرس حذف شد");
    },
    onError: (e) =>
      toast.error(e instanceof ApiClientError && e.message ? e.message : MSG_ERR),
  });

  const createContact = useMutation({
    mutationFn: (v: {
      contact_type: string;
      contact_value: string;
      is_primary?: boolean;
    }) => entityContactService.createForCompany(companyId, v),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["md", "contacts", "COMPANY", companyId] });
      toast.success("تماس ثبت شد");
      setContactOpen(false);
      contactForm.reset({ contact_type: "PHONE", contact_value: "", is_primary: false });
    },
    onError: (e) =>
      toast.error(e instanceof ApiClientError && e.message ? e.message : MSG_ERR),
  });

  const deleteContact = useMutation({
    mutationFn: (id: string) => entityContactService.softDelete(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["md", "contacts", "COMPANY", companyId] });
      toast.success("تماس حذف شد");
    },
    onError: (e) =>
      toast.error(e instanceof ApiClientError && e.message ? e.message : MSG_ERR),
  });

  return (
    <div className="space-y-8">
      <section id="addresses" className="scroll-mt-20 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold">آدرس‌ها</h2>
            <p className="text-[11px] text-muted-foreground">
              منبع حقیقت: Master Data · entity_type=COMPANY
            </p>
          </div>
          <Button size="sm" onClick={() => setAddrOpen(true)}>
            <Plus className="h-4 w-4" /> آدرس
          </Button>
        </div>
        {addresses.isLoading ? (
          <div className="flex gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> بارگذاری…
          </div>
        ) : null}
        <ul className="divide-y rounded-xl border">
          {(addresses.data ?? []).map((a) => (
            <li
              key={a.entity_address_id}
              className="flex flex-wrap items-start justify-between gap-2 px-4 py-3 text-sm"
            >
              <div>
                <div>{a.address_text}</div>
                {a.postal_code ? (
                  <div className="font-mono text-xs text-muted-foreground" dir="ltr">
                    {a.postal_code}
                  </div>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                {a.is_primary ? <StatusChip label="اصلی" tone="warning" /> : null}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-destructive"
                  onClick={() => {
                    if (!window.confirm("آدرس حذف شود؟")) return;
                    deleteAddr.mutate(a.entity_address_id);
                  }}
                >
                  حذف
                </Button>
              </div>
            </li>
          ))}
          {!addresses.isLoading && (addresses.data ?? []).length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-muted-foreground">آدرسی نیست</li>
          ) : null}
        </ul>
      </section>

      <section id="contacts" className="scroll-mt-20 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold">نقاط تماس</h2>
            <p className="text-[11px] text-muted-foreground">
              تلفن، ایمیل، فکس — Master Data
            </p>
          </div>
          <Button size="sm" onClick={() => setContactOpen(true)}>
            <Plus className="h-4 w-4" /> تماس
          </Button>
        </div>
        {contacts.isLoading ? (
          <div className="flex gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> بارگذاری…
          </div>
        ) : null}
        <ul className="divide-y rounded-xl border">
          {(contacts.data ?? []).map((c) => (
            <li
              key={c.contact_point_id}
              className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
            >
              <div>
                <span className="font-mono text-xs" dir="ltr">
                  {c.contact_type}
                </span>{" "}
                <span dir="ltr">{c.contact_value}</span>
              </div>
              <div className="flex items-center gap-2">
                {c.is_primary ? <StatusChip label="اصلی" tone="warning" /> : null}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-destructive"
                  onClick={() => {
                    if (!window.confirm("تماس حذف شود؟")) return;
                    deleteContact.mutate(c.contact_point_id);
                  }}
                >
                  حذف
                </Button>
              </div>
            </li>
          ))}
          {!contacts.isLoading && (contacts.data ?? []).length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-muted-foreground">تماسی نیست</li>
          ) : null}
        </ul>
      </section>

      <Dialog open={addrOpen} onOpenChange={setAddrOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>آدرس جدید</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={addrForm.handleSubmit((v) =>
              createAddr.mutate({
                address_text: v.address_text.trim(),
                postal_code: v.postal_code.trim() || undefined,
                is_primary: v.is_primary,
              })
            )}
          >
            <div className="space-y-1.5">
              <Label>متن آدرس *</Label>
              <Input className="h-9" {...addrForm.register("address_text", { required: true })} />
            </div>
            <div className="space-y-1.5">
              <Label>کد پستی</Label>
              <Input className="h-9" dir="ltr" {...addrForm.register("postal_code")} />
            </div>
            <div className="flex items-center justify-between gap-2">
              <Label>آدرس اصلی</Label>
              <Switch
                checked={addrForm.watch("is_primary")}
                onCheckedChange={(v) => addrForm.setValue("is_primary", v)}
              />
            </div>
            <DialogFooter>
              <Button type="submit" size="sm" disabled={createAddr.isPending}>
                {createAddr.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "ثبت"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={contactOpen} onOpenChange={setContactOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>نقطه تماس جدید</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={contactForm.handleSubmit((v) =>
              createContact.mutate({
                contact_type: v.contact_type,
                contact_value: v.contact_value.trim(),
                is_primary: v.is_primary,
              })
            )}
          >
            <div className="space-y-1.5">
              <Label>نوع</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                {...contactForm.register("contact_type")}
              >
                <option value="PHONE">تلفن</option>
                <option value="MOBILE">موبایل</option>
                <option value="EMAIL">ایمیل</option>
                <option value="FAX">فکس</option>
                <option value="WEBSITE">وب‌سایت</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>مقدار *</Label>
              <Input
                className="h-9"
                dir="ltr"
                {...contactForm.register("contact_value", { required: true })}
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <Label>اصلی</Label>
              <Switch
                checked={contactForm.watch("is_primary")}
                onCheckedChange={(v) => contactForm.setValue("is_primary", v)}
              />
            </div>
            <DialogFooter>
              <Button type="submit" size="sm" disabled={createContact.isPending}>
                {createContact.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "ثبت"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
