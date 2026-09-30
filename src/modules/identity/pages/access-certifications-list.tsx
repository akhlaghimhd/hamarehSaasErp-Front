/** فهرست کمپین‌های بازبینی دسترسی */

"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CircleHelp,
  ClipboardCheck,
  Loader2,
  Plus,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/shared/components/layout/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { StatusChip } from "@/shared/components/data-display/status-chip";
import { EmptyState } from "@/shared/components/feedback/empty-state";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import { ApiClientError } from "@/api";
import { usePermission } from "@/auth";
import { toFaDigits } from "@/shared/lib/utils";
import { IdentityPermissions } from "../types";
import {
  accessCertificationService,
} from "../services/access-certification-service";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "پیش‌نویس",
  OPEN: "در حال بازبینی",
  COMPLETED: "تکمیل‌شده",
  CANCELLED: "لغو شده",
};

type SortKey = "name" | "code" | "status" | "due_at" | "created_at";
type SortDir = "asc" | "desc";

function jalaliToGregorian(jy: number, jm: number, jd: number): string {
  const gy = jy <= 979 ? 621 : 1600;
  jy -= jy <= 979 ? 0 : 979;
  let days =
    365 * jy +
    Math.floor(jy / 33) * 8 +
    Math.floor(((jy % 33) + 3) / 4) +
    78 +
    jd +
    (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);
  let gy2 = gy + 400 * Math.floor(days / 146097);
  days %= 146097;
  if (days > 36524) {
    gy2 += 100 * Math.floor(--days / 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy2 += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    gy2 += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let gd = days + 1;
  const sal_a = [
    0,
    31,
    (gy2 % 4 === 0 && gy2 % 100 !== 0) || gy2 % 400 === 0 ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];
  let gm = 0;
  for (gm = 1; gm <= 12 && gd > sal_a[gm]; gm++) gd -= sal_a[gm];
  return `${gy2}-${String(gm).padStart(2, "0")}-${String(gd).padStart(2, "0")}`;
}

function formatJalaliDateTime(value?: string | null): string {
  if (!value) return "—";
  try {
    return toFaDigits(
      new Intl.DateTimeFormat("fa-IR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(value))
    );
  } catch {
    return toFaDigits(String(value));
  }
}

function statusTone(status?: string): "success" | "warning" | "danger" | "neutral" {
  switch (String(status || "").toUpperCase()) {
    case "OPEN":
      return "warning";
    case "COMPLETED":
      return "success";
    case "CANCELLED":
      return "danger";
    default:
      return "neutral";
  }
}

export function AccessCertificationsListPage() {
  const canView = usePermission(IdentityPermissions.accessCertView);
  const canManage = usePermission(IdentityPermissions.accessCertManage);
  const router = useRouter();
  const qc = useQueryClient();

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [createOpen, setCreateOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [jy, setJy] = useState("");
  const [jm, setJm] = useState("");
  const [jd, setJd] = useState("");

  const formDirty = Boolean(
    code.trim() || name.trim() || description.trim() || jy || jm || jd
  );

  const { data = [], isLoading, isError, error } = useQuery({
    queryKey: ["identity", "access-certifications"],
    queryFn: () => accessCertificationService.list(),
    enabled: canView,
  });

  const createMut = useMutation({
    mutationFn: () => {
      let due: string | null = null;
      if (jy && jm && jd) {
        due = jalaliToGregorian(Number(jy), Number(jm), Number(jd));
      }
      return accessCertificationService.create({
        code: code.trim(),
        name: name.trim(),
        description: description.trim() || null,
        due_at: due,
      });
    },
    onSuccess: () => {
      toast.success("کمپین ایجاد شد");
      resetCreate();
      setCreateOpen(false);
      void qc.invalidateQueries({ queryKey: ["identity", "access-certifications"] });
    },
    onError: (e) =>
      toast.error(e instanceof ApiClientError ? e.message : "ایجاد کمپین ناموفق بود"),
  });

  const openMut = useMutation({
    mutationFn: (id: string) => accessCertificationService.open(id),
    onSuccess: (c) => {
      toast.success("کمپین باز شد");
      void qc.invalidateQueries({ queryKey: ["identity", "access-certifications"] });
      if (c?.campaign_id) {
        router.push(`/dashboard/identity/access-certifications/${c.campaign_id}`);
      }
    },
    onError: (e) =>
      toast.error(e instanceof ApiClientError ? e.message : "باز کردن کمپین ناموفق بود"),
  });

  const completeMut = useMutation({
    mutationFn: (id: string) => accessCertificationService.complete(id),
    onSuccess: () => {
      toast.success("کمپین تکمیل شد");
      void qc.invalidateQueries({ queryKey: ["identity", "access-certifications"] });
    },
    onError: (e) =>
      toast.error(e instanceof ApiClientError ? e.message : "تکمیل کمپین ناموفق بود"),
  });

  function resetCreate() {
    setCode("");
    setName("");
    setDescription("");
    setJy("");
    setJm("");
    setJd("");
  }

  const filteredSorted = useMemo(() => {
    let list = data;
    if (statusFilter !== "all") {
      list = list.filter((r) => String(r.status || "").toUpperCase() === statusFilter);
    }
    const term = q.trim().toLowerCase();
    if (term) {
      list = list.filter((r) =>
        [r.code, r.name, r.description, r.status].some((v) =>
          String(v ?? "").toLowerCase().includes(term)
        )
      );
    }
    return [...list].sort((a, b) => {
      const va = String((a as Record<string, unknown>)[sortKey] ?? "").toLowerCase();
      const vb = String((b as Record<string, unknown>)[sortKey] ?? "").toLowerCase();
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [data, statusFilter, q, sortKey, sortDir]);

  const total = filteredSorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filteredSorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  const currentJy = Number(
    new Intl.DateTimeFormat("fa-IR-u-nu-latn", { year: "numeric" }).format(new Date())
  );
  const yearOptions = Array.from({ length: 8 }, (_, i) => currentJy + i);

  if (!canView) {
    return (
      <EmptyState
        title="دسترسی ندارید"
        description="برای مشاهده بازبینی دسترسی، مجوز لازم را از مدیر سیستم دریافت کنید."
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <PageHeader
        title="بازبینی دسترسی"
        description="بررسی دوره‌ای نقش‌ها و دسترسی اعضای سازمان"
        icon={<ClipboardCheck className="h-5 w-5" />}
        breadcrumbs={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "هویت و دسترسی", href: "/dashboard/identity" },
          { label: "بازبینی دسترسی" },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button type="button" size="sm" variant="outline">
                  <CircleHelp className="me-1.5 h-4 w-4" />
                  راهنما
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md text-start">
                <DialogHeader>
                  <DialogTitle>راهنمای بازبینی دسترسی</DialogTitle>
                  <DialogDescription className="sr-only">توضیح کمپین بازبینی</DialogDescription>
                </DialogHeader>
                <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
                  <p>
                    با «باز کردن» کمپین، از نقش‌های فعلی همهٔ اعضای فعال عکس گرفته
                    می‌شود و تضادهای تفکیک وظایف علامت می‌خورد.
                  </p>
                  <p>
                    بعد برای هر نفر تصمیم می‌گیرید: تأیید، کاهش دسترسی، یا موکول به بعد.
                  </p>
                  <p>
                    شکاف‌های رایج: نقش‌های ناسازگار، دسترسی قدیمی بعد از جابه‌جایی شغلی،
                    یا کسی که هم ثبت و هم تأیید می‌کند.
                  </p>
                </div>
              </DialogContent>
            </Dialog>
            {canManage ? (
              <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="me-1.5 h-4 w-4" />
                کمپین جدید
              </Button>
            ) : null}
          </div>
        }
      />

      {isError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error instanceof Error ? error.message : "بارگذاری ناموفق بود"}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[12rem] flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-8 ps-8 text-sm"
            placeholder="جستجو در نام یا کد…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="h-8 w-[10rem]">
            <SelectValue placeholder="وضعیت" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه وضعیت‌ها</SelectItem>
            <SelectItem value="DRAFT">پیش‌نویس</SelectItem>
            <SelectItem value="OPEN">در حال بازبینی</SelectItem>
            <SelectItem value="COMPLETED">تکمیل‌شده</SelectItem>
          </SelectContent>
        </Select>
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b bg-card shadow-sm">
              <TableHead className="sticky top-0 z-20 w-10 bg-card px-2 text-center text-xs">#</TableHead>
              <TableHead className="sticky top-0 z-20 bg-card">
                <button type="button" className="inline-flex items-center gap-1 font-medium" onClick={() => toggleSort("name")}>
                  نام کمپین <SortIcon k="name" />
                </button>
              </TableHead>
              <TableHead className="sticky top-0 z-20 bg-card">
                <button type="button" className="inline-flex items-center gap-1 font-medium" onClick={() => toggleSort("code")}>
                  کد <SortIcon k="code" />
                </button>
              </TableHead>
              <TableHead className="sticky top-0 z-20 bg-card">
                <button type="button" className="inline-flex items-center gap-1 font-medium" onClick={() => toggleSort("status")}>
                  وضعیت <SortIcon k="status" />
                </button>
              </TableHead>
              <TableHead className="sticky top-0 z-20 bg-card">موعد</TableHead>
              <TableHead className="sticky top-0 z-20 bg-card text-end">عملیات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6} className="py-2"><Skeleton className="h-7 w-full" /></TableCell>
                </TableRow>
              ))
            ) : pageRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="p-0">
                  <EmptyState title="کمپینی ثبت نشده" description="با «کمپین جدید» اولین دوره بازبینی را شروع کنید." />
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((r, idx) => (
                <TableRow key={r.campaign_id}>
                  <TableCell className="px-2 py-1 text-center text-xs text-muted-foreground">
                    {toFaDigits((safePage - 1) * pageSize + idx + 1)}
                  </TableCell>
                  <TableCell className="px-2 py-1">
                    <button
                      type="button"
                      className="text-start text-sm font-medium hover:underline"
                      onClick={() => router.push(`/dashboard/identity/access-certifications/${r.campaign_id}`)}
                    >
                      {r.name || "—"}
                    </button>
                  </TableCell>
                  <TableCell className="px-2 py-1 font-mono text-xs">{r.code || "—"}</TableCell>
                  <TableCell className="px-2 py-1">
                    <StatusChip
                      label={STATUS_LABEL[String(r.status || "").toUpperCase()] || r.status || "—"}
                      tone={statusTone(r.status)}
                    />
                  </TableCell>
                  <TableCell className="px-2 py-1 text-xs text-muted-foreground">
                    {formatJalaliDateTime(r.due_at ? String(r.due_at) : null)}
                  </TableCell>
                  <TableCell className="px-2 py-1">
                    <div className="flex flex-wrap justify-end gap-1">
                      <Button type="button" size="sm" variant="outline" className="h-7 text-xs"
                        onClick={() => router.push(`/dashboard/identity/access-certifications/${r.campaign_id}`)}>
                        جزئیات
                      </Button>
                      {canManage && String(r.status).toUpperCase() === "DRAFT" ? (
                        <Button type="button" size="sm" className="h-7 text-xs" disabled={openMut.isPending}
                          onClick={() => void openMut.mutateAsync(r.campaign_id)}>
                          باز کردن
                        </Button>
                      ) : null}
                      {canManage && String(r.status).toUpperCase() === "OPEN" ? (
                        <Button type="button" size="sm" variant="secondary" className="h-7 text-xs" disabled={completeMut.isPending}
                          onClick={() => void completeMut.mutateAsync(r.campaign_id)}>
                          تکمیل
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {total === 0
            ? "موردی نیست"
            : `نمایش ${toFaDigits((safePage - 1) * pageSize + 1)}–${toFaDigits(Math.min(safePage * pageSize, total))} از ${toFaDigits(total)}`}
        </span>
        <div className="flex items-center gap-2">
          <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
            <SelectTrigger className="h-7 w-[4.5rem]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[10, 20, 50].map((n) => (
                <SelectItem key={n} value={String(n)}>{toFaDigits(n)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" size="sm" variant="outline" className="h-7" disabled={safePage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}>قبلی</Button>
          <span className="tabular-nums">{toFaDigits(safePage)} / {toFaDigits(totalPages)}</span>
          <Button type="button" size="sm" variant="outline" className="h-7" disabled={safePage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>بعدی</Button>
        </div>
      </div>

      <Sheet
        open={createOpen}
        onOpenChange={(open) => {
          if (!open && formDirty) return;
          if (!open) resetCreate();
          setCreateOpen(open);
        }}
      >
        <SheetContent
          side="right"
          className="flex h-full max-h-dvh w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md"
          onInteractOutside={(e) => { if (formDirty) e.preventDefault(); }}
          onPointerDownOutside={(e) => { if (formDirty) e.preventDefault(); }}
          onEscapeKeyDown={(e) => { if (formDirty) e.preventDefault(); }}
        >
          <SheetHeader className="shrink-0 space-y-1 border-b px-6 py-4 text-start">
            <SheetTitle>کمپین بازبینی جدید</SheetTitle>
            <SheetDescription>
              بعد از ایجاد، با «باز کردن» از همهٔ اعضا عکس نقش‌ها گرفته می‌شود.
            </SheetDescription>
          </SheetHeader>
          <form
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
            onSubmit={(e) => {
              e.preventDefault();
              if (!code.trim() || !name.trim()) {
                toast.error("کد و نام کمپین الزامی است");
                return;
              }
              void createMut.mutateAsync();
            }}
          >
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="ac-code">کد کمپین</Label>
                <Input id="ac-code" className="h-9" placeholder="مثال: cert-1405-01" value={code}
                  onChange={(e) => setCode(e.target.value)} dir="ltr" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ac-name">نام کمپین</Label>
                <Input id="ac-name" className="h-9" placeholder="مثال: بازبینی فصل بهار" value={name}
                  onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ac-desc">توضیح (اختیاری)</Label>
                <Input id="ac-desc" className="h-9" value={description}
                  onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>موعد بازبینی (شمسی، اختیاری)</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Select value={jy || undefined} onValueChange={setJy}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="سال" /></SelectTrigger>
                    <SelectContent>
                      {yearOptions.map((y) => (
                        <SelectItem key={y} value={String(y)}>{toFaDigits(y)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={jm || undefined} onValueChange={setJm}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="ماه" /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <SelectItem key={m} value={String(m)}>{toFaDigits(m)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={jd || undefined} onValueChange={setJd}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="روز" /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                        <SelectItem key={d} value={String(d)}>{toFaDigits(d)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <SheetFooter className="shrink-0 gap-2 border-t px-6 py-4 sm:flex-row">
              <Button type="button" variant="outline" onClick={() => { resetCreate(); setCreateOpen(false); }}>
                انصراف
              </Button>
              <Button type="submit" disabled={createMut.isPending}>
                {createMut.isPending ? (
                  <><Loader2 className="me-1.5 h-4 w-4 animate-spin" />در حال ثبت…</>
                ) : (
                  "ثبت کمپین"
                )}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
