import { z } from "zod";

const emptyToUndefined = (v: unknown) => {
  if (v === "" || v === null || v === undefined) return undefined;
  return v;
};

export const createMemberSchema = z.object({
  first_name: z
    .string({ required_error: "نام الزامی است" })
    .trim()
    .min(1, "نام الزامی است")
    .max(100, "حداکثر ۱۰۰ کاراکتر"),
  last_name: z
    .string({ required_error: "نام خانوادگی الزامی است" })
    .trim()
    .min(1, "نام خانوادگی الزامی است")
    .max(100, "حداکثر ۱۰۰ کاراکتر"),
  mobile: z
    .string({ required_error: "شماره موبایل الزامی است" })
    .trim()
    .min(10, "شماره موبایل معتبر نیست")
    .max(20, "حداکثر ۲۰ کاراکتر"),
  is_owner: z.boolean().optional().default(false),
  /** Optional initial role (single) — sent as role_ids array to API. */
  role_id: z.preprocess(
    emptyToUndefined,
    z.string().uuid("شناسه نقش معتبر نیست").optional()
  ),
});

export type CreateMemberFormValues = z.infer<typeof createMemberSchema>;
