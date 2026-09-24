import { demoApi } from "../src/services/api";

test("Riya can send money to Demo and both wallets and histories update",async()=>{
  await demoApi.login({email:"riya@blockpay.app",password:"riya123"});
  const riyaBefore=(await demoApi.wallet()).wallet.balance;
  const paid=await demoApi.transfer({username:"demo",amount:250,note:"Riya test payment",pin:"1234"});
  expect(paid.wallet.balance).toBe(riyaBefore-250);
  expect((await demoApi.transactions()).transactions[0].note).toBe("Riya test payment");
  await demoApi.login({email:"demo@blockpay.app",password:"demo123"});
  expect((await demoApi.wallet()).wallet.balance).toBe(13000.5);
  expect((await demoApi.transactions()).transactions[0].senderId.username).toBe("riya");
  expect((await demoApi.notifications()).notifications[0].title).toBe("Payment received");
});
