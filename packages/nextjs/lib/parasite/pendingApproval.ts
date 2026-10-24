import { type Address, type Hash, isAddress, maxUint256, zeroAddress } from "viem";

/** Only public transaction metadata. Never a signature, credential, or wallet secret. */
export type PendingApproval = {
  version: 1;
  chainId: 10143;
  owner: Address;
  token: Address;
  spender: Address;
  requestedAllowance: string;
  hash: Hash;
  submittedAt: string;
};
export type PendingStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export type PendingRead =
  | { kind: "empty" }
  | { kind: "valid"; record: PendingApproval }
  | { kind: "invalid" }
  | { kind: "unavailable" };

export const pendingApprovalKey = (owner: string) => `parasite:pending-approval:v1:10143:${owner.toLowerCase()}`;

export function parsePendingApproval(raw: string, owner: Address): PendingApproval | null {
  if (raw.length > 4096) return null;
  try {
    const record: unknown = JSON.parse(raw);
    if (!record || typeof record !== "object") return null;
    const r = record as Record<string, unknown>;
    const addressValid = (value: unknown): value is Address =>
      typeof value === "string" && isAddress(value) && value.toLowerCase() !== zeroAddress;
    if (
      r.version !== 1 ||
      r.chainId !== 10143 ||
      !addressValid(r.owner) ||
      r.owner.toLowerCase() !== owner.toLowerCase() ||
      !addressValid(r.token) ||
      !addressValid(r.spender)
    )
      return null;
    if (typeof r.hash !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(r.hash)) return null;
    if (
      typeof r.requestedAllowance !== "string" ||
      !/^(0|[1-9][0-9]{0,77})$/.test(r.requestedAllowance) ||
      BigInt(r.requestedAllowance) > maxUint256
    )
      return null;
    if (typeof r.submittedAt !== "string" || r.submittedAt.length > 40 || !Number.isFinite(Date.parse(r.submittedAt)))
      return null;
    return {
      version: 1,
      chainId: 10143,
      owner: r.owner,
      token: r.token,
      spender: r.spender,
      hash: r.hash as Hash,
      requestedAllowance: r.requestedAllowance,
      submittedAt: r.submittedAt,
    };
  } catch {
    return null;
  }
}

export function readPendingApproval(storage: PendingStorage | undefined, owner: Address): PendingRead {
  if (!storage) return { kind: "unavailable" };
  try {
    const raw = storage.getItem(pendingApprovalKey(owner));
    if (raw === null) return { kind: "empty" };
    const record = parsePendingApproval(raw, owner);
    return record ? { kind: "valid", record } : { kind: "invalid" };
  } catch {
    return { kind: "unavailable" };
  }
}

/** A late completion may only remove its own record, never another transaction. */
export function clearPendingApproval(storage: PendingStorage | undefined, owner: Address, expectedHash: Hash): boolean {
  if (!storage) return false;
  try {
    const saved = readPendingApproval(storage, owner);
    if (saved.kind === "empty") return true;
    if (saved.kind !== "valid" || saved.record.hash.toLowerCase() !== expectedHash.toLowerCase()) return false;
    storage.removeItem(pendingApprovalKey(owner));
    return true;
  } catch {
    return false;
  }
}

export function savePendingApproval(
  storage: PendingStorage | undefined,
  record: PendingApproval,
  previousHash?: Hash,
): boolean {
  if (!storage) return false;
  try {
    if (!parsePendingApproval(JSON.stringify(record), record.owner)) return false;
    const saved = readPendingApproval(storage, record.owner);
    if (saved.kind === "invalid" || saved.kind === "unavailable") return false;
    if (
      saved.kind === "valid" &&
      saved.record.hash.toLowerCase() !== record.hash.toLowerCase() &&
      saved.record.hash.toLowerCase() !== previousHash?.toLowerCase()
    )
      return false;
    storage.setItem(pendingApprovalKey(record.owner), JSON.stringify(record));
    return true;
  } catch {
    return false;
  }
}
