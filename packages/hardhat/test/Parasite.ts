import { expect } from "chai";
import { ethers } from "hardhat";

describe("PARASITE demo authorization", function () {
  async function fixture() {
    const [owner, other] = await ethers.getSigners();
    const token = await (await ethers.getContractFactory("DemoToken")).deploy(owner.address);
    const spender = await (await ethers.getContractFactory("DemoSpender")).deploy();
    const second = await (await ethers.getContractFactory("DemoSpender")).deploy();
    return { owner, other, token, spender: await spender.getAddress(), second: await second.getAddress() };
  }
  it("deploys with fixed test supply minted to demo owner", async () => {
    const { token, owner } = await fixture();
    expect(await token.name()).to.equal("Parasite Demo Token");
    expect(await token.symbol()).to.equal("PDEM");
    expect(await token.balanceOf(owner.address)).to.equal(ethers.parseEther("10000"));
    expect(await token.totalSupply()).to.equal(ethers.parseEther("10000"));
  });
  it("verifies finite, unlimited and zero allowances independently", async () => {
    const { token, owner, spender, second } = await fixture();
    await token.approve(spender, 123n);
    await token.approve(second, ethers.MaxUint256);
    expect(await token.allowance(owner.address, spender)).to.equal(123n);
    expect(await token.allowance(owner.address, second)).to.equal(ethers.MaxUint256);
    await token.approve(spender, 0n);
    expect(await token.allowance(owner.address, spender)).to.equal(0n);
    expect(await token.allowance(owner.address, second)).to.equal(ethers.MaxUint256);
  });
  it("another account cannot revoke the owner's authorization", async () => {
    const { token, owner, other, spender } = await fixture();
    await token.approve(spender, 50n);
    await token.connect(other).approve(spender, 0n);
    expect(await token.allowance(owner.address, spender)).to.equal(50n);
    expect(await token.allowance(other.address, spender)).to.equal(0n);
  });
});
