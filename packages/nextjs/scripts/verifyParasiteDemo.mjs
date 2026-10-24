// Read-only verification. Arguments are public owner, token, and spender addresses.
import fs from "node:fs";
import { createPublicClient, erc20Abi, formatUnits, http, isAddress, zeroAddress } from "viem";

const [owner, token, spender] = process.argv.slice(2);
if ([owner, token, spender].some(value => !value || !isAddress(value) || value.toLowerCase() === zeroAddress)) {
  throw new Error("Usage: node scripts/verifyParasiteDemo.mjs <owner> <token> <spender>");
}
const client = createPublicClient({
  transport: http(process.env.NEXT_PUBLIC_MONAD_RPC_URL || "https://testnet-rpc.monad.xyz"),
});
if ((await client.getChainId()) !== 10143) throw new Error("RPC is not Monad Testnet");
const block = await client.getBlockNumber({ cacheTime: 0 });
const read = (functionName, args) =>
  client.readContract({ address: token, abi: erc20Abi, functionName, args, blockNumber: block });
const [tokenCode, spenderCode, symbol, decimals, balance, allowance] = await Promise.all([
  client.getBytecode({ address: token, blockNumber: block }),
  client.getBytecode({ address: spender, blockNumber: block }),
  read("symbol"),
  read("decimals"),
  read("balanceOf", [owner]),
  read("allowance", [owner, spender]),
]);
const artifact = name =>
  JSON.parse(
    fs.readFileSync(new URL(`../../hardhat/artifacts/contracts/${name}.sol/${name}.json`, import.meta.url), "utf8"),
  );
const tokenRuntimeMatches = tokenCode === artifact("DemoToken").deployedBytecode;
const spenderRuntimeMatches = spenderCode === artifact("DemoSpender").deployedBytecode;
if (!tokenRuntimeMatches || !spenderRuntimeMatches)
  throw new Error("Onchain runtime does not match the compiled demo contracts");
console.log(
  JSON.stringify(
    {
      chainId: 10143,
      block: String(block),
      verifiedAt: new Date().toISOString(),
      token,
      spender,
      tokenRuntimeMatches,
      spenderRuntimeMatches,
      symbol,
      decimals,
      balance: String(balance),
      formattedBalance: formatUnits(balance, decimals),
      allowance: String(allowance),
    },
    null,
    2,
  ),
);
