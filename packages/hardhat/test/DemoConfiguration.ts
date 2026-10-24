import { expect } from "chai";
import { supportedPairs } from "../../nextjs/lib/parasite/discovery/knownContracts";

describe("Persistent demo configuration", () => {
  it("includes both confirmed demo spenders without requiring browser storage", () => {
    const token = process.env.NEXT_PUBLIC_PARASITE_TOKEN;
    const spenders = process.env.NEXT_PUBLIC_PARASITE_SPENDERS;
    try {
      delete process.env.NEXT_PUBLIC_PARASITE_TOKEN;
      delete process.env.NEXT_PUBLIC_PARASITE_SPENDERS;
      const config = supportedPairs();
      expect(config.error).to.equal(undefined);
      expect(config.pairs).to.have.length(2);
      expect(config.pairs.map(pair => pair.spender)).to.deep.equal([
        "0x4ade1e3c0733b41652aa8d12c51c8b3b5dc5d0df",
        "0x52b8a59afd00ab49451d4722ab7594bc1b04bebd",
      ]);
      expect(config.pairs.map(pair => pair.name)).to.deep.equal(["The Overseer", "Ember 01"]);
    } finally {
      if (token === undefined) delete process.env.NEXT_PUBLIC_PARASITE_TOKEN;
      else process.env.NEXT_PUBLIC_PARASITE_TOKEN = token;
      if (spenders === undefined) delete process.env.NEXT_PUBLIC_PARASITE_SPENDERS;
      else process.env.NEXT_PUBLIC_PARASITE_SPENDERS = spenders;
    }
  });
});
