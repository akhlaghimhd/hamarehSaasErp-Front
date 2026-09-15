/**
 * Self-service profile form (bio + address request only).
 */

import { z } from "zod";

const emptyToNull = (v: unknown) => {
  if (v === "" || v === undefined) return null;
  return v;
};

export const selfProfileSchema = z.object({
  display_bio: z.preprocess(
    emptyToNull,
    z.string().max(500, "حداکثر ۵۰۰ کاراکتر").nullable().optional()
  ),
  address: z.preprocess(
    emptyToNull,
    z.string().max(2000, "حداکثر ۲۰۰۰ کاراکتر").nullable().optional()
  ),
});

export type SelfProfileFormValues = z.infer<typeof selfProfileSchema>;

/** @deprecated identity fields are admin-only */
export const profileUpsertSchema = selfProfileSchema;
export type ProfileUpsertFormValues = SelfProfileFormValues;

export const GENDER_LABELS: Record<number, string> = {
  1: "مرد",
  2: "زن",
};

export const GENDER_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "انتخاب نشده" },
  { value: "1", label: "مرد" },
  { value: "2", label: "زن" },
];

export const ADDRESS_STATUS_LABELS: Record<number, string> = {
  0: "",
  1: "در انتظار تأیید مدیر",
  2: "تأیید شده",
  3: "رد شده",
};

/** Minimal Gregorian → Jalali for read-only display */
export function toJalaliDisplay(isoDate?: string | null): string {
  if (!isoDate) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);
  if (!m) return isoDate;
  const gy = Number(m[1]);
  const gm = Number(m[2]);
  const gd = Number(m[3]);
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy = gy <= 1600 ? 0 : 979;
  let gy2 = gy <= 1600 ? gy + 621 : gy - 1600;
  const gy2l = gm > 2 ? gy2 + 1 : gy2;
  let days =
    365 * gy2 +
    Math.floor((gy2l + 3) / 4) -
    Math.floor((gy2l + 99) / 100) +
    Math.floor((gy2l + 399) / 400) -
    80 +
    gd +
    g_d_m[gm - 1];
  jy += 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  const jm =
    days < 186
      ? 1 + Math.floor(days / 31)
      : 7 + Math.floor((days - 186) / 30);
  const jd =
    1 +
    (days < 186 ? days % 31 : (days - 186) % 30);
  const fa = "۰۱۲۳۴۵۶۷۸۹";
  const toFa = (n: number, w = 2) =>
    String(n)
      .padStart(w, "0")
      .replace(/\d/g, (d) => fa[Number(d)]);
  return `${toFa(jy, 4)}/${toFa(jm)}/${toFa(jd)}`;
}
