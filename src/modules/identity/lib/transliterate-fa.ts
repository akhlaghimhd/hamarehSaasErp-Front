/**
 * Persian → Finglish for email local-part.
 *
 * Pipeline:
 * 1) whole-token dictionary
 * 2) context-aware letter rules (و=v at start, و=o as vowel, …)
 * 3) insert default short vowel "a" between consonant clusters
 */

const NAME_DICT: Record<string, string> = {
  علی: "ali",
  علیرضا: "alireza",
  "علی‌رضا": "alireza",
  "علی‌اکبر": "aliakbar",
  "علی اکبر": "aliakbar",
  محمد: "mohammad",
  محمدعلی: "mohammadali",
  محمدحسین: "mohammadhossein",
  محمدرضا: "mohammadreza",
  مهدی: "mahdi",
  حسین: "hossein",
  حسن: "hasan",
  رضا: "reza",
  امیر: "amir",
  سعید: "saeed",
  مجید: "majid",
  حمید: "hamid",
  حمیدرضا: "hamidreza",
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
  پوریا: "pouria",
  کیان: "kian",
  کیوان: "keyvan",
  کوروش: "kourosh",
  آرش: "arash",
  آرمان: "arman",
  آرمین: "armin",
  آریا: "arya",
  سینا: "sina",
  سامان: "saman",
  سهراب: "sohrab",
  شهاب: "shahab",
  شهرام: "shahram",
  داریوش: "dariush",
  داوود: "davoud",
  داود: "davoud",
  عبدالله: "abdollah",
  محسن: "mohsen",
  میلاد: "milad",
  ایمان: "iman",
  احسان: "ehsan",
  اشکان: "ashkan",
  افشین: "afshin",
  امید: "omid",
  بیژن: "bijan",
  جلال: "jalal",
  جمال: "jamal",
  حافظ: "hafez",
  حبیب: "habib",
  رامین: "ramin",
  رسول: "rasoul",
  سروش: "soroush",
  صادق: "sadegh",
  طاهر: "taher",
  عادل: "adel",
  عارف: "aref",
  عرفان: "erfan",
  قاسم: "ghasem",
  کامبیز: "kambiz",
  کامران: "kamran",
  کسری: "kasra",
  مازیار: "maziar",
  مهران: "mehran",
  مهرداد: "mehrdad",
  نوید: "navid",
  نیما: "nima",
  وحید: "vahid",
  هادی: "hadi",
  هومن: "houman",
  همایون: "homayoun",
  یحیی: "yahya",
  بتول: "batol",
  ترحمی: "tarahomi",
  واحدی: "vahedi",
  واحد: "vahed",
  فاطمه: "fatemeh",
  "فاطمه زهرا": "fatemehzahra",
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
  آتنا: "atena",
  آتوسا: "atousa",
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
  گلناز: "golnaz",
  کیمیا: "kimia",
  مهتاب: "mahtab",
  نگین: "negin",
  یاسمن: "yasaman",
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
  جلالی: "jalali",
  کرمی: "karami",
  قربانی: "ghorbani",
  "قاسم‌زاده": "ghasemzadeh",
  نژاد: "nejad",
  پور: "pour",
  زاده: "zadeh",
};

/** Digraph consonants (Latin output is multi-letter but one Persian unit) */
const DIGRAPHS: Array<[string, string]> = [
  ["خوا", "kh"], // will get vowel from next rules — kept simple
  ["خ", "kh"],
  ["چ", "ch"],
  ["ش", "sh"],
  ["ژ", "zh"],
  ["غ", "gh"],
  ["ق", "gh"],
];

const CONSONANT_FA = new Set([
  "ب",
  "پ",
  "ت",
  "ث",
  "ج",
  "چ",
  "ح",
  "خ",
  "د",
  "ذ",
  "ر",
  "ز",
  "ژ",
  "س",
  "ش",
  "ص",
  "ض",
  "ط",
  "ظ",
  "ع",
  "غ",
  "ف",
  "ق",
  "ک",
  "ك",
  "گ",
  "ل",
  "م",
  "ن",
  "ه",
]);

const VOWEL_LATIN = new Set(["a", "e", "i", "o", "u"]);

function normalizeFa(text: string): string {
  return text
    .trim()
    .replace(/[\u200c\u200d\u0640]/g, "")
    .replace(/\s+/g, " ");
}

function isFaConsonant(ch: string): boolean {
  return CONSONANT_FA.has(ch);
}

/**
 * Map one token with context:
 * - leading و → v
 * - و after consonant → o
 * - ی → i (or y between vowels handled simply as i)
 * - آ/ا → a
 * - default short vowel a between consecutive consonants
 */
function mapToken(token: string): string {
  const key = normalizeFa(token);
  if (!key) return "";
  if (NAME_DICT[key]) return NAME_DICT[key];

  type Piece = { kind: "c" | "v"; lat: string };
  const pieces: Piece[] = [];
  let i = 0;

  while (i < key.length) {
    const ch = key[i];

    // digraph consonants
    let digraphHit = false;
    for (const [from, to] of DIGRAPHS) {
      if (key.startsWith(from, i) && from.length > 1) {
        pieces.push({ kind: "c", lat: to });
        i += from.length;
        digraphHit = true;
        break;
      }
    }
    if (digraphHit) continue;

    if (ch === "و") {
      const prev = pieces[pieces.length - 1];
      if (!prev) {
        pieces.push({ kind: "c", lat: "v" }); // واحدی → v...
      } else if (prev.kind === "c") {
        pieces.push({ kind: "v", lat: "o" }); // ترحمی mid و as vowel-ish via later a-insert; و as o after C
      } else {
        pieces.push({ kind: "v", lat: "o" });
      }
      i += 1;
      continue;
    }

    if (ch === "ی" || ch === "ي" || ch === "ئ") {
      pieces.push({ kind: "v", lat: "i" });
      i += 1;
      continue;
    }

    if (ch === "آ" || ch === "ا" || ch === "أ" || ch === "إ" || ch === "ٱ") {
      pieces.push({ kind: "v", lat: "a" });
      i += 1;
      continue;
    }

    if (ch === "ع") {
      // often silent or a; treat as vowel a when between consonants context later
      pieces.push({ kind: "v", lat: "a" });
      i += 1;
      continue;
    }

    const single: Record<string, string> = {
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
      غ: "gh",
      ف: "f",
      ق: "gh",
      ک: "k",
      ك: "k",
      گ: "g",
      ل: "l",
      م: "m",
      ن: "n",
      ه: "h",
      ة: "h",
    };

    if (single[ch]) {
      pieces.push({ kind: "c", lat: single[ch] });
      i += 1;
      continue;
    }

    if (/[a-zA-Z0-9]/.test(ch)) {
      pieces.push({
        kind: VOWEL_LATIN.has(ch.toLowerCase()) ? "v" : "c",
        lat: ch.toLowerCase(),
      });
    }
    i += 1;
  }

  // Insert default short vowel "a" between consecutive consonants
  // e.g. بتول: b-t-o-l → b-a-t-o-l ; ترحمی after mapping needs a between t-r, r-h, h-m
  const out: string[] = [];
  for (let p = 0; p < pieces.length; p++) {
    const cur = pieces[p];
    if (p > 0) {
      const prev = pieces[p - 1];
      if (prev.kind === "c" && cur.kind === "c") {
        out.push("a");
      }
    }
    out.push(cur.lat);
  }

  // Leading vowel-less: fine. Collapse aa
  return out.join("").replace(/aa+/g, "a");
}

export function transliterateFa(text: string): string {
  const normalized = normalizeFa(text);
  if (!normalized) return "";
  if (NAME_DICT[normalized]) return NAME_DICT[normalized];

  return normalized
    .split(/\s+/)
    .filter(Boolean)
    .map(mapToken)
    .filter(Boolean)
    .join(" ");
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
