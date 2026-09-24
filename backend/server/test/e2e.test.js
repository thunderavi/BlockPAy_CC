import request from "supertest";
import { app } from "../src/app.js";

const user = (username) => ({ name:`${username} User`, username, email:`${username}@journey.dev`, phone:"9999999999", password:"secret1" });
const register = (username) => request(app).post("/api/auth/register").send(user(username));
const bearer = (token) => ({ Authorization:`Bearer ${token}` });

describe("critical API user journeys", () => {
  test("new user registers, logs in and views the wallet", async () => {
    await register("newuser");
    const login=await request(app).post("/api/auth/login").send({email:"newuser@journey.dev",password:"secret1"});
    expect(login.status).toBe(200);
    const wallet=await request(app).get("/api/wallet").set(bearer(login.body.token));
    expect(wallet.body.wallet.balance).toBe(10000);
  });

  test("username payment is searchable and produces history and a receipt", async () => {
    const a=await register("payer"); await register("merchant"); const h=bearer(a.body.token);
    expect((await request(app).get("/api/users/search?q=merchant").set(h)).body.users).toHaveLength(1);
    const paid=await request(app).post("/api/wallet/transfer").set(h).send({username:"merchant",amount:425,note:"Books",pin:"1234"});
    expect(paid.status).toBe(201);
    expect((await request(app).get("/api/transactions").set(h)).body.transactions[0].referenceId).toBe(paid.body.transaction.referenceId);
    expect((await request(app).get(`/api/transactions/${paid.body.transaction._id}`).set(h)).body.transaction.hash).toHaveLength(64);
  });

  test("QR payload resolves a receiver before payment and receipt retrieval", async () => {
    const receiver=await register("qrshop"); const payer=await register("qrpayer");
    const generated=await request(app).post("/api/qr/generate").set(bearer(receiver.body.token)).send({amount:90,purpose:"Coffee"});
    const scan=await request(app).post("/api/qr/scan").set(bearer(payer.body.token)).send({payload:generated.body.payload});
    expect(scan.body).toMatchObject({username:"qrshop",amount:90});
    const paid=await request(app).post("/api/wallet/transfer").set(bearer(payer.body.token)).send({...scan.body,pin:"1234"});
    expect((await request(app).get(`/api/transactions/${paid.body.transaction._id}`).set(bearer(payer.body.token))).status).toBe(200);
  });

  test("payment request acceptance settles balances and sends notifications", async () => {
    const requester=await register("requester"), payer=await register("requestpayer");
    const made=await request(app).post("/api/transactions/request").set(bearer(requester.body.token)).send({username:"requestpayer",amount:500,note:"Event"});
    const accepted=await request(app).post(`/api/transactions/accept/${made.body.request._id}`).set(bearer(payer.body.token)).send({pin:"1234"});
    expect(accepted.status).toBe(201);
    expect((await request(app).get("/api/wallet").set(bearer(payer.body.token))).body.wallet.balance).toBe(9500);
    expect((await request(app).get("/api/notifications").set(bearer(requester.body.token))).body.notifications.length).toBeGreaterThan(0);
    expect((await request(app).get("/api/transactions/requests").set(bearer(payer.body.token))).body.requests[0].status).toBe("accepted");
  });

  test("split bill calculates rounded shares and creates each request", async () => {
    const owner=await register("splitowner"); await register("memberone"); await register("membertwo");
    const split=await request(app).post("/api/transactions/split").set(bearer(owner.body.token)).send({title:"Dinner",amount:100,members:["memberone","membertwo"]});
    expect(split.status).toBe(201);
    expect(split.body.perHead).toBe(33.34);
    expect(split.body.requests).toHaveLength(2);
  });

  test("security barriers reject unauthorized, invalid, PIN, funds, self and admin attempts", async () => {
    const a=await register("securea"); await register("secureb"); const h=bearer(a.body.token);
    expect((await request(app).get("/api/wallet")).status).toBe(401);
    expect((await request(app).get("/api/wallet").set("Authorization","Bearer bad")).status).toBe(401);
    expect((await request(app).post("/api/wallet/transfer").set(h).send({username:"secureb",amount:1,pin:"0000"})).status).toBe(403);
    expect((await request(app).post("/api/wallet/transfer").set(h).send({username:"secureb",amount:20000,pin:"1234"})).status).toBe(400);
    expect((await request(app).post("/api/wallet/transfer").set(h).send({username:"securea",amount:1,pin:"1234"})).status).toBe(400);
    expect((await request(app).get("/api/admin/summary").set(h)).status).toBe(403);
  });
});
