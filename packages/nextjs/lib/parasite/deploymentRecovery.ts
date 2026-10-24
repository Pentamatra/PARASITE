import { type Address, type Hex, getContractAddress } from "viem";

/** A recovery hash is only evidence after its complete creation intent matches. */
export function matchesDemoDeployment(
  tx: { from: Address; to: Address | null; input: Hex; value: bigint },
  owner: Address,
  creationCode: Hex,
) {
  return (
    tx.from.toLowerCase() === owner.toLowerCase() &&
    tx.to === null &&
    tx.value === 0n &&
    tx.input.toLowerCase() === creationCode.toLowerCase()
  );
}

export function matchesDeploymentReceipt(
  receipt: { status: string; transactionHash: Hex; contractAddress?: Address | null },
  hash: Hex,
  owner: Address,
  nonce: number,
) {
  return (
    receipt.status === "success" &&
    receipt.transactionHash.toLowerCase() === hash.toLowerCase() &&
    receipt.contractAddress?.toLowerCase() === getContractAddress({ from: owner, nonce: BigInt(nonce) }).toLowerCase()
  );
}
