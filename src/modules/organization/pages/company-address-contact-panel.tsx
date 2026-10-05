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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";
import { StatusChip } from "@/shared/components/data-display/status-chip";
import { ApiClientError, apiPut } from "@/api";
import { toFaDigits } from "@/shared/lib/utils";
import {
  entityAddressService,
  entityContactService,
  type EntityAddressDto,
  type EntityContactDto,
} from "../services/master-data-entity-service";

const MSG_ERR = "انجام این کار ممکن نشد.";
const MD = "/master-data";

const CONTACT_TYPE_LABELS: Record<string, string> = {
  PHONE: "تلفن",
  MOBILE: "موبایل",
  EMAIL: "ایمیل",
  FAX: "فکس",
  WEBSITE: "وب‌سایت",
};

type AddrForm = {
  address_text: string;
  postal_code: string;
  is_primary: boolean;
};
type ContactForm = {
  contact_type: string;
  contact_value: string;
  is_primary: boolean;
};

/** Law 5.1 — addresses/contacts owned by MasterData, scoped to COMPANY. */
export function CompanyAddressContactPanel({
  companyId,
  readOnly = false,
}: {
  companyId: string;
  readOnly?: boolean;
}) {
  const qc = useQueryClient();
  const [addrOpen, setAddrOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [editingAddr, setEditingAddr] = useState<EntityAddressDto | null>(null);
  const [editingContact, setEditingContact] = useState<EntityContactDto | null>(
    null
  );

  const addrForm = useForm<AddrForm>({
    defaultValues: { address_text: "", postal_code: "", is_primary: false },
  });
  const contactForm = useForm<ContactForm>({
    defaultValues: {
      contact_type: "PHONE",
      contact_value: "",
      is_primary: false,
    },
  });
  const { isDirty: addrDirty } = addrForm.formState;
  const { isDirty: contactDirty } = contactForm.formState;

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

  useEffect(() => {
    if (!addrOpen) return;
    if (editingAddr) {
      addrForm.reset({
        address_text: editingAddr.address_text ?? "",
        postal_code: editingAddr.postal_code ?? "",
        is_primary: Boolean(editingAddr.is_primary),
      });
    } else {
      addrForm.reset({ address_text: "", postal_code: "", is_primary: false });
    }
  }, [addrOpen, editingAddr, addrForm]);

  useEffect(() => {
    if (!contactOpen) return;
    if (editingContact) {
      contactForm.reset({
        contact_type: editingContact.contact_type || "PHONE",
        contact_value: editingContact.contact_value ?? "",
        is_primary: Boolean(editingContact.is_primary),
      });
    } else {
      contactForm.reset({
        contact_type: "PHONE",
        contact_value: "",
        is_primary: false,
      });
    }
  }, [contactOpen, editingContact, contactForm]);

  const saveAddr = useMutation({
    mutationFn: async (v: AddrForm) => {
      const payload = {
        address_text: v.address_text.trim(),
        postal_code: v.postal_code.trim() || undefined,
        is_primary: v.is_primary,
      };
      if (editingAddr) {
        await apiPut(`${MD}/entity-addresses/${editingAddr.entity_address_id}`, {
          entity_type: "COMPANY",
          entity_id: companyId,
          ...payload,
        });
        return;
      }
      await entityAddressService.createForCompany(companyId, payload);
    },
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: ["md", "addresses", "COMPANY", companyId],
      });
      toast.success(editingAddr ? "آدرس به‌روز شد" : "آدرس ثبت شد");
      setAddrOpen(false);
      setEditingAddr(null);
      addrForm.reset();
    },
    onError: (e) =>
      toast.error(
        e instanceof ApiClientError && e.message ? e.message : MSG_ERR
      ),
  });

  const deleteAddr = useMutation({
    mutationFn: (id: string) => entityAddressService.softDelete(id),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: ["md", "addresses", "COMPANY", companyId],
      });
      toast.success("آدرس حذف شد");
    },
    onError: (e) =>
      toast.error(
        e instanceof ApiClientError && e.message ? e.message : MSG_ERR
      ),
  });

  const saveContact = useMutation({
    mutationFn: async (v: ContactForm) => {
      const payload = {
        contact_type: v.contact_type,
        contact_value: v.contact_value.trim(),
        is_primary: v.is_primary,
      };
      if (editingContact) {
        await apiPut(
          `${MD}/entity-contact-points/${editingContact.contact_point_id}`,
          {
            entity_type: "COMPANY",
            entity_id: companyId,
            ...payload,
          }
        );
        return;
      }
      await entityContactService.createForCompany(companyId, payload);
    },
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: ["md", "contacts", "COMPANY", companyId],
      });
      toast.success(editingContact ? "تماس به‌روز شد" : "تماس ثبت شد");
      setContactOpen(false);
      setEditingContact(null);
      contactForm.reset({
        contact_type: "PHONE",
        contact_value: "",
        is_primary: false,
      });
    },
    onError: (e) =>
      toast.error(
        e instanceof ApiClientError && e.message ? e.message : MSG_ERR
      ),
  });

  const deleteContact = useMutation({
    mutationFn: (id: string) => entityContactService.softDelete(id),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: ["md", "contacts", "COMPANY", companyId],
      });
      toast.success("تماس حذف شد");
    },
    onError: (e) =>
      toast.error(
        e instanceof ApiClientError && e.message ? e.message : MSG_ERR
      ),
  });

  const openNewAddr = () => {
    setEditingAddr(null);
    setAddrOpen(true);
  };
  const openEditAddr = (a: EntityAddressDto) => {
    setEditingAddr(a);
    setAddrOpen(true);
  };
  const openNewContact = () => {
    setEditingContact(null);
    setContactOpen(true);
  };
  const openEditContact = (c: EntityContactDto) => {
    setEditingContact(c);
    setContactOpen(true);
  };

  const handleAddrOpen = (next: boolean) => {
    if (!next) {
      addrForm.reset();
      setEditingAddr(null);
    }
    setAddrOpen(next);
  };
  const handleContactOpen = (next: boolean) => {
    if (!next) {
      contactForm.reset();
      setEditingContact(null);
    }
    setContactOpen(next);
  };

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
          {readOnly ? (
            <p className="text-xs text-amber-700 dark:text-amber-400">
              ثبت غیرفعال (شرکت حذف‌شده/غیرفعال)
            </p>
          ) : (
            <Button size="sm" onClick={openNewAddr}>
              <Plus className="h-4 w-4" /> آدرس
            </Button>
          )}
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
                <div>{toFaDigits(a.address_text)}</div>
                {a.postal_code ? (
                  <div className="font-mono text-xs text-muted-foreground">
                    {toFaDigits(a.postal_code)}
                  </div>
                ) : null}
              </div>
              <div className="flex items-center gap-1">
                {a.is_primary ? (
                  <StatusChip label="اصلی" tone="warning" />
                ) : null}
                {!readOnly ? (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8"
                      onClick={() => openEditAddr(a)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-destructive"
                      onClick={() => {
                        if (!window.confirm("آدرس حذف شود؟")) return;
                        deleteAddr.mutate(a.entity_address_id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </>
                ) : null}
              </div>
            </li>
          ))}
          {!addresses.isLoading && (addresses.data ?? []).length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-muted-foreground">
              آدرسی نیست
            </li>
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
          {readOnly ? (
            <p className="text-xs text-amber-700 dark:text-amber-400">
              ثبت غیرفعال (شرکت حذف‌شده/غیرفعال)
            </p>
          ) : (
            <Button size="sm" onClick={openNewContact}>
              <Plus className="h-4 w-4" /> تماس
            </Button>
          )}
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
                <span className="text-xs text-muted-foreground">
                  {CONTACT_TYPE_LABELS[c.contact_type] ?? c.contact_type}
                </span>{" "}
                <span dir="ltr">{toFaDigits(c.contact_value)}</span>
              </div>
              <div className="flex items-center gap-1">
                {c.is_primary ? (
                  <StatusChip label="اصلی" tone="warning" />
                ) : null}
                {!readOnly ? (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8"
                      onClick={() => openEditContact(c)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-destructive"
                      onClick={() => {
                        if (!window.confirm("تماس حذف شود؟")) return;
                        deleteContact.mutate(c.contact_point_id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </>
                ) : null}
              </div>
            </li>
          ))}
          {!contacts.isLoading && (contacts.data ?? []).length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-muted-foreground">
              تماسی نیست
            </li>
          ) : null}
        </ul>
      </section>

      <Sheet open={addrOpen && !readOnly} onOpenChange={handleAddrOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-md"
          onInteractOutside={(e) => {
            if (addrDirty) e.preventDefault();
          }}
          onPointerDownOutside={(e) => {
            if (addrDirty) e.preventDefault();
          }}
        >
          <SheetHeader className="space-y-1.5 pb-4">
            <SheetTitle>{editingAddr ? "ویرایش آدرس" : "آدرس جدید"}</SheetTitle>
            <SheetDescription>آدرس پستی شرکت</SheetDescription>
          </SheetHeader>
          <form
            className="flex flex-1 flex-col gap-4"
            onSubmit={addrForm.handleSubmit((v) => saveAddr.mutate(v))}
          >
            <div className="space-y-1.5">
              <Label>متن آدرس *</Label>
              <Input
                className="h-9"
                {...addrForm.register("address_text", { required: true })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>کد پستی</Label>
              <Input
                className="h-9"
                dir="ltr"
                {...addrForm.register("postal_code")}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
              <Label>آدرس اصلی</Label>
              <Switch
                checked={addrForm.watch("is_primary")}
                onCheckedChange={(v) =>
                  addrForm.setValue("is_primary", v, { shouldDirty: true })
                }
              />
            </div>
            <SheetFooter className="mt-auto gap-2 border-t pt-4 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleAddrOpen(false)}
              >
                انصراف
              </Button>
              <Button type="submit" disabled={saveAddr.isPending}>
                {saveAddr.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "ذخیره"
                )}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <Sheet open={contactOpen && !readOnly} onOpenChange={handleContactOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-md"
          onInteractOutside={(e) => {
            if (contactDirty) e.preventDefault();
          }}
          onPointerDownOutside={(e) => {
            if (contactDirty) e.preventDefault();
          }}
        >
          <SheetHeader className="space-y-1.5 pb-4">
            <SheetTitle>
              {editingContact ? "ویرایش نقطه تماس" : "نقطه تماس جدید"}
            </SheetTitle>
            <SheetDescription>تلفن، موبایل، ایمیل یا فکس</SheetDescription>
          </SheetHeader>
          <form
            className="flex flex-1 flex-col gap-4"
            onSubmit={contactForm.handleSubmit((v) => saveContact.mutate(v))}
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
            <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
              <Label>اصلی</Label>
              <Switch
                checked={contactForm.watch("is_primary")}
                onCheckedChange={(v) =>
                  contactForm.setValue("is_primary", v, { shouldDirty: true })
                }
              />
            </div>
            <SheetFooter className="mt-auto gap-2 border-t pt-4 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleContactOpen(false)}
              >
                انصراف
              </Button>
              <Button type="submit" disabled={saveContact.isPending}>
                {saveContact.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "ذخیره"
                )}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
