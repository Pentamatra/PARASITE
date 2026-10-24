import { createPublicClient, http, isAddress } from "viem";
import { approvalLogPairs } from "../../nextjs/lib/parasite/discovery/approvalLogs";
import { discover } from "../../nextjs/lib/parasite/permissions";

/** Public inputs only. No signer, private key, transaction, or contract write path. */
async function main() {
  const [owner, token, from, to] = process.argv.slice(2);
  if (!isAddress(owner || "") || !isAddress(token || "") || !/^[0-9]+$/.test(from || "") || !/^[0-9]+$/.test(to || ""))
    throw new Error("Usage: ts-node scripts/checkParasiteHistory.ts <owner> <token> <from-block> <to-block>");
  const client = createPublicClient({
    transport: http(process.env.MONAD_RPC_URL || "https://testnet-rpc.monad.xyz"),
  }) as unknown as Parameters<typeof approvalLogPairs>[0];
  const coverage = await approvalLogPairs(
    client,
    owner as `0x${string}`,
    token as `0x${string}`,
    BigInt(from),
    BigInt(to),
  );
  const current = await discover(client, owner as `0x${string}`, coverage.pairs);
  console.log(
    JSON.stringify({ coverage, current }, (_, value) => (typeof value === "bigint" ? value.toString() : value), 2),
  );
}
main().catch(error => {
  console.error(error instanceof Error ? error.message : "Discovery failed");
  process.exitCode = 1;
});
