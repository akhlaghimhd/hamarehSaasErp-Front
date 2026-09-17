/**
 * Opaque path segment for member detail routes.
 * UUID is not shown plain in the URL; API still authorizes by real id after decode.
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Encode tenant_user_id for use in /members/[id] path. */
export function encodeMemberRef(tenantUserId: string): string {
  const id = tenantUserId.trim();
  if (!id) return "";
  const b64 =
    typeof btoa === "function"
      ? btoa(id)
      : Buffer.from(id, "utf8").toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

/**
 * Decode path segment back to tenant_user_id.
 * Accepts legacy plain UUID for old bookmarks.
 */
export function decodeMemberRef(ref: string | null | undefined): string | null {
  if (!ref || typeof ref !== "string") return null;
  const raw = ref.trim();
  if (!raw) return null;
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

export function memberDetailPath(tenantUserId: string): string {
  return `/dashboard/identity/members/${encodeMemberRef(tenantUserId)}`;
}
