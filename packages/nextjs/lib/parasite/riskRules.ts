import { isUnlimited } from "./exposure";
import type { Category } from "./types";

export function classify(allowance: bigint, balance: bigint | null): Category {
  if (allowance === 0n) return "NO CURRENT ALLOWANCE";
  if (!isUnlimited(allowance)) return "REVIEW";
  if (balance === null) return "UNKNOWN RISK";
  return balance > 0n ? "HIGH EXPOSURE" : "REVIEW";
}
export function explain(allowance: bigint, balance: bigint | null) {
  if (allowance === 0n) return "No active authorization detected for this pair.";
  const scope = isUnlimited(allowance)
    ? "Unlimited spending authorization. Future deposits may also remain accessible."
    : "Limited spending authorization. Future deposits may be accessible up to the remaining allowance.";
  return `${scope} ${balance === null ? "Balance unavailable; current exposure is unknown." : "Current exposure is the smaller of balance and allowance."} Allowance size does not establish maliciousness or prove withdrawal capability.`;
}
