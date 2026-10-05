"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  Globe,
  Loader2,
  Mail,
  Pencil,
  Phone,
  Plus,
  Smartphone,
  Trash2,
} from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { StatusChip } from "@/shared/components/data-display/status-chip";
import { ApiClientError, apiPut } from "@/api";
import { toFaDigits, cn } from "@/shared/lib/utils";
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

/** ترتیب نمایش کشوهای نوع تماس */
const CONTACT_TYPE_ORDER = ["MOBILE", "PHONE", "EMAIL", "FAX", "WEBSITE"] as const;

function contactTypeIcon(type: string) {
  const t = (type || "").toUpperCase();
  if (t === "MOBILE") return Smartphone;
  if (t === "PHONE" || t === "FAX") return Phone;
  if (t === "EMAIL") return Mail;
  if (t === "WEBSITE") return Globe;
  return Phone;
}

function contactTypeTone(type: string): string {
  const t = (type || "").toUpperCase();
  if (t === "MOBILE") return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
  if (t === "PHONE") return "bg-sky-500/10 text-sky-700 dark:text-sky-400";
  if (t === "FAX") return "bg-violet-500/10 text-violet-700 dark:text-violet-400";
  if (t === "EMAIL") return "bg-amber-500/10 text-amber-800 dark:text-amber-400";
  if (t === "WEBSITE") return "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400";
  return "bg-muted text-muted-foreground";
}

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

type PendingDelete =
  | { kind: "address"; id: string; label: string }
  | { kind: "contact"; id: string; label: string }
  | null;

function errMsg(e: unknown): string {
  if (e instanceof ApiClientError && e.message) return e.message;
  if (e instanceof Error && e.message) return e.message;
  return MSG_ERR;
}

function toAsciiDigits(raw: string): string {
  const map: Record<string, string> = {
    "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
    "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
    "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
    "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
  };
  let s = "";
  for (const ch of raw) {
    const d = map[ch] ?? ch;
    if (d >= "0" && d <= "9") s += d;
  }
  return s;
}

function normalizePostalAscii(raw: string): string {
  return toAsciiDigits(raw).slice(0, 10);
}

function normalizePhoneAscii(raw: string, maxLen: number): string {
  let s = toAsciiDigits(raw);
  if (s.startsWith("0098")) s = s.slice(4);
  else if (s.startsWith("98") && s.length > 10) s = s.slice(2);
  if (s.startsWith("0") === false && s.length === 10) {
    if (s.startsWith("9")) s = "0" + s;
  }
  return s.slice(0, maxLen);
}

function validateContactValue(type: string, raw: string): string | null {
  const t = type.toUpperCase();
  if (t === "EMAIL") {
    const v = raw.trim();
    if (!v) return "ایمیل الزامی است.";
    if (v.length > 120) return "ایمیل حداکثر ۱۲۰ نویسه باشد.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "فرمت ایمیل معتبر نیست.";
    return null;
  }
  if (t === "WEBSITE") {
    const v = raw.trim();
    if (!v) return "آدرس وب‌سایت الزامی است.";
    if (v.length > 200) return "وب‌سایت حداکثر ۲۰۰ نویسه باشد.";
    return null;
  }
  if (t === "MOBILE") {
    const digits = normalizePhoneAscii(raw, 11);
    if (!/^09[0-9]{9}$/.test(digits)) {
      return "موبایل باید ۱۱ رقم و با ۰۹ شروع شود (مثال: ۰۹۱۲۳۴۵۶۷۸۹).";
    }
    return null;
  }
  if (t === "PHONE" || t === "FAX") {
    const digits = normalizePhoneAscii(raw, 11);
    if (digits.length < 8 || digits.length > 11) {
      return "تلفن/فکس باید بین ۸ تا ۱۱ رقم باشد (با کد شهر).";
    }
    if (!/^[0-9]+$/.test(digits)) return "فقط رقم مجاز است.";
    return null;
  }
  if (!raw.trim()) return "مقدار الزامی است.";
  if (raw.trim().length > 120) return "حداکثر ۱۲۰ نویسه.";
  return null;
}

function contactValueForApi(type: string, raw: string): string {
  const t = type.toUpperCase();
  if (t === "MOBILE" || t === "PHONE" || t === "FAX") {
    return normalizePhoneAscii(raw, 11);
  }
  return raw.trim();
}

function contactValueDisplay(type: string, raw: string): string {
  const t = type.toUpperCase();
  if (t === "MOBILE" || t === "PHONE" || t === "FAX") {
    return toFaDigits(toAsciiDigits(raw));
  }
  return raw;
}

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
  const [editingContact, setEditingContact] = useState<EntityContactDto | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [contactsSectionOpen, setContactsSectionOpen] = useState(true);
  const [openContactTypes, setOpenContactTypes] = useState<Record<string, boolean>>({});

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
  const watchedContactType = contactForm.watch("contact_type");

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
        postal_code: normalizePostalAscii(editingAddr.postal_code ?? ""),
        is_primary: Boolean(editingAddr.is_primary),
      });
    } else {
      addrForm.reset({ address_text: "", postal_code: "", is_primary: false });
    }
  }, [addrOpen, editingAddr, addrForm]);

  useEffect(() => {
    if (!contactOpen) return;
    if (editingContact) {
      const t = editingContact.contact_type || "PHONE";
      const raw = editingContact.contact_value ?? "";
      contactForm.reset({
        contact_type: t,
        contact_value:
          t === "MOBILE" || t === "PHONE" || t === "FAX"
            ? normalizePhoneAscii(raw, 11)
            : raw,
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
      const postal = normalizePostalAscii(v.postal_code);
      if (postal && !/^[0-9]{10}$/.test(postal)) {
        throw new Error("کد پستی باید دقیقاً ۱۰ رقم باشد.");
      }
      const payload = {
        address_text: v.address_text.trim(),
        postal_code: postal || undefined,
        is_primary: Boolean(v.is_primary),
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
      void qc.invalidateQueries({ queryKey: ["md", "addresses", "COMPANY", companyId] });
      toast.success(editingAddr ? "آدرس به‌روز شد" : "آدرس ثبت شد");
      setAddrOpen(false);
      setEditingAddr(null);
      addrForm.reset();
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  const saveContact = useMutation({
    mutationFn: async (v: ContactForm) => {
      const err = validateContactValue(v.contact_type, v.contact_value);
      if (err) throw new Error(err);
      const payload = {
        contact_type: v.contact_type,
        contact_value: contactValueForApi(v.contact_type, v.contact_value),
        is_primary: Boolean(v.is_primary),
      };
      if (editingContact) {
        await apiPut(`${MD}/entity-contact-points/${editingContact.contact_point_id}`, {
          entity_type: "COMPANY",
          entity_id: companyId,
          ...payload,
        });
        return;
      }
      await entityContactService.createForCompany(companyId, payload);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["md", "contacts", "COMPANY", companyId] });
      toast.success(editingContact ? "راه ارتباطی به‌روز شد" : "راه ارتباطی ثبت شد");
      setContactOpen(false);
      setEditingContact(null);
      contactForm.reset({ contact_type: "PHONE", contact_value: "", is_primary: false });
    },
    onError: (e) => toast.error(errMsg(e)),
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

  const runConfirmedDelete = async () => {
    if (!pendingDelete) return;
    setDeleteBusy(true);
    try {
      if (pendingDelete.kind === "address") {
        await entityAddressService.softDelete(pendingDelete.id);
        void qc.invalidateQueries({ queryKey: ["md", "addresses", "COMPANY", companyId] });
        toast.success("آدرس حذف شد");
      } else {
        await entityContactService.softDelete(pendingDelete.id);
        void qc.invalidateQueries({ queryKey: ["md", "contacts", "COMPANY", companyId] });
        toast.success("راه ارتباطی حذف شد");
      }
      setPendingDelete(null);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setDeleteBusy(false);
    }
  };

  const isPhoneLike =
    watchedContactType === "MOBILE" ||
    watchedContactType === "PHONE" ||
    watchedContactType === "FAX";

  const contactHint =
    watchedContactType === "MOBILE"
      ? "۱۱ رقم، شروع با ۰۹ — مثال: ۰۹۱۲۳۴۵۶۷۸۹"
      : watchedContactType === "PHONE" || watchedContactType === "FAX"
        ? "۸ تا ۱۱ رقم با کد شهر — مثال: ۰۲۱۲۲۳۳۴۴۵۵"
        : watchedContactType === "EMAIL"
          ? "مثال: info@company.com"
          : watchedContactType === "WEBSITE"
            ? "مثال: https://example.com"
            : "";

  const postalAscii = addrForm.watch("postal_code") ?? "";
  const contactAscii = contactForm.watch("contact_value") ?? "";

  return (
    <div className="space-y-5">
      <section id="addresses" className="scroll-mt-20 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold">آدرس‌ها</h2>
            <p className="text-[11px] text-muted-foreground">آدرس‌های ثبت‌شده شرکت</p>
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
        <div className="overflow-hidden rounded-lg border border-border/70">
          {(addresses.data ?? []).length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-[11px] text-muted-foreground">
                  <th className="px-3 py-2 text-start font-medium">آدرس</th>
                  <th className="hidden w-28 px-2 py-2 text-start font-medium sm:table-cell">
                    کدپستی
                  </th>
                  <th className="w-14 px-1 py-2 text-center font-medium">اصلی</th>
                  {!readOnly ? (
                    <th className="w-16 px-1 py-2 text-end font-medium" />
                  ) : null}
                </tr>
              </thead>
              <tbody className="divide-y">
                {(addresses.data ?? []).map((a) => (
                  <tr key={a.entity_address_id} className="hover:bg-muted/20">
                    <td className="px-3 py-2">
                      <div className="line-clamp-2">{toFaDigits(a.address_text)}</div>
                    </td>
                    <td className="hidden px-2 py-2 font-mono text-xs text-muted-foreground sm:table-cell">
                      {a.postal_code ? toFaDigits(a.postal_code) : "—"}
                    </td>
                    <td className="px-1 py-2 text-center">
                      {a.is_primary ? (
                        <StatusChip label="بله" tone="warning" />
                      ) : (
                        <span className="text-[11px] text-muted-foreground">—</span>
                      )}
                    </td>
                    {!readOnly ? (
                      <td className="px-1 py-2 text-end">
                        <div className="inline-flex">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => openEditAddr(a)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-destructive"
                            onClick={() =>
                              setPendingDelete({
                                kind: "address",
                                id: a.entity_address_id,
                                label: a.address_text || "آدرس",
                              })
                            }
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : !addresses.isLoading ? (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">
              آدرسی ثبت نشده است.
            </div>
          ) : null}
        </div>
      </section>

      <section id="contacts" className="scroll-mt-20">
        <div className="overflow-hidden rounded-xl border border-border/70 bg-card/40">
          <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2.5">
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-2 text-start"
              onClick={() => setContactsSectionOpen((v) => !v)}
              aria-expanded={contactsSectionOpen}
            >
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                  !contactsSectionOpen && "-rotate-90"
                )}
              />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-semibold">راه‌های ارتباطی</h2>
                  {(contacts.data ?? []).length > 0 ? (
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] tabular-nums text-muted-foreground">
                      {toFaDigits((contacts.data ?? []).length)}
                    </span>
                  ) : null}
                </div>
                <p className="text-[11px] leading-5 text-muted-foreground">
                  {(contacts.data ?? []).length
                    ? "تلفن، موبایل، ایمیل و …"
                    : "هنوز ثبت نشده"}
                </p>
              </div>
            </button>
            {readOnly ? (
              <p className="shrink-0 text-xs text-amber-700 dark:text-amber-400">
                ثبت غیرفعال
              </p>
            ) : (
              <Button
                size="sm"
                className="shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  openNewContact();
                }}
              >
                <Plus className="h-4 w-4" /> افزودن
              </Button>
            )}
          </div>

          {contactsSectionOpen ? (
            <div className="p-0">
              {contacts.isLoading ? (
                <div className="flex gap-2 px-3 py-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> بارگذاری…
                </div>
              ) : null}

              {!contacts.isLoading && (contacts.data ?? []).length === 0 ? (
                <div className="px-3 py-7 text-center text-xs text-muted-foreground">
                  راه ارتباطی ثبت نشده است.
                </div>
              ) : null}

              {!contacts.isLoading && (contacts.data ?? []).length > 0
                ? (() => {
                    const items = contacts.data ?? [];
                    const byType = new Map<string, typeof items>();
                    for (const c of items) {
                      const t = (c.contact_type || "PHONE").toUpperCase();
                      const arr = byType.get(t) ?? [];
                      arr.push(c);
                      byType.set(t, arr);
                    }
                    for (const [t, arr] of byType) {
                      arr.sort((a, b) => {
                        const pa = a.is_primary ? 0 : 1;
                        const pb = b.is_primary ? 0 : 1;
                        if (pa !== pb) return pa - pb;
                        return 0;
                      });
                      byType.set(t, arr);
                    }
                    const orderedTypes = [
                      ...CONTACT_TYPE_ORDER.filter((t) => byType.has(t)),
                      ...[...byType.keys()].filter(
                        (t) =>
                          !(CONTACT_TYPE_ORDER as readonly string[]).includes(t)
                      ),
                    ];
                    return (
                      <div className="divide-y divide-border/50">
                        {orderedTypes.map((typeKey) => {
                          const rows = byType.get(typeKey) ?? [];
                          if (rows.length === 0) return null;
                          const Icon = contactTypeIcon(typeKey);
                          const tone = contactTypeTone(typeKey);
                          const typeLabel =
                            CONTACT_TYPE_LABELS[typeKey] ?? typeKey;
                          const isOpen = openContactTypes[typeKey] ?? true;
                          return (
                            <div key={typeKey}>
                              <button
                                type="button"
                                className="flex w-full items-center gap-2 px-3 py-2.5 text-start hover:bg-muted/30"
                                onClick={() =>
                                  setOpenContactTypes((prev) => ({
                                    ...prev,
                                    [typeKey]: !isOpen,
                                  }))
                                }
                                aria-expanded={isOpen}
                              >
                                <span
                                  className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${tone}`}
                                >
                                  <Icon className="h-3.5 w-3.5" />
                                </span>
                                <span className="min-w-0 flex-1 text-sm font-medium">
                                  {typeLabel}
                                </span>
                                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] tabular-nums text-muted-foreground">
                                  {toFaDigits(rows.length)}
                                </span>
                                <ChevronDown
                                  className={cn(
                                    "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform",
                                    !isOpen && "-rotate-90"
                                  )}
                                />
                              </button>
                              {isOpen ? (
                                <ul className="border-t border-border/40 bg-muted/10">
                                  {rows.map((c) => {
                                    const value = contactValueDisplay(
                                      c.contact_type,
                                      c.contact_value
                                    );
                                    return (
                                      <li
                                        key={c.contact_point_id}
                                        className="group flex items-center gap-3 px-3 py-2.5 ps-12 transition-colors hover:bg-muted/40"
                                      >
                                        <div className="min-w-0 flex-1">
                                          <div
                                            dir="ltr"
                                            className="truncate text-sm font-semibold tabular-nums tracking-tight"
                                            title={value}
                                          >
                                            {value}
                                          </div>
                                          {c.is_primary ? (
                                            <span className="mt-0.5 inline-block rounded-full bg-amber-500/15 px-1.5 py-px text-[10px] font-medium text-amber-700 dark:text-amber-400">
                                              اصلی
                                            </span>
                                          ) : null}
                                        </div>
                                        {!readOnly ? (
                                          <div className="flex shrink-0 gap-0.5 opacity-70 transition-opacity group-hover:opacity-100">
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="sm"
                                              className="h-7 w-7 p-0"
                                              onClick={() => openEditContact(c)}
                                              aria-label="ویرایش"
                                            >
                                              <Pencil className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="sm"
                                              className="h-7 w-7 p-0 text-destructive"
                                              onClick={() =>
                                                setPendingDelete({
                                                  kind: "contact",
                                                  id: c.contact_point_id,
                                                  label: `${typeLabel}: ${value}`,
                                                })
                                              }
                                              aria-label="حذف"
                                            >
                                              <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                          </div>
                                        ) : null}
                                      </li>
                                    );
                                  })}
                                </ul>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()
                : null}
            </div>
          ) : null}
        </div>
      </section>

      <Dialog
        open={!!pendingDelete}
        onOpenChange={(o) => {
          if (!o && !deleteBusy) setPendingDelete(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pendingDelete?.kind === "address"
                ? "تأیید حذف آدرس"
                : "تأیید حذف راه ارتباطی"}
            </DialogTitle>
            <DialogDescription>
              {pendingDelete ? `«${pendingDelete.label}» حذف شود؟` : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={deleteBusy}
              onClick={() => setPendingDelete(null)}
            >
              انصراف
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteBusy}
              onClick={() => void runConfirmedDelete()}
            >
              {deleteBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "حذف"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={addrOpen && !readOnly} onOpenChange={handleAddrOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 overflow-hidden sm:max-w-md"
          onInteractOutside={(e) => {
            if (addrDirty) e.preventDefault();
          }}
          onPointerDownOutside={(e) => {
            if (addrDirty) e.preventDefault();
          }}
        >
          <SheetHeader>
            <SheetTitle>{editingAddr ? "ویرایش آدرس" : "آدرس جدید"}</SheetTitle>
            <SheetDescription>آدرس پستی شرکت</SheetDescription>
          </SheetHeader>
          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={addrForm.handleSubmit((v) => saveAddr.mutate(v))}
          >
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              <div className="space-y-1.5">
                <Label>متن آدرس *</Label>
                <Input className="h-9" {...addrForm.register("address_text", { required: true })} />
              </div>
              <div className="space-y-1.5">
                <Label>کد پستی</Label>
                <Input
                  className="h-9 font-mono"
                  dir="ltr"
                  maxLength={10}
                  value={postalAscii}
                  onChange={(e) =>
                    addrForm.setValue("postal_code", normalizePostalAscii(e.target.value), {
                      shouldDirty: true,
                    })
                  }
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={addrForm.watch("is_primary")}
                  onCheckedChange={(v) =>
                    addrForm.setValue("is_primary", v, { shouldDirty: true })
                  }
                />
                <Label>آدرس اصلی</Label>
              </div>
            </div>
            <SheetFooter>
              <Button type="button" variant="outline" onClick={() => handleAddrOpen(false)}>
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
          className="flex w-full flex-col gap-0 overflow-hidden sm:max-w-md"
          onInteractOutside={(e) => {
            if (contactDirty) e.preventDefault();
          }}
          onPointerDownOutside={(e) => {
            if (contactDirty) e.preventDefault();
          }}
        >
          <SheetHeader>
            <SheetTitle>
              {editingContact ? "ویرایش راه ارتباطی" : "راه ارتباطی جدید"}
            </SheetTitle>
            <SheetDescription>تلفن، موبایل، ایمیل، فکس یا وب‌سایت</SheetDescription>
          </SheetHeader>
          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={contactForm.handleSubmit((v) => saveContact.mutate(v))}
          >
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              <div className="space-y-1.5">
                <Label>نوع *</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={watchedContactType}
                  onChange={(e) => {
                    contactForm.setValue("contact_type", e.target.value, {
                      shouldDirty: true,
                    });
                    contactForm.setValue("contact_value", "", { shouldDirty: true });
                  }}
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
                  className={cn("h-9", isPhoneLike && "font-mono")}
                  dir={isPhoneLike ? "ltr" : undefined}
                  value={contactAscii}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const next = isPhoneLike
                      ? normalizePhoneAscii(raw, 11)
                      : raw;
                    contactForm.setValue("contact_value", next, { shouldDirty: true });
                  }}
                />
                {contactHint ? (
                  <p className="text-[11px] text-muted-foreground">{contactHint}</p>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={contactForm.watch("is_primary")}
                  onCheckedChange={(v) =>
                    contactForm.setValue("is_primary", v, { shouldDirty: true })
                  }
                />
                <Label>اصلی برای این نوع</Label>
              </div>
            </div>
            <SheetFooter>
              <Button type="button" variant="outline" onClick={() => handleContactOpen(false)}>
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
