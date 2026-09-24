import { createProofPayload, verifyProof } from "../src/services/blockchainService.js";
import { Transaction } from "../src/models/Transaction.js";
const sender={username:"alpha"},receiver={username:"bravo"};
describe("cryptographic receipts",()=>{
  const base={sender,receiver,amount:500,note:"Lunch",referenceId:"BP-FIXED",timestamp:"2026-01-01T00:00:00.000Z"};
  test("same complete payload produces the same hash",async()=>expect((await createProofPayload(base)).hash).toBe((await createProofPayload(base)).hash));
  test.each([["amount",501],["sender",{username:"changed"}],["receiver",{username:"changed"}],["note","Changed"],["timestamp","2026-01-02T00:00:00.000Z"]])("changing %s changes the hash",async(key,value)=>expect((await createProofPayload(base)).hash).not.toBe((await createProofPayload({...base,[key]:value})).hash));
  test("reference format, hexadecimal length and previous link are valid",async()=>{await Transaction.create({senderId:"000000000000000000000001",receiverId:"000000000000000000000002",amount:1,hash:"c".repeat(64),referenceId:"BP-OLD"});const proof=await createProofPayload({sender,receiver,amount:2,note:""});expect(proof.referenceId).toMatch(/^BP-/);expect(proof.hash).toMatch(/^[a-f0-9]{64}$/);expect(proof.previousHash).toBe("c".repeat(64));expect(verifyProof(proof)).toBe(true)});
});
