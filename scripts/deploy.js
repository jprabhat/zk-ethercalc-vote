const { ethers } = require("hardhat");

async function main() {
  const Vote = await ethers.getContractFactory("Vote");
  const vote = await Vote.deploy();
  await vote.waitForDeployment(); // Correct for Hardhat Toolbox v2+
  console.log(`Contract deployed to: ${await vote.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
