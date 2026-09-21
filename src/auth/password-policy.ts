/**
 * Client-side password policy — mirrors backend PasswordPolicyService rules.
 * Backend remains source of truth; this is UX-only pre-validation.
 */

export interface PasswordPolicyContext {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  mobile?: string | null;
}

export function validatePasswordClient(
  password: string,
  ctx: PasswordPolicyContext = {}
): string | null {
  if (!password || password.length < 6) {
    return "رمز عبور حداقل ۶ کاراکتر باشد.";
  }
  if (password.length > 128) {
    return "رمز عبور بیش از حد طولانی است.";
  }
  // No Persian / non-ASCII letters
  if (/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(password)) {
    return "رمز عبور نباید شامل حروف فارسی باشد.";
  }
  if (!/^[\x20-\x7E]+$/.test(password)) {
    return "رمز عبور فقط می‌تواند شامل حروف و علائم انگلیسی باشد.";
  }
  if (!/[A-Z]/.test(password)) {
    return "رمز عبور باید حداقل یک حرف بزرگ انگلیسی داشته باشد.";
  }
  if (!/[a-z]/.test(password)) {
    return "رمز عبور باید حداقل یک حرف کوچک انگلیسی داشته باشد.";
  }
  if (!/[0-9]/.test(password) && !/[^A-Za-z0-9]/.test(password)) {
    return "رمز عبور باید حداقل یک رقم یا نماد داشته باشد.";
  }

  const lower = password.toLowerCase();
  const parts: string[] = [];
  if (ctx.firstName) parts.push(ctx.firstName);
  if (ctx.lastName) parts.push(ctx.lastName);
  if (ctx.email) {
    const local = ctx.email.split("@")[0] ?? "";
    if (local.length >= 3) parts.push(local);
  }
  if (ctx.mobile) {
    const digits = ctx.mobile.replace(/\D/g, "");
    if (digits.length >= 4) {
      parts.push(digits);
      parts.push(digits.slice(-4));
      if (digits.length >= 7) parts.push(digits.slice(0, 7));
    }
  }
  for (const p of parts) {
    const t = p.trim().toLowerCase();
    if (t.length >= 3 && lower.includes(t)) {
      return "رمز عبور نباید شامل نام، موبایل یا بخشی از ایمیل شما باشد.";
    }
  }

  return null;
}

export const PASSWORD_HINT =
  "حداقل ۶ کاراکتر انگلیسی، شامل حرف بزرگ و کوچک و رقم یا نماد؛ بدون فارسی و بدون نام/موبایل.";
