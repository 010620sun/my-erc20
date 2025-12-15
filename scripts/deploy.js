const { ethers } = require("hardhat");

async function main() {
  
  const [deployer] = await ethers.getSigners();

  console.log("Using account:", deployer.address);

  const MyToken = await ethers.getContractFactory("MyToken");
  const Staking = await ethers.getContractFactory("Staking");
  const contract = await MyToken.deploy(1000000000000000000n);
  const contract2 = await Staking.deploy(await contract.getAddress());

  console.log("Deploy tx hash:", contract.deploymentTransaction().hash);

  const address = await contract.target;
  const address2 = await contract2.target;
  console.log("MyToken Contract deployed at:", address);
  console.log("Staking Contract deployed at:", address2);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});