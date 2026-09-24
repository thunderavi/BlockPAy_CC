import { anchorTransaction,verifyOnChain } from "../src/services/blockchainService.js";
import { Transaction } from "../src/models/Transaction.js";
import { User } from "../src/models/User.js";

async function payment(){const [sender,receiver]=await User.create([{name:"Alice",email:"alice@chain.test",phone:"1",passwordHash:"x",pinHash:"x",username:"alice"},{name:"Bob",email:"bob@chain.test",phone:"2",passwordHash:"x",pinHash:"x",username:"bob"}]);return Transaction.create({senderId:sender._id,receiverId:receiver._id,amount:12.34,note:"Chain test",status:"successful",hash:"a".repeat(64),previousHash:"GENESIS",referenceId:"BP-CHAIN-001",metadata:{blockchainStatus:"pending",blockchainAttempts:0}})}

describe("API blockchain anchoring service",()=>{
  test("submits the real receipt fields in paise and stores confirmation metadata",async()=>{const tx=await payment();let submitted;const contract={createTransaction:async(...args)=>{submitted=args;return {hash:"0xabc123",wait:async()=>({blockNumber:42})}}};const anchored=await anchorTransaction(tx,{contract,enabled:true});expect(submitted).toEqual(["alice","bob",1234n,"BP-CHAIN-001","a".repeat(64)]);expect(anchored.metadata).toMatchObject({blockchainStatus:"confirmed",blockchainTxHash:"0xabc123",blockchainBlockNumber:42,blockchainAttempts:1});expect(anchored.metadata.blockchainAnchoredAt).toBeTruthy()});
  test("records a failed submission without changing the payment status",async()=>{const tx=await payment();const contract={createTransaction:async()=>{throw new Error("RPC unavailable")}};const result=await anchorTransaction(tx,{contract,enabled:true});expect(result.status).toBe("successful");expect(result.metadata.blockchainStatus).toBe("failed");expect(result.metadata.blockchainError).toContain("RPC unavailable");expect(result.metadata.blockchainAttempts).toBe(1)});
  test("verifies a stored receipt through the contract",async()=>{const tx=await payment();const result=await verifyOnChain(tx,{contract:{verifyTransaction:async(id,hash)=>id==="BP-CHAIN-001"&&hash==="a".repeat(64)},enabled:true});expect(result).toMatchObject({available:true,verified:true,status:"confirmed"})});
});
