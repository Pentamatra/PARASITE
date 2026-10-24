import type { Pair } from "./types";
import { isAddress, zeroAddress } from "viem";

export const MAX_PAIRS = 24;
export const customPairsKey = (owner: string) => `parasite:pairs:v1:10143:${owner.toLowerCase()}`;
export function parseCustomPairs(raw: string): Pair[] {
  try {
    if (raw.length > 15000) return [];
    const data = JSON.parse(raw);
    if (data.version !== 1 || !Array.isArray(data.pairs) || data.pairs.length > MAX_PAIRS) return [];
    return data.pairs.filter(
      (p: Pair) =>
        p &&
        typeof p.token === "string" &&
        typeof p.spender === "string" &&
        validPair(p.token, p.spender) &&
        (p.origin === "manual" || p.origin === "history") &&
        typeof p.name === "string" &&
        p.name.length <= 64,
    );
  } catch {
    return [];
  }
}
export const pairKey = (pair: { token: string; spender: string }) => `${pair.token}:${pair.spender}`.toLowerCase();
export function validPair(token: string, spender: string): boolean {
  return (
    isAddress(token) &&
    isAddress(spender) &&
    token.toLowerCase() !== zeroAddress &&
    spender.toLowerCase() !== zeroAddress
  );
}
export function mergePairs(...groups: Pair[][]): Pair[] {
  const pairs = new Map<string, Pair>();
  for (const group of groups)
    for (const pair of group)
      if (validPair(pair.token, pair.spender) && !pairs.has(pairKey(pair))) {
        if (pairs.size >= MAX_PAIRS) break;
        pairs.set(pairKey(pair), pair);
      }
  return [...pairs.values()];
}
