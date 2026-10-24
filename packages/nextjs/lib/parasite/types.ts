import type { Address, Hash } from "viem";

export type Category = "HIGH EXPOSURE" | "REVIEW" | "NO CURRENT ALLOWANCE" | "UNKNOWN RISK";
export type Pair = { token: Address; spender: Address; name: string; origin?: "demo" | "manual" | "history" };
export type Permission = Pair & {
  key: string;
  owner: Address;
  symbol: string;
  decimals: number | null;
  allowance: bigint;
  balance: bigint | null;
  exposure: bigint | null;
  formattedAllowance: string;
  unlimited: boolean;
  category: Category;
  block: bigint;
  verifiedAt: string;
  explanation: string;
  source: "Known-contract verification";
  metadataUnavailable: boolean;
  spenderType: "Contract" | "Appears to be an EOA" | "Classification unavailable";
};
export type Finding = { pair: Pair; status: "READ FAILED" | "UNSUPPORTED TOKEN"; message: string };
export type Scan = { permissions: Permission[]; failures: Finding[]; checked: number; block: bigint; time: string };
export type TxState =
  | "IDLE"
  | "AWAITING_WALLET_CONFIRMATION"
  | "SUBMITTED"
  | "WAITING_FOR_CONFIRMATION"
  | "RECHECKING_ALLOWANCE"
  | "SUCCESS"
  | "UNRESOLVED"
  | "FAILED";
export type VerifiedApproval = {
  finalizedBlock?: bigint;
  hash: Hash;
  owner: Address;
  token: Address;
  spender: Address;
  requestedAllowance: bigint;
  allowance: bigint;
  receiptBlock: bigint;
  verificationBlock: bigint;
  verifiedAt: string;
};
export type TxObservation = { state: TxState; elapsedMs: number };
export type Revocation = {
  key: string;
  hash: Hash;
  token: Address;
  spender: Address;
  time: string;
  owner: Address;
  receiptBlock?: bigint;
  verificationBlock?: bigint;
};
