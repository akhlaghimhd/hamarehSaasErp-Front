/** Minimal Persian → Latin for email local-part (mirrors backend map). */

const FA_MAP: Record<string, string> = {
  آ: "a",
  ا: "a",
  ب: "b",
  پ: "p",
  ت: "t",
  ث: "s",
  ج: "j",
  چ: "ch",
  ح: "h",
  خ: "kh",
  د: "d",
  ذ: "z",
  ر: "r",
  ز: "z",
  ژ: "zh",
  س: "s",
  ش: "sh",
  ص: "s",
  ض: "z",
  ط: "t",
  ظ: "z",
  ع: "a",
  غ: "gh",
  ف: "f",
  ق: "gh",
  ک: "k",
  گ: "g",
  ل: "l",
  م: "m",
  ن: "n",
  و: "v",
  ه: "h",
  ی: "y",
  ي: "y",
  ء: "",
  ة: "h",
};

export function transliterateFa(text: string): string {
  let out = "";
  for (const ch of text.trim()) {
    out += FA_MAP[ch] ?? ch;
  }
  return out;
}

export function slugNamePart(value: string): string {
  let s = transliterateFa(value).toLowerCase();
  s = s.replace(/[^a-z0-9]+/g, ".");
  s = s.replace(/\.{2,}/g, ".").replace(/^\.|\.$/g, "");
  return s;
}

/** Suggested email local-part from FA first + last name. */
export function suggestEmailLocalPart(firstName: string, lastName: string): string {
  const first = slugNamePart(firstName);
  const last = slugNamePart(lastName);
  if (!first && !last) return "";
  if (!first) return last;
  if (!last) return first;
  return `${first}.${last}`;
}
