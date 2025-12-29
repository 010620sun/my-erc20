const { ethers } = require("hardhat");

async function main() {
  
  const [deployer] = await ethers.getSigners();
  const DECIMALS = 18;
  const HUNDRED_TOKENS = ethers.parseUnits("100", DECIMALS);

  console.log("Using account:", deployer.address);

  const MyToken = await ethers.getContractFactory("MyToken");
  const Staking = await ethers.getContractFactory("Staking");
  const mytoken = await MyToken.deploy(HUNDRED_TOKENS);
  const staking = await Staking.deploy(mytoken.target);

  const MINTER_ROLE = await mytoken.MINTER_ROLE();
  await mytoken.grantRole(MINTER_ROLE,staking.target);

  console.log("Deploy tx hash:", mytoken.deploymentTransaction().hash);

  console.log("MyToken Contract deployed at:", mytoken.target);
  console.log("Staking Contract deployed at:", staking.target);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});