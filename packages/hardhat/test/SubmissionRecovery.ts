import { expect } from "chai";
import { encodeFunctionData, erc20Abi, type Hash, type Address, type Hex } from "viem";
import { findSubmittedApproval, submitWithReadOnlyRecovery } from "../../nextjs/lib/parasite/submissionRecovery";
const owner = "0x0000000000000000000000000000000000000001" as const;
const token = "0x0000000000000000000000000000000000000002" as const;
const spender = "0x0000000000000000000000000000000000000003" as const;
const hash = `0x${"aa".repeat(32)}` as Hash;
const intent = { owner, token, spender, value: 250n };
const log: {
  address: Address;
  transactionHash: Hash;
  removed: boolean;
  args: { owner: Address; spender: Address; value: bigint };
} = { address: token, transactionHash: hash, removed: false, args: { owner, spender, value: 250n } };
const transaction: { from: Address; to: Address; value: bigint; input: Hex } = {
  from: owner,
  to: token,
  value: 0n,
  input: encodeFunctionData({ abi: erc20Abi, functionName: "approve", args: [spender, 250n] }),
};
const mock = (entry = log, tx = transaction) =>
  ({ getLogs: async () => [entry], getTransaction: async () => tx }) as unknown as Parameters<
    typeof findSubmittedApproval
  >[0];
describe("Wallet submission hash recovery", () => {
  it("recovers a matching new approval only after checking full transaction intent", async () => {
    expect(await findSubmittedApproval(mock(), intent, 10n, 20n)).to.equal(hash);
  });
  it("rejects removed, wrong-value and foreign-owner logs", async () => {
    expect(await findSubmittedApproval(mock({ ...log, removed: true }), intent, 10n, 20n)).to.equal(undefined);
    expect(await findSubmittedApproval(mock({ ...log, args: { ...log.args, value: 0n } }), intent, 10n, 20n)).to.equal(
      undefined,
    );
    expect(
      await findSubmittedApproval(
        mock({ ...log, args: { ...log.args, owner: spender } } as typeof log),
        intent,
        10n,
        20n,
      ),
    ).to.equal(undefined);
  });
  it("rejects another sender, a transfer and native value", async () => {
    expect(
      await findSubmittedApproval(mock(log, { ...transaction, from: spender } as typeof transaction), intent, 10n, 20n),
    ).to.equal(undefined);
    expect(await findSubmittedApproval(mock(log, { ...transaction, value: 1n }), intent, 10n, 20n)).to.equal(undefined);
    expect(
      await findSubmittedApproval(
        mock(log, {
          ...transaction,
          input: encodeFunctionData({ abi: erc20Abi, functionName: "transfer", args: [spender, 250n] }),
        }),
        intent,
        10n,
        20n,
      ),
    ).to.equal(undefined);
  });
  it("never searches an unbounded block range", async () => {
    expect(await findSubmittedApproval(mock(), intent, 0n, 100n)).to.equal(undefined);
  });
  it("submits exactly once when the wallet returns normally", async () => {
    let writes = 0;
    const client = { getBlockNumber: async () => 10n } as unknown as Parameters<typeof findSubmittedApproval>[0];
    expect(
      await submitWithReadOnlyRecovery(client, intent, async () => {
        writes++;
        return hash;
      }),
    ).to.equal(hash);
    expect(writes).to.equal(1);
  });
  it("does not wait or retry when the user rejects signing", async () => {
    const client = { getBlockNumber: async () => 10n } as unknown as Parameters<typeof findSubmittedApproval>[0];
    let rejected = false;
    try {
      await submitWithReadOnlyRecovery(client, intent, async () => {
        throw { code: 4001 };
      });
    } catch {
      rejected = true;
    }
    expect(rejected).to.equal(true);
  });
  it("recovers without a second write when a wallet broadcasts but never responds", async function () {
    this.timeout(6000);
    let blocks = 0,
      writes = 0;
    const client = { ...mock(), getBlockNumber: async () => (blocks++ === 0 ? 10n : 11n) } as Parameters<
      typeof findSubmittedApproval
    >[0];
    const recovered = await submitWithReadOnlyRecovery(client, intent, () => {
      writes++;
      return new Promise<Hash>(() => {});
    });
    expect(recovered).to.equal(hash);
    expect(writes).to.equal(1);
  });
});
