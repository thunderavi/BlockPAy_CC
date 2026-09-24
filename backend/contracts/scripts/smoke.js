const { ethers } = require("hardhat");

async function main(){
  const address=process.env.BLOCKPAY_CONTRACT_ADDRESS||"0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const registry=await ethers.getContractAt("BlockPay",address);
  const paymentId=`BP-SMOKE-${Date.now()}`;
  const receiptHash=ethers.sha256(ethers.toUtf8Bytes(paymentId));
  const submission=await registry.createTransaction("smoke-sender","smoke-receiver",12500,paymentId,receiptHash);
  const mined=await submission.wait();
  const verified=await registry.verifyTransaction(paymentId,receiptHash);
  console.log(JSON.stringify({contractAddress:address,paymentId,transactionHash:submission.hash,blockNumber:Number(mined.blockNumber),verified},null,2));
  if(!verified)throw new Error("On-chain verification failed");
}

main().catch((error)=>{console.error(error);process.exitCode=1});
