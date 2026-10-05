/**
 * Company detail navigation — no DB ids/codes in the URL.
 *
 * Product rule: browser address stays a fixed human path
 * `/dashboard/organization/companies/detail`. The selected company is
 * carried in sessionStorage (SPA context, not query/path). API calls
 * still use real UUID after the page reads focus context.
 */

const FOCUS_ID_KEY = "org.focus.companyId";
const FOCUS_FROM_KEY = "org.focus.companyFrom";

export type CompanyDetailFrom = "branches" | "departments" | "companies";

export type CompanyDetailNavOpts = {
  from?: CompanyDetailFrom;
  hash?: string;
};

export const COMPANY_DETAIL_HREF = "/dashboard/organization/companies/detail";

function canUseSession(): boolean {
  return typeof window !== "undefined" && typeof sessionStorage !== "undefined";
}

export function setCompanyFocus(
  companyId: string,
  from: CompanyDetailFrom = "companies"
): void {
  if (!canUseSession()) return;
  const id = companyId.trim();
  if (!id) return;
  sessionStorage.setItem(FOCUS_ID_KEY, id);
  sessionStorage.setItem(FOCUS_FROM_KEY, from);
}

export function getCompanyFocusId(): string | null {
  if (!canUseSession()) return null;
  const id = sessionStorage.getItem(FOCUS_ID_KEY)?.trim() ?? "";
  return id || null;
}

export function getCompanyFocusFrom(): CompanyDetailFrom | null {
  if (!canUseSession()) return null;
  const v = sessionStorage.getItem(FOCUS_FROM_KEY);
  if (v === "branches" || v === "departments" || v === "companies") return v;
  return null;
}

export function clearCompanyFocus(): void {
  if (!canUseSession()) return;
  sessionStorage.removeItem(FOCUS_ID_KEY);
  sessionStorage.removeItem(FOCUS_FROM_KEY);
}

/**
 * Stable detail URL only (no id). Does **not** write focus — call
 * `setCompanyFocus` in the click/navigation handler so list render
 * does not overwrite the selected company.
 */
export function companyDetailPath(
  _companyId?: string,
  opts?: CompanyDetailNavOpts
): string {
  let path = COMPANY_DETAIL_HREF;
  if (opts?.hash) {
    path += `#${opts.hash}`;
  }
  return path;
}

/** Set focus then return detail href — for imperative navigation (button/menu). */
export function openCompanyDetail(
  companyId: string,
  opts?: CompanyDetailNavOpts
): string {
  setCompanyFocus(companyId, opts?.from ?? "companies");
  return companyDetailPath(companyId, opts);
}

/** @deprecated kept for BC of imports */
export function encodeCompanyRef(_companyId: string): string {
  return "detail";
}

/** Legacy base64/uuid path segments → decode for one-time migration only */
export function decodeCompanyRef(ref: string | null | undefined): string | null {
  if (!ref || typeof ref !== "string") return null;
  const raw = ref.trim();
  if (!raw || raw === "detail") return getCompanyFocusId();
  const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (UUID_RE.test(raw)) return raw;
  try {
    const pad = raw.length % 4 === 0 ? raw : raw + "=".repeat(4 - (raw.length % 4));
    const b64 = pad.replace(/-/g, "+").replace(/_/g, "/");
    const id =
      typeof atob === "function"
        ? atob(b64)
        : Buffer.from(b64, "base64").toString("utf8");
    return id.trim() || null;
  } catch {
    return null;
  }
}

export function orgListPathFromQuery(
  from: string | null | undefined
): { href: string; label: string } {
  if (from === "branches") {
    return { href: "/dashboard/organization/branches", label: "شعب" };
  }
  if (from === "departments") {
    return { href: "/dashboard/organization/departments", label: "واحدها" };
  }
  return { href: "/dashboard/organization/companies", label: "شرکت‌ها" };
}
