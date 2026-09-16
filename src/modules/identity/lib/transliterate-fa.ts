/**
 * Persian → Finglish for email local-part.
 * Strategy: whole-name dictionary first, then digraph/char map (aligned with backend).
 */

const NAME_DICT: Record<string, string> = {
  علی: "ali",
  محمد: "mohammad",
  مهدی: "mahdi",
  حسین: "hossein",
  حسن: "hasan",
  رضا: "reza",
  امیر: "amir",
  سعید: "saeed",
  مجید: "majid",
  حمید: "hamid",
  جواد: "javad",
  احمد: "ahmad",
  محمود: "mahmoud",
  عباس: "abbas",
  اکبر: "akbar",
  اصغر: "asghar",
  یاسر: "yaser",
  یاسین: "yasin",
  یوسف: "yousef",
  ابراهیم: "ebrahim",
  اسماعیل: "esmaeil",
  مصطفی: "mostafa",
  مرتضی: "morteza",
  کاظم: "kazem",
  ناصر: "naser",
  نادر: "nader",
  فرهاد: "farhad",
  فرید: "farid",
  فرزاد: "farzad",
  بهرام: "bahram",
  بهروز: "behrouz",
  بهنام: "behnam",
  بابک: "babak",
  پرویز: "parviz",
  پیمان: "peyman",
  پویا: "pouya",
  کیان: "kian",
  کیوان: "keyvan",
  کوروش: "kourosh",
  آرش: "arash",
  آرمان: "arman",
  آرمین: "armin",
  سینا: "sina",
  سامان: "saman",
  سام: "sam",
  سهراب: "sohrab",
  شهاب: "shahab",
  شهرام: "shahram",
  داریوش: "dariush",
  داوود: "davoud",
  داود: "davoud",
  عبدالله: "abdollah",
  عبداله: "abdollah",
  فاطمه: "fatemeh",
  زهرا: "zahra",
  مریم: "maryam",
  زینب: "zeynab",
  سارا: "sara",
  نرگس: "narges",
  نازنین: "nazanin",
  نسیم: "nasim",
  نیلوفر: "niloufar",
  مینا: "mina",
  مهسا: "mahsa",
  مهناز: "mahnaz",
  مونا: "mona",
  هانیه: "hanieh",
  هستی: "hasti",
  هلیا: "helia",
  الهام: "elham",
  الهه: "elahe",
  آیدا: "aida",
  ایدا: "aida",
  آتنا: "atena",
  پریسا: "parisa",
  پریا: "pariya",
  پگاه: "pegah",
  شیرین: "shirin",
  شیدا: "sheida",
  سمیرا: "samira",
  سمیه: "somayeh",
  سعیده: "saeedeh",
  لیلا: "leila",
  لیدا: "lida",
  رویا: "roya",
  ریحانه: "reyhaneh",
  راضیه: "razie",
  طاهره: "tahereh",
  محمدی: "mohammadi",
  حسینی: "hosseini",
  رضایی: "rezaei",
  رضائی: "rezaei",
  احمدی: "ahmadi",
  موسوی: "mousavi",
  کریمی: "karimi",
  جعفری: "jafari",
  حیدری: "heidari",
  نوری: "nouri",
  اکبری: "akbari",
  کاظمی: "kazemi",
  عباسی: "abbasi",
  مرادی: "moradi",
  علیزاده: "alizadeh",
  محمدزاده: "mohammadzadeh",
  رحیمی: "rahimi",
  صالحی: "salehi",
  طاهری: "taheri",
  صادقی: "sadeghi",
  باقری: "bagheri",
  نجفی: "najafi",
  شریفی: "sharifi",
  قاسمی: "ghasemi",
  یوسفی: "yousefi",
  اسدی: "asadi",
  فرهادی: "farhadi",
  بهرامی: "bahrami",
  پناهی: "panahi",
  نظری: "nazari",
  امینی: "amini",
  هاشمی: "hashemi",
  میرزایی: "mirzaei",
  میرزائی: "mirzaei",
  سلطانی: "soltani",
  پارسا: "parsa",
  رستمی: "rostami",
  اخلاقی: "akhlaghi",
};

const CHAR_MAP: Array<[string, string]> = [
  ["خوا", "kha"],
  ["خا", "kha"],
  ["چه", "che"],
  ["شه", "she"],
  ["ژه", "zhe"],
  ["غه", "ghe"],
  ["قه", "ghe"],
  ["آ", "a"],
  ["ا", "a"],
  ["ب", "b"],
  ["پ", "p"],
  ["ت", "t"],
  ["ث", "s"],
  ["ج", "j"],
  ["چ", "ch"],
  ["ح", "h"],
  ["خ", "kh"],
  ["د", "d"],
  ["ذ", "z"],
  ["ر", "r"],
  ["ز", "z"],
  ["ژ", "zh"],
  ["س", "s"],
  ["ش", "sh"],
  ["ص", "s"],
  ["ض", "z"],
  ["ط", "t"],
  ["ظ", "z"],
  ["ع", "a"],
  ["غ", "gh"],
  ["ف", "f"],
  ["ق", "gh"],
  ["ک", "k"],
  ["ك", "k"],
  ["گ", "g"],
  ["ل", "l"],
  ["م", "m"],
  ["ن", "n"],
  ["و", "o"],
  ["ه", "h"],
  ["ی", "i"],
  ["ي", "i"],
  ["ئ", "i"],
  ["ء", ""],
  ["ة", "h"],
  ["ؤ", "o"],
  ["إ", "e"],
  ["أ", "a"],
];

function normalizeFa(text: string): string {
  return text.trim().replace(/[\u200c\u0640]/g, ""); // ZWNJ + tatweel
}

export function transliterateFa(text: string): string {
  const normalized = normalizeFa(text);
  if (!normalized) return "";

  const dictHit = NAME_DICT[normalized];
  if (dictHit) return dictHit;

  // Tokenize on spaces for multi-part names
  const parts = normalized.split(/\s+/).filter(Boolean);
  if (parts.length > 1) {
    return parts.map((p) => transliterateFa(p)).join(" ");
  }

  let rest = normalized;
  let out = "";
  while (rest.length > 0) {
    let matched = false;
    for (const [from, to] of CHAR_MAP) {
      if (rest.startsWith(from)) {
        out += to;
        rest = rest.slice(from.length);
        matched = true;
        break;
      }
    }
    if (!matched) {
      out += rest[0];
      rest = rest.slice(1);
    }
  }
  return out;
}

export function slugNamePart(value: string): string {
  let s = transliterateFa(value).toLowerCase();
  s = s.replace(/[^a-z0-9]+/g, ".");
  s = s.replace(/\.{2,}/g, ".").replace(/^\.|\.$/g, "");
  return s;
}

export function suggestEmailLocalPart(firstName: string, lastName: string): string {
  const first = slugNamePart(firstName);
  const last = slugNamePart(lastName);
  if (!first && !last) return "";
  if (!first) return last;
  if (!last) return first;
  return `${first}.${last}`;
}
