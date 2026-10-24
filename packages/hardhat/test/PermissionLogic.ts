import { expect } from "chai";
import { currentExposure, isUnlimited } from "../../nextjs/lib/parasite/exposure";
import { classify, explain } from "../../nextjs/lib/parasite/riskRules";
import { amount } from "../../nextjs/lib/parasite/formatting";
import { discover } from "../../nextjs/lib/parasite/permissions";
import { approveAndVerify } from "../../nextjs/lib/parasite/transactions";
import { Address, Hash, encodeFunctionData, erc20Abi } from "viem";
import { TxState } from "../../nextjs/lib/parasite/types";

type PublicClient = Parameters<typeof discover>[0];
type WalletClient = Parameters<typeof approveAndVerify>[0]["wallet"];

const owner = "0x0000000000000000000000000000000000000001" as Address;
const pair = {
  token: "0x0000000000000000000000000000000000000002" as Address,
  spender: "0x0000000000000000000000000000000000000003" as Address,
  name: "Test",
};
const hash = `0x${"1".repeat(64)}` as Hash;

describe("PARASITE deterministic exposure", () => {
  it("classifies zero, finite, effectively unlimited, and unavailable balances", () => {
    expect(isUnlimited(2n ** 256n - 1n)).to.equal(true);
    expect(isUnlimited(2n ** 255n - 1n)).to.equal(false);
    expect(classify(0n, null)).to.equal("NO CURRENT ALLOWANCE");
    expect(classify(100n, 1000n)).to.equal("REVIEW");
    expect(classify(2n ** 255n, 1n)).to.equal("HIGH EXPOSURE");
    expect(classify(2n ** 255n, null)).to.equal("UNKNOWN RISK");
    expect(classify(2n ** 255n, 0n)).to.equal("REVIEW");
  });
  it("preserves decimal precision and large bigint values", () => {
    expect(currentExposure(123n, 2n ** 256n - 1n)).to.equal(123n);
    expect(currentExposure(1000n, 20n)).to.equal(20n);
    expect(amount(1234567890123456789n, 18)).to.equal("1.234567890123456789");
    expect(amount(1234567n, 6)).to.equal("1.234567");
    expect(amount(2n ** 256n - 1n, null)).to.equal(`${2n ** 256n - 1n} raw units`);
    expect(amount(null, 18)).to.equal("Unavailable");
  });
  it("does not invent reputation, prices, or withdrawal capability", () => {
    expect(explain(2n ** 255n, 5n)).to.contain("does not establish maliciousness");
    expect(explain(1n, null)).to.contain("exposure is unknown");
    expect(explain(2n ** 255n, 5n)).not.to.match(/\$|scammer|audited/);
  });
  it("retains verified allowances through partial metadata and balance failures", async () => {
    const mock = {
      getChainId: async () => 10143,
      getBlockNumber: async () => 77n,
      getBytecode: async () => "0x01",
      readContract: async ({ functionName }: { functionName: string }) => {
        if (functionName === "allowance") return 2n ** 255n;
        throw new Error("Metadata unavailable");
      },
    } as unknown as PublicClient;
    const result = await discover(mock, owner, [pair]);
    expect(result.permissions).to.have.length(1);
    expect(result.permissions[0].category).to.equal("UNKNOWN RISK");
    expect(result.permissions[0].decimals).to.equal(null);
    expect(result.permissions[0].exposure).to.equal(null);
    expect(result.permissions[0].symbol).to.equal("Unknown token");
  });
});

describe("PARASITE receipt and allowance state machine", () => {
  function fixture({ receiptStatus = "success", after = 0n, reject = false, replacement = "" } = {}) {
    const states: TxState[] = [];
    let reads = 0;
    const client = {
      getChainId: async () => 10143,
      getTransaction: async () => ({
        hash,
        from: owner,
        to: pair.token,
        input: encodeFunctionData({ abi: erc20Abi, functionName: "approve", args: [pair.spender, 0n] }),
        value: 0n,
      }),
      getBlockNumber: async () => 101n,
      readContract: async () => (++reads === 1 ? 100n : after),
      simulateContract: async ({ address, args }: { address: Address; args: readonly unknown[] }) => {
        expect(address).to.equal(pair.token);
        expect(args).to.deep.equal([pair.spender, 0n]);
        return { request: {} };
      },
      waitForTransactionReceipt: async ({
        onReplaced,
      }: {
        onReplaced: (event: { reason: string; transaction: { hash: Hash } }) => void;
      }) => {
        expect(states).not.to.include("SUCCESS");
        if (replacement)
          onReplaced({
            reason: replacement,
            transaction: {
              hash,
              from: owner,
              to: pair.token,
              input: encodeFunctionData({ abi: erc20Abi, functionName: "approve", args: [pair.spender, 0n] }),
              value: 0n,
            },
          } as Parameters<typeof onReplaced>[0]);
        return { status: receiptStatus, transactionHash: hash, blockNumber: 100n };
      },
    } as unknown as PublicClient;
    const wallet = {
      getChainId: async () => 10143,
      getAddresses: async () => [owner],
      writeContract: async () => {
        if (reject) throw Object.assign(new Error("User rejected"), { code: 4001 });
        return hash;
      },
    } as unknown as WalletClient;
    const run = () =>
      approveAndVerify({
        client,
        wallet,
        owner,
        pair,
        value: 0n,
        state: s => states.push(s),
        submitted: () => undefined,
      });
    return { states, run };
  }
  it("passes through pending and rechecking before verified success", async () => {
    const { states, run } = fixture();
    expect((await run()).hash).to.equal(hash);
    expect(states).to.deep.equal([
      "AWAITING_WALLET_CONFIRMATION",
      "SUBMITTED",
      "WAITING_FOR_CONFIRMATION",
      "RECHECKING_ALLOWANCE",
      "SUCCESS",
    ]);
  });
  it("permits a gas repricing replacement after receipt and allowance verification", async () => {
    const { states, run } = fixture({ replacement: "repriced" });
    await run();
    expect(states).to.include("SUCCESS");
  });
  for (const scenario of [
    { receiptStatus: "reverted" },
    { after: 5n },
    { reject: true },
    { replacement: "cancelled" },
    { replacement: "replaced" },
  ]) {
    it(`never succeeds on ${JSON.stringify(scenario, (_, value) => (typeof value === "bigint" ? String(value) : value))}`, async () => {
      const { states, run } = fixture(scenario);
      let failed = false;
      try {
        await run();
      } catch {
        failed = true;
      }
      expect(failed).to.equal(true);
      expect(states).not.to.include("SUCCESS");
    });
  }
});
