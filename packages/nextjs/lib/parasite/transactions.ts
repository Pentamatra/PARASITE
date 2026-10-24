import { isTransactionNotVisible, waitForTransactionVisibility } from "./rpcVisibility";
import { submitWithReadOnlyRecovery } from "./submissionRecovery";
import type { Pair, TxState, VerifiedApproval } from "./types";
import { type Address, type Hash, type PublicClient, type WalletClient, decodeFunctionData, erc20Abi } from "viem";

export class ApprovalVerificationError extends Error {
  constructor(
    message: string,
    public readonly kind: "REVERTED" | "REPLACED" | "INTENT_MISMATCH" | "UNRESOLVED",
  ) {
    super(message);
    this.name = "ApprovalVerificationError";
  }
}

type ApprovalIntent = { owner: Address; pair: Pair; value: bigint };
type ApprovalTransaction = { hash: Hash; from: Address; to: Address | null; input: `0x${string}`; value: bigint };

export function matchesApprovalIntent(transaction: ApprovalTransaction, hash: Hash, intent: ApprovalIntent): boolean {
  try {
    if (
      transaction.hash.toLowerCase() !== hash.toLowerCase() ||
      transaction.from.toLowerCase() !== intent.owner.toLowerCase() ||
      transaction.to?.toLowerCase() !== intent.pair.token.toLowerCase() ||
      transaction.value !== 0n
    )
      return false;
    const decoded = decodeFunctionData({ abi: erc20Abi, data: transaction.input });
    return (
      decoded.functionName === "approve" &&
      decoded.args[0].toLowerCase() === intent.pair.spender.toLowerCase() &&
      decoded.args[1] === intent.value
    );
  } catch {
    return false;
  }
}

/** Read-only verification, shared by a fresh submission and reload recovery. */
export async function verifyApprovalTransaction({
  client,
  owner,
  pair,
  value,
  hash,
  state,
  submitted,
}: ApprovalIntent & {
  client: PublicClient;
  hash: Hash;
  state: (state: TxState) => void;
  submitted: (hash: Hash) => void;
}): Promise<VerifiedApproval> {
  if ((await client.getChainId()) !== 10143)
    throw new ApprovalVerificationError("RPC is not Monad Testnet", "UNRESOLVED");
  state("WAITING_FOR_CONFIRMATION");
  const transaction = await waitForTransactionVisibility(() => client.getTransaction({ hash })).catch(error => {
    if (isTransactionNotVisible(error))
      throw new ApprovalVerificationError(
        "The transaction is not visible on this RPC yet. Its hash is saved. Recheck this transaction; do not submit another.",
        "UNRESOLVED",
      );
    throw error;
  });
  if (!matchesApprovalIntent(transaction, hash, { owner, pair, value }))
    throw new ApprovalVerificationError(
      "The saved transaction does not match this wallet and approval. No success can be verified.",
      "INTENT_MISMATCH",
    );
  let finalHash = hash;
  let changedIntent = false;
  const receipt = await client.waitForTransactionReceipt({
    hash,
    confirmations: 2,
    // Scaffold's 30-second background interval needlessly delays an active demo transaction.
    pollingInterval: 1_000,
    timeout: 180_000,
    onReplaced: replacement => {
      if (
        replacement.reason !== "repriced" ||
        !matchesApprovalIntent(replacement.transaction, replacement.transaction.hash, { owner, pair, value })
      ) {
        changedIntent = true;
        return;
      }
      finalHash = replacement.transaction.hash;
      submitted(finalHash);
    },
  });
  if (changedIntent)
    throw new ApprovalVerificationError(
      "Transaction was cancelled or replaced with a different action. Refresh allowance before retrying.",
      "REPLACED",
    );
  if (receipt.transactionHash.toLowerCase() !== finalHash.toLowerCase())
    throw new ApprovalVerificationError(
      "The receipt does not match the tracked transaction. Verification is unresolved.",
      "UNRESOLVED",
    );
  if (receipt.status !== "success")
    throw new ApprovalVerificationError(
      "Transaction reverted. Permission has not been verified as revoked.",
      "REVERTED",
    );
  state("RECHECKING_ALLOWANCE");
  const verificationBlock = await client.getBlockNumber({ cacheTime: 0 });
  if (verificationBlock < receipt.blockNumber + 1n)
    throw new ApprovalVerificationError(
      "The RPC has not returned the required confirmed block yet. Retry verification.",
      "UNRESOLVED",
    );
  const verified = await client.readContract({
    address: pair.token,
    abi: erc20Abi,
    functionName: "allowance",
    args: [owner, pair.spender],
    blockNumber: verificationBlock,
  });
  if (verified !== value)
    throw new ApprovalVerificationError(
      "Receipt confirmed, but allowance does not match. Refresh and review; success is unverified.",
      "UNRESOLVED",
    );
  let finalizedBlock: bigint | undefined;
  try {
    const finalized = await client.getBlock({ blockTag: "finalized" });
    if (finalized.number !== null && finalized.number >= receipt.blockNumber) finalizedBlock = finalized.number;
  } catch {
    /* Provider finality tags are optional; confirmation and allowance evidence remain separate. */
  }
  const proof: VerifiedApproval = {
    finalizedBlock,
    hash: finalHash,
    owner,
    token: pair.token,
    spender: pair.spender,
    requestedAllowance: value,
    allowance: verified,
    receiptBlock: receipt.blockNumber,
    verificationBlock,
    verifiedAt: new Date().toISOString(),
  };
  state("SUCCESS");
  return proof;
}

export async function approveAndVerify({
  client,
  wallet,
  owner,
  pair,
  value,
  state,
  submitted,
}: {
  client: PublicClient;
  wallet: WalletClient;
  owner: Address;
  pair: Pair;
  value: bigint;
  state: (state: TxState) => void;
  submitted: (hash: Hash) => void;
}) {
  if ((await wallet.getChainId()) !== 10143 || (await client.getChainId()) !== 10143)
    throw new Error("Switch to Monad Testnet before signing");
  const accounts = await wallet.getAddresses();
  if (accounts[0]?.toLowerCase() !== owner.toLowerCase()) throw new Error("Wallet account changed. Scan again.");
  const current = await client.readContract({
    address: pair.token,
    abi: erc20Abi,
    functionName: "allowance",
    args: [owner, pair.spender],
  });
  if (value === 0n && current === 0n) throw new Error("Allowance already zero. Refresh scan; no transaction required.");
  const { request } = await client.simulateContract({
    account: owner,
    address: pair.token,
    abi: erc20Abi,
    functionName: "approve",
    args: [pair.spender, value],
  });
  state("AWAITING_WALLET_CONFIRMATION");
  const hash = await submitWithReadOnlyRecovery(
    client,
    { owner, token: pair.token, spender: pair.spender, value },
    () => wallet.writeContract({ ...request, chain: wallet.chain }),
  );
  submitted(hash);
  state("SUBMITTED");
  return verifyApprovalTransaction({ client, owner, pair, value, hash, state, submitted });
}
