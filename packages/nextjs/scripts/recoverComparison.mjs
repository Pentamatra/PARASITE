// Read-only recovery of a known owner's transaction nonce. Never signs or submits.
import fs from "node:fs";
import { createPublicClient, getContractAddress, http, isAddress } from "viem";

const [owner, nonceText, startText] = process.argv.slice(2);
if (!isAddress(owner || "") || !/^\d+$/.test(nonceText || "") || !/^\d+$/.test(startText || ""))
  throw new Error("Usage: node scripts/recoverComparison.mjs <owner> <nonce> <earliest-block>");
const nonce = BigInt(nonceText);
const client = createPublicClient({
  transport: http("https://testnet-rpc.monad.xyz", { timeout: 20_000, retryCount: 1 }),
});
if ((await client.getChainId()) !== 10143) throw new Error("Wrong chain");
let low = BigInt(startText),
  high = await client.getBlockNumber();
if (BigInt(await client.getTransactionCount({ address: owner, blockNumber: low })) > nonce)
  throw new Error("Start block is too late");
if (BigInt(await client.getTransactionCount({ address: owner, blockNumber: high })) <= nonce)
  throw new Error("Nonce is not confirmed");
while (high - low > 1n) {
  const mid = (low + high) / 2n;
  if (BigInt(await client.getTransactionCount({ address: owner, blockNumber: mid })) > nonce) high = mid;
  else low = mid;
}
const block = await client.getBlock({ blockNumber: high, includeTransactions: true });
const tx = block.transactions.find(tx => tx.from.toLowerCase() === owner.toLowerCase() && BigInt(tx.nonce) === nonce);
if (!tx) throw new Error("Transaction not found at nonce boundary");
const receipt = await client.getTransactionReceipt({ hash: tx.hash });
const expected = getContractAddress({ from: owner, nonce });
const artifact = JSON.parse(
  fs.readFileSync(
    new URL("../../hardhat/artifacts/contracts/DemoSpender.sol/DemoSpender.json", import.meta.url),
    "utf8",
  ),
);
const code = await client.getBytecode({ address: expected });
const verified =
  tx.to === null &&
  tx.value === 0n &&
  tx.input.toLowerCase() === artifact.bytecode.toLowerCase() &&
  receipt.status === "success" &&
  receipt.contractAddress?.toLowerCase() === expected.toLowerCase() &&
  code === artifact.deployedBytecode;
console.log(
  JSON.stringify(
    {
      hash: tx.hash,
      nonce: tx.nonce,
      block: String(high),
      to: tx.to,
      receiptStatus: receipt.status,
      contractAddress: receipt.contractAddress,
      expectedAddress: expected,
      verifiedDemoSpender: verified,
    },
    null,
    2,
  ),
);
if (!verified) process.exitCode = 1;
