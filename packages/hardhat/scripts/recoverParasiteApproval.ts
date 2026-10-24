import { createPublicClient, http, isAddress, type Address } from "viem";
import { findSubmittedApproval } from "../../nextjs/lib/parasite/submissionRecovery";
import { verifyApprovalTransaction } from "../../nextjs/lib/parasite/transactions";

async function main() {
  const [owner, token, spender, value, from, to] = process.argv.slice(2);
  if (![owner, token, spender].every(s => isAddress(s || "")) || ![value, from, to].every(s => /^\d+$/.test(s || "")))
    throw new Error("Expected owner token spender raw-value from-block to-block");
  const client = createPublicClient({ transport: http("https://testnet-rpc.monad.xyz") }) as unknown as Parameters<
    typeof findSubmittedApproval
  >[0];
  if ((await client.getChainId()) !== 10143) throw new Error("Wrong chain");
  if (BigInt(to) - BigInt(from) > 2000n) throw new Error("Range exceeds 2000 blocks");
  for (let cursor = BigInt(from); cursor <= BigInt(to); cursor += 100n) {
    const end = cursor + 99n < BigInt(to) ? cursor + 99n : BigInt(to);
    const hash = await findSubmittedApproval(
      client,
      { owner: owner as Address, token: token as Address, spender: spender as Address, value: BigInt(value) },
      cursor,
      end,
    );
    if (!hash) continue;
    const proof = await verifyApprovalTransaction({
      client,
      owner: owner as Address,
      pair: { token: token as Address, spender: spender as Address, name: "Recovered permission" },
      value: BigInt(value),
      hash,
      state: () => {},
      submitted: () => {},
    });
    console.log(JSON.stringify(proof, (_, v) => (typeof v === "bigint" ? String(v) : v), 2));
    return;
  }
  throw new Error("No matching submitted approval found");
}
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error.message);
    process.exit(1);
  });
