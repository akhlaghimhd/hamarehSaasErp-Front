/** ADR-FIN-002 display helper — DB: DR-1405-000017 / UI: DR-05-000017 */
import { toFaDigits } from "@/shared/lib/utils";

export function displayJournalNumber(j: {
  status?: string;
  entry_number?: string | null;
  draft_number?: string | null;
}): string {
  const isDraft = (j.status || "").toUpperCase() === "DRAFT";
  let raw = (isDraft ? j.draft_number || j.entry_number : j.entry_number || j.draft_number) || "";
  if (!raw) return "—";
  raw = raw.replace(/^DRAFT[-_]?/i, "DR-");
  raw = raw.replace(/^(DR|JE)-(\d{4})-(\d+)$/i, (_m, kind: string, y: string, seq: string) => {
    return `${String(kind).toUpperCase()}-${y.slice(-2)}-${seq}`;
  });
  return toFaDigits(raw);
}
