import { explain } from "./riskRules";
import type { Permission } from "./types";

// Explicitly illustrative; never supplied to live reads or writes.
export const simulationPermissions: Permission[] = [0, 1, 2].map(i => {
  const allowance = i === 0 ? 2n ** 256n - 1n : BigInt(i === 1 ? 250 : 40) * 10n ** 18n;
  const balance = 1000n * 10n ** 18n;
  return {
    key: `simulation-${i}`,
    owner: "0x0000000000000000000000000000000000000001",
    token: "0x0000000000000000000000000000000000000002",
    spender: `0x${String(i + 3).padStart(40, "0")}`,
    name: ["The Overseer", "Ember", "The Hitchhiker"][i],
    symbol: "PDEM",
    decimals: 18,
    allowance,
    balance,
    exposure: allowance < balance ? allowance : balance,
    formattedAllowance: i === 0 ? allowance.toString() : i === 1 ? "250" : "40",
    unlimited: i === 0,
    category: i === 0 ? "HIGH EXPOSURE" : "REVIEW",
    block: 0n,
    verifiedAt: "2026-01-01T00:00:00Z",
    explanation: explain(allowance, balance),
    source: "Known-contract verification",
    metadataUnavailable: false,
    spenderType: "Contract",
  };
});
