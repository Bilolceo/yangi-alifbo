/**
 * Oʻrnatilgan lugʻatlar.
 *
 * EXCEPTIONS — tutuqsiz yozilgan, lekin `s`+`h` (yoki `c`+`h`) alohida tovush boʻlgan soʻzlar oʻzaklari.
 * `|` — birlashtirmaslik nuqtasi. Oʻzak soʻz boshiga mos kelishi kifoya (qoʻshimchalar bilan ishlaydi):
 * "is|hoq" → Ishoq, Ishoqning, Ishoqjon → Isʼhoq, Isʼhoqning, Isʼhoqjon.
 *
 * Lugʻatni tilshunoslar bilan kengaytirish rejalashtirilgan (TZ 8-boʻlim).
 */
export const EXCEPTIONS: readonly string[] = [
  "is|hoq",
  "as|hob",
  "mus|haf",
  "is|hob",
  "as|hal",
  "mas|hab",
];

/**
 * Himoyalangan soʻzlar — oʻgirilmaydi (brendlar, xorijiy nomlar).
 * Faqat chet soʻz evristikasidan (w, c, th, ph, ee, oo) oʻtib ketadigan soʻzlarni qoʻshish kerak.
 * Soʻzning oʻzi yoki unga oʻzbekcha qoʻshimcha qoʻshilgan shakli mos keladi (Chevroletning).
 */
export const PROTECTED_WORDS: readonly string[] = [
  "chevrolet", "chery", "changan", "chrome", "chromium", "chrysler", "chanel", "chase",
  "bosch", "shell", "shopify", "shazam", "shrek", "shimano", "shiseido",
  "english", "dashboard", "fresh", "smash", "splash",
  "chatgpt", "hashtag",
];

/** Himoyalangan soʻzdan keyin kelishi mumkin boʻlgan oʻzbekcha qoʻshimchalar. */
export const UZ_SUFFIX_RE =
  /^-?(?:lar)?(?:i|si|im|ing|imiz|ingiz|miz|ngiz)?(?:ning|ni|ga|ka|qa|da|dan|dagi|dek|day|cha|mi|ku|dir)?$/;
