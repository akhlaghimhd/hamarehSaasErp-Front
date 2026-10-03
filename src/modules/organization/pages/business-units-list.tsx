/** FE-ORG business units list */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown, ArrowUp, ArrowUpDown, Columns3, Layers, Link2, Loader2, Pencil, Plus,
  Power, PowerOff, RotateCcw, Search, Sparkles, Trash2, X,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { PageHeader } from "@/shared/components/layout/page-header";
import { StatusChip } from "@/shared/components/data-display/status-chip";
import { EmptyState } from "@/shared/components/feedback/empty-state";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { TooltipProvider } from "@/shared/components/ui/tooltip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/shared/components/ui/sheet";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/shared/components/ui/dialog";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
import { usePermission } from "@/auth";
import { ApiClientError, tokenStorage } from "@/api";
import { cn, toFaDigits } from "@/shared/lib/utils";
import { useCompanies } from "../hooks/use-companies";
import { businessUnitService, type BusinessUnitDto } from "../services/org-extended-service";
import { OrganizationPermissions } from "../types";
import { IconAction, fd } from "./companies-list-helpers";

const MSG_ERR = "╪د┘╪ش╪د┘à ╪د█î┘ ┌ر╪د╪▒ ┘à┘à┌ر┘ ┘╪┤╪». ┌ر┘à█î ╪ذ╪╣╪» ╪»┘ê╪ذ╪د╪▒┘ç ╪ز┘╪د╪┤ ┌ر┘█î╪».";
const COL_STORAGE = "organization.business-units.columns.v1";
const PAGE_SIZE = 20;

type StatusFilter = "all" | "active" | "inactive";
type MembershipFilter = "active" | "deleted";
type SortKey = "name" | "code" | "status" | "created" | "companies";
type SortDir = "asc" | "desc";
type ColumnId = "name" | "code" | "companies" | "status" | "created" | "actions";
type BulkKind = "activate" | "deactivate" | "delete" | "restore";
type LinkConfirm =
  | { kind: "leave_all" }
  | { kind: "swap_primary" }
  | { kind: "bulk_disconnect_primary"; names: string[] };
type BuForm = { code: string; name: string; description: string; is_active: boolean };

const COLS: { id: ColumnId; label: string; hideable?: boolean; sort?: SortKey }[] = [
  { id: "name", label: "┘╪د┘à", hideable: false, sort: "name" },
  { id: "code", label: "┌ر╪»", sort: "code" },
  { id: "companies", label: "╪┤╪▒┌ر╪زظî┘ç╪د█î ┘à╪ز╪╡┘", sort: "companies" },
  { id: "status", label: "┘ê╪╢╪╣█î╪ز", sort: "status" },
  { id: "created", label: "╪ز╪د╪▒█î╪« ╪د█î╪ش╪د╪»", sort: "created" },
  { id: "actions", label: "╪╣┘à┘█î╪د╪ز", hideable: false },
];

const emptyForm = (): BuForm => ({ code: "", name: "", description: "", is_active: true });

function rowToForm(r: BusinessUnitDto): BuForm {
  return { code: r.code ?? "", name: r.name ?? "", description: r.description ?? "", is_active: r.is_active !== false };
}

function hasAuthContext(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(tokenStorage.getAccessToken() && tokenStorage.getTenantId());
}

function formatCodeDisplay(code?: string | null): { text: string; dir: "ltr" | "rtl" } {
  const s = (code ?? "").trim();
  if (!s) return { text: "ظ¤", dir: "rtl" };
  if (/[A-Za-z]/.test(s)) return { text: s, dir: "ltr" };
  return { text: toFaDigits(s), dir: "rtl" };
}

function isRecentCreated(iso?: string | null, days = 3): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t <= days * 86_400_000;
}

function companyLabels(bu: BusinessUnitDto): string {
  const rows = bu.company_assignments ?? [];
  if (!rows.length) return "ظ¤";
  return rows.map((a) => {
    const n = a.company?.legal_name || a.company?.name || "╪┤╪▒┌ر╪ز";
    return a.is_primary ? `${n} (╪د╪╡┘█î)` : n;
  }).join("╪î ");
}

export function BusinessUnitsListPage() {
  const qc = useQueryClient();
  const canView = usePermission(OrganizationPermissions.businessUnitView) || usePermission(OrganizationPermissions.companyView);
  const canManage = usePermission(OrganizationPermissions.businessUnitManage) || usePermission(OrganizationPermissions.companyUpdate);
  const { data: companies } = useCompanies();

  const [membership, setMembership] = useState<MembershipFilter>("active");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("code");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [visibleCols, setVisibleCols] = useState<Set<ColumnId>>(() => {
    if (typeof window === "undefined") return new Set(COLS.map((c) => c.id));
    try {
      const raw = localStorage.getItem(COL_STORAGE);
      if (raw) {
        const arr = JSON.parse(raw) as ColumnId[];
        if (Array.isArray(arr) && arr.length) return new Set(arr);
      }
    } catch { /* ignore */ }
    return new Set(COLS.map((c) => c.id));
  });

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<BusinessUnitDto | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<BusinessUnitDto | null>(null);
  const [assignTargets, setAssignTargets] = useState<BusinessUnitDto[]>([]);
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<Set<string>>(new Set());
  const [bulkLinkMode, setBulkLinkMode] = useState<"connect" | "disconnect">("connect");
  const [primaryCompanyId, setPrimaryCompanyId] = useState("");
  const [confirm, setConfirm] = useState<null | { kind: BulkKind; targets: BusinessUnitDto[] }>(null);
  const [linkConfirm, setLinkConfirm] = useState<LinkConfirm | null>(null);
  const [busy, setBusy] = useState(false);
  const form = useForm<BuForm>({ defaultValues: emptyForm() });

  useEffect(() => {
    if (primaryCompanyId && !selectedCompanyIds.has(primaryCompanyId)) {
      setPrimaryCompanyId("");
    }
  }, [selectedCompanyIds, primaryCompanyId]);

  const listQuery = useQuery({
    queryKey: ["org", "business-units", membership],
    queryFn: () => businessUnitService.list({ membership }),
    enabled: canView && hasAuthContext(),
    placeholderData: (prev) => prev,
  });
  const rows = listQuery.data ?? [];

  useEffect(() => {
    try { localStorage.setItem(COL_STORAGE, JSON.stringify([...visibleCols])); } catch { /* ignore */ }
  }, [visibleCols]);

  useEffect(() => {
    setPage(1);
    setSelected(new Set());
  }, [membership, statusFilter, search, sortKey, sortDir]);

  const filtered = useMemo(() => {
    let list = [...rows];
    if (statusFilter === "active") list = list.filter((r) => r.is_active !== false);
    if (statusFilter === "inactive") list = list.filter((r) => r.is_active === false);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((r) =>
        (r.name ?? "").toLowerCase().includes(q) ||
        (r.code ?? "").toLowerCase().includes(q) ||
        (r.description ?? "").toLowerCase().includes(q) ||
        companyLabels(r).toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      let av: string | number = "";
      let bv: string | number = "";
      if (sortKey === "name") { av = (a.name ?? "").toLowerCase(); bv = (b.name ?? "").toLowerCase(); }
      else if (sortKey === "code") { av = (a.code ?? "").toLowerCase(); bv = (b.code ?? "").toLowerCase(); }
      else if (sortKey === "status") { av = a.is_active !== false ? 1 : 0; bv = b.is_active !== false ? 1 : 0; }
      else if (sortKey === "companies") { av = a.company_assignments?.length ?? 0; bv = b.company_assignments?.length ?? 0; }
      else { av = a.created_at ? new Date(a.created_at).getTime() : 0; bv = b.created_at ? new Date(b.created_at).getTime() : 0; }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [rows, statusFilter, search, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />;
  }

  function openCreate() { setEditing(null); form.reset(emptyForm()); setSheetOpen(true); }
  function openEdit(row: BusinessUnitDto) { setEditing(row); form.reset(rowToForm(row)); setSheetOpen(true); }

  function openAssign(row: BusinessUnitDto) {
    if (row.is_active === false) {
      toast.message("┘ê╪د╪ص╪» ╪║█î╪▒┘╪╣╪د┘ ╪▒╪د ┘┘à█îظî╪ز┘ê╪د┘ ╪ذ┘ç ╪┤╪▒┌ر╪ز ┘à╪ز╪╡┘ ┌ر╪▒╪». ╪د╪ذ╪ز╪»╪د ╪ت┘ ╪▒╪د ┘╪╣╪د┘ ┌ر┘█î╪».");
      return;
    }
    setAssignTarget(row);
    setAssignTargets([]);
    setBulkLinkMode("connect");
    setSelectedCompanyIds(new Set((row.company_assignments ?? []).map((a) => a.company_id)));
    setPrimaryCompanyId((row.company_assignments ?? []).find((a) => a.is_primary)?.company_id ?? "");
    setAssignOpen(true);
  }

  function openAssignBulk(targets: BusinessUnitDto[]) {
    if (!targets.length) return;
    const active = targets.filter((r) => r.is_active !== false);
    const skipped = targets.length - active.length;
    if (!active.length) {
      toast.message("┘ç█î┌ ┘ê╪د╪ص╪» ┘╪╣╪د┘█î ╪»╪▒ ╪د┘╪ز╪«╪د╪ذ ┘█î╪│╪ز╪ؤ ┘ê╪د╪ص╪» ╪║█î╪▒┘╪╣╪د┘ ╪▒╪د ┘┘à█îظî╪ز┘ê╪د┘ ╪ذ┘ç ╪┤╪▒┌ر╪ز ┘ê╪╡┘ ┌ر╪▒╪».");
      return;
    }
    if (skipped > 0) toast.message(`${toFaDigits(skipped)} ┘ê╪د╪ص╪» ╪║█î╪▒┘╪╣╪د┘ ╪د╪▓ ╪╣┘à┘█î╪د╪ز ┌ر┘╪د╪▒ ┌»╪░╪د╪┤╪ز┘ç ╪┤╪».`);
    setAssignTarget(null);
    setAssignTargets(active);
    setBulkLinkMode("connect");
    setSelectedCompanyIds(new Set());
    setPrimaryCompanyId("");
    setAssignOpen(true);
  }

  async function submitForm(v: BuForm) {
    if (!canManage) return;
    setBusy(true);
    try {
      if (editing) {
        await businessUnitService.update(editing.business_unit_id, {
          code: v.code.trim(), name: v.name.trim(), description: v.description.trim() || undefined, is_active: v.is_active,
        });
        toast.success("┘ê╪د╪ص╪» ┌ر╪│╪ذظî┘ê┌ر╪د╪▒ ╪ذ┘çظî╪▒┘ê╪▓ ╪┤╪»");
      } else {
        await businessUnitService.create({
          code: v.code.trim(), name: v.name.trim(), description: v.description.trim() || undefined, is_active: v.is_active,
        });
        toast.success("┘ê╪د╪ص╪» ┌ر╪│╪ذظî┘ê┌ر╪د╪▒ ╪س╪ذ╪ز ╪┤╪»");
      }
      setSheetOpen(false);
      await qc.invalidateQueries({ queryKey: ["org", "business-units"] });
    } catch (e) {
      toast.error(e instanceof ApiClientError && e.message ? e.message : MSG_ERR);
    } finally { setBusy(false); }
  }

  async function submitAssign(opts?: { skipLinkConfirm?: boolean }) {
    if (!canManage) return;
    const companyIds = [...selectedCompanyIds];
    const skip = !!opts?.skipLinkConfirm;

    if (assignTarget && assignTargets.length === 0) {
      if (assignTarget.is_active === false) {
        toast.message("┘ê╪د╪ص╪» ╪║█î╪▒┘╪╣╪د┘ ╪▒╪د ┘┘à█îظî╪ز┘ê╪د┘ ╪ذ┘ç ╪┤╪▒┌ر╪ز ┘à╪ز╪╡┘ ┌ر╪▒╪».");
        return;
      }
      if (companyIds.length > 0 && primaryCompanyId && !companyIds.includes(primaryCompanyId)) {
        toast.message("╪┤╪▒┌ر╪ز ╪د╪╡┘█î ╪ذ╪د█î╪» █î┌ر█î ╪د╪▓ ╪┤╪▒┌ر╪زظî┘ç╪د█î ┘à╪ز╪╡┘ ╪ذ╪د╪┤╪».");
        return;
      }
      const prevPrimary = (assignTarget.company_assignments ?? []).find((a) => a.is_primary)?.company_id;
      const removingPrimary = !!prevPrimary && !companyIds.includes(prevPrimary);
      if (removingPrimary && companyIds.length > 0 && !primaryCompanyId) {
        toast.message("╪┤╪▒┌ر╪ز ╪د╪╡┘█î ┘é╪╖╪╣ ┘à█îظî╪┤┘ê╪». ┘╪╖┘╪د┘ï ╪┤╪▒┌ر╪ز ╪د╪╡┘█î ╪ش╪»█î╪» ╪▒╪د ╪د┘╪ز╪«╪د╪ذ ┌ر┘█î╪».");
        return;
      }
      if (!skip && removingPrimary && companyIds.length === 0) {
        setLinkConfirm({ kind: "leave_all" });
        return;
      }
      if (!skip && removingPrimary && companyIds.length > 0 && primaryCompanyId) {
        setLinkConfirm({ kind: "swap_primary" });
        return;
      }
      setBusy(true);
      try {
        const primary = primaryCompanyId && companyIds.includes(primaryCompanyId) ? primaryCompanyId : null;
        const res = await businessUnitService.syncCompanies(assignTarget.business_unit_id, companyIds, primary);
        const att = res?.attached ?? 0;
        const det = res?.detached ?? 0;
        if (att === 0 && det === 0) toast.message("╪ز╪║█î█î╪▒█î ╪»╪▒ ╪د╪ز╪╡╪د┘╪د╪ز ╪د╪╣┘à╪د┘ ┘╪┤╪».");
        else {
          const parts: string[] = [];
          if (att) parts.push(`${toFaDigits(att)} ╪د╪ز╪╡╪د┘ ╪ش╪»█î╪»`);
          if (det) parts.push(`${toFaDigits(det)} ╪د┘┘╪╡╪د┘`);
          toast.success(parts.join(" ┘ê ") + " ╪س╪ذ╪ز ╪┤╪».");
        }
        setAssignOpen(false);
        setLinkConfirm(null);
        await qc.invalidateQueries({ queryKey: ["org", "business-units"] });
      } catch (e) {
        toast.error(e instanceof ApiClientError && e.message ? e.message : MSG_ERR);
      } finally { setBusy(false); }
      return;
    }

    const targets = assignTargets;
    if (!targets.length) return;
    if (!companyIds.length) { toast.message("╪ص╪»╪د┘é┘ █î┌ر ╪┤╪▒┌ر╪ز ╪▒╪د ╪د┘╪ز╪«╪د╪ذ ┌ر┘█î╪»."); return; }

    if (!skip && bulkLinkMode === "disconnect") {
      const affected: string[] = [];
      for (const bu of targets) {
        const prim = (bu.company_assignments ?? []).find((a) => a.is_primary)?.company_id;
        if (prim && companyIds.includes(prim)) affected.push(bu.name || bu.code);
      }
      if (affected.length) {
        setLinkConfirm({ kind: "bulk_disconnect_primary", names: affected });
        return;
      }
    }

    if (bulkLinkMode === "connect" && primaryCompanyId && !companyIds.includes(primaryCompanyId)) {
      toast.message("╪┤╪▒┌ر╪ز ╪د╪╡┘█î ╪ذ╪د█î╪» ╪»╪▒ ┘┘ç╪▒╪│╪ز ╪┤╪▒┌ر╪زظî┘ç╪د█î ╪د┘╪ز╪«╪د╪ذظî╪┤╪»┘ç ╪ذ╪د╪┤╪».");
      return;
    }

    setBusy(true);
    let ok = 0;
    let skipped = 0;
    try {
      for (const bu of targets) {
        if (bu.is_active === false && bulkLinkMode === "connect") { skipped += 1; continue; }
        const linked = new Set((bu.company_assignments ?? []).map((a) => a.company_id));
        for (const cid of companyIds) {
          try {
            if (bulkLinkMode === "connect") {
              if (linked.has(cid)) { skipped += 1; continue; }
              const makePrimary = !!primaryCompanyId && cid === primaryCompanyId;
              await businessUnitService.assignCompany(bu.business_unit_id, cid, makePrimary);
              ok += 1;
            } else {
              if (!linked.has(cid)) { skipped += 1; continue; }
              await businessUnitService.unassignCompany(bu.business_unit_id, cid);
              ok += 1;
            }
          } catch { skipped += 1; }
        }
      }
      if (ok) {
        toast.success(bulkLinkMode === "connect" ? `${toFaDigits(ok)} ╪د╪ز╪╡╪د┘ ╪د┘╪ش╪د┘à ╪┤╪».` : `${toFaDigits(ok)} ╪د┘┘╪╡╪د┘ ╪د┘╪ش╪د┘à ╪┤╪».`);
        setAssignOpen(false);
        setAssignTargets([]);
        setSelected(new Set());
        setLinkConfirm(null);
        await qc.invalidateQueries({ queryKey: ["org", "business-units"] });
      } else if (skipped) {
        toast.message(bulkLinkMode === "connect"
          ? "┘ç┘à┘ç┘¤ ╪ش┘╪زظî┘ç╪د ╪د╪▓ ┘é╪ذ┘ ┘à╪ز╪╡┘ ╪ذ┘ê╪»┘╪» █î╪د ┘ê╪د╪ص╪» ╪║█î╪▒┘╪╣╪د┘ ╪د╪│╪ز."
          : "┘ç█î┌ ╪د╪ز╪╡╪د┘ ┘╪╣╪د┘█î ╪ذ╪▒╪د█î ╪د┘┘╪╡╪د┘ █î╪د┘╪ز ┘╪┤╪».");
      } else toast.error(MSG_ERR);
      if (ok && skipped) toast.message(`${toFaDigits(skipped)} ┘à┘ê╪▒╪» ╪ذ┘çظî╪«╪د╪╖╪▒ ╪ز┌ر╪▒╪د╪▒█î ╪ذ┘ê╪»┘ █î╪د ┘ê╪╢╪╣█î╪ز ╪▒╪» ╪┤╪».`);
    } finally { setBusy(false); }
  }

  function requestBulk(kind: BulkKind, targets: BusinessUnitDto[]) {
    if (!targets.length) {
      if (kind === "activate") toast.message("┘ç┘à┘ç┘¤ ┘à┘ê╪د╪▒╪» ╪د┘╪ز╪«╪د╪ذظî╪┤╪»┘ç ╪د╪▓ ┘é╪ذ┘ ┘╪╣╪د┘ ┘ç╪│╪ز┘╪».");
      else if (kind === "deactivate") toast.message("┘ç┘à┘ç┘¤ ┘à┘ê╪د╪▒╪» ╪د┘╪ز╪«╪د╪ذظî╪┤╪»┘ç ╪د╪▓ ┘é╪ذ┘ ╪║█î╪▒┘╪╣╪د┘ ┘ç╪│╪ز┘╪».");
      else if (kind === "delete") toast.message("┘à┘ê╪▒╪»█î ╪ذ╪▒╪د█î ╪ص╪░┘ ╪د┘╪ز╪«╪د╪ذ ┘╪┤╪»┘ç ╪د╪│╪ز.");
      else if (kind === "restore") toast.message("┘à┘ê╪▒╪»█î ╪ذ╪▒╪د█î ╪ذ╪د╪▓┌»╪▒╪»╪د┘█î ╪د┘╪ز╪«╪د╪ذ ┘╪┤╪»┘ç ╪د╪│╪ز.");
      return;
    }
    setConfirm({ kind, targets });
  }

  async function runBulk() {
    if (!confirm || !canManage) return;
    const { kind, targets } = confirm;
    setBusy(true);
    let ok = 0;
    try {
      for (const t of targets) {
        try {
          if (kind === "activate" || kind === "deactivate") {
            await businessUnitService.update(t.business_unit_id, {
              code: t.code, name: t.name, description: t.description ?? undefined, is_active: kind === "activate",
            });
          } else if (kind === "delete") await businessUnitService.softDelete(t.business_unit_id);
          else await businessUnitService.restore(t.business_unit_id);
          ok += 1;
        } catch { /* continue */ }
      }
      if (ok) {
        const n = toFaDigits(ok);
        if (kind === "activate") toast.success(ok === 1 ? "█▒ ┘à┘ê╪▒╪» ┘╪╣╪د┘ ╪┤╪»." : `${n} ┘à┘ê╪▒╪» ┘╪╣╪د┘ ╪┤╪».`);
        else if (kind === "deactivate") toast.success(ok === 1 ? "█▒ ┘à┘ê╪▒╪» ╪║█î╪▒┘╪╣╪د┘ ╪┤╪»." : `${n} ┘à┘ê╪▒╪» ╪║█î╪▒┘╪╣╪د┘ ╪┤╪».`);
        else if (kind === "delete") toast.success(ok === 1 ? "█▒ ┘à┘ê╪▒╪» ╪ص╪░┘ ╪┤╪»." : `${n} ┘à┘ê╪▒╪» ╪ص╪░┘ ╪┤╪».`);
        else toast.success(ok === 1 ? "█▒ ┘à┘ê╪▒╪» ╪ذ╪د╪▓┌»╪▒╪»╪د┘█î ╪┤╪»." : `${n} ┘à┘ê╪▒╪» ╪ذ╪د╪▓┌»╪▒╪»╪د┘█î ╪┤╪».`);
      } else toast.error(MSG_ERR);
      setConfirm(null);
      setSelected(new Set());
      await qc.invalidateQueries({ queryKey: ["org", "business-units"] });
    } finally { setBusy(false); }
  }

  const allPageSelected = pageRows.length > 0 && pageRows.every((r) => selected.has(r.business_unit_id));

  if (!canView) {
    return (
      <div className="space-y-6">
        <PageHeader title="┘ê╪د╪ص╪»┘ç╪د█î ┌ر╪│╪ذظî┘ê┌ر╪د╪▒" description="╪ذ╪«╪┤ظî╪ذ┘╪»█î ┘à╪»█î╪▒█î╪ز█î ╪ذ╪▒╪د█î ┌»╪▓╪د╪▒╪┤ ┘ê ┌ر┘╪ز╪▒┘ ╪╣┘à┘┌ر╪▒╪»" breadcrumbs={[{ label: "╪│╪د╪▓┘à╪د┘", href: "/dashboard/organization" }, { label: "┘ê╪د╪ص╪» ┌ر╪│╪ذظî┘ê┌ر╪د╪▒" }]} icon={<Layers className="h-4 w-4" />} />
        <EmptyState title="╪»╪│╪ز╪▒╪│█î ┘╪»╪د╪▒█î╪»" description="╪ذ╪▒╪د█î ┘à╪┤╪د┘ç╪»┘ç ╪د█î┘ ╪ذ╪«╪┤ ┘à╪ش┘ê╪▓ ┘╪د╪▓┘à ╪▒╪د ┘╪»╪د╪▒█î╪»." />
      </div>
    );
  }

  const showSkeleton = listQuery.isLoading && !listQuery.data;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6">
        <PageHeader
          title="┘ê╪د╪ص╪»┘ç╪د█î ┌ر╪│╪ذظî┘ê┌ر╪د╪▒"
          description="╪ذ╪«╪┤ظî╪ذ┘╪»█î ┘à╪»█î╪▒█î╪ز█î ┘à╪│╪ز┘é┘ ╪د╪▓ ╪│╪د╪«╪ز╪د╪▒ ╪ص┘é┘ê┘é█î ╪ذ╪▒╪د█î ┌»╪▓╪د╪▒╪┤ ┘ê ┌ر┘╪ز╪▒┘ ╪╣┘à┘┌ر╪▒╪»"
          breadcrumbs={[{ label: "╪│╪د╪▓┘à╪د┘", href: "/dashboard/organization" }, { label: "┘ê╪د╪ص╪» ┌ر╪│╪ذظî┘ê┌ر╪د╪▒" }]}
          icon={<Layers className="h-4 w-4" />}
          actions={canManage && membership === "active" ? (<Button size="sm" onClick={openCreate}><Plus className="h-4 w-4" /> ┘ê╪د╪ص╪» ╪ش╪»█î╪»</Button>) : null}
        />

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="h-9 ps-9" placeholder="╪ش╪│╪ز╪ش┘ê ╪»╪▒ ┘╪د┘à╪î ┌ر╪»╪î ╪ز┘ê╪╢█î╪صظخ" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={membership} onValueChange={(v) => setMembership(v as MembershipFilter)}>
            <SelectTrigger className="h-9 w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">┘à┘ê╪د╪▒╪» ╪ش╪د╪▒█î</SelectItem>
              <SelectItem value="deleted">╪ص╪░┘ظî╪┤╪»┘çظî┘ç╪د</SelectItem>
            </SelectContent>
          </Select>
          {membership === "active" ? (
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="h-9 w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">┘ç┘à┘ç ┘ê╪╢╪╣█î╪زظî┘ç╪د</SelectItem>
                <SelectItem value="active">┘╪╣╪د┘</SelectItem>
                <SelectItem value="inactive">╪║█î╪▒┘╪╣╪د┘</SelectItem>
              </SelectContent>
            </Select>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9"><Columns3 className="h-4 w-4" /> ╪│╪ز┘ê┘ظî┘ç╪د</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>┘┘à╪د█î╪┤ ╪│╪ز┘ê┘</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {COLS.map((c) => (
                <DropdownMenuItem key={c.id} onSelect={(e) => {
                  e.preventDefault();
                  if (c.hideable === false) return;
                  setVisibleCols((prev) => {
                    const next = new Set(prev);
                    if (next.has(c.id)) next.delete(c.id); else next.add(c.id);
                    next.add("name"); next.add("actions");
                    return next;
                  });
                }}>
                  <Checkbox checked={visibleCols.has(c.id)} className="ms-0 me-2" />{c.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {selected.size > 0 && canManage ? (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
            <span className="text-muted-foreground">{toFaDigits(selected.size)} ┘à┘ê╪▒╪» ╪د┘╪ز╪«╪د╪ذظî╪┤╪»┘ç</span>
            {membership === "active" ? (
              <>
                <Button size="sm" variant="outline" className="h-8" disabled={busy} onClick={() => requestBulk("activate", rows.filter((r) => selected.has(r.business_unit_id) && r.is_active === false))}><Power className="h-3.5 w-3.5" /> ┘╪╣╪د┘ظî╪│╪د╪▓█î</Button>
                <Button size="sm" variant="outline" className="h-8" disabled={busy} onClick={() => requestBulk("deactivate", rows.filter((r) => selected.has(r.business_unit_id) && r.is_active !== false))}><PowerOff className="h-3.5 w-3.5" /> ╪║█î╪▒┘╪╣╪د┘ظî╪│╪د╪▓█î</Button>
                <Button size="sm" variant="outline" className="h-8" disabled={busy} onClick={() => openAssignBulk(rows.filter((r) => selected.has(r.business_unit_id)))}><Link2 className="h-3.5 w-3.5" /> ╪د╪ز╪╡╪د┘ / ╪د┘┘╪╡╪د┘</Button>
                <Button size="sm" variant="destructive" className="h-8" disabled={busy} onClick={() => requestBulk("delete", rows.filter((r) => selected.has(r.business_unit_id)))}><Trash2 className="h-3.5 w-3.5" /> ╪ص╪░┘</Button>
              </>
            ) : (
              <Button size="sm" variant="outline" className="h-8" disabled={busy} onClick={() => requestBulk("restore", rows.filter((r) => selected.has(r.business_unit_id)))}><RotateCcw className="h-3.5 w-3.5" /> ╪ذ╪د╪▓┌»╪▒╪»╪د┘█î ┌»╪▒┘ê┘ç█î</Button>
            )}
            <Button size="sm" variant="ghost" className="h-8 ms-auto" onClick={() => setSelected(new Set())}><X className="h-3.5 w-3.5" /> ┘╪║┘ê ╪د┘╪ز╪«╪د╪ذ</Button>
          </div>
        ) : null}

        <div className={cn("rounded-xl border bg-card", listQuery.isFetching && listQuery.data ? "opacity-70 transition-opacity" : "")}>
          {showSkeleton ? (
            <div className="space-y-2 p-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : listQuery.isError ? (
            <div className="p-6 text-sm text-destructive">
              {listQuery.error instanceof ApiClientError ? listQuery.error.message : MSG_ERR}
              <Button variant="outline" size="sm" className="ms-2" onClick={() => void listQuery.refetch()}>╪ز┘╪د╪┤ ┘à╪ش╪»╪»</Button>
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Layers}
              title={membership === "deleted" ? "╪ص╪░┘ظî╪┤╪»┘çظî╪د█î ┘█î╪│╪ز" : "┘ê╪د╪ص╪» ┌ر╪│╪ذظî┘ê┌ر╪د╪▒█î ╪س╪ذ╪ز ┘╪┤╪»┘ç"}
              description={membership === "deleted" ? "┘à┘ê╪▒╪»█î ╪»╪▒ ╪│╪╖┘ ╪ص╪░┘ ┘█î╪│╪ز." : "╪ذ╪▒╪د█î ╪┤╪▒┘ê╪╣╪î ╪د┘ê┘█î┘ ┘ê╪د╪ص╪» ┌ر╪│╪ذظî┘ê┌ر╪د╪▒ ╪▒╪د ╪س╪ذ╪ز ┌ر┘█î╪»."}
              actionLabel={canManage && membership === "active" ? "┘ê╪د╪ص╪» ╪ش╪»█î╪»" : undefined}
              onAction={canManage && membership === "active" ? openCreate : undefined}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox checked={allPageSelected} onCheckedChange={(v) => {
                      setSelected((prev) => {
                        const next = new Set(prev);
                        pageRows.forEach((r) => { if (v) next.add(r.business_unit_id); else next.delete(r.business_unit_id); });
                        return next;
                      });
                    }} />
                  </TableHead>
                  {COLS.filter((c) => visibleCols.has(c.id)).map((c) => (
                    <TableHead key={c.id}>
                      {c.sort ? (
                        <button type="button" className="inline-flex items-center gap-1 font-medium" onClick={() => toggleSort(c.sort!)}>
                          {c.label}<SortIcon k={c.sort} />
                        </button>
                      ) : c.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map((r) => {
                  const codeDisp = formatCodeDisplay(r.code);
                  return (
                    <TableRow key={r.business_unit_id} data-state={selected.has(r.business_unit_id) ? "selected" : undefined}>
                      <TableCell>
                        <Checkbox checked={selected.has(r.business_unit_id)} onCheckedChange={(v) => {
                          setSelected((prev) => {
                            const next = new Set(prev);
                            if (v) next.add(r.business_unit_id); else next.delete(r.business_unit_id);
                            return next;
                          });
                        }} />
                      </TableCell>
                      {visibleCols.has("name") ? (
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-medium">{r.name || "ظ¤"}</span>
                            {isRecentCreated(r.created_at) ? (
                              <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                                <Sparkles className="h-3 w-3" /> ╪ز╪د╪▓┘ç
                              </span>
                            ) : null}
                          </div>
                          {r.description ? <div className="mt-0.5 max-w-xs truncate text-xs text-muted-foreground">{r.description}</div> : null}
                        </TableCell>
                      ) : null}
                      {visibleCols.has("code") ? <TableCell><span className="font-mono text-xs" dir={codeDisp.dir}>{codeDisp.text}</span></TableCell> : null}
                      {visibleCols.has("companies") ? <TableCell className="max-w-[220px] text-sm text-muted-foreground">{companyLabels(r)}</TableCell> : null}
                      {visibleCols.has("status") ? (
                        <TableCell>
                          <StatusChip label={r.is_active !== false ? "┘╪╣╪د┘" : "╪║█î╪▒┘╪╣╪د┘"} tone={r.is_active !== false ? "success" : "neutral"} />
                        </TableCell>
                      ) : null}
                      {visibleCols.has("created") ? <TableCell className="text-sm text-muted-foreground">{fd(r.created_at)}</TableCell> : null}
                      {visibleCols.has("actions") ? (
                        <TableCell>
                          <div className="flex items-center gap-0.5">
                            {membership === "active" && canManage ? (
                              <>
                                <IconAction label="┘ê█î╪▒╪د█î╪┤" onClick={() => openEdit(r)}><Pencil className="h-3.5 w-3.5" /></IconAction>
                                <IconAction label="┘à╪»█î╪▒█î╪ز ╪د╪ز╪╡╪د┘ ╪┤╪▒┌ر╪ز" onClick={() => openAssign(r)}><Link2 className="h-3.5 w-3.5" /></IconAction>
                                {r.is_active !== false ? (
                                  <IconAction label="╪║█î╪▒┘╪╣╪د┘" onClick={() => requestBulk("deactivate", [r])}><PowerOff className="h-3.5 w-3.5" /></IconAction>
                                ) : (
                                  <IconAction label="┘╪╣╪د┘" onClick={() => requestBulk("activate", [r])}><Power className="h-3.5 w-3.5" /></IconAction>
                                )}
                                <IconAction label="╪ص╪░┘" variant="destructive" onClick={() => requestBulk("delete", [r])}><Trash2 className="h-3.5 w-3.5" /></IconAction>
                              </>
                            ) : null}
                            {membership === "deleted" && canManage ? (
                              <IconAction label="╪ذ╪د╪▓┌»╪▒╪»╪د┘█î" onClick={() => requestBulk("restore", [r])}><RotateCcw className="h-3.5 w-3.5" /></IconAction>
                            ) : null}
                          </div>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        {filtered.length > PAGE_SIZE ? (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{toFaDigits((page - 1) * PAGE_SIZE + 1)}ظô{toFaDigits(Math.min(page * PAGE_SIZE, filtered.length))} ╪د╪▓ {toFaDigits(filtered.length)}</span>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>┘é╪ذ┘█î</Button>
              <Button size="sm" variant="outline" disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)}>╪ذ╪╣╪»█î</Button>
            </div>
          </div>
        ) : null}

        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent side="right" className="flex w-full flex-col sm:max-w-lg">
            <SheetHeader><SheetTitle>{editing ? "┘ê█î╪▒╪د█î╪┤ ┘ê╪د╪ص╪» ┌ر╪│╪ذظî┘ê┌ر╪د╪▒" : "┘ê╪د╪ص╪» ┌ر╪│╪ذظî┘ê┌ر╪د╪▒ ╪ش╪»█î╪»"}</SheetTitle></SheetHeader>
            <form className="flex flex-1 flex-col" onSubmit={form.handleSubmit(submitForm)}>
              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5"><Label>┌ر╪» *</Label><Input dir="ltr" className="h-9" {...form.register("code", { required: true })} /></div>
                  <div className="space-y-1.5"><Label>┘╪د┘à *</Label><Input className="h-9" {...form.register("name", { required: true })} /></div>
                </div>
                <div className="space-y-1.5"><Label>╪ز┘ê╪╢█î╪ص</Label><Input className="h-9" {...form.register("description")} /></div>
                <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <button type="button" className="text-sm" onClick={() => form.setValue("is_active", !form.watch("is_active"))}>┘╪╣╪د┘</button>
                  <Switch checked={form.watch("is_active")} onCheckedChange={(v) => form.setValue("is_active", !!v)} />
                </div>
              </div>
              <SheetFooter className="gap-2 border-t px-5 py-3">
                <Button type="button" variant="outline" onClick={() => setSheetOpen(false)}>╪د┘╪╡╪▒╪د┘</Button>
                <Button type="submit" disabled={busy || !canManage}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? "╪░╪«█î╪▒┘ç" : "╪س╪ذ╪ز"}</Button>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>

        <Sheet open={assignOpen} onOpenChange={setAssignOpen}>
          <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
            <SheetHeader>
              <SheetTitle>
                {assignTarget
                  ? `┘à╪»█î╪▒█î╪ز ╪د╪ز╪╡╪د┘ ┬س${assignTarget.name}┬╗`
                  : assignTargets.length > 1
                    ? `╪د╪ز╪╡╪د┘ / ╪د┘┘╪╡╪د┘ ${toFaDigits(assignTargets.length)} ┘ê╪د╪ص╪»`
                    : assignTargets.length === 1
                      ? `╪د╪ز╪╡╪د┘ / ╪د┘┘╪╡╪د┘ ┬س${assignTargets[0].name}┬╗`
                      : "╪د╪ز╪╡╪د┘ ╪┤╪▒┌ر╪ز"}
              </SheetTitle>
            </SheetHeader>
            <div className="flex flex-1 flex-col">
              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
                {assignTargets.length > 0 ? (
                  <div className="flex gap-2">
                    <Button type="button" size="sm" variant={bulkLinkMode === "connect" ? "default" : "outline"} className="h-8 flex-1" onClick={() => setBulkLinkMode("connect")}>╪د╪ز╪╡╪د┘</Button>
                    <Button type="button" size="sm" variant={bulkLinkMode === "disconnect" ? "default" : "outline"} className="h-8 flex-1" onClick={() => setBulkLinkMode("disconnect")}>╪د┘┘╪╡╪د┘</Button>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">╪┤╪▒┌ر╪زظî┘ç╪د ╪▒╪د ╪ز█î┌ر ╪ذ╪▓┘█î╪». ╪ذ╪د ╪░╪«█î╪▒┘ç╪î ┘ç┘à ╪د╪ز╪╡╪د┘ ╪ش╪»█î╪» ┘ê ┘ç┘à ┘é╪╖╪╣ ╪د╪▒╪ز╪ذ╪د╪╖ظî┘ç╪د█î ╪ذ╪▒╪»╪د╪┤╪ز┘çظî╪┤╪»┘ç ╪د╪╣┘à╪د┘ ┘à█îظî╪┤┘ê╪».</p>
                )}
                <div className="space-y-1.5">
                  <Label>╪┤╪▒┌ر╪زظî┘ç╪د</Label>
                  <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border p-2">
                    {(companies ?? []).length === 0 ? (
                      <p className="px-2 py-3 text-xs text-muted-foreground">╪┤╪▒┌ر╪ز█î ╪س╪ذ╪ز ┘╪┤╪»┘ç ╪د╪│╪ز.</p>
                    ) : (companies ?? []).map((c) => {
                      const id = c.company_id;
                      const checked = selectedCompanyIds.has(id);
                      return (
                        <label key={id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50">
                          <Checkbox checked={checked} onCheckedChange={(v) => {
                            setSelectedCompanyIds((prev) => {
                              const next = new Set(prev);
                              if (v) next.add(id); else next.delete(id);
                              return next;
                            });
                          }} />
                          <span className="flex-1 truncate">{c.legal_name || c.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
                {(assignTarget || (assignTargets.length > 0 && bulkLinkMode === "connect")) ? (
                  <div className="space-y-1.5">
                    <Label>
                      {assignTarget ? "╪┤╪▒┌ر╪ز ╪د╪╡┘█î ╪د█î┘ ┘ê╪د╪ص╪»" : "╪┤╪▒┌ر╪ز ╪د╪╡┘█î ╪ذ╪▒╪د█î ┘ê╪د╪ص╪»┘ç╪د█î ╪د┘╪ز╪«╪د╪ذظî╪┤╪»┘ç"}
                      {assignTarget ? " (╪»╪▒ ╪╡┘ê╪▒╪ز ╪»╪د╪┤╪ز┘ ╪د╪ز╪╡╪د┘)" : " (╪د╪«╪ز█î╪د╪▒█î)"}
                    </Label>
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={primaryCompanyId}
                      onChange={(e) => setPrimaryCompanyId(e.target.value)}
                    >
                      <option value="">ظ¤ ╪د┘╪ز╪«╪د╪ذ ┘╪┤╪»┘ç ظ¤</option>
                      {(companies ?? []).filter((c) => selectedCompanyIds.has(c.company_id)).map((c) => (
                        <option key={c.company_id} value={c.company_id}>{c.legal_name || c.name}</option>
                      ))}
                    </select>
                    <p className="text-[11px] text-muted-foreground">
                      {assignTarget
                        ? "╪د┌»╪▒ ╪┤╪▒┌ر╪ز ╪د╪╡┘█î ┘╪╣┘█î ╪▒╪د ╪د╪▓ ┘┘ç╪▒╪│╪ز ╪ذ╪▒╪»╪د╪▒█î╪»╪î ╪ذ╪د█î╪» ╪د╪╡┘█î ╪ش╪»█î╪» ╪د┘╪ز╪«╪د╪ذ ┌ر┘█î╪» (┘à┌»╪▒ ╪د█î┘┌ر┘ç ┘ç█î┌ ╪┤╪▒┌ر╪ز█î ╪ذ╪د┘é█î ┘┘à╪د┘╪»)."
                        : "╪»╪▒ ╪د╪ز╪╡╪د┘ ┌»╪▒┘ê┘ç█î╪î ╪د█î┘ ╪┤╪▒┌ر╪ز ╪ذ╪▒╪د█î ┘ç╪▒ ┘ê╪د╪ص╪» ╪ذ┘çظî╪╣┘┘ê╪د┘ ╪د╪╡┘█î ╪س╪ذ╪ز ┘à█îظî╪┤┘ê╪» (╪»╪▒ ╪╡┘ê╪▒╪ز ┘ê╪╡┘ ╪┤╪»┘ ╪ذ┘ç ┘ç┘à╪د┘ ╪┤╪▒┌ر╪ز)."}
                    </p>
                  </div>
                ) : null}
                {assignTargets.length > 0 && bulkLinkMode === "disconnect" ? (
                  <p className="text-xs text-muted-foreground">
                    ╪د┌»╪▒ ╪┤╪▒┌ر╪ز ╪د╪╡┘█î ┘é╪╖╪╣ ╪┤┘ê╪»╪î ╪»╪▒ ╪╡┘ê╪▒╪ز ╪ذ╪د┘é█îظî┘à╪د┘╪»┘ ╪┤╪▒┌ر╪ز ╪»█î┌»╪▒╪î ╪│█î╪│╪ز┘à ╪ذ┘çظî╪╡┘ê╪▒╪ز ╪«┘ê╪»┌ر╪د╪▒ █î┌ر█î ╪▒╪د ╪د╪╡┘█î ┘à█îظî┌ر┘╪» ┘ê ┘é╪ذ┘ ╪د╪▓ ╪د╪ش╪▒╪د ┘ç╪┤╪»╪د╪▒ ┘à█îظî╪»┘ç╪».
                  </p>
                ) : null}
              </div>
              <SheetFooter className="gap-2 border-t px-5 py-3">
                <Button type="button" variant="outline" onClick={() => setAssignOpen(false)}>╪د┘╪╡╪▒╪د┘</Button>
                <Button type="button" disabled={busy || !canManage} onClick={() => void submitAssign()}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : assignTarget ? "╪░╪«█î╪▒┘ç ╪د╪ز╪╡╪د┘╪د╪ز" : bulkLinkMode === "connect" ? "╪د╪ز╪╡╪د┘" : "╪د┘┘╪╡╪د┘"}
                </Button>
              </SheetFooter>
            </div>
          </SheetContent>
        </Sheet>

        <Dialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {confirm?.kind === "delete" ? "╪ز╪ث█î█î╪» ╪ص╪░┘" : confirm?.kind === "restore" ? "╪ز╪ث█î█î╪» ╪ذ╪د╪▓┌»╪▒╪»╪د┘█î" : confirm?.kind === "activate" ? "╪ز╪ث█î█î╪» ┘╪╣╪د┘ظî╪│╪د╪▓█î" : "╪ز╪ث█î█î╪» ╪║█î╪▒┘╪╣╪د┘ظî╪│╪د╪▓█î"}
              </DialogTitle>
              <DialogDescription>
                {confirm
                  ? confirm.kind === "delete"
                    ? `${toFaDigits(confirm.targets.length)} ┘à┘ê╪▒╪» ╪ص╪░┘ ┘à█îظî╪┤┘ê╪» ┘ê ╪ذ╪╣╪»╪د┘ï ╪د╪▓ ┘┘ç╪▒╪│╪ز ╪ص╪░┘ظî╪┤╪»┘çظî┘ç╪د ┘é╪د╪ذ┘ ╪ذ╪د╪▓┌»╪▒╪»╪د┘█î ╪د╪│╪ز.`
                    : confirm.kind === "restore"
                      ? `${toFaDigits(confirm.targets.length)} ┘à┘ê╪▒╪» ╪ذ╪د╪▓┘à█îظî┌»╪▒╪»╪» ┘ê ╪ز╪د ┘╪╣╪د┘ظî╪│╪د╪▓█î ╪»╪│╪ز█î╪î ╪║█î╪▒┘╪╣╪د┘ ┘à█îظî┘à╪د┘╪».`
                      : confirm.kind === "activate"
                        ? `${toFaDigits(confirm.targets.length)} ┘à┘ê╪▒╪» ┘╪╣╪د┘ ┘à█îظî╪┤┘ê╪».`
                        : `${toFaDigits(confirm.targets.length)} ┘à┘ê╪▒╪» ╪║█î╪▒┘╪╣╪د┘ ┘à█îظî╪┤┘ê╪».`
                  : null}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirm(null)}>╪د┘╪╡╪▒╪د┘</Button>
              <Button variant={confirm?.kind === "delete" ? "destructive" : "default"} disabled={busy} onClick={() => void runBulk()}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "╪ز╪ث█î█î╪»"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!linkConfirm} onOpenChange={(o) => !o && setLinkConfirm(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {linkConfirm?.kind === "leave_all"
                  ? "┘é╪╖╪╣ ┘ç┘à┘ç┘¤ ╪د╪ز╪╡╪د┘╪د╪ز"
                  : linkConfirm?.kind === "swap_primary"
                    ? "╪ز╪║█î█î╪▒ ╪┤╪▒┌ر╪ز ╪د╪╡┘█î"
                    : "┘é╪╖╪╣ ╪┤╪▒┌ر╪ز ╪د╪╡┘█î"}
              </DialogTitle>
              <DialogDescription>
                {linkConfirm?.kind === "leave_all"
                  ? "╪ذ╪د ╪د█î┘ ┌ر╪د╪▒ ┘ç┘à┘ç┘¤ ╪د╪ز╪╡╪د┘╪د╪ز ╪د█î┘ ┘ê╪د╪ص╪» ┘é╪╖╪╣ ┘à█îظî╪┤┘ê╪» ┘ê ╪»█î┌»╪▒ ╪┤╪▒┌ر╪ز ╪د╪╡┘█î ┘╪«┘ê╪د┘ç╪» ╪»╪د╪┤╪ز. ╪د╪»╪د┘à┘ç ┘à█îظî╪»┘ç█î╪»╪ا"
                  : linkConfirm?.kind === "swap_primary"
                    ? "╪┤╪▒┌ر╪ز ╪د╪╡┘█î ┘╪╣┘█î ┘é╪╖╪╣ ┘à█îظî╪┤┘ê╪» ┘ê ╪┤╪▒┌ر╪ز ╪د┘╪ز╪«╪د╪ذظî╪┤╪»┘ç ╪ذ┘çظî╪╣┘┘ê╪د┘ ╪د╪╡┘█î ╪ش╪»█î╪» ╪س╪ذ╪ز ┘à█îظî╪┤┘ê╪». ╪د╪»╪د┘à┘ç ┘à█îظî╪»┘ç█î╪»╪ا"
                    : linkConfirm?.kind === "bulk_disconnect_primary"
                      ? (() => {
                          const names = linkConfirm.names;
                          const sample = names.slice(0, 5).join("╪î ");
                          const more = names.length > 5 ? ` ┘ê ${toFaDigits(names.length - 5)} ┘à┘ê╪▒╪» ╪»█î┌»╪▒` : "";
                          return `╪ذ╪▒╪د█î ${toFaDigits(names.length)} ┘ê╪د╪ص╪»╪î ╪┤╪▒┌ر╪ز ╪د╪╡┘█î ╪»╪▒ ╪ص╪د┘ ┘é╪╖╪╣ ╪د╪│╪ز (${sample}${more}). ┘╛╪│ ╪د╪▓ ╪د┘┘╪╡╪د┘╪î ╪»╪▒ ╪╡┘ê╪▒╪ز ╪ذ╪د┘é█îظî┘à╪د┘╪»┘ ╪┤╪▒┌ر╪ز ╪»█î┌»╪▒╪î █î┌ر█î ╪ذ┘çظî╪╡┘ê╪▒╪ز ╪«┘ê╪»┌ر╪د╪▒ ╪د╪╡┘█î ┘à█îظî╪┤┘ê╪». ╪د╪»╪د┘à┘ç ┘à█îظî╪»┘ç█î╪»╪ا`;
                        })()
                      : null}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setLinkConfirm(null)}>╪د┘╪╡╪▒╪د┘</Button>
              <Button
                disabled={busy}
                onClick={() => {
                  setLinkConfirm(null);
                  void submitAssign({ skipLinkConfirm: true });
                }}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "╪ز╪ث█î█î╪»"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
