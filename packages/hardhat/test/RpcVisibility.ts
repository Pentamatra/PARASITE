import { expect } from "chai";
import { waitForTransactionVisibility } from "../../nextjs/lib/parasite/rpcVisibility";

describe("RPC transaction propagation", () => {
  const missing = () => Object.assign(new Error("Not visible yet"), { name: "TransactionNotFoundError" });
  it("retries a newly broadcast hash until the RPC can return it", async () => {
    let reads = 0;
    const result = await waitForTransactionVisibility(
      async () => {
        if (++reads < 3) throw missing();
        return "real transaction";
      },
      { intervalMs: 0 },
    );
    expect(result).to.equal("real transaction");
    expect(reads).to.equal(3);
  });
  it("recognizes a wrapped not-found error", async () => {
    let reads = 0;
    await waitForTransactionVisibility(
      async () => {
        if (++reads === 1) throw { cause: missing() };
        return true;
      },
      { intervalMs: 0 },
    );
    expect(reads).to.equal(2);
  });
  it("bounds repeated absence and never invents a result", async () => {
    let reads = 0,
      failed = false;
    try {
      await waitForTransactionVisibility(
        async () => {
          reads++;
          throw missing();
        },
        { attempts: 3, intervalMs: 0 },
      );
    } catch {
      failed = true;
    }
    expect(failed).to.equal(true);
    expect(reads).to.equal(3);
  });
  it("does not retry unrelated RPC or intent failures", async () => {
    let reads = 0;
    try {
      await waitForTransactionVisibility(
        async () => {
          reads++;
          throw new Error("RPC unavailable");
        },
        { intervalMs: 0 },
      );
    } catch {
      /* Expected. */
    }
    expect(reads).to.equal(1);
  });
});
