const { ethers } = require("hardhat");

async function main() {
  
  const [deployer] = await ethers.getSigners();

  console.log("Using account:", deployer.address);

  const MyToken = await ethers.getContractFactory("MyToken");
  const Staking = await ethers.getContractFactory("Staking");
  const mytoken = await MyToken.deploy(1000000000000000000n);
  const staking = await Staking.deploy(mytoken.target);

  console.log("Deploy tx hash:", mytoken.deploymentTransaction().hash);

  console.log("MyToken Contract deployed at:", mytoken.target);
  console.log("Staking Contract deployed at:", staking.target);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});