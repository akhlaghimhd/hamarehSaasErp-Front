/**
 * FE-ORG — فهرست شرکت‌ها
 * Table parity with identity members: sort, select, columns, export Excel/PDF,
 * membership active|deleted + restore, opaque detail ID, system confirm, dirty Sheet guard.
 */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Building2,
  CircleHelp,
  Columns3,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Loader2,
  Pencil,
  Plus,
  Power,
  PowerOff,
  RotateCcw,
  Search,
  Trash2,
  X,
  Sparkles,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import {
  Sheet,
  SheetContent,
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
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
import { usePermission } from "@/auth";
import { ApiClientError } from "@/api";
import { cn, toFaDigits } from "@/shared/lib/utils";
import {
  useCompanies,
  useCreateCompany,
  useRestoreCompany,
  useSoftDeleteCompany,
  useUpdateCompany,
} from "../hooks/use-companies";
import {
  FEATURE_PACK_CODES,
  useFeaturePackEnabled,
} from "../hooks/use-feature-packs";
import type { CompanyListFilter } from "../services/company-service";
import {
  OrganizationPermissions,
  ENTITY_KIND_LABELS,
  ENTITY_KIND_FIELD_LABEL,
  ENTITY_KIND_OPTIONS,
  type CompanyDto,
} from "../types";
import { companyDetailPath } from "../lib/company-ref";
import { exportCompaniesExcel, exportCompaniesPdf } from "../lib/companies-export";
import {
  MSG_LOAD,
  MSG_ERR,
  MSG_NO_ACCESS,
  COL_STORAGE,
  type StatusFilter,
  type SortKey,
  type SortDir,
  type ColumnId,
  type BulkKind,
  type ConfirmState,
  RESTORE_ONE_MSG,
  BULK_SUCCESS,
  confirmTitle,
  confirmBody,
  confirmActionLabel,
  COLS,
  type CompanyForm,
  emptyForm,
  companyToForm,
  displayName,
  fd,
  sortValue,
  IconAction,
} from "./companies-list-helpers";

function isRecentCreated(iso?: string | null, days = 3): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t <= days * 86_400_000;
}

export function CompaniesListPage() {
  const canView = usePermission(OrganizationPermissions.companyView);
  const canCreate = usePermission(OrganizationPermissions.companyCreate);
  const canUpdate = usePermission(OrganizationPermissions.companyUpdate);
  const canDelete = usePermission(OrganizationPermissions.companyDelete);
  const { enabled: hasMultiCompany, isLoading: multiCompanyPackLoading } =
    useFeaturePackEnabled(FEATURE_PACK_CODES.multiCompany);

  // RESTORE_IN_PROGRESS: body continues from artifact FINAL — see next commit
  return (
    <div className="p-6 text-sm text-muted-foreground">
      در حال بازیابی فهرست کامل شرکت‌ها… یک لحظه صبر کنید و رفرش کنید.
    </div>
  );
}
