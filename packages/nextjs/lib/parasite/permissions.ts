import { currentExposure, isUnlimited } from "./exposure";
import { amount } from "./formatting";
import { classify, explain } from "./riskRules";
import type { Pair, Permission, Scan } from "./types";
import { type Address, type PublicClient, erc20Abi } from "viem";

export async function discover(client: PublicClient, owner: Address, pairs: Pair[]): Promise<Scan> {
  if ((await client.getChainId()) !== 10143) throw new Error("RPC is not Monad Testnet");
  const block = await client.getBlockNumber({ cacheTime: 0 });
  const time = new Date().toISOString();
  const scan: Scan = { permissions: [], failures: [], checked: pairs.length, block, time };
  // Bounded known pairs only; every read is pinned to the same block.
  for (const pair of pairs) {
    try {
      const code = await client.getBytecode({ address: pair.token, blockNumber: block });
      if (!code || code === "0x") {
        scan.failures.push({ pair, status: "UNSUPPORTED TOKEN", message: "No token bytecode at this address" });
        continue;
      }
      const allowance = await client.readContract({
        address: pair.token,
        abi: erc20Abi,
        functionName: "allowance",
        args: [owner, pair.spender],
        blockNumber: block,
      });
      const [symbolResult, decimalsResult, balanceResult, spenderResult] = await Promise.allSettled([
        client.readContract({ address: pair.token, abi: erc20Abi, functionName: "symbol", blockNumber: block }),
        client.readContract({ address: pair.token, abi: erc20Abi, functionName: "decimals", blockNumber: block }),
        client.readContract({
          address: pair.token,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [owner],
          blockNumber: block,
        }),
        client.getBytecode({ address: pair.spender, blockNumber: block }),
      ]);
      const decimals = decimalsResult.status === "fulfilled" ? decimalsResult.value : null;
      const symbol = symbolResult.status === "fulfilled" ? symbolResult.value.slice(0, 24) : "Unknown token";
      const balance = balanceResult.status === "fulfilled" ? balanceResult.value : null;
      const permission: Permission = {
        ...pair,
        key: `10143:${owner}:${pair.token}:${pair.spender}`.toLowerCase(),
        owner,
        symbol,
        decimals,
        allowance,
        balance,
        exposure: balance === null ? null : currentExposure(balance, allowance),
        formattedAllowance: amount(allowance, decimals),
        unlimited: isUnlimited(allowance),
        category: classify(allowance, balance),
        block,
        verifiedAt: time,
        explanation: explain(allowance, balance),
        source: "Known-contract verification",
        metadataUnavailable: decimals === null || symbolResult.status === "rejected",
        spenderType:
          spenderResult.status === "rejected"
            ? "Classification unavailable"
            : spenderResult.value && spenderResult.value !== "0x"
              ? "Contract"
              : "Appears to be an EOA",
      };
      scan.permissions.push(permission);
    } catch (error) {
      scan.failures.push({
        pair,
        status: "READ FAILED",
        message: error instanceof Error ? error.message : "RPC read failed",
      });
    }
  }
  return scan;
}
