"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2, ExternalLink } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { ApiClientError } from "@/api";
import { toFaDigits } from "@/shared/lib/utils";
import { salesOrgService, purchOrgService } from "../services/org-extended-service";
import { salesStructureService } from "../services/sales-structure-service";

type TabId = "sales" | "purch" | "channels" | "divisions" | "areas" | "offices";
type ConfirmState = { title: string; description: string; onConfirm: () => void } | null;

const TABS: { id: TabId; label: string }[] = [
  { id: "sales", label: "سازمان فروش" },
  { id: "purch", label: "سازمان خرید" },
  { id: "channels", label: "کانال توزیع" },
  { id: "divisions", label: "دیویژن" },
  { id: "areas", label: "ناحیه فروش" },
  { id: "offices", label: "دفتر / گروه" },
];

const td = "px-3 py-2.5 align-middle text-sm";
const tdEnd = "px-3 py-2.5 align-middle text-end";
const th = "px-3 py-2.5 align-middle text-start text-xs font-medium text-muted-foreground";
const thEnd = "px-3 py-2.5 align-middle text-end text-xs font-medium text-muted-foreground";
const selectCls = "flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm";

function TableShell({
  headers,
  children,
  loading,
}: {
  headers: string[];
  children: React.ReactNode;
  loading?: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border/60">
      <table className="w-full min-w-[28rem] border-collapse">
        <thead className="border-b bg-muted/30">
          <tr>
            {headers.map((h, i) => (
              <th key={`${h}-${i}`} className={i === headers.length - 1 ? thEnd : th}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {loading ? (
            <tr>
              <td colSpan={headers.length} className="px-4 py-10 text-center text-sm text-muted-foreground align-middle">
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  در حال بارگذاری…
                </span>
              </td>
            </tr>
          ) : (
            children
          )}
        </tbody>
      </table>
    </div>
  );
}

function EmptyRow({ colSpan, children }: { colSpan: number; children: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center text-sm text-muted-foreground align-middle">
        {children}
      </td>
    </tr>
  );
}

export function SalesPurchOrgsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<TabId>("sales");
  const [open, setOpen] = useState(false);
  const [groupOfficeId, setGroupOfficeId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(null);

  const form = useForm({
    defaultValues: { code: "", name: "", is_reference: false, sales_org_id: "" },
  });
  const areaForm = useForm({
    defaultValues: {
      sales_org_id: "",
      distribution_channel_id: "",
      division_id: "",
      code: "",
      name: "",
    },
  });
  const groupForm = useForm({ defaultValues: { code: "", name: "" } });

  const sales = useQuery({ queryKey: ["org", "sales-orgs"], queryFn: () => salesOrgService.list() });
  const purch = useQuery({ queryKey: ["org", "purch-orgs"], queryFn: () => purchOrgService.list() });
  const channels = useQuery({
    queryKey: ["org", "dist-channels"],
    queryFn: () => salesStructureService.listChannels(),
  });
  const divisions = useQuery({
    queryKey: ["org", "prod-divisions"],
    queryFn: () => salesStructureService.listDivisions(),
  });
  const areas = useQuery({
    queryKey: ["org", "sales-areas"],
    queryFn: () => salesStructureService.listSalesAreas(),
  });
  const offices = useQuery({
    queryKey: ["org", "sales-offices"],
    queryFn: () => salesStructureService.listOffices(),
  });

  const inv = () => void qc.invalidateQueries({ queryKey: ["org"] });
  const onErr = (e: unknown) =>
    toast.error(e instanceof ApiClientError && e.message ? e.message : "خطا");

  const createSales = useMutation({
    mutationFn: salesOrgService.create,
    onSuccess: () => { inv(); toast.success("سازمان فروش ثبت شد"); setOpen(false); form.reset(); },
    onError: onErr,
  });
  const createPurch = useMutation({
    mutationFn: purchOrgService.create,
    onSuccess: () => { inv(); toast.success("سازمان خرید ثبت شد"); setOpen(false); form.reset(); },
    onError: onErr,
  });
  const createChannel = useMutation({
    mutationFn: salesStructureService.createChannel,
    onSuccess: () => { inv(); toast.success("کانال ثبت شد"); setOpen(false); form.reset(); },
    onError: onErr,
  });
  const createDivision = useMutation({
    mutationFn: salesStructureService.createDivision,
    onSuccess: () => { inv(); toast.success("دیویژن ثبت شد"); setOpen(false); form.reset(); },
    onError: onErr,
  });
  const createArea = useMutation({
    mutationFn: salesStructureService.createSalesArea,
    onSuccess: () => { inv(); toast.success("ناحیه فروش ثبت شد"); setOpen(false); areaForm.reset(); },
    onError: onErr,
  });
  const createOffice = useMutation({
    mutationFn: salesStructureService.createOffice,
    onSuccess: () => { inv(); toast.success("دفتر فروش ثبت شد"); setOpen(false); form.reset(); },
    onError: onErr,
  });
  const createGroup = useMutation({
    mutationFn: (p: { officeId: string; code: string; name: string }) =>
      salesStructureService.createGroup(p.officeId, { code: p.code, name: p.name }),
    onSuccess: () => { inv(); toast.success("گروه فروش ثبت شد"); setGroupOfficeId(null); groupForm.reset(); },
    onError: onErr,
  });

  const delSales = useMutation({
    mutationFn: salesOrgService.softDelete,
    onSuccess: () => { inv(); toast.success("حذف شد"); },
    onError: onErr,
  });
  const delPurch = useMutation({
    mutationFn: purchOrgService.softDelete,
    onSuccess: () => { inv(); toast.success("حذف شد"); },
    onError: onErr,
  });
  const delChannel = useMutation({
    mutationFn: salesStructureService.softDeleteChannel,
    onSuccess: () => { inv(); toast.success("حذف شد"); },
    onError: onErr,
  });
  const delDivision = useMutation({
    mutationFn: salesStructureService.softDeleteDivision,
    onSuccess: () => { inv(); toast.success("حذف شد"); },
    onError: onErr,
  });
  const delArea = useMutation({
    mutationFn: salesStructureService.softDeleteSalesArea,
    onSuccess: () => { inv(); toast.success("حذف شد"); },
    onError: onErr,
  });
  const delOffice = useMutation({
    mutationFn: salesStructureService.softDeleteOffice,
    onSuccess: () => { inv(); toast.success("حذف شد"); },
    onError: onErr,
  });
  const delGroup = useMutation({
    mutationFn: salesStructureService.softDeleteGroup,
    onSuccess: () => { inv(); toast.success("حذف شد"); },
    onError: onErr,
  });

  const assignmentCount = (row: { assignment_count?: number; assignments?: unknown[] }) => {
    if (typeof row.assignment_count === "number") return row.assignment_count;
    return Array.isArray(row.assignments) ? row.assignments.length : 0;
  };

  const askConfirm = (title: string, description: string, onConfirm: () => void) => {
    setConfirm({ title, description, onConfirm });
  };

  const pendingCreate =
    createSales.isPending ||
    createPurch.isPending ||
    createChannel.isPending ||
    createDivision.isPending ||
    createOffice.isPending ||
    createArea.isPending;

  return (
    <div className="space-y-5">
      <PageHeader
        title="سازمان فروش و خرید"
        description="ساختار رقابتی: Sales/Purch Org، کانال، دیویژن، Sales Area، دفتر و گروه"
        breadcrumbs={[
          { label: "سازمان", href: "/dashboard/organization" },
          { label: "فروش و خرید" },
        ]}
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1 border-b pb-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={
                tab === t.id
                  ? "rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
                  : "rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted"
              }
            >
              {t.label}
            </button>
          ))}
        </div>
        <Button
          size="sm"
          className="h-8 gap-1.5"
          onClick={() => {
            form.reset();
            areaForm.reset();
            setOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          جدید
        </Button>
      </div>

      {tab === "sales" && (
        <TableShell headers={["نام", "کد", "تخصیص", "عملیات"]} loading={sales.isLoading}>
          {(sales.data ?? []).length === 0 ? (
            <EmptyRow colSpan={4}>هنوز سازمان فروشی ثبت نشده است.</EmptyRow>
          ) : (
            (sales.data ?? []).map((s) => {
              const count = assignmentCount(s);
              const hasAssign = count > 0;
              return (
                <tr key={s.sales_org_id} className="hover:bg-muted/20">
                  <td className={`${td} font-medium`}>{s.name}</td>
                  <td className={`${td} font-mono text-xs`} dir="ltr">{s.code}</td>
                  <td className={`${td} tabular-nums`}>{toFaDigits(count)}</td>
                  <td className={tdEnd}>
                    <div className="inline-flex items-center gap-1">
                      <Button asChild size="sm" variant="outline" className="h-8 gap-1">
                        <Link href={`/dashboard/organization/sales-purch/sales/${s.sales_org_id}`}>
                          <ExternalLink className="h-3.5 w-3.5" />
                          تخصیص
                        </Link>
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8 text-destructive"
                        disabled={hasAssign || delSales.isPending}
                        title={hasAssign ? "به‌خاطر وجود تخصیص فعال قابل حذف نیست" : "حذف"}
                        onClick={() => {
                          if (hasAssign) {
                            toast.error(
                              "این سازمان فروش دارای تخصیص فعال است. ابتدا از صفحه جزئیات تخصیص‌ها را حذف کنید."
                            );
                            return;
                          }
                          askConfirm("حذف سازمان فروش", `«${s.name}» (${s.code}) حذف شود؟`, () =>
                            delSales.mutate(s.sales_org_id)
                          );
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </TableShell>
      )}

      {tab === "purch" && (
        <TableShell headers={["نام", "کد", "مرجع", "تخصیص", "عملیات"]} loading={purch.isLoading}>
          {(purch.data ?? []).length === 0 ? (
            <EmptyRow colSpan={5}>هنوز سازمان خریدی ثبت نشده است.</EmptyRow>
          ) : (
            (purch.data ?? []).map((s) => {
              const count = assignmentCount(s);
              const hasAssign = count > 0;
              return (
                <tr key={s.purch_org_id} className="hover:bg-muted/20">
                  <td className={`${td} font-medium`}>{s.name}</td>
                  <td className={`${td} font-mono text-xs`} dir="ltr">{s.code}</td>
                  <td className={td}>
                    {s.is_reference ? (
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">مرجع</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className={`${td} tabular-nums`}>{toFaDigits(count)}</td>
                  <td className={tdEnd}>
                    <div className="inline-flex items-center gap-1">
                      <Button asChild size="sm" variant="outline" className="h-8 gap-1">
                        <Link href={`/dashboard/organization/sales-purch/purch/${s.purch_org_id}`}>
                          <ExternalLink className="h-3.5 w-3.5" />
                          تخصیص
                        </Link>
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8 text-destructive"
                        disabled={hasAssign || delPurch.isPending}
                        title={hasAssign ? "به‌خاطر وجود تخصیص فعال قابل حذف نیست" : "حذف"}
                        onClick={() => {
                          if (hasAssign) {
                            toast.error(
                              "این سازمان خرید دارای تخصیص فعال است. ابتدا از صفحه جزئیات تخصیص‌ها را حذف کنید."
                            );
                            return;
                          }
                          askConfirm("حذف سازمان خرید", `«${s.name}» (${s.code}) حذف شود؟`, () =>
                            delPurch.mutate(s.purch_org_id)
                          );
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </TableShell>
      )}

      {tab === "channels" && (
        <TableShell headers={["نام", "کد", "عملیات"]} loading={channels.isLoading}>
          {(channels.data ?? []).length === 0 ? (
            <EmptyRow colSpan={3}>کانالی ثبت نشده است.</EmptyRow>
          ) : (
            (channels.data ?? []).map((c) => (
              <tr key={c.distribution_channel_id} className="hover:bg-muted/20">
                <td className={`${td} font-medium`}>{c.name}</td>
                <td className={`${td} font-mono text-xs`} dir="ltr">{c.code}</td>
                <td className={tdEnd}>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 text-destructive"
                    disabled={delChannel.isPending}
                    onClick={() =>
                      askConfirm("حذف کانال توزیع", `«${c.name}» (${c.code}) حذف شود؟`, () =>
                        delChannel.mutate(c.distribution_channel_id)
                      )
                    }
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
            ))
          )}
        </TableShell>
      )}

      {tab === "divisions" && (
        <TableShell headers={["نام", "کد", "عملیات"]} loading={divisions.isLoading}>
          {(divisions.data ?? []).length === 0 ? (
            <EmptyRow colSpan={3}>دیویژنی ثبت نشده است.</EmptyRow>
          ) : (
            (divisions.data ?? []).map((d) => (
              <tr key={d.division_id} className="hover:bg-muted/20">
                <td className={`${td} font-medium`}>{d.name}</td>
                <td className={`${td} font-mono text-xs`} dir="ltr">{d.code}</td>
                <td className={tdEnd}>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 text-destructive"
                    disabled={delDivision.isPending}
                    onClick={() =>
                      askConfirm("حذف دیویژن", `«${d.name}» (${d.code}) حذف شود؟`, () =>
                        delDivision.mutate(d.division_id)
                      )
                    }
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
            ))
          )}
        </TableShell>
      )}

      {tab === "areas" && (
        <TableShell
          headers={["نام", "کد", "سازمان فروش", "کانال", "دیویژن", "عملیات"]}
          loading={areas.isLoading}
        >
          {(areas.data ?? []).length === 0 ? (
            <EmptyRow colSpan={6}>ابتدا سازمان فروش، کانال و دیویژن را بسازید.</EmptyRow>
          ) : (
            (areas.data ?? []).map((a) => (
              <tr key={a.sales_area_id} className="hover:bg-muted/20">
                <td className={`${td} font-medium`}>{a.name || "—"}</td>
                <td className={`${td} font-mono text-xs`} dir="ltr">{a.code || "—"}</td>
                <td className={td}>
                  <span className="font-medium">{a.sales_organization?.name || "—"}</span>
                  {a.sales_organization?.code ? (
                    <span className="mr-1 font-mono text-xs text-muted-foreground" dir="ltr">
                      ({a.sales_organization.code})
                    </span>
                  ) : null}
                </td>
                <td className={td}>
                  <span className="font-medium">{a.distribution_channel?.name || "—"}</span>
                  {a.distribution_channel?.code ? (
                    <span className="mr-1 font-mono text-xs text-muted-foreground" dir="ltr">
                      ({a.distribution_channel.code})
                    </span>
                  ) : null}
                </td>
                <td className={td}>
                  <span className="font-medium">{a.product_division?.name || "—"}</span>
                  {a.product_division?.code ? (
                    <span className="mr-1 font-mono text-xs text-muted-foreground" dir="ltr">
                      ({a.product_division.code})
                    </span>
                  ) : null}
                </td>
                <td className={tdEnd}>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 text-destructive"
                    disabled={delArea.isPending}
                    onClick={() =>
                      askConfirm("حذف ناحیه فروش", `«${a.name || a.code || "ناحیه"}» حذف شود؟`, () =>
                        delArea.mutate(a.sales_area_id)
                      )
                    }
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
            ))
          )}
        </TableShell>
      )}

      {tab === "offices" && (
        <TableShell headers={["نام", "کد", "گروه‌ها", "عملیات"]} loading={offices.isLoading}>
          {(offices.data ?? []).length === 0 ? (
            <EmptyRow colSpan={4}>دفتری ثبت نشده است.</EmptyRow>
          ) : (
            (offices.data ?? []).map((o) => {
              const groups = o.groups ?? [];
              const hasGroups = groups.length > 0;
              return (
                <tr key={o.sales_office_id} className="hover:bg-muted/20">
                  <td className={`${td} font-medium`}>{o.name}</td>
                  <td className={`${td} font-mono text-xs`} dir="ltr">{o.code}</td>
                  <td className={td}>
                    {hasGroups ? (
                      <ul className="space-y-1">
                        {groups.map((g) => (
                          <li
                            key={g.sales_group_id}
                            className="flex items-center justify-between gap-2 text-xs"
                          >
                            <span>
                              <span className="font-medium text-foreground">{g.name}</span>{" "}
                              <span className="font-mono text-muted-foreground" dir="ltr">
                                ({g.code})
                              </span>
                            </span>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-7 text-destructive"
                              disabled={delGroup.isPending}
                              onClick={() =>
                                askConfirm("حذف گروه فروش", `گروه «${g.name}» (${g.code}) حذف شود؟`, () =>
                                  delGroup.mutate(g.sales_group_id)
                                )
                              }
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-muted-foreground">بدون گروه</span>
                    )}
                  </td>
                  <td className={tdEnd}>
                    <div className="inline-flex flex-col items-end gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8"
                        onClick={() => {
                          groupForm.reset();
                          setGroupOfficeId(o.sales_office_id);
                        }}
                      >
                        + گروه
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8 text-destructive"
                        disabled={hasGroups || delOffice.isPending}
                        title={hasGroups ? "ابتدا گروه‌های زیرمجموعه را حذف کنید" : "حذف دفتر"}
                        onClick={() => {
                          if (hasGroups) {
                            toast.error("این دفتر دارای گروه فروش است. ابتدا گروه‌ها را حذف کنید.");
                            return;
                          }
                          askConfirm("حذف دفتر فروش", `دفتر «${o.name}» (${o.code}) حذف شود؟`, () =>
                            delOffice.mutate(o.sales_office_id)
                          );
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </TableShell>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {tab === "sales"
                ? "سازمان فروش"
                : tab === "purch"
                  ? "سازمان خرید"
                  : tab === "channels"
                    ? "کانال"
                    : tab === "divisions"
                      ? "دیویژن"
                      : tab === "offices"
                        ? "دفتر فروش"
                        : "ناحیه فروش"}
            </DialogTitle>
          </DialogHeader>
          {tab === "areas" ? (
            <form
              className="space-y-3"
              onSubmit={areaForm.handleSubmit((v) =>
                createArea.mutate({
                  sales_org_id: v.sales_org_id,
                  distribution_channel_id: v.distribution_channel_id,
                  division_id: v.division_id,
                  code: v.code.trim() || undefined,
                  name: v.name.trim() || undefined,
                })
              )}
            >
              <div className="space-y-1.5">
                <Label>سازمان فروش *</Label>
                <select className={selectCls} {...areaForm.register("sales_org_id", { required: true })}>
                  <option value="">انتخاب…</option>
                  {(sales.data ?? []).map((s) => (
                    <option key={s.sales_org_id} value={s.sales_org_id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>کانال *</Label>
                <select
                  className={selectCls}
                  {...areaForm.register("distribution_channel_id", { required: true })}
                >
                  <option value="">انتخاب…</option>
                  {(channels.data ?? []).map((c) => (
                    <option key={c.distribution_channel_id} value={c.distribution_channel_id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>دیویژن *</Label>
                <select className={selectCls} {...areaForm.register("division_id", { required: true })}>
                  <option value="">انتخاب…</option>
                  {(divisions.data ?? []).map((d) => (
                    <option key={d.division_id} value={d.division_id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>کد</Label>
                <Input dir="ltr" className="h-9" {...areaForm.register("code")} />
              </div>
              <div className="space-y-1.5">
                <Label>نام</Label>
                <Input className="h-9" {...areaForm.register("name")} />
              </div>
              <DialogFooter>
                <Button type="submit" size="sm" disabled={createArea.isPending}>
                  {createArea.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "ثبت"}
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <form
              className="space-y-3"
              onSubmit={form.handleSubmit((v) => {
                const payload = { code: v.code.trim(), name: v.name.trim() };
                if (tab === "sales") createSales.mutate(payload);
                else if (tab === "purch")
                  createPurch.mutate({ ...payload, is_reference: !!v.is_reference });
                else if (tab === "channels") createChannel.mutate(payload);
                else if (tab === "divisions") createDivision.mutate(payload);
                else if (tab === "offices")
                  createOffice.mutate({ ...payload, sales_org_id: v.sales_org_id || null });
              })}
            >
              <div className="space-y-1.5">
                <Label>کد *</Label>
                <Input dir="ltr" className="h-9" {...form.register("code", { required: true })} />
              </div>
              <div className="space-y-1.5">
                <Label>نام *</Label>
                <Input className="h-9" {...form.register("name", { required: true })} />
              </div>
              {tab === "purch" ? (
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" {...form.register("is_reference")} />
                  سازمان مرجع خرید
                </label>
              ) : null}
              {tab === "offices" ? (
                <div className="space-y-1.5">
                  <Label>سازمان فروش (اختیاری)</Label>
                  <select className={selectCls} {...form.register("sales_org_id")}>
                    <option value="">— بدون —</option>
                    {(sales.data ?? []).map((s) => (
                      <option key={s.sales_org_id} value={s.sales_org_id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              <DialogFooter>
                <Button type="submit" size="sm" disabled={pendingCreate}>
                  {pendingCreate ? <Loader2 className="h-4 w-4 animate-spin" /> : "ثبت"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!groupOfficeId} onOpenChange={(v) => !v && setGroupOfficeId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>گروه فروش جدید</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={groupForm.handleSubmit((v) => {
              if (!groupOfficeId) return;
              createGroup.mutate({
                officeId: groupOfficeId,
                code: v.code.trim(),
                name: v.name.trim(),
              });
            })}
          >
            <div className="space-y-1.5">
              <Label>کد *</Label>
              <Input dir="ltr" className="h-9" {...groupForm.register("code", { required: true })} />
            </div>
            <div className="space-y-1.5">
              <Label>نام *</Label>
              <Input className="h-9" {...groupForm.register("name", { required: true })} />
            </div>
            <DialogFooter>
              <Button type="submit" size="sm" disabled={createGroup.isPending}>
                {createGroup.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "ثبت"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirm} onOpenChange={(v) => !v && setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirm?.title}</DialogTitle>
            <DialogDescription>{confirm?.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setConfirm(null)}>
              انصراف
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                const fn = confirm?.onConfirm;
                setConfirm(null);
                fn?.();
              }}
            >
              تأیید حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
