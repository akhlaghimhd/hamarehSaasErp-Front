"use client";

import { useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
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

function AccountRows({
  nodes,
  depth,
  canDelete,
  onDelete,
}: {
  nodes: AccountTreeNode[];
  depth: number;
  canDelete: boolean;
  onDelete: (id: string) => void;
}) {
  return (
    <>
      {nodes.map((n) => (
        <div key={n.account_id}>
          <div
            className="flex items-center gap-2 border-b border-border/50 px-3 py-2 text-sm"
            style={{ paddingInlineStart: 12 + depth * 16 }}
          >
            <span className="font-mono text-xs text-muted-foreground w-16 shrink-0">
              {n.account_code}
            </span>
            <span className="flex-1 truncate">{n.name}</span>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {ACCOUNT_TYPE_LABELS[n.account_type as number] ?? n.account_type}
            </span>
            {n.is_postable ? (
              <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-700">
                قابل ثبت
              </span>
            ) : (
              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                کنترل
              </span>
            )}
            {canDelete && n.is_postable ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive"
                title="حذف نرم"
                onClick={() => onDelete(n.account_id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            ) : null}
          </div>
          {n.children && n.children.length > 0 ? (
            <AccountRows
              nodes={n.children}
              depth={depth + 1}
              canDelete={canDelete}
              onDelete={onDelete}
            />
          ) : null}
        </div>
      ))}
    </>
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
      <div className="p-6 text-sm text-amber-700">مجوز مشاهده کدینگ را ندارید.</div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="کدینگ حساب‌ها"
        description="درخت حساب‌های دفتر کل"
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
            <Input value={code} onChange={(e) => setCode(e.target.value)} className="w-28" />
          </div>
          <div className="space-y-1 flex-1 min-w-[140px]">
            <label className="text-xs text-muted-foreground">نام</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
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

      <div className="rounded-xl border bg-card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> بارگذاری…
          </div>
        ) : error ? (
          <div className="p-4 text-sm text-destructive">
            خطا در بارگذاری.{" "}
            <button type="button" className="underline" onClick={() => void refetch()}>
              تلاش مجدد
            </button>
          </div>
        ) : !data || data.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">
            حسابی ثبت نشده. سیدر DemoFinanceCoaSeeder را اجرا کنید.
          </div>
        ) : (
          <AccountRows
            nodes={data}
            depth={0}
            canDelete={canDelete}
            onDelete={(id) => void handleDelete(id)}
          />
        )}
      </div>
    </div>
  );
}
