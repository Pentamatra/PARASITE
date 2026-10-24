import productCopy from "./productCopy.json";
import turkish from "./tr.json";
import productTurkish from "./trProduct.json";
import transactionTurkish from "./trTransactions.json";

export type Locale = "tr" | "en";
const dictionary: Record<string, string> = { ...turkish, ...transactionTurkish, ...productTurkish, ...productCopy.tr };
const englishCopy: Record<string, string> = productCopy.en;
export function translate(text: string, locale: Locale): string {
  if (locale === "en") return englishCopy[text] || text;
  if (dictionary[text]) return dictionary[text];
  if (text.includes("spending authorization.") || text.startsWith("No active authorization"))
    return text
      .split(/(?<=\.) /)
      .map(sentence => dictionary[sentence] || sentence)
      .join(" ");
  if (/^\d+ raw units$/.test(text)) return text.replace("raw units", "ham birim");
  if (/^Ember \d+$/.test(text)) return text.replace("Ember", "Köz");
  if (/^BLOCK \d+$/.test(text)) return text.replace("BLOCK", "BLOK");
  if (text.startsWith("Verified at block ")) return text.replace("Verified at block", "Doğrulanan blok");
  if (text.startsWith("Confirm Demo"))
    return text.replace("Confirm ", "").replace(" deployment in your wallet.", " oluşturmayı cüzdanından onayla.");
  if (text.startsWith("Waiting for ") && text.includes("deployment confirmation"))
    return "Sözleşme işleminin zincir onayı bekleniyor…";
  return text;
}
