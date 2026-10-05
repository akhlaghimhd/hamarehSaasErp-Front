import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

/** Convert ASCII digits in a string/number to Persian digits for UI display. */
export function toFaDigits(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/\d/g, (d) => FA_DIGITS[Number(d)] ?? d);
}

/** Convert Persian/Arabic digits to ASCII digits. */
export function toAsciiDigits(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const map: Record<string, string> = {
    "۰": "0",
    "۱": "1",
    "۲": "2",
    "۳": "3",
    "۴": "4",
    "۵": "5",
    "۶": "6",
    "۷": "7",
    "۸": "8",
    "۹": "9",
    "٠": "0",
    "١": "1",
    "٢": "2",
    "٣": "3",
    "٤": "4",
    "٥": "5",
    "٦": "6",
    "٧": "7",
    "٨": "8",
    "٩": "9",
  };
  return String(value).replace(/[۰-۹٠-٩]/g, (ch) => map[ch] ?? ch);
}

/** Gregorian → Jalali (pure algorithm, no dependency). */
export function toJalaliParts(
  gy: number,
  gm: number,
  gd: number
): { jy: number; jm: number; jd: number } {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy = gy <= 1600 ? 0 : 979;
  gy -= gy <= 1600 ? 621 : 1600;
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days =
    365 * gy +
    Math.floor((gy2 + 3) / 4) -
    Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) -
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
  const jm = days < 186 ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
  const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
  return { jy, jm, jd };
}

/** Jalali → Gregorian (pure algorithm). */
export function toGregorianParts(
  jy: number,
  jm: number,
  jd: number
): { gy: number; gm: number; gd: number } {
  let gy = jy <= 979 ? 621 : 1600;
  jy -= jy <= 979 ? 0 : 979;
  const days =
    365 * jy +
    Math.floor(jy / 33) * 8 +
    Math.floor(((jy % 33) + 3) / 4) +
    78 +
    jd +
    (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);
  gy += 400 * Math.floor(days / 146097);
  let d = days % 146097;
  if (d > 36524) {
    gy += 100 * Math.floor(--d / 36524);
    d %= 36524;
    if (d >= 365) d++;
  }
  gy += 4 * Math.floor(d / 1461);
  d %= 1461;
  if (d > 365) {
    gy += Math.floor((d - 1) / 365);
    d = (d - 1) % 365;
  }
  const gd = d + 1;
  const sal_a = [
    0,
    31,
    (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0 ? 29 : 28,
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
  let v = gd;
  for (gm = 1; gm <= 12 && v > sal_a[gm]; gm++) {
    v -= sal_a[gm];
  }
  return { gy, gm, gd: v };
}

const JALALI_MONTH_DAYS = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];

export function jalaliMonthLength(jy: number, jm: number): number {
  if (jm >= 1 && jm <= 11) return JALALI_MONTH_DAYS[jm - 1];
  // Esfand: 30 in leap years
  const a = jy - (jy > 0 ? 474 : 473);
  const b = a % 2820 + 474;
  const leap = ((b + 38) * 682) % 2816 < 682;
  return leap ? 30 : 29;
}

/** Format ISO/Gregorian date (YYYY-MM-DD or datetime) as Jalali with FA digits: ۱۴۰۴/۰۷/۱۵ */
export function formatJalaliDate(value?: string | null): string {
  if (!value) return "—";
  const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const { jy, jm, jd } = toJalaliParts(Number(m[1]), Number(m[2]), Number(m[3]));
    return toFaDigits(
      `${jy}/${String(jm).padStart(2, "0")}/${String(jd).padStart(2, "0")}`
    );
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const { jy, jm, jd } = toJalaliParts(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return toFaDigits(
    `${jy}/${String(jm).padStart(2, "0")}/${String(jd).padStart(2, "0")}`
  );
}

/** Format ISO/Gregorian datetime as Jalali with Persian digits: ۱۴۰۴/۰۷/۱۰ ۱۴:۳۰ */
export function formatJalaliDateTime(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const { jy, jm, jd } = toJalaliParts(d.getFullYear(), d.getMonth() + 1, d.getDate());
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const raw = `${jy}/${String(jm).padStart(2, "0")}/${String(jd).padStart(2, "0")} ${hh}:${mm}`;
  return toFaDigits(raw);
}

/** Parse ISO date → Jalali parts; null if invalid. */
export function isoToJalali(
  iso?: string | null
): { jy: number; jm: number; jd: number } | null {
  if (!iso) return null;
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return toJalaliParts(Number(m[1]), Number(m[2]), Number(m[3]));
}

/** Build ISO YYYY-MM-DD from Jalali parts. */
export function jalaliToIso(jy: number, jm: number, jd: number): string {
  const { gy, gm, gd } = toGregorianParts(jy, jm, jd);
  return `${gy}-${String(gm).padStart(2, "0")}-${String(gd).padStart(2, "0")}`;
}

/** Current Jalali year (local). */
export function currentJalaliYear(): number {
  const n = new Date();
  return toJalaliParts(n.getFullYear(), n.getMonth() + 1, n.getDate()).jy;
}

/** Format percent for tables: strip trailing zeros (25 not 25.00). */
export function formatPercent(value: number | string | null | undefined): string {
  const num = Number(value);
  if (!Number.isFinite(num)) return toFaDigits("0");
  const rounded = Math.round(num * 10000) / 10000;
  let asStr: string;
  if (
    Number.isInteger(rounded) ||
    Math.abs(rounded - Math.round(rounded)) < 1e-9
  ) {
    asStr = String(Math.round(rounded));
  } else {
    asStr = rounded.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
  }
  return toFaDigits(asStr);
}
