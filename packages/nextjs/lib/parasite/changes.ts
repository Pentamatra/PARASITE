import { MAX_PAIRS, pairKey, validPair } from "./pairs";
import type { Scan } from "./types";
import { maxUint256 } from "viem";

export type Snapshot = {
  version: 1;
  owner: string;
  chainId: 10143;
  time: string;
  items: { token: string; spender: string; allowance: string }[];
};
export type PermissionChange = {
  key: string;
  kind: "NEWLY OBSERVED" | "INCREASED" | "REOPENED" | "ZERO NOW" | "DECREASED";
};
export function parseSnapshot(raw: string, owner: string): Snapshot | null {
  try {
    if (raw.length > 24000) return null;
    const v = JSON.parse(raw);
    if (
      v.version !== 1 ||
      v.chainId !== 10143 ||
      typeof v.owner !== "string" ||
      v.owner.toLowerCase() !== owner.toLowerCase() ||
      typeof v.time !== "string" ||
      v.time.length > 40 ||
      !Number.isFinite(Date.parse(v.time)) ||
      !Array.isArray(v.items) ||
      v.items.length > MAX_PAIRS
    )
      return null;
    for (const item of v.items)
      if (
        !validPair(item.token, item.spender) ||
        typeof item.allowance !== "string" ||
        !/^(0|[1-9][0-9]{0,77})$/.test(item.allowance) ||
        BigInt(item.allowance) > maxUint256
      )
        return null;
    return v;
  } catch {
    return null;
  }
}
export function compareSnapshot(previous: Snapshot, scan: Scan): PermissionChange[] {
  const old = new Map(previous.items.map(p => [pairKey(p), BigInt(p.allowance)]));
  return scan.permissions.flatMap(p => {
    const prior = old.get(pairKey(p));
    const kind =
      prior === undefined
        ? p.allowance > 0n
          ? "NEWLY OBSERVED"
          : null
        : prior === 0n && p.allowance > 0n
          ? "REOPENED"
          : prior > 0n && p.allowance === 0n
            ? "ZERO NOW"
            : p.allowance > prior
              ? "INCREASED"
              : p.allowance < prior
                ? "DECREASED"
                : null;
    return kind ? [{ key: pairKey(p), kind } as PermissionChange] : [];
  });
}
export function makeSnapshot(owner: string, scan: Scan, previous?: Snapshot): Snapshot {
  // Failed or unscanned relationships never become invented zero values.
  const items = new Map((previous?.items ?? []).map(p => [pairKey(p), p]));
  for (const p of scan.permissions)
    items.set(pairKey(p), { token: p.token, spender: p.spender, allowance: p.allowance.toString() });
  return {
    version: 1,
    owner: owner.toLowerCase(),
    chainId: 10143,
    time: scan.time,
    items: [...items.values()].slice(-MAX_PAIRS),
  };
}
