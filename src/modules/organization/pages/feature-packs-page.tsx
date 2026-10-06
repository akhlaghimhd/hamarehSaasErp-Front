/**
 * FE-ORG — وضعیت بسته‌های قابلیت مستأجر (Feature Packs)
 */
"use client";

import { Package, Loader2 } from "lucide-react";
import { PageHeader } from "@/shared/components/layout/page-header";
import { StatusChip } from "@/shared/components/data-display/status-chip";
import { EmptyState } from "@/shared/components/feedback/empty-state";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import {
  FEATURE_PACK_CODES,
  useFeatureEntitlements,
} from "../hooks/use-feature-packs";
import { featureEntitlementsService } from "../services/feature-entitlements-service";

const PACK_CATALOG: Array<{
  code: string;
  title: string;
  description: string;
}> = [
  {
    code: FEATURE_PACK_CODES.multiCompany,
    title: "چندشرکتی (multi_company)",
    description: "ایجاد و مدیریت بیش از یک شرکت در مستأجر",
  },
  {
    code: FEATURE_PACK_CODES.multiBranch,
    title: "چندشعبه (multi_branch)",
    description: "ایجاد شعبهٔ دوم و بیشتر در هر شرکت",
  },
  {
    code: FEATURE_PACK_CODES.multiBusinessUnit,
    title: "واحد کسب‌وکار (multi_business_unit)",
    description: "ایجاد و گزارش‌گیری بر اساس چند BU",
  },
  {
    code: FEATURE_PACK_CODES.customOrgHierarchy,
    title: "سلسله‌مراتب سفارشی (custom_org_hierarchy)",
    description: "ایجاد درخت CUSTOM علاوه بر درخت‌های سیستمی",
  },
  {
    code: FEATURE_PACK_CODES.orgIntercompany,
    title: "بین‌شرکتی (org.intercompany)",
    description: "شرکای گروه و قواعد معامله بین‌شرکتی",
  },
];

export function FeaturePacksPage() {
  const { data, isLoading, isError, refetch, isFetching } = useFeatureEntitlements();

  return (
    <div className="space-y-6">
      <PageHeader
        title="بسته‌های قابلیت"
        description="وضعیت entitlementهای خریداری‌شده برای این مستأجر"
        breadcrumbs={[
          { label: "سازمان", href: "/dashboard/organization" },
          { label: "بسته‌های قابلیت" },
        ]}
        icon={<Package className="h-4 w-4" />}
      />

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : isError ? (
        <EmptyState
          title="بارگذاری entitlementها ناموفق بود"
          actionLabel="تلاش مجدد"
          onAction={() => void refetch()}
        />
      ) : (
        <>
          <div className="rounded-md border border-border/80 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
            بدون بسته، مسیر تک‌موجودیت (شرکت اصلی + HQ) فعال می‌ماند؛ ایجاد موجودیت اضافه از API و UI
            مسدود است.
            {isFetching ? (
              <Loader2 className="ms-2 inline h-3.5 w-3.5 animate-spin" />
            ) : null}
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>بسته</TableHead>
                  <TableHead>توضیح</TableHead>
                  <TableHead className="w-[120px]">وضعیت</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {PACK_CATALOG.map((pack) => {
                  const on = featureEntitlementsService.isEnabled(data, pack.code);
                  return (
                    <TableRow key={pack.code}>
                      <TableCell className="font-medium">{pack.title}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {pack.description}
                      </TableCell>
                      <TableCell>
                        {on ? (
                          <StatusChip tone="success" label="فعال" />
                        ) : (
                          <StatusChip tone="neutral" label="غیرفعال" />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <div className="text-xs text-muted-foreground">
            کدهای فعال:{" "}
            <span className="font-mono" dir="ltr">
              {(data?.enabled_codes ?? []).join(", ") || "—"}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
