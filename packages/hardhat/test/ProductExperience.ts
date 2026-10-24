import { expect } from "chai";
import { maxUint256 } from "viem";
import { mergePairs, MAX_PAIRS, validPair, parseCustomPairs } from "../../nextjs/lib/parasite/pairs";
import { approvalLogPairs } from "../../nextjs/lib/parasite/discovery/approvalLogs";
import { compareSnapshot, makeSnapshot, parseSnapshot } from "../../nextjs/lib/parasite/changes";
import { reportCardSvg } from "../../nextjs/lib/parasite/reportCard";
import type { Permission, Scan } from "../../nextjs/lib/parasite/types";
const owner = "0x0000000000000000000000000000000000000001" as const;
const token = "0x0000000000000000000000000000000000000002" as const;
const spender = "0x0000000000000000000000000000000000000003" as const;
const pair = { token, spender, name: "Test" };
const scan = (allowance: bigint, failures = false): Scan => ({
  permissions: failures
    ? []
    : [
        {
          ...pair,
          owner,
          allowance,
          key: `${owner}:${token}:${spender}`,
          symbol: "PDEM",
          decimals: 0,
          balance: 100n,
          exposure: allowance < 100n ? allowance : 100n,
          formattedAllowance: allowance.toString(),
          unlimited: allowance >= 2n ** 255n,
          category: allowance === 0n ? "NO CURRENT ALLOWANCE" : "REVIEW",
          block: 100n,
          verifiedAt: "2026-10-24T09:00:00.000Z",
          explanation: "Test fixture",
          source: "Known-contract verification",
          metadataUnavailable: false,
          spenderType: "Contract",
        } as Permission,
      ],
  checked: 1,
  failures: failures ? [{ pair, status: "READ FAILED", message: "RPC failed" }] : [],
  block: 100n,
  time: "2026-10-24T09:00:00.000Z",
});

describe("PARASITE coverage and local observations", () => {
  it("does not let saved user pairs masquerade as verified demo contracts", () => {
    expect(parseCustomPairs(JSON.stringify({ version: 1, pairs: [{ ...pair, origin: "demo" }] }))).to.deep.equal([]);
    expect(parseCustomPairs(JSON.stringify({ version: 1, pairs: [{ ...pair, origin: "manual" }] }))).to.have.length(1);
    expect(parseCustomPairs("broken")).to.deep.equal([]);
  });
  it("deduplicates normalized pairs, rejects zero addresses, and bounds total coverage", () => {
    expect(validPair(token, "0x0000000000000000000000000000000000000000")).to.equal(false);
    expect(mergePairs([pair], [{ ...pair, name: "Duplicate" }])).to.have.length(1);
    const pairs = Array.from({ length: 30 }, (_, index) => ({
      ...pair,
      spender: `0x${(index + 100).toString(16).padStart(40, "0")}` as `0x${string}`,
    }));
    expect(mergePairs(pairs)).to.have.length(MAX_PAIRS);
  });
  it("distinguishes newly observed, increased, reopened, decreased, and verified zero", () => {
    const baseline = makeSnapshot(owner, scan(0n));
    expect(compareSnapshot(baseline, scan(10n))[0].kind).to.equal("REOPENED");
    expect(compareSnapshot(makeSnapshot(owner, scan(1n)), scan(10n))[0].kind).to.equal("INCREASED");
    expect(compareSnapshot(makeSnapshot(owner, scan(10n)), scan(1n))[0].kind).to.equal("DECREASED");
    expect(compareSnapshot(makeSnapshot(owner, scan(10n)), scan(0n))[0].kind).to.equal("ZERO NOW");
    expect(compareSnapshot({ ...baseline, items: [] }, scan(10n))[0].kind).to.equal("NEWLY OBSERVED");
    expect(compareSnapshot(baseline, scan(0n))).to.deep.equal([]);
  });
  it("does not turn failed or missing reads into revocations", () => {
    const previous = makeSnapshot(owner, scan(maxUint256));
    expect(compareSnapshot(previous, scan(0n, true))).to.deep.equal([]);
    const next = makeSnapshot(owner, scan(0n, true), previous);
    expect(next.items[0].allowance).to.equal(maxUint256.toString());
  });
  it("rejects corrupted, foreign-owner, foreign-chain, and overflowing snapshots", () => {
    const previous = makeSnapshot(owner, scan(maxUint256));
    expect(parseSnapshot(JSON.stringify(previous), owner)?.items[0].allowance).to.equal(maxUint256.toString());
    for (const raw of [
      "broken",
      JSON.stringify({ ...previous, owner: spender }),
      JSON.stringify({ ...previous, chainId: 1 }),
      JSON.stringify({ ...previous, items: [{ token, spender, allowance: (maxUint256 + 1n).toString() }] }),
    ])
      expect(parseSnapshot(raw, owner)).to.equal(null);
  });
  it("escapes SVG text and preserves unknown baselines without inventing a score", () => {
    const svg = reportCardSvg({
      headline: "<script>alert(1)</script>",
      wallet: "0x1234…5678",
      checked: 1,
      before: null,
      after: 0,
      revoked: 1,
      time: "now",
      labels: ["checked", "before after", "revoked"],
      limitation: "Limited coverage",
    });
    expect(svg).not.to.contain("<script>");
    expect(svg).to.contain("&lt;script&gt;");
    expect(svg).to.contain("— → 0");
    expect(svg).not.to.match(/security score|USD|saved funds/i);
  });
});

describe("PARASITE bounded Approval-log discovery", () => {
  it("stops a cancelled discovery without claiming scan coverage", async () => {
    const controller = new AbortController();
    controller.abort();
    const f = fixture();
    let failed = false;
    try {
      await approvalLogPairs(f.client, owner, token, 0n, 10n, controller.signal);
    } catch {
      failed = true;
    }
    expect(failed).to.equal(true);
    expect(f.calls()).to.equal(0);
  });
  function fixture({ rejectLarge = false, fail = false, reorg = false, foreign = false, chain = 10143 } = {}) {
    let calls = 0,
      anchors = 0;
    const client = {
      getChainId: async () => chain,
      getBlock: async () => ({ hash: reorg && ++anchors > 1 ? "0xbbb" : "0xaaa" }),
      getLogs: async (args: { fromBlock: bigint; toBlock: bigint; args: { owner: string }; address: string }) => {
        ++calls;
        expect(args.args.owner).to.equal(owner);
        expect(args.address).to.equal(token);
        if (fail || (rejectLarge && args.toBlock - args.fromBlock >= 25n)) throw new Error("Provider range limit");
        return [
          { removed: false, args: { owner: foreign ? spender : owner, spender, value: maxUint256 } },
          { removed: true, args: { owner, spender: token } },
          { removed: false, args: { owner: foreign ? spender : owner, spender, value: 0n } },
        ];
      },
    } as unknown as Parameters<typeof approvalLogPairs>[0];
    return { client, calls: () => calls };
  }
  it("adapts to provider ranges, deduplicates pairs, and discards historical values", async () => {
    const f = fixture({ rejectLarge: true });
    const result = await approvalLogPairs(f.client, owner, token, 0n, 199n);
    expect(result.pairs).to.have.length(1);
    expect(result.pairs[0]).not.to.have.property("allowance");
    expect(result.scannedTo).to.equal(199n);
    expect(result.partial).to.equal(false);
    expect(f.calls()).to.be.lessThan(80);
  });
  it("reports partial coverage on provider failure instead of claiming a clean wallet", async () => {
    const f = fixture({ fail: true });
    const result = await approvalLogPairs(f.client, owner, token, 0n, 99n);
    expect(result.partial).to.equal(true);
    expect(result.scannedTo).to.equal(null);
    expect(result.pairs).to.deep.equal([]);
    expect(f.calls()).to.be.at.most(80);
  });
  it("ignores logs belonging to another owner", async () => {
    const f = fixture({ foreign: true });
    const result = await approvalLogPairs(f.client, owner, token, 0n, 10n);
    expect(result.pairs).to.deep.equal([]);
  });
  for (const scenario of ["reorg", "wrong-chain", "oversized-range"] as const)
    it(`rejects ${scenario} conservatively`, async () => {
      const f = fixture({ reorg: scenario === "reorg", chain: scenario === "wrong-chain" ? 1 : 10143 });
      let failed = false;
      try {
        await approvalLogPairs(f.client, owner, token, 0n, scenario === "oversized-range" ? 5000n : 10n);
      } catch {
        failed = true;
      }
      expect(failed).to.equal(true);
    });
});
