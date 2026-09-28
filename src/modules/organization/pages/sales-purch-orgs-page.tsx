"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { ApiClientError } from "@/api";
import {
  salesOrgService,
  purchOrgService,
} from "../services/org-extended-service";
import { salesStructureService } from "../services/sales-structure-service";

type TabId =
  | "sales"
  | "purch"
  | "channels"
  | "divisions"
  | "areas"
  | "offices";

const TABS: { id: TabId; label: string }[] = [
  { id: "sales", label: "سازمان فروش" },
  { id: "purch", label: "سازمان خرید" },
  { id: "channels", label: "کانال توزیع" },
  { id: "divisions", label: "دیویژن" },
  { id: "areas", label: "ناحیه فروش" },
  { id: "offices", label: "دفتر / گروه" },
];

export function SalesPurchOrgsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<TabId>("sales");
  const [open, setOpen] = useState(false);
  const [groupOfficeId, setGroupOfficeId] = useState<string | null>(null);
  const form = useForm({
    defaultValues: {
      code: "",
      name: "",
      is_reference: false,
      sales_org_id: "",
    },
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

  const sales = useQuery({
    queryKey: ["org", "sales-orgs"],
    queryFn: () => salesOrgService.list(),
  });
  const purch = useQuery({
    queryKey: ["org", "purch-orgs"],
    queryFn: () => purchOrgService.list(),
  });
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

  const inv = () => {
    void qc.invalidateQueries({ queryKey: ["org"] });
  };
  const onErr = (e: unknown) =>
    toast.error(e instanceof ApiClientError && e.message ? e.message : "خطا");

  const createSales = useMutation({
    mutationFn: salesOrgService.create,
    onSuccess: () => {
      inv();
      toast.success("سازمان فروش ثبت شد");
      setOpen(false);
      form.reset();
    },
    onError: onErr,
  });
  const createPurch = useMutation({
    mutationFn: purchOrgService.create,
    onSuccess: () => {
      inv();
      toast.success("سازمان خرید ثبت شد");
      setOpen(false);
      form.reset();
    },
    onError: onErr,
  });
  const createChannel = useMutation({
    mutationFn: salesStructureService.createChannel,
    onSuccess: () => {
      inv();
      toast.success("کانال ثبت شد");
      setOpen(false);
      form.reset();
    },
    onError: onErr,
  });
  const createDivision = useMutation({
    mutationFn: salesStructureService.createDivision,
    onSuccess: () => {
      inv();
      toast.success("دیویژن ثبت شد");
      setOpen(false);
      form.reset();
    },
    onError: onErr,
  });
  const createArea = useMutation({
    mutationFn: salesStructureService.createSalesArea,
    onSuccess: () => {
      inv();
      toast.success("ناحیه فروش ثبت شد");
      setOpen(false);
      areaForm.reset();
    },
    onError: onErr,
  });
  const createOffice = useMutation({
    mutationFn: salesStructureService.createOffice,
    onSuccess: () => {
      inv();
      toast.success("دفتر فروش ثبت شد");
      setOpen(false);
      form.reset();
    },
    onError: onErr,
  });
  const createGroup = useMutation({
    mutationFn: (p: { officeId: string; code: string; name: string }) =>
      salesStructureService.createGroup(p.officeId, {
        code: p.code,
        name: p.name,
      }),
    onSuccess: () => {
      inv();
      toast.success("گروه فروش ثبت شد");
      setGroupOfficeId(null);
      groupForm.reset();
    },
    onError: onErr,
  });

  const delSales = useMutation({
    mutationFn: salesOrgService.softDelete,
    onSuccess: inv,
    onError: onErr,
  });
  const delPurch = useMutation({
    mutationFn: purchOrgService.softDelete,
    onSuccess: inv,
    onError: onErr,
  });
  const delChannel = useMutation({
    mutationFn: salesStructureService.softDeleteChannel,
    onSuccess: inv,
    onError: onErr,
  });
  const delDivision = useMutation({
    mutationFn: salesStructureService.softDeleteDivision,
    onSuccess: inv,
    onError: onErr,
  });
  const delArea = useMutation({
    mutationFn: salesStructureService.softDeleteSalesArea,
    onSuccess: inv,
    onError: onErr,
  });
  const delOffice = useMutation({
    mutationFn: salesStructureService.softDeleteOffice,
    onSuccess: inv,
    onError: onErr,
  });
  const delGroup = useMutation({
    mutationFn: salesStructureService.softDeleteGroup,
    onSuccess: inv,
    onError: onErr,
  });

  const selectCls =
    "flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm";

  return (
    <div className="space-y-6">
      <PageHeader
        title="سازمان فروش و خرید"
        description="ساختار رقابتی: Sales/Purch Org، کانال، دیویژن، Sales Area، دفتر و گروه"
        breadcrumbs={[
          { label: "سازمان", href: "/dashboard/organization" },
          { label: "فروش و خرید" },
        ]}
      />

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

      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={() => {
            form.reset();
            areaForm.reset();
            setOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> جدید
        </Button>
      </div>

      {tab === "sales" && (
        <ul className="divide-y rounded-xl border">
          {(sales.data ?? []).map((s) => (
            <li
              key={s.sales_org_id}
              className="flex items-center justify-between px-4 py-3 text-sm"
            >
              <span>
                <span className="font-medium">{s.name}</span>{" "}
                <span className="font-mono text-xs text-muted-foreground" dir="ltr">
                  {s.code}
                </span>
              </span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-destructive"
                onClick={() => confirm("حذف؟") && delSales.mutate(s.sales_org_id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
          {!sales.isLoading && !(sales.data ?? []).length && (
            <li className="px-4 py-6 text-center text-sm text-muted-foreground">خالی</li>
          )}
        </ul>
      )}

      {tab === "purch" && (
        <ul className="divide-y rounded-xl border">
          {(purch.data ?? []).map((s) => (
            <li
              key={s.purch_org_id}
              className="flex items-center justify-between px-4 py-3 text-sm"
            >
              <span>
                <span className="font-medium">{s.name}</span>{" "}
                <span className="font-mono text-xs text-muted-foreground" dir="ltr">
                  {s.code}
                </span>
                {s.is_reference ? (
                  <span className="mr-2 text-xs text-primary">(مرجع)</span>
                ) : null}
              </span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-destructive"
                onClick={() => confirm("حذف؟") && delPurch.mutate(s.purch_org_id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
          {!purch.isLoading && !(purch.data ?? []).length && (
            <li className="px-4 py-6 text-center text-sm text-muted-foreground">خالی</li>
          )}
        </ul>
      )}

      {tab === "channels" && (
        <ul className="divide-y rounded-xl border">
          {(channels.data ?? []).map((c) => (
            <li
              key={c.distribution_channel_id}
              className="flex items-center justify-between px-4 py-3 text-sm"
            >
              <span>
                <span className="font-medium">{c.name}</span>{" "}
                <span className="font-mono text-xs text-muted-foreground" dir="ltr">
                  {c.code}
                </span>
              </span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-destructive"
                onClick={() =>
                  confirm("حذف؟") && delChannel.mutate(c.distribution_channel_id)
                }
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
          {!channels.isLoading && !(channels.data ?? []).length && (
            <li className="px-4 py-6 text-center text-sm text-muted-foreground">خالی</li>
          )}
        </ul>
      )}

      {tab === "divisions" && (
        <ul className="divide-y rounded-xl border">
          {(divisions.data ?? []).map((d) => (
            <li
              key={d.division_id}
              className="flex items-center justify-between px-4 py-3 text-sm"
            >
              <span>
                <span className="font-medium">{d.name}</span>{" "}
                <span className="font-mono text-xs text-muted-foreground" dir="ltr">
                  {d.code}
                </span>
              </span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-destructive"
                onClick={() => confirm("حذف؟") && delDivision.mutate(d.division_id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
          {!divisions.isLoading && !(divisions.data ?? []).length && (
            <li className="px-4 py-6 text-center text-sm text-muted-foreground">خالی</li>
          )}
        </ul>
      )}

      {tab === "areas" && (
        <ul className="divide-y rounded-xl border">
          {(areas.data ?? []).map((a) => (
            <li
              key={a.sales_area_id}
              className="flex items-center justify-between px-4 py-3 text-sm"
            >
              <div>
                <span className="font-medium">
                  {a.name || a.code || a.sales_area_id.slice(0, 8)}
                </span>
                <p className="text-xs text-muted-foreground" dir="ltr">
                  {(a.sales_organization?.code || "?") +
                    " / " +
                    (a.distribution_channel?.code || "?") +
                    " / " +
                    (a.product_division?.code || "?")}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-destructive"
                onClick={() => confirm("حذف؟") && delArea.mutate(a.sales_area_id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
          {!areas.isLoading && !(areas.data ?? []).length && (
            <li className="px-4 py-6 text-center text-sm text-muted-foreground">
              ابتدا سازمان فروش، کانال و دیویژن را بسازید.
            </li>
          )}
        </ul>
      )}

      {tab === "offices" && (
        <ul className="divide-y rounded-xl border">
          {(offices.data ?? []).map((o) => (
            <li key={o.sales_office_id} className="px-4 py-3 text-sm">
              <div className="flex items-center justify-between">
                <span>
                  <span className="font-medium">{o.name}</span>{" "}
                  <span
                    className="font-mono text-xs text-muted-foreground"
                    dir="ltr"
                  >
                    {o.code}
                  </span>
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
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
                    className="text-destructive"
                    onClick={() =>
                      confirm("حذف دفتر؟") && delOffice.mutate(o.sales_office_id)
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {(o.groups ?? []).length > 0 && (
                <ul className="mt-2 mr-4 space-y-1 border-r pr-3">
                  {(o.groups ?? []).map((g) => (
                    <li
                      key={g.sales_group_id}
                      className="flex items-center justify-between text-xs text-muted-foreground"
                    >
                      <span>
                        {g.name}{" "}
                        <span className="font-mono" dir="ltr">
                          ({g.code})
                        </span>
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 text-destructive"
                        onClick={() =>
                          confirm("حذف گروه؟") &&
                          delGroup.mutate(g.sales_group_id)
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
          {!offices.isLoading && !(offices.data ?? []).length && (
            <li className="px-4 py-6 text-center text-sm text-muted-foreground">
              دفتری ثبت نشده است.
            </li>
          )}
        </ul>
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
                <select
                  className={selectCls}
                  {...areaForm.register("sales_org_id", { required: true })}
                >
                  <option value="">—</option>
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
                  {...areaForm.register("distribution_channel_id", {
                    required: true,
                  })}
                >
                  <option value="">—</option>
                  {(channels.data ?? []).map((c) => (
                    <option
                      key={c.distribution_channel_id}
                      value={c.distribution_channel_id}
                    >
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>دیویژن *</Label>
                <select
                  className={selectCls}
                  {...areaForm.register("division_id", { required: true })}
                >
                  <option value="">—</option>
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
                  {createArea.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "ثبت"
                  )}
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <form
              className="space-y-3"
              onSubmit={form.handleSubmit((v) => {
                const p = { code: v.code.trim(), name: v.name.trim() };
                if (tab === "sales") createSales.mutate(p);
                else if (tab === "purch")
                  createPurch.mutate({ ...p, is_reference: v.is_reference });
                else if (tab === "channels") createChannel.mutate(p);
                else if (tab === "divisions") createDivision.mutate(p);
                else if (tab === "offices")
                  createOffice.mutate({
                    ...p,
                    sales_org_id: v.sales_org_id || null,
                  });
              })}
            >
              <div className="space-y-1.5">
                <Label>کد *</Label>
                <Input
                  dir="ltr"
                  className="h-9"
                  {...form.register("code", { required: true })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>نام *</Label>
                <Input
                  className="h-9"
                  {...form.register("name", { required: true })}
                />
              </div>
              {tab === "purch" && (
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" {...form.register("is_reference")} />{" "}
                  سازمان خرید مرجع
                </label>
              )}
              {tab === "offices" && (
                <div className="space-y-1.5">
                  <Label>سازمان فروش (اختیاری)</Label>
                  <select className={selectCls} {...form.register("sales_org_id")}>
                    <option value="">—</option>
                    {(sales.data ?? []).map((s) => (
                      <option key={s.sales_org_id} value={s.sales_org_id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <DialogFooter>
                <Button
                  type="submit"
                  size="sm"
                  disabled={
                    createSales.isPending ||
                    createPurch.isPending ||
                    createChannel.isPending ||
                    createDivision.isPending ||
                    createOffice.isPending
                  }
                >
                  {createSales.isPending ||
                  createPurch.isPending ||
                  createChannel.isPending ||
                  createDivision.isPending ||
                  createOffice.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "ثبت"
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!groupOfficeId}
        onOpenChange={(v) => !v && setGroupOfficeId(null)}
      >
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
              <Input
                dir="ltr"
                className="h-9"
                {...groupForm.register("code", { required: true })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>نام *</Label>
              <Input
                className="h-9"
                {...groupForm.register("name", { required: true })}
              />
            </div>
            <DialogFooter>
              <Button type="submit" size="sm" disabled={createGroup.isPending}>
                {createGroup.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "ثبت"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
