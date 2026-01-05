const { ethers } = require("hardhat");

async function main() {
  
  const [deployer] = await ethers.getSigners();
  const multisig = process.env.MULTISIG_ADDRESS;

  const DECIMALS = 18;
  const initialSupply = ethers.parseUnits("1000000", DECIMALS);

  console.log("Using account:", deployer.address);

  const MyToken = await ethers.getContractFactory("MyToken");
  const TokenManager = await ethers.getContractFactory("TokenManager");
  const Staking = await ethers.getContractFactory("Staking");

  // MyToken deployment
  const mytoken = await MyToken.deploy(initialSupply);
  await mytoken.waitForDeployment();
  
   // TokenManager deployment
  const tokenmanager = await TokenManager.deploy(mytoken.target,multisig);
  await tokenmanager.waitForDeployment();

  // Staking deployment
  const staking = await Staking.deploy(mytoken.target,tokenmanager.target);
  await staking.waitForDeployment();

  // loads role values
  const DEFAULT_ADMIN_ROLE = await mytoken.DEFAULT_ADMIN_ROLE();

  // let TokenManager be manager of MyToken
  await mytoken.grantRole(DEFAULT_ADMIN_ROLE,tokenmanager.target);

  // deprive token admin role of deployer
  await mytoken.renounceRole(DEFAULT_ADMIN_ROLE, deployer);

  console.log("Deploy tx hash:", mytoken.deploymentTransaction().hash);

  console.log("MyToken Contract deployed at:", mytoken.target);
  console.log("Staking Contract deployed at:", staking.target);
  console.log("TokenManager Contract deployed at:", tokenmanager.target);
  
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});