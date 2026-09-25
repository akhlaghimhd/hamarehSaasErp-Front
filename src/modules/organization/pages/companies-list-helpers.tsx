/**
 * FE-ORG companies list — shared helpers (mirrors identity members-list-helpers).
 */
"use client";

import { Button } from "@/shared/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import { cn, toFaDigits } from "@/shared/lib/utils";
import {
  ENTITY_KIND_LABELS,
  type CompanyDto,
} from "../types";

export const MSG_LOAD = "بارگذاری فهرست شرکت‌ها ممکن نشد. کمی بعد دوباره تلاش کنید.";
export const MSG_ERR = "انجام این کار ممکن نشد. کمی بعد دوباره تلاش کنید.";
export const MSG_NO_ACCESS = "برای مشاهده این بخش مجوز لازم را ندارید.";
export const COL_STORAGE = "organization.companies.columns.v2";

export type StatusFilter = "all" | "active" | "inactive";
export type SortKey =
  | "name"
  | "code"
  | "kind"
  | "reg"
  | "status"
  | "parent"
  | "branches"
  | "departments"
  | "children"
  | "created";
export type SortDir = "asc" | "desc";
export type ColumnId =
  | "name"
  | "code"
  | "kind"
  | "reg"
  | "parent"
  | "branches"
  | "departments"
  | "children"
  | "status"
  | "created"
  | "actions";
export type BulkKind = "activate" | "deactivate" | "delete" | "restore";
export type ConfirmState = null | { kind: BulkKind; count: number; targets: CompanyDto[] };

export const RESTORE_ONE_MSG = "شرکت بازگردانی شد.";
export const BULK_SUCCESS: Record<BulkKind, (n: number) => string> = {
  activate: (n) => `${toFaDigits(n)} شرکت فعال شد.`,
  deactivate: (n) => `${toFaDigits(n)} شرکت غیرفعال شد.`,
  delete: (n) => `${toFaDigits(n)} شرکت حذف نرم شد.`,
  restore: (n) => `${toFaDigits(n)} شرکت بازگردانی شد.`,
};

export const COLS: { id: ColumnId; label: string; hideable?: boolean; sort?: SortKey }[] = [
  { id: "name", label: "نام شرکت", hideable: false, sort: "name" },
  { id: "code", label: "کد", sort: "code" },
  { id: "kind", label: "کاربرد", sort: "kind" },
  { id: "reg", label: "شماره ثبت", sort: "reg" },
  { id: "parent", label: "شرکت والد", sort: "parent" },
  { id: "branches", label: "شعب", sort: "branches" },
  { id: "departments", label: "واحدها", sort: "departments" },
  { id: "children", label: "زیرمجموعه", sort: "children" },
  { id: "status", label: "وضعیت", sort: "status" },
  { id: "created", label: "تاریخ ایجاد", sort: "created" },
  { id: "actions", label: "عملیات", hideable: false },
];

export type CompanyForm = {
  code: string;
  name: string;
  legal_name: string;
  trade_name: string;
  registration_number: string;
  economic_code: string;
  tax_identifier: string;
  entity_kind: string;
  is_primary: boolean;
  parent_company_id: string;
  is_active: boolean;
};

export const emptyForm = (): CompanyForm => ({
  code: "",
  name: "",
  legal_name: "",
  trade_name: "",
  registration_number: "",
  economic_code: "",
  tax_identifier: "",
  entity_kind: "OPERATING",
  is_primary: false,
  parent_company_id: "",
  is_active: true,
});

export function companyToForm(c: CompanyDto): CompanyForm {
  return {
    code: c.code ?? "",
    name: c.name ?? "",
    legal_name: c.legal_name ?? "",
    trade_name: c.trade_name ?? "",
    registration_number: c.registration_number ?? "",
    economic_code: c.economic_code ?? "",
    tax_identifier: c.tax_identifier ?? "",
    entity_kind: (c.entity_kind as string) || "OPERATING",
    is_primary: Boolean(c.is_primary),
    parent_company_id: c.parent_company_id ?? "",
    is_active: c.is_active !== false,
  };
}

export function displayName(c: CompanyDto) {
  return (c.legal_name || c.name || "—").trim() || "—";
}

export function fd(v?: string | null) {
  if (!v) return "—";
  try {
    return toFaDigits(
      new Intl.DateTimeFormat("fa-IR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(v))
    );
  } catch {
    return toFaDigits(v);
  }
}

export function sortValue(
  c: CompanyDto,
  key: SortKey,
  parentMap: Map<string, string>
): string | number {
  if (key === "name") return displayName(c).toLowerCase();
  if (key === "code") return (c.code ?? "").toLowerCase();
  if (key === "kind")
    return (ENTITY_KIND_LABELS[c.entity_kind ?? "OPERATING"] ?? "").toLowerCase();
  if (key === "reg") return c.registration_number ?? "";
  if (key === "parent")
    return (c.parent_company_id ? parentMap.get(c.parent_company_id) ?? "" : "").toLowerCase();
  if (key === "status") return c.is_active !== false ? 1 : 0;
  if (key === "branches") return Number(c.branches_count ?? 0);
  if (key === "departments") return Number(c.departments_count ?? 0);
  if (key === "children") return Number(c.children_count ?? 0);
  return c.created_at ? new Date(c.created_at).getTime() : 0;
}

export function IconAction({
  label,
  onClick,
  disabled,
  variant = "ghost",
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: "ghost" | "destructive";
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "h-7 w-7 shrink-0",
            variant === "destructive" &&
              "text-destructive hover:bg-destructive/10 hover:text-destructive"
          )}
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          aria-label={label}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}
