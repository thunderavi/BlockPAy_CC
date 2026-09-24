import { dateTime, inr, initials, peerFor } from "../src/utils/format";
import { parseBlockPayQr } from "../src/utils/qr";
describe("mobile utilities",()=>{
  test("formats INR and initials",()=>{expect(inr(1250)).toContain("1,250");expect(initials("Demo Student")).toBe("DS")});
  test("identifies incoming transaction peer",()=>expect(peerFor({receiverId:"me",senderId:{username:"friend"}},"me")).toEqual({incoming:true,peer:{username:"friend"}}));
  test("parses valid BlockPay QR",()=>expect(parseBlockPayQr(JSON.stringify({type:"BLOCKPAY_QR",username:"rahul",amount:50,purpose:"Tea"}))).toEqual({username:"rahul",amount:50,note:"Tea"}));
  test("rejects malformed QR",()=>expect(()=>parseBlockPayQr("not-json")).toThrow("valid BlockPay JSON"));
  test("rejects unsupported QR",()=>expect(()=>parseBlockPayQr({type:"OTHER"})).toThrow("Unsupported QR"));
});
