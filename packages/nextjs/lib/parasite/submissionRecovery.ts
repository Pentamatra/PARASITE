import { waitForTransactionVisibility } from "./rpcVisibility";
import { type Address, type Hash, type Hex, type PublicClient, decodeFunctionData, erc20Abi, parseAbiItem } from "viem";

const approvalEvent = parseAbiItem("event Approval(address indexed owner, address indexed spender, uint256 value)");
type Intent = { owner: Address; token: Address; spender: Address; value: bigint };

/** A matching event alone is insufficient: verify who sent the complete transaction. */
export async function findSubmittedApproval(
  client: PublicClient,
  intent: Intent,
  fromBlock: bigint,
  toBlock: bigint,
): Promise<Hash | undefined> {
  if (toBlock < fromBlock || toBlock - fromBlock > 99n) return;
  const logs = await client.getLogs({
    address: intent.token,
    event: approvalEvent,
    args: { owner: intent.owner, spender: intent.spender },
    fromBlock,
    toBlock,
  });
  for (const log of logs) {
    if (
      log.removed ||
      !log.transactionHash ||
      log.args.value !== intent.value ||
      log.address.toLowerCase() !== intent.token.toLowerCase() ||
      log.args.owner?.toLowerCase() !== intent.owner.toLowerCase() ||
      log.args.spender?.toLowerCase() !== intent.spender.toLowerCase()
    )
      continue;
    const tx = await waitForTransactionVisibility(() => client.getTransaction({ hash: log.transactionHash! }));
    if (
      tx.from.toLowerCase() !== intent.owner.toLowerCase() ||
      tx.to?.toLowerCase() !== intent.token.toLowerCase() ||
      tx.value !== 0n
    )
      continue;
    try {
      const call = decodeFunctionData({ abi: erc20Abi, data: tx.input as Hex });
      if (
        call.functionName === "approve" &&
        call.args[0].toLowerCase() === intent.spender.toLowerCase() &&
        call.args[1] === intent.value
      )
        return log.transactionHash;
    } catch {
      /* An unrelated or incompatible transaction is not recovery evidence. */
    }
  }
}

/** Wallet bridges may broadcast successfully but never return a hash. Never submit twice. */
export async function submitWithReadOnlyRecovery(
  client: PublicClient,
  intent: Intent,
  write: () => Promise<Hash>,
): Promise<Hash> {
  const start = await client.getBlockNumber({ cacheTime: 0 });
  const controller = new AbortController();
  let stopTimer: (() => void) | undefined;
  const observe = async () => {
    let cursor = start + 1n;
    const deadline = Date.now() + 120_000;
    let requests = 0;
    while (!controller.signal.aborted && Date.now() < deadline && requests < 45) {
      await new Promise<void>(resolve => {
        const timer = setTimeout(resolve, 3_000);
        stopTimer = () => {
          clearTimeout(timer);
          resolve();
        };
      });
      if (controller.signal.aborted) break;
      try {
        const head = await client.getBlockNumber({ cacheTime: 0 });
        if (head < cursor) continue;
        const end = head < cursor + 99n ? head : cursor + 99n;
        requests++;
        const hash = await findSubmittedApproval(client, intent, cursor, end);
        if (controller.signal.aborted) break;
        if (hash) return hash;
        cursor = end + 1n;
      } catch {
        /* RPC log support is optional. The wallet response can still complete. */
      }
    }
    throw new Error("Wallet did not return a transaction hash. Check wallet activity before trying again.");
  };
  const observed = observe();
  const wallet = write().catch(error => {
    let cause = error;
    for (let depth = 0; cause && depth < 8; depth++, cause = cause.cause) {
      if (cause.code === 4001 || cause.name === "UserRejectedRequestError") throw error;
    }
    return observed.catch(() => {
      throw error;
    });
  });
  // Expiring the read-only observer must not unlock an outstanding wallet request.
  try {
    return await Promise.race([wallet, observed.catch(() => wallet)]);
  } finally {
    controller.abort();
    stopTimer?.();
  }
}
