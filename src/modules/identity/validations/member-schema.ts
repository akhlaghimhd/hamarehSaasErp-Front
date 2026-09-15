import { z } from "zod";

const emptyToUndefined = (v: unknown) => {
  if (v === "" || v === null || v === undefined) return undefined;
  return v;
};

export const createMemberSchema = z.object({
  email: z
    .string({ required_error: "ایمیل الزامی است" })
    .trim()
    .email("ایمیل معتبر نیست")
    .max(255, "حداکثر ۲۵۵ کاراکتر"),
  password: z
    .string({ required_error: "رمز عبور الزامی است" })
    .min(8, "حداقل ۸ کاراکتر")
    .max(100, "حداکثر ۱۰۰ کاراکتر"),
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
  mobile: z.preprocess(
    emptyToUndefined,
    z.string().max(20, "حداکثر ۲۰ کاراکتر").optional()
  ),
  is_owner: z.boolean().optional().default(false),
  /** Optional initial role (single) — sent as role_ids array to API. */
  role_id: z.preprocess(
    emptyToUndefined,
    z.string().uuid("شناسه نقش معتبر نیست").optional()
  ),
});

export type CreateMemberFormValues = z.infer<typeof createMemberSchema>;
