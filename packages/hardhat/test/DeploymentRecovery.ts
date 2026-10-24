import { expect } from "chai";
import { getContractAddress, type Hex } from "viem";
import { matchesDemoDeployment, matchesDeploymentReceipt } from "../../nextjs/lib/parasite/deploymentRecovery";

const owner = "0x0000000000000000000000000000000000000001" as const;
const other = "0x0000000000000000000000000000000000000002" as const;
const hash = `0x${"ab".repeat(32)}` as Hex;
const input = "0x60006000" as const;
const tx = { from: owner, to: null, input, value: 0n };
const receipt = {
  status: "success",
  transactionHash: hash,
  contractAddress: getContractAddress({ from: owner, nonce: 29n }),
};

describe("Demo deployment recovery", () => {
  it("accepts only the expected owner's zero-value contract creation", () => {
    expect(matchesDemoDeployment(tx, owner, input)).to.equal(true);
    expect(matchesDemoDeployment({ ...tx, from: other }, owner, input)).to.equal(false);
    expect(matchesDemoDeployment({ ...tx, to: other }, owner, input)).to.equal(false);
    expect(matchesDemoDeployment({ ...tx, value: 1n }, owner, input)).to.equal(false);
    expect(matchesDemoDeployment({ ...tx, input: "0x6001" }, owner, input)).to.equal(false);
  });
  it("requires a successful receipt, the tracked hash, and the nonce-derived address", () => {
    expect(matchesDeploymentReceipt(receipt, hash, owner, 29)).to.equal(true);
    expect(matchesDeploymentReceipt({ ...receipt, status: "reverted" }, hash, owner, 29)).to.equal(false);
    expect(matchesDeploymentReceipt({ ...receipt, contractAddress: null }, hash, owner, 29)).to.equal(false);
    expect(matchesDeploymentReceipt({ ...receipt, contractAddress: other }, hash, owner, 29)).to.equal(false);
    expect(matchesDeploymentReceipt({ ...receipt, transactionHash: `0x${"cd".repeat(32)}` }, hash, owner, 29)).to.equal(
      false,
    );
    expect(matchesDeploymentReceipt(receipt, hash, owner, 30)).to.equal(false);
  });
});
