"use client";

import { useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  COMPANY_DETAIL_HREF,
  decodeCompanyRef,
  setCompanyFocus,
  type CompanyDetailFrom,
} from "@/modules/organization/lib/company-ref";

/**
 * Legacy routes with id/base64 in the path: absorb into session focus and
 * replace URL with the stable /detail path (no database identifiers visible).
 */
export default function LegacyCompanyDetailRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const raw = typeof params?.id === "string" ? params.id : "";
    const id = decodeCompanyRef(raw);
    const fromRaw = searchParams.get("from");
    const from: CompanyDetailFrom =
      fromRaw === "branches" || fromRaw === "departments" ? fromRaw : "companies";
    if (id) {
      setCompanyFocus(id, from);
    }
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    router.replace(`${COMPANY_DETAIL_HREF}${hash}`);
  }, [params, router, searchParams]);

  return (
    <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
      در حال انتقال به صفحه جزئیات…
    </div>
  );
}
