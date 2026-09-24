const { ethers } = require("hardhat");

async function main(){
  const contract=await ethers.deployContract("BlockPay");
  await contract.waitForDeployment();
  const address=await contract.getAddress();
  console.log(`BlockPay deployed to: ${address}`);
  console.log("Add this to backend/server/.env:");
  console.log(`BLOCKPAY_CONTRACT_ADDRESS=${address}`);
}

main().catch((error)=>{console.error(error);process.exitCode=1});
