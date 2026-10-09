"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, Loader2, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { usePermission } from "@/auth";
import {
  useAccountTree,
  useCreateAccount,
  useDeleteAccount,
} from "../hooks/use-accounts";
import {
  ACCOUNT_TYPE_LABELS,
  FinancePermissions,
  type AccountTreeNode,
} from "../types";
import { ApiClientError } from "@/api";
import { cn, toFaDigits } from "@/shared/lib/utils";

/** ترتیب ثابت انواع حساب در نمایش گروه‌بندی‌شده */
const TYPE_ORDER = [1, 2, 3, 4, 5] as const;

const TYPE_META: Record<
  number,
  { label: string; tone: string; hint: string }
> = {
  1: {
    label: "دارایی",
    tone: "bg-sky-500/10 text-sky-800 dark:text-sky-300",
    hint: "موجودی نقد، بانک، مطالبات، موجودی کالا، دارایی ثابت",
  },
  2: {
    label: "بدهی",
    tone: "bg-amber-500/10 text-amber-800 dark:text-amber-300",
    hint: "حساب‌های پرداختنی، وام، پیش‌دریافت",
  },
  3: {
    label: "حقوق صاحبان سهام",
    tone: "bg-violet-500/10 text-violet-800 dark:text-violet-300",
    hint: "سرمایه، سود انباشته، اندوخته‌ها",
  },
  4: {
    label: "درآمد",
    tone: "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
    hint: "فروش، درآمد خدمات، سایر درآمدها",
  },
  5: {
    label: "هزینه",
    tone: "bg-rose-500/10 text-rose-800 dark:text-rose-300",
    hint: "بهای تمام‌شده، هزینه‌های عملیاتی و مالی",
  },
};

function countNodes(nodes: AccountTreeNode[]): number {
  let n = 0;
  for (const node of nodes) {
    n += 1;
    if (node.children?.length) n += countNodes(node.children);
  }
  return n;
}

/** گروه‌بندی ریشه‌های درخت بر اساس نوع حساب */
function groupRootsByType(
  roots: AccountTreeNode[]
): Record<number, AccountTreeNode[]> {
  const map: Record<number, AccountTreeNode[]> = {
    1: [],
    2: [],
    3: [],
    4: [],
    5: [],
  };
  for (const node of roots) {
    const t = Number(node.account_type) || 0;
    if (map[t]) map[t].push(node);
    else {
      // حساب با نوع نامعتبر را در دارایی نریز؛ نادیده بگیر
    }
  }
  return map;
}

function AccountTreeNodeRow({
  node,
  depth,
  canDelete,
  onDelete,
  expandedIds,
  toggleExpand,
}: {
  node: AccountTreeNode;
  depth: number;
  canDelete: boolean;
  onDelete: (id: string) => void;
  expandedIds: Set<string>;
  toggleExpand: (id: string) => void;
}) {
  const hasChildren = Boolean(node.children && node.children.length > 0);
  const expanded = expandedIds.has(node.account_id);
  const pad = 10 + depth * 18;

  return (
    <div className="select-none">
      <div
        className={cn(
          "group flex items-center gap-1.5 border-b border-border/40 py-1.5 pe-2 text-sm",
          depth === 0 ? "bg-muted/20" : "hover:bg-muted/30"
        )}
        style={{ paddingInlineStart: pad }}
      >
        {/* دکمه باز/بسته برای گره‌های دارای فرزند */}
        {hasChildren ? (
          <button
            type="button"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() => toggleExpand(node.account_id)}
            aria-expanded={expanded}
            title={expanded ? "بستن" : "باز کردن"}
          >
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronLeft className="h-3.5 w-3.5" />
            )}
          </button>
        ) : (
          <span className="inline-block h-6 w-6 shrink-0" aria-hidden />
        )}

        <span
          className="w-[4.5rem] shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground"
          title={node.account_code}
        >
          {toFaDigits(node.account_code)}
        </span>

        <span
          className={cn(
            "min-w-0 flex-1 truncate",
            hasChildren || !node.is_postable ? "font-medium" : ""
          )}
          title={node.name}
        >
          {node.name}
        </span>

        {node.is_postable ? (
          <span className="hidden shrink-0 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-700 dark:text-emerald-400 sm:inline">
            قابل ثبت
          </span>
        ) : (
          <span className="hidden shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline">
            کنترل
          </span>
        )}

        {hasChildren ? (
          <span className="hidden shrink-0 text-[10px] text-muted-foreground sm:inline">
            {toFaDigits(node.children!.length)} زیرمجموعه
          </span>
        ) : null}

        {canDelete && node.is_postable ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-destructive opacity-0 transition group-hover:opacity-100"
            title="حذف نرم"
            onClick={() => onDelete(node.account_id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <span className="inline-block h-7 w-7 shrink-0" aria-hidden />
        )}
      </div>

      {hasChildren && expanded
        ? node.children!.map((child) => (
            <AccountTreeNodeRow
              key={child.account_id}
              node={child}
              depth={depth + 1}
              canDelete={canDelete}
              onDelete={onDelete}
              expandedIds={expandedIds}
              toggleExpand={toggleExpand}
            />
          ))
        : null}
    </div>
  );
}

function TypeSection({
  typeId,
  roots,
  open,
  onToggle,
  canDelete,
  onDelete,
  expandedIds,
  toggleExpand,
}: {
  typeId: number;
  roots: AccountTreeNode[];
  open: boolean;
  onToggle: () => void;
  canDelete: boolean;
  onDelete: (id: string) => void;
  expandedIds: Set<string>;
  toggleExpand: (id: string) => void;
}) {
  const meta = TYPE_META[typeId] ?? {
    label: ACCOUNT_TYPE_LABELS[typeId] ?? String(typeId),
    tone: "bg-muted text-muted-foreground",
    hint: "",
  };
  const total = countNodes(roots);

  return (
    <section className="overflow-hidden rounded-xl border border-border/70 bg-card">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-right hover:bg-muted/40"
        aria-expanded={open}
      >
        <span
          className={cn(
            "rounded-md px-2 py-0.5 text-xs font-semibold",
            meta.tone
          )}
        >
          {meta.label}
        </span>
        <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
          {meta.hint}
        </span>
        <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
          {toFaDigits(total)} حساب
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open ? (
        <div className="border-t border-border/50">
          {roots.length === 0 ? (
            <p className="px-3 py-3 text-xs text-muted-foreground">
              هنوز حسابی در این گروه تعریف نشده است.
            </p>
          ) : (
            roots.map((node) => (
              <AccountTreeNodeRow
                key={node.account_id}
                node={node}
                depth={0}
                canDelete={canDelete}
                onDelete={onDelete}
                expandedIds={expandedIds}
                toggleExpand={toggleExpand}
              />
            ))
          )}
        </div>
      ) : null}
    </section>
  );
}

export function AccountsPage() {
  const canView = usePermission(FinancePermissions.coaView);
  const canCreate = usePermission(FinancePermissions.coaCreate);
  const canDelete = usePermission(FinancePermissions.coaDelete);

  const { data, isLoading, error, refetch } = useAccountTree();
  const createMut = useCreateAccount();
  const deleteMut = useDeleteAccount();

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState(1);
  const [formError, setFormError] = useState<string | null>(null);

  /** بخش‌های نوع باز؛ پیش‌فرض همه باز تا کاربر ساختار را ببیند */
  const [openTypes, setOpenTypes] = useState<Set<number>>(
    () => new Set(TYPE_ORDER)
  );
  /** گره‌های درخت باز */
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  const grouped = useMemo(
    () => groupRootsByType(data ?? []),
    [data]
  );

  function toggleType(t: number) {
    setOpenTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  }

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function expandAllInOpenTypes() {
    const ids = new Set<string>();
    function walk(nodes: AccountTreeNode[]) {
      for (const n of nodes) {
        if (n.children?.length) {
          ids.add(n.account_id);
          walk(n.children);
        }
      }
    }
    for (const t of TYPE_ORDER) {
      if (openTypes.has(t)) walk(grouped[t] ?? []);
    }
    setExpandedIds(ids);
  }

  function collapseAllNodes() {
    setExpandedIds(new Set());
  }

  async function handleCreate() {
    setFormError(null);
    try {
      await createMut.mutateAsync({
        account_code: code.trim(),
        name: name.trim(),
        account_type: type,
        is_postable: true,
        normal_balance: type === 4 || type === 2 || type === 3 ? 2 : 1,
      });
      setCode("");
      setName("");
      // بخش نوع مربوطه را باز نگه دار
      setOpenTypes((prev) => new Set(prev).add(type));
    } catch (e) {
      const msg =
        e instanceof ApiClientError
          ? e.message
          : e instanceof Error
            ? e.message
            : "خطا در ایجاد حساب";
      setFormError(msg);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("حذف نرم این حساب؟")) return;
    try {
      await deleteMut.mutateAsync(id);
    } catch (e) {
      alert(e instanceof Error ? e.message : "حذف ممکن نیست");
    }
  }

  if (!canView) {
    return (
      <div className="p-6 text-sm text-amber-700">
        مجوز مشاهده کدینگ را ندارید.
      </div>
    );
  }

  const hasAny =
    data &&
    data.length > 0 &&
    TYPE_ORDER.some((t) => (grouped[t] ?? []).length > 0);

  return (
    <div className="space-y-4">
      <PageHeader
        title="کدینگ حساب‌ها"
        description="درخت حساب‌های دفتر کل — گروه‌بندی بر اساس نوع"
        breadcrumbs={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "حسابداری", href: "/dashboard/finance" },
          { label: "کدینگ" },
        ]}
      />

      {canCreate ? (
        <div className="flex flex-wrap items-end gap-2 rounded-xl border bg-card p-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">کد</label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-28 font-mono"
              placeholder="۱۱۰۱"
            />
          </div>
          <div className="min-w-[140px] flex-1 space-y-1">
            <label className="text-xs text-muted-foreground">نام</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="نام حساب"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">نوع</label>
            <select
              className="h-9 rounded-md border bg-background px-2 text-sm"
              value={type}
              onChange={(e) => setType(Number(e.target.value))}
            >
              {Object.entries(ACCOUNT_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <Button
            size="sm"
            disabled={!code.trim() || !name.trim() || createMut.isPending}
            onClick={() => void handleCreate()}
          >
            {createMut.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            <span className="ms-1">افزودن</span>
          </Button>
          {formError ? (
            <p className="w-full text-xs text-destructive">{formError}</p>
          ) : null}
        </div>
      ) : null}

      {!isLoading && !error && hasAny ? (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <button
            type="button"
            className="rounded-md border px-2 py-1 hover:bg-muted"
            onClick={() => setOpenTypes(new Set(TYPE_ORDER))}
          >
            باز کردن همه گروه‌ها
          </button>
          <button
            type="button"
            className="rounded-md border px-2 py-1 hover:bg-muted"
            onClick={() => setOpenTypes(new Set())}
          >
            بستن همه گروه‌ها
          </button>
          <span className="mx-1 text-border">|</span>
          <button
            type="button"
            className="rounded-md border px-2 py-1 hover:bg-muted"
            onClick={expandAllInOpenTypes}
          >
            باز کردن زیرمجموعه‌ها
          </button>
          <button
            type="button"
            className="rounded-md border px-2 py-1 hover:bg-muted"
            onClick={collapseAllNodes}
          >
            بستن زیرمجموعه‌ها
          </button>
        </div>
      ) : null}

      {isLoading ? (
        <div className="flex items-center gap-2 rounded-xl border bg-card p-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> بارگذاری…
        </div>
      ) : error ? (
        <div className="rounded-xl border bg-card p-4 text-sm text-destructive">
          خطا در بارگذاری.{" "}
          <button
            type="button"
            className="underline"
            onClick={() => void refetch()}
          >
            تلاش مجدد
          </button>
        </div>
      ) : !hasAny ? (
        <div className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
          حسابی ثبت نشده. سیدر DemoFinanceCoaSeeder را اجرا کنید.
        </div>
      ) : (
        <div className="space-y-2">
          {TYPE_ORDER.map((t) => (
            <TypeSection
              key={t}
              typeId={t}
              roots={grouped[t] ?? []}
              open={openTypes.has(t)}
              onToggle={() => toggleType(t)}
              canDelete={canDelete}
              onDelete={(id) => void handleDelete(id)}
              expandedIds={expandedIds}
              toggleExpand={toggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
}
