import { formatUnits } from "viem";

export const short = (value: string) => `${value.slice(0, 6)}…${value.slice(-4)}`;
export const amount = (value: bigint | null, decimals: number | null) =>
  value === null ? "Unavailable" : decimals === null ? `${value.toString()} raw units` : formatUnits(value, decimals);
