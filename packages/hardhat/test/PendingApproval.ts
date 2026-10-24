import { expect } from "chai";
import { encodeFunctionData, erc20Abi, maxUint256 } from "viem";
import {
  type PendingApproval,
  type PendingStorage,
  pendingApprovalKey,
  parsePendingApproval,
  readPendingApproval,
  savePendingApproval,
  clearPendingApproval,
} from "../../nextjs/lib/parasite/pendingApproval";
import { ApprovalVerificationError, verifyApprovalTransaction } from "../../nextjs/lib/parasite/transactions";
import type { TxState } from "../../nextjs/lib/parasite/types";

const owner = "0x0000000000000000000000000000000000000001" as const;
const token = "0x0000000000000000000000000000000000000002" as const;
const spender = "0x0000000000000000000000000000000000000003" as const;
const hash = `0x${"a".repeat(64)}` as const;
const otherHash = `0x${"b".repeat(64)}` as const;
const record: PendingApproval = {
  version: 1,
  chainId: 10143,
  owner,
  token,
  spender,
  hash,
  requestedAllowance: "0",
  submittedAt: "2026-10-24T08:00:00.000Z",
};
const pair = { token, spender, name: "Recovery test" };

function memoryStorage(): PendingStorage {
  const values = new Map<string, string>();
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: key => {
      values.delete(key);
    },
  };
}

describe("PARASITE persistent pending approval journal", () => {
  it("survives a reload as versioned public metadata with exact uint256 strings", () => {
    const storage = memoryStorage();
    expect(savePendingApproval(storage, { ...record, requestedAllowance: maxUint256.toString() })).to.equal(true);
    const restored = readPendingApproval(storage, owner);
    expect(restored.kind).to.equal("valid");
    if (restored.kind === "valid") expect(BigInt(restored.record.requestedAllowance)).to.equal(maxUint256);
    expect(storage.getItem(pendingApprovalKey(owner))).not.to.match(/privateKey|signature|seed/i);
  });
  it("rejects corrupt, oversized, cross-wallet, cross-chain, and overflowing records", () => {
    for (const raw of [
      "broken",
      "x".repeat(5000),
      "null",
      JSON.stringify({ ...record, version: 2 }),
      JSON.stringify({ ...record, owner: spender }),
      JSON.stringify({ ...record, chainId: 1 }),
      JSON.stringify({ ...record, hash: "0x123" }),
      JSON.stringify({ ...record, requestedAllowance: "-1" }),
      JSON.stringify({ ...record, requestedAllowance: "1e18" }),
      JSON.stringify({ ...record, requestedAllowance: (maxUint256 + 1n).toString() }),
      JSON.stringify({ ...record, token: "0x0000000000000000000000000000000000000000" }),
    ]) {
      expect(parsePendingApproval(raw, owner)).to.equal(null);
    }
  });
  it("does not overwrite another transaction or remove it on a late completion", () => {
    const storage = memoryStorage();
    expect(savePendingApproval(storage, record)).to.equal(true);
    expect(savePendingApproval(storage, { ...record, hash: otherHash })).to.equal(false);
    expect(clearPendingApproval(storage, owner, otherHash)).to.equal(false);
    expect(readPendingApproval(storage, owner).kind).to.equal("valid");
    expect(savePendingApproval(storage, { ...record, hash: otherHash }, hash)).to.equal(true);
    expect(clearPendingApproval(storage, owner, hash)).to.equal(false);
    expect(clearPendingApproval(storage, owner, otherHash)).to.equal(true);
    expect(readPendingApproval(storage, owner).kind).to.equal("empty");
  });
  it("keeps storage failures and invalid records distinct from no pending transaction", () => {
    expect(readPendingApproval(undefined, owner).kind).to.equal("unavailable");
    const blocked: PendingStorage = {
      getItem: () => {
        throw new Error("Denied");
      },
      setItem: () => {
        throw new Error("Quota");
      },
      removeItem: () => {
        throw new Error("Denied");
      },
    };
    expect(readPendingApproval(blocked, owner).kind).to.equal("unavailable");
    expect(savePendingApproval(blocked, record)).to.equal(false);
    const storage = memoryStorage();
    storage.setItem(pendingApprovalKey(owner), "broken");
    expect(readPendingApproval(storage, owner).kind).to.equal("invalid");
    expect(savePendingApproval(storage, record)).to.equal(false);
  });
  it("treats transaction hashes case-insensitively and keeps owners isolated", () => {
    const storage = memoryStorage();
    expect(savePendingApproval(storage, record)).to.equal(true);
    expect(savePendingApproval(storage, { ...record, hash: `0x${"A".repeat(64)}` })).to.equal(true);
    expect(readPendingApproval(storage, spender).kind).to.equal("empty");
    expect(clearPendingApproval(storage, owner, hash)).to.equal(true);
  });
});

describe("PARASITE read-only transaction recovery", () => {
  function fixture(
    options: {
      allowance?: bigint;
      receiptStatus?: string;
      wrongOwner?: boolean;
      wrongToken?: boolean;
      wrongSpender?: boolean;
      wrongValue?: boolean;
      wrongCall?: boolean;
      wrongReceipt?: boolean;
      rpcFailure?: boolean;
      staleHead?: boolean;
      chainId?: number;
      expectedValue?: bigint;
      repriced?: boolean;
      finalized?: bigint;
      notFoundReads?: number;
    } = {},
  ) {
    const states: TxState[] = [];
    let waitCalls = 0;
    let allowanceReads = 0;
    let transactionReads = 0;
    const transaction = {
      hash,
      from: options.wrongOwner ? spender : owner,
      to: options.wrongToken ? spender : token,
      input: options.wrongCall
        ? encodeFunctionData({ abi: erc20Abi, functionName: "transfer", args: [spender, 0n] })
        : encodeFunctionData({
            abi: erc20Abi,
            functionName: "approve",
            args: [options.wrongSpender ? owner : spender, options.wrongValue ? 1n : (options.expectedValue ?? 0n)],
          }),
      value: 0n,
    };
    const client = {
      getChainId: async () => options.chainId ?? 10143,
      getTransaction: async () => {
        if (++transactionReads <= (options.notFoundReads ?? 0))
          throw Object.assign(new Error("Propagating"), { name: "TransactionNotFoundError" });
        if (options.rpcFailure) throw new Error("RPC unavailable");
        return transaction;
      },
      waitForTransactionReceipt: async ({
        onReplaced,
        pollingInterval,
        confirmations,
      }: {
        onReplaced: (event: unknown) => void;
        pollingInterval: number;
        confirmations: number;
      }) => {
        ++waitCalls;
        expect(pollingInterval).to.equal(1000);
        expect(confirmations).to.equal(2);
        expect(states).not.to.include("SUCCESS");
        if (options.repriced) onReplaced({ reason: "repriced", transaction: { ...transaction, hash: otherHash } });
        return {
          transactionHash: options.repriced || options.wrongReceipt ? otherHash : hash,
          blockNumber: 100n,
          status: options.receiptStatus ?? "success",
        };
      },
      getBlockNumber: async () => (options.staleHead ? 100n : 101n),
      getBlock: async () => {
        if (options.finalized === undefined) throw new Error("Finality tag unsupported");
        return { number: options.finalized };
      },
      readContract: async (args: { blockNumber?: bigint }) => {
        ++allowanceReads;
        expect(args.blockNumber).to.equal(101n);
        return options.allowance ?? 0n;
      },
    } as unknown as Parameters<typeof verifyApprovalTransaction>[0]["client"];
    const run = () =>
      verifyApprovalTransaction({
        client,
        owner,
        pair,
        value: options.expectedValue ?? 0n,
        hash,
        state: state => states.push(state),
        submitted: () => undefined,
      });
    return { run, states, waitCalls: () => waitCalls, allowanceReads: () => allowanceReads };
  }
  it("recovers using only reads and returns confirmed receipt plus independently verified block", async () => {
    const { run, states, allowanceReads } = fixture();
    const proof = await run();
    expect(proof.hash).to.equal(hash);
    expect(proof.allowance).to.equal(0n);
    expect(proof.receiptBlock).to.equal(100n);
    expect(proof.verificationBlock).to.equal(101n);
    expect(allowanceReads()).to.equal(1);
    expect(states).to.deep.equal(["WAITING_FOR_CONFIRMATION", "RECHECKING_ALLOWANCE", "SUCCESS"]);
  });
  it("recovers creation of a finite test allowance without converting bigint amounts", async () => {
    const value = 250123456789012345678n;
    const proof = await fixture({ expectedValue: value, allowance: value }).run();
    expect(proof.requestedAllowance).to.equal(value);
    expect(proof.allowance).to.equal(value);
  });
  it("keeps a propagating hash pending and verifies receipt plus allowance after it becomes visible", async function () {
    this.timeout(5000);
    const { run, states, allowanceReads } = fixture({ notFoundReads: 2 });
    const proof = await run();
    expect(proof.allowance).to.equal(0n);
    expect(allowanceReads()).to.equal(1);
    expect(states).to.deep.equal(["WAITING_FOR_CONFIRMATION", "RECHECKING_ALLOWANCE", "SUCCESS"]);
  });
  it("records a provider finalized head only when it covers the receipt", async () => {
    expect((await fixture({ finalized: 100n }).run()).finalizedBlock).to.equal(100n);
  });
  it("does not claim finality from an older provider checkpoint", async () => {
    expect((await fixture({ finalized: 99n }).run()).finalizedBlock).to.equal(undefined);
  });
  it("keeps confirmation evidence separate when finality tags are unavailable", async () => {
    const proof = await fixture().run();
    expect(proof.finalizedBlock).to.equal(undefined);
    expect(proof.allowance).to.equal(0n);
  });
  it("returns the actual repriced transaction hash after checking the replacement intent", async () => {
    const proof = await fixture({ repriced: true }).run();
    expect(proof.hash).to.equal(otherHash);
    expect(proof.allowance).to.equal(0n);
  });
  for (const options of [
    { wrongOwner: true },
    { wrongToken: true },
    { wrongSpender: true },
    { wrongValue: true },
    { wrongCall: true },
  ]) {
    it(`rejects a mismatched stored intent ${JSON.stringify(options)} before waiting`, async () => {
      const check = fixture(options);
      let error: unknown;
      try {
        await check.run();
      } catch (caught) {
        error = caught;
      }
      expect(error).to.be.instanceOf(ApprovalVerificationError);
      expect((error as ApprovalVerificationError).kind).to.equal("INTENT_MISMATCH");
      expect(check.waitCalls()).to.equal(0);
      expect(check.states).not.to.include("SUCCESS");
    });
  }
  for (const options of [
    { allowance: 1n },
    { receiptStatus: "reverted" },
    { wrongReceipt: true },
    { rpcFailure: true },
    { staleHead: true },
    { chainId: 1 },
  ]) {
    it(`never invents recovery success ${JSON.stringify(options, (_, value) => (typeof value === "bigint" ? value.toString() : value))}`, async () => {
      const check = fixture(options);
      let failed = false;
      try {
        await check.run();
      } catch {
        failed = true;
      }
      expect(failed).to.equal(true);
      expect(check.states).not.to.include("SUCCESS");
    });
  }
});
