import { currentExposure } from "./exposure";
import { maxUint256 } from "viem";

export type DepositInput =
  | { value: bigint; error?: never }
  | { value?: never; error: "INVALID_AMOUNT" | "PRECISION" | "OVERFLOW" };

/** Exact decimal parsing: extra precision is rejected, never silently rounded. */
export function parseDeposit(input: string, decimals: number | null): DepositInput {
  if (input.length > 400 || !/^(0|[1-9][0-9]*)(\.[0-9]+)?$/.test(input)) return { error: "INVALID_AMOUNT" };
  const units = decimals ?? 0;
  if (!Number.isInteger(units) || units < 0 || units > 255) return { error: "INVALID_AMOUNT" };
  const [whole, fraction = ""] = input.split(".");
  if (fraction.length > units) return { error: "PRECISION" };
  const value = BigInt(whole) * 10n ** BigInt(units) + BigInt(fraction.padEnd(units, "0") || "0");
  return value > maxUint256 ? { error: "OVERFLOW" } : { value };
}

/** A local what-if snapshot. Assumes no intervening spend or allowance change. */
export function futureExposure(balance: bigint | null, allowance: bigint, deposit: bigint) {
  const valid = (value: bigint) => value >= 0n && value <= maxUint256;
  if (!valid(allowance) || !valid(deposit) || (balance !== null && !valid(balance)))
    throw new RangeError("Invalid uint256 amount");
  if (balance === null) return { balance: null, exposure: null, outside: null, additionalExposure: null };
  const projectedBalance = balance + deposit;
  if (projectedBalance > maxUint256) throw new RangeError("Projected balance exceeds uint256");
  const exposure = currentExposure(projectedBalance, allowance);
  return {
    balance: projectedBalance,
    exposure,
    outside: projectedBalance - exposure,
    additionalExposure: exposure - currentExposure(balance, allowance),
  };
}
