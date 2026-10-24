import deployment from "../deployment.json";
import type { Pair } from "../types";
import { isAddress, zeroAddress } from "viem";

export function supportedPairs(): { pairs: Pair[]; error?: string } {
  const token = process.env.NEXT_PUBLIC_PARASITE_TOKEN || deployment.token;
  const configuredSpenders = process.env.NEXT_PUBLIC_PARASITE_SPENDERS?.trim();
  const spenders = configuredSpenders ? configuredSpenders.split(",").map(s => s.trim()) : deployment.spenders;
  if (!token && !spenders.length)
    return {
      pairs: [],
      error: "Demo contracts are not configured. Deploy them and record confirmed addresses to enable live discovery.",
    };
  if (
    deployment.chainId !== 10143 ||
    !isAddress(token) ||
    token === zeroAddress ||
    !spenders.length ||
    spenders.some(s => !isAddress(s) || s === zeroAddress)
  )
    return { pairs: [], error: "Invalid testnet contract configuration. Discovery unavailable." };
  return {
    pairs: [...new Set(spenders.map(s => s.toLowerCase()))].map((spender, i) => ({
      token,
      spender: spender as Pair["spender"],
      name: i === 0 ? "The Overseer" : `Ember ${i.toString().padStart(2, "0")}`,
      origin: "demo" as const,
    })),
  };
}
