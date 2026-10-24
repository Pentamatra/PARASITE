import { pairKey, validPair } from "../pairs";
import type { Pair } from "../types";
import { type Address, type PublicClient, parseAbiItem } from "viem";

const event = parseAbiItem("event Approval(address indexed owner, address indexed spender, uint256 value)");
export type LogCoverage = {
  pairs: Pair[];
  from: bigint;
  requestedTo: bigint;
  scannedTo: bigint | null;
  requests: number;
  partial: boolean;
};
/** One token, one owner, <= 5000 blocks and <= 80 RPC log requests. Event values are never current allowances. */
export async function approvalLogPairs(
  client: PublicClient,
  owner: Address,
  token: Address,
  from: bigint,
  to: bigint,
  signal?: AbortSignal,
): Promise<LogCoverage> {
  if (signal?.aborted) throw new Error("Discovery cancelled.");
  if (from < 0n || to < from || to - from + 1n > 5000n) throw new Error("Choose at most 5,000 recent blocks.");
  if ((await client.getChainId()) !== 10143) throw new Error("RPC is not Monad Testnet");
  const anchor = await client.getBlock({ blockNumber: to });
  const pairs = new Map<string, Pair>();
  let cursor = from,
    chunk = 100n,
    requests = 0,
    scannedTo: bigint | null = null;
  while (cursor <= to && requests < 80 && pairs.size < 12) {
    if (signal?.aborted) throw new Error("Discovery cancelled.");
    const end = cursor + chunk - 1n < to ? cursor + chunk - 1n : to;
    ++requests;
    try {
      const logs = await client.getLogs({
        address: token,
        event,
        args: { owner },
        fromBlock: cursor,
        toBlock: end,
        strict: true,
      });
      for (const log of logs) {
        if (
          log.removed ||
          !log.args.spender ||
          log.args.owner?.toLowerCase() !== owner.toLowerCase() ||
          !validPair(token, log.args.spender)
        )
          continue;
        const pair: Pair = {
          token,
          spender: log.args.spender,
          name: `Approval · ${log.args.spender.slice(-6)}`,
          origin: "history",
        };
        if (pairs.size < 12) pairs.set(pairKey(pair), pair);
      }
      scannedTo = end;
      cursor = end + 1n;
    } catch {
      if (chunk === 1n) break;
      chunk = chunk / 2n || 1n;
    }
  }
  const checkedAnchor = await client.getBlock({ blockNumber: to });
  if (signal?.aborted) throw new Error("Discovery cancelled.");
  if (!anchor.hash || anchor.hash !== checkedAnchor.hash)
    throw new Error("Chain coverage changed during discovery. Retry; results were discarded.");
  return {
    pairs: [...pairs.values()],
    from,
    requestedTo: to,
    scannedTo,
    requests,
    partial: cursor <= to || pairs.size >= 12,
  };
}
