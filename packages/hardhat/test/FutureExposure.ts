import { expect } from "chai";
import { maxUint256 } from "viem";
import { futureExposure, parseDeposit } from "../../nextjs/lib/parasite/futureExposure";

describe("PARASITE future-deposit illustration", () => {
  it("shows future exposure for an empty wallet with unlimited authorization", () => {
    expect(futureExposure(0n, maxUint256, 1000n)).to.deep.equal({
      balance: 1000n,
      exposure: 1000n,
      outside: 0n,
      additionalExposure: 1000n,
    });
  });
  it("caps finite exposure at unchanged allowance", () => {
    expect(futureExposure(100n, 250n, 1000n)).to.deep.equal({
      balance: 1100n,
      exposure: 250n,
      outside: 850n,
      additionalExposure: 150n,
    });
    expect(futureExposure(1000n, 250n, 1000n).additionalExposure).to.equal(0n);
  });
  it("does not restore access after revocation even with a future deposit", () => {
    expect(futureExposure(0n, 0n, 999n)).to.deep.equal({
      balance: 999n,
      exposure: 0n,
      outside: 999n,
      additionalExposure: 0n,
    });
  });
  it("keeps an unavailable balance unknown rather than fabricating zero exposure", () => {
    expect(futureExposure(null, maxUint256, 100n)).to.deep.equal({
      balance: null,
      exposure: null,
      outside: null,
      additionalExposure: null,
    });
  });
  it("preserves large uint256 and decimal amounts exactly", () => {
    expect(parseDeposit("1.234567890123456789", 18)).to.deep.equal({ value: 1234567890123456789n });
    expect(parseDeposit(maxUint256.toString(), null)).to.deep.equal({ value: maxUint256 });
    expect(futureExposure(maxUint256 - 1n, maxUint256, 1n).exposure).to.equal(maxUint256);
  });
  it("rejects extra decimal precision instead of rounding", () => {
    expect(parseDeposit("0.0000001", 6).error).to.equal("PRECISION");
    expect(parseDeposit("1.1", null).error).to.equal("PRECISION");
    expect(parseDeposit("1.0000000", 6).error).to.equal("PRECISION");
  });
  it("rejects negative, exponent, non-finite, huge, and overflowing inputs", () => {
    for (const value of ["", "-1", "1e18", "NaN", "Infinity", "1,5", "1".repeat(401)])
      expect(parseDeposit(value, 18).error).to.equal("INVALID_AMOUNT");
    expect(parseDeposit((maxUint256 + 1n).toString(), 0).error).to.equal("OVERFLOW");
    expect(() => futureExposure(maxUint256, 1n, 1n)).to.throw(RangeError);
    expect(() => futureExposure(0n, -1n, 0n)).to.throw(RangeError);
  });
});
