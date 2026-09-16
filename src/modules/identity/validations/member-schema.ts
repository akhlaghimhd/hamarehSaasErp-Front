import { z } from "zod";

/** Normalize to 09xxxxxxxxx (11 digits) or empty. */
export function normalizeIranMobile(raw: string): string {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("98") && d.length >= 12) {
    d = "0" + d.slice(2);
  }
  if (d.startsWith("9") && d.length === 10) {
    d = "0" + d;
  }
  // Keep at most 11 digits for 09xxxxxxxxx
  if (d.length > 11) d = d.slice(0, 11);
  return d;
}

const IR_MOBILE = /^09\d{9}$/;

export const createMemberSchema = z.object({
  first_name: z
    .string({ required_error: "نام الزامی است" })
    .trim()
    .min(2, "نام حداقل ۲ حرف باشد")
    .max(50, "حداکثر ۵۰ کاراکتر"),
  last_name: z
    .string({ required_error: "نام خانوادگی الزامی است" })
    .trim()
    .min(2, "نام خانوادگی حداقل ۲ حرف باشد")
    .max(50, "حداکثر ۵۰ کاراکتر"),
  mobile: z
    .string({ required_error: "شماره موبایل الزامی است" })
    .trim()
    .transform((v) => normalizeIranMobile(v))
    .refine((v) => IR_MOBILE.test(v), {
      message: "موبایل باید ۱۱ رقم و با ۰۹ شروع شود (مثال: ۰۹۱۲۱۲۳۴۵۶۷)",
    }),
  email_local_part: z
    .string({ required_error: "بخش ابتدایی ایمیل الزامی است" })
    .trim()
    .min(1, "بخش ابتدایی ایمیل الزامی است")
    .max(64, "حداکثر ۶۴ کاراکتر")
    .regex(
      /^[a-zA-Z0-9]([a-zA-Z0-9._-]*[a-zA-Z0-9])?$/,
      "فقط حروف انگلیسی، عدد، نقطه، خط تیره و زیرخط"
    ),
});

export type CreateMemberFormValues = z.infer<typeof createMemberSchema>;
