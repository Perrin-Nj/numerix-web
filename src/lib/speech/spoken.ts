/** Text as a person would say it: symbols become words in the child's language. */
const WORDS: Record<'fr' | 'en', Record<string, string>> = {
  fr: { '+': ' plus ', '\u2212': ' moins ', '-': ' moins ', '\u00d7': ' fois ', '\u00f7': ' divisé par ', '=': ' égale ' },
  en: { '+': ' plus ', '\u2212': ' minus ', '-': ' minus ', '\u00d7': ' times ', '\u00f7': ' divided by ', '=': ' equals ' },
};

export function spokenText(text: string, lang: string): string {
  const w = WORDS[lang.toLowerCase().startsWith('en') ? 'en' : 'fr'];
  const ask = lang.toLowerCase().startsWith('en') ? 'how many' : 'combien';
  return text
    .replace(/(\d)\s*([+\u2212\u00d7\u00f7=]|-(?=\s*\d))\s*(?=[\d?])/g, (_, d, op) => `${d}${w[op]}`)
    .replace(/\?(?=\s*(\)|$|\s))/g, (m, _g, off, all) => (/\d\s*(plus|moins|minus|fois|times|divisé par|divided by|égale|equals)\s*$/.test(all.slice(0, off)) ? ask : m))
    .replace(/\s{2,}/g, ' ')
    .trim();
}
