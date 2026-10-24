import { createPublicClient, http, isAddress } from "viem";
import { verifyApprovalTransaction } from "../../nextjs/lib/parasite/transactions";
async function main() {
  const [owner, token, spender, hash, raw] = process.argv.slice(2);
  if (
    ![owner, token, spender].every(value => isAddress(value || "")) ||
    !/^0x[0-9a-fA-F]{64}$/.test(hash || "") ||
    !/^(0|[1-9][0-9]{0,77})$/.test(raw || "")
  )
    throw new Error(
      "Usage: ts-node scripts/checkParasiteApproval.ts <owner> <token> <spender> <tx-hash> <expected-raw-allowance>",
    );
  const client = createPublicClient({
    transport: http(process.env.MONAD_RPC_URL || "https://testnet-rpc.monad.xyz"),
  }) as unknown as Parameters<typeof verifyApprovalTransaction>[0]["client"];
  const proof = await verifyApprovalTransaction({
    client,
    owner: owner as `0x${string}`,
    pair: { token: token as `0x${string}`, spender: spender as `0x${string}`, name: "Read-only verification" },
    value: BigInt(raw),
    hash: hash as `0x${string}`,
    state: state => console.log(state),
    submitted: replacement => console.log(`Replacement hash: ${replacement}`),
  });
  console.log(JSON.stringify(proof, (_, value) => (typeof value === "bigint" ? value.toString() : value), 2));
}
main()
  .then(() => {
    process.exit(0);
  })
  .catch(error => {
    console.error(error instanceof Error ? error.message : "Verification failed");
    process.exit(1);
  });
