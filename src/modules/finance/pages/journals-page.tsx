"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import {
  Loader2,
  Plus,
  Trash2,
  Copy,
  CheckCircle2,
  Undo2,
  Pencil,
  X,
  FileText,
  Search,
  Link2,
} from "lucide-react";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { ShamsiDatePicker } from "@/shared/components/ui/shamsi-date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { usePermission } from "@/auth";
import { useCompanies } from "@/modules/organization/hooks/use-companies";
import {
  costCenterService,
  businessUnitService,
  type CostCenterDto,
  type BusinessUnitDto,
} from "@/modules/organization/services/org-extended-service";
import {
  useJournals,
  usePostJournal,
  useReverseJournal,
  useDeleteJournal,
} from "../hooks/use-journals";
import { useAccountFlat } from "../hooks/use-accounts";
import { journalService } from "../services/journal-service";
import {
  FinancePermissions,
  DEMO_PERIOD_ID,
  type JournalEntryDto,
  type JournalItemDto,
} from "../types";
import { ApiClientError } from "@/api";
import {
  cn,
  toFaDigits,
  toAsciiDigits,
  formatJalaliDate,
  jalaliToIso,
  toJalaliParts,
} from "@/shared/lib/utils";

// NOTE: Full file restore in progress — this is a bridge commit.
// Replace with artifacts/journals-page.UX-PHASES-ALL.tsx for full UX.

const statusLabel: Record<string, string> = {
  DRAFT: "پیش‌نویس",
  POSTED: "ثبت‌شده",
  REVERSED: "برگشت‌خورده",
};

const statusChip: Record<string, string> = {
  DRAFT: "bg-amber-50 text-amber-800 border-amber-200",
  POSTED: "bg-emerald-50 text-emerald-800 border-emerald-200",
  REVERSED: "bg-slate-100 text-slate-600 border-slate-200",
};

type LineForm = {
  key: string;
  account_id: string;
  debit: string;
  credit: string;
  description: string;
  cost_center_id: string;
  business_unit_id: string;
};

function emptyLine(desc = ""): LineForm {
  return {
    key: Math.random().toString(36).slice(2),
    account_id: "",
    debit: "",
    credit: "",
    description: desc,
    cost_center_id: "",
    business_unit_id: "",
  };
}

function periodLabel(id?: string | null): string {
  if (!id) return "—";
  if (id === DEMO_PERIOD_ID) return "دوره جاری (دمو)";
  return toFaDigits(id.slice(0, 8));
}

function parseAmount(raw: string): number {
  const n = Number(toAsciiDigits(raw).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

function formatMoney(n: number): string {
  return toFaDigits(
    n.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
  );
}

function sumLines(
  items: Array<{ debit_amount?: number | string; credit_amount?: number | string }> | undefined
) {
  let d = 0;
  let c = 0;
  for (const i of items ?? []) {
    d += Number(i.debit_amount || 0);
    c += Number(i.credit_amount || 0);
  }
  return { debit: d, credit: c };
}

function todayIso(): string {
  const n = new Date();
  const { jy, jm, jd } = toJalaliParts(n.getFullYear(), n.getMonth() + 1, n.getDate());
  return jalaliToIso(jy, jm, jd);
}

export function JournalsPage() {
  const canView = usePermission(FinancePermissions.journalView);
  const canCreate = usePermission(FinancePermissions.journalCreate);

  if (!canView) {
    return <div className="p-6 text-sm text-amber-700">مجوز مشاهده اسناد را ندارید.</div>;
  }

  return (
    <div className="space-y-4 p-4">
      <PageHeader
        title="اسناد حسابداری"
        description="نسخه کامل در حال بازیابی از artifacts — فعلاً لیست/فرم کامل را از فایل محلی جایگزین کنید"
        breadcrumbs={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "حسابداری", href: "/dashboard/finance" },
          { label: "اسناد" },
        ]}
      />
      <div className="rounded-xl border bg-card p-4 text-sm space-y-2">
        <p>
          صفحه کامل آماده است در فایل پروژه:
          <code className="mx-1 text-xs">artifacts/journals-page.UX-PHASES-ALL.tsx</code>
        </p>
        <p className="text-muted-foreground text-xs">
          به‌دلیل محدودیت حجم push از کانکتور، فایل کامل را لطفاً لوکال جایگزین و push کنید.
          بهبودهای UX (میانبر کیبورد، حساب اخیر، دیالوگ خروج، تراز واضح، کپی شرح) داخل همان فایل است.
        </p>
        {canCreate ? (
          <p className="text-xs text-amber-700">مجوز ایجاد دارید؛ پس از جایگزینی فایل، سند جدید در دسترس است.</p>
        ) : null}
      </div>
    </div>
  );
}
