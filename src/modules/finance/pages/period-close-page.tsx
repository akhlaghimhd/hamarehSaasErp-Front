"use client";

import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import { usePermission } from "@/auth";
import { useCompanies } from "@/modules/organization/hooks/use-companies";
import { periodCloseService } from "../services/period-close-service";
import { DEMO_PERIOD_ID, FinancePermissions, type PeriodCloseItemDto } from "../types";

export function PeriodClosePage() {
  const canView = usePermission(FinancePermissions.periodView);
  const canClose = usePermission(FinancePermissions.periodClose);
  const { data: companies } = useCompanies();

  const primaryCompanyId = useMemo(() => {
    const list = companies ?? [];
    const p = list.find((c) => c.is_primary) ?? list[0];
    return p?.company_id ?? null;
  }, [companies]);

  const [companyId, setCompanyId] = useState("");
  const [periodId, setPeriodId] = useState(DEMO_PERIOD_ID);
  const [items, setItems] = useState<PeriodCloseItemDto[]>([]);
  const [hasBlocking, setHasBlocking] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const effectiveCompany = companyId || primaryCompanyId;

  const evaluateMut = useMutation({
    mutationFn: () =>
      periodCloseService.evaluate(effectiveCompany as string, periodId),
    onSuccess: (data) => {
      setItems(data.items ?? data.checklist?.items_json ?? []);
      setHasBlocking(!!(data.checklist?.has_blocking ?? data.has_blocking));
      setMsg(null);
    },
    onError: (e: Error) => setMsg(e.message),
  });

  const softMut = useMutation({
    mutationFn: () => periodCloseService.softClose(effectiveCompany as string, periodId),
    onSuccess: () => setMsg("دوره نیمه‌بسته شد."),
    onError: (e: Error) => setMsg(e.message || "بستن ممکن نیست"),
  });

  const hardMut = useMutation({
    mutationFn: () => periodCloseService.hardClose(effectiveCompany as string, periodId),
    onSuccess: () => setMsg("دوره قطعی بسته شد."),
    onError: (e: Error) => setMsg(e.message || "بستن قطعی ممکن نیست"),
  });

  if (!canView) {
    return (
      <div className="p-6 text-sm text-amber-700">مجوز مشاهده بستن دوره را ندارید.</div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="بستن هدایت‌شده دوره (K4)"
        description="چک‌لیست مسدودکننده‌ها قبل از نیمه‌بستن / بستن قطعی"
        breadcrumbs={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "حسابداری", href: "/dashboard/finance" },
          { label: "بستن دوره" },
        ]}
      />

      <div className="flex flex-wrap items-end gap-2 rounded-xl border bg-card p-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">شرکت</label>
          <select
            className="h-9 min-w-[180px] rounded-md border bg-background px-2 text-sm"
            value={effectiveCompany ?? ""}
            onChange={(e) => setCompanyId(e.target.value)}
          >
            <option value="">—</option>
            {(companies ?? []).map((c) => (
              <option key={c.company_id} value={c.company_id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Period ID</label>
          <input
            className="h-9 w-64 rounded-md border bg-background px-2 font-mono text-xs"
            value={periodId}
            onChange={(e) => setPeriodId(e.target.value)}
          />
        </div>
        <Button
          size="sm"
          disabled={!effectiveCompany || evaluateMut.isPending}
          onClick={() => void evaluateMut.mutateAsync()}
        >
          {evaluateMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          ارزیابی چک‌لیست
        </Button>
      </div>

      {msg ? <p className="text-sm text-muted-foreground">{msg}</p> : null}

      <div className="rounded-xl border bg-card p-3 space-y-2">
        <div className="text-sm font-medium">
          وضعیت مسدودکننده:{" "}
          {hasBlocking ? (
            <span className="text-destructive">دارد — بستن مجاز نیست</span>
          ) : items.length ? (
            <span className="text-emerald-700 dark:text-emerald-400">ندارد</span>
          ) : (
            <span className="text-muted-foreground">هنوز ارزیابی نشده</span>
          )}
        </div>
        <ul className="space-y-2 text-sm">
          {items.map((it, idx) => (
            <li
              key={`${it.code}-${idx}`}
              className="rounded-lg border border-border/60 px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-medium uppercase">{it.severity}</span>
                <span className="font-medium">{it.title}</span>
                {it.blocking ? (
                  <span className="text-[10px] text-destructive">مسدودکننده</span>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">{it.message}</p>
            </li>
          ))}
        </ul>

        {canClose ? (
          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              size="sm"
              variant="outline"
              disabled={hasBlocking || softMut.isPending || !items.length}
              onClick={() => void softMut.mutateAsync()}
            >
              نیمه‌بستن
            </Button>
            <Button
              size="sm"
              disabled={hasBlocking || hardMut.isPending || !items.length}
              onClick={() => void hardMut.mutateAsync()}
            >
              بستن قطعی
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
