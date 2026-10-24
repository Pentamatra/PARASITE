import { DeployFunction } from "hardhat-deploy/types";
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "fs";
import path from "path";

const deployParasite: DeployFunction = async hre => {
  if ((await hre.ethers.provider.getNetwork()).chainId !== 10143n) throw new Error("Monad Testnet only");
  if (!process.env.DEPLOYER_PRIVATE_KEY) throw new Error("Configure a funded testnet DEPLOYER_PRIVATE_KEY privately");
  const { deployer } = await hre.getNamedAccounts();
  const owner = process.env.DEMO_OWNER_ADDRESS || deployer;
  if (!hre.ethers.isAddress(owner)) throw new Error("Invalid DEMO_OWNER_ADDRESS");
  const output = path.resolve(__dirname, "../../nextjs/lib/parasite/deployment.json");
  const prior = JSON.parse(readFileSync(output, "utf8"));
  if (prior.token && !existsSync(path.resolve(__dirname, "../deployments/monadTestnet/DemoToken.json"))) {
    throw new Error("Existing address manifest has no matching deployment record; refusing overwrite");
  }
  const token = await hre.deployments.deploy("DemoToken", { from: deployer, args: [owner], log: true });
  const spenders = [];
  for (const name of ["DemoSpender", "DemoSpenderLimited"]) {
    const deployed = await hre.deployments.deploy(name, {
      contract: "DemoSpender",
      from: deployer,
      args: [],
      log: true,
    });
    spenders.push(deployed.address);
  }
  mkdirSync(path.dirname(output), { recursive: true });
  writeFileSync(output, JSON.stringify({ chainId: 10143, token: token.address, spenders }, null, 2) + "\n");
  console.log("Confirmed deployment manifest saved. Demo owner:", owner);
};
deployParasite.tags = ["Parasite"];
export default deployParasite;
