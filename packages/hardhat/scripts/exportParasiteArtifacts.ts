import { artifacts } from "hardhat";
import { writeFileSync } from "fs";
import path from "path";

async function main() {
  const result: Record<string, { abi: unknown; bytecode: string }> = {};
  for (const name of ["DemoToken", "DemoSpender"]) {
    const artifact = await artifacts.readArtifact(name);
    result[name] = { abi: artifact.abi, bytecode: artifact.bytecode };
  }
  writeFileSync(
    path.resolve(__dirname, "../../nextjs/lib/parasite/demoArtifacts.json"),
    JSON.stringify(result, null, 2) + "\n",
  );
}
main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
