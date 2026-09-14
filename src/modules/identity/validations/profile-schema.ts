/**
 * FE-P1-T04 — Client validation for profile upsert (Backend remains SoT).
 */

import { z } from "zod";

const emptyToNull = (v: unknown) => {
  if (v === "" || v === undefined) return null;
  return v;
};

export const profileUpsertSchema = z.object({
  national_id: z.preprocess(
    emptyToNull,
    z.string().max(50, "حداکثر ۵۰ کاراکتر").nullable().optional()
  ),
  birth_date: z.preprocess(
    emptyToNull,
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "تاریخ را به‌صورت YYYY-MM-DD وارد کنید")
      .nullable()
      .optional()
      .or(z.literal(null))
  ),
  avatar_url: z.preprocess(
    emptyToNull,
    z.string().max(500, "حداکثر ۵۰۰ کاراکتر").nullable().optional()
  ),
  gender: z.preprocess((v) => {
    if (v === "" || v === undefined || v === null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : v;
  }, z.union([z.literal(1), z.literal(2), z.literal(3), z.null()]).optional()),
  address: z.preprocess(
    emptyToNull,
    z.string().nullable().optional()
  ),
  phone: z.preprocess(
    emptyToNull,
    z.string().max(50, "حداکثر ۵۰ کاراکتر").nullable().optional()
  ),
  description: z.preprocess(
    emptyToNull,
    z.string().max(500, "حداکثر ۵۰۰ کاراکتر").nullable().optional()
  ),
});

export type ProfileUpsertFormValues = z.infer<typeof profileUpsertSchema>;

export const GENDER_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "انتخاب نشده" },
  { value: "1", label: "مرد" },
  { value: "2", label: "زن" },
  { value: "3", label: "سایر / ترجیح می‌دهم نگویم" },
];
