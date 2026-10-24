import { ethers, deployments } from "hardhat";

async function main() {
  if ((await ethers.provider.getNetwork()).chainId !== 10143n) throw new Error("Monad Testnet only");
  if (!process.env.DEPLOYER_PRIVATE_KEY) throw new Error("Missing private testnet signer configuration");
  const [owner] = await ethers.getSigners();
  const tokenDeployment = await deployments.get("DemoToken");
  const token = await ethers.getContractAt("DemoToken", tokenDeployment.address, owner);
  if ((await token.balanceOf(owner.address)) === 0n)
    throw new Error("Signer has no PDEM; use the connected demo owner in Demo Setup");
  for (const [index, name] of ["DemoSpender", "DemoSpenderLimited"].entries()) {
    const spender = await deployments.get(name);
    const amount =
      process.env.PARASITE_RESET === "true" ? 0n : index === 0 ? ethers.MaxUint256 : ethers.parseEther("250");
    const tx = await token.approve(spender.address, amount);
    const receipt = await tx.wait();
    if (receipt?.status !== 1 || (await token.allowance(owner.address, spender.address)) !== amount)
      throw new Error("Approval verification failed");
    console.log(name, "verified", tx.hash);
  }
}
main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
