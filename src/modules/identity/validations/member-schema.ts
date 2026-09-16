import { z } from "zod";

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
  email_local_part: z
    .string({ required_error: "بخش ابتدایی ایمیل الزامی است" })
    .trim()
    .min(1, "بخش ابتدایی ایمیل الزامی است")
    .max(64, "حداکثر ۶۴ کاراکتر")
    .regex(
      /^[a-zA-Z0-9]([a-zA-Z0-9._-]*[a-zA-Z0-9])?$/,
      "فقط حروف انگلیسی، عدد، نقطه، خط تیره و زیرخط"
    ),
  is_owner: z.boolean().optional().default(false),
});

export type CreateMemberFormValues = z.infer<typeof createMemberSchema>;
