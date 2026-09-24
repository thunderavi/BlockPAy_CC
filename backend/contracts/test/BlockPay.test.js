const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BlockPay receipt registry", function () {
  let registry;
  beforeEach(async function () {
    registry = await ethers.deployContract("BlockPay");
    await registry.waitForDeployment();
  });
  const create = (paymentId = "BP-001", hash = "sha256:abc123") =>
    registry.createTransaction("alice", "bob", 1250, paymentId, hash);
  async function expectRevert(promise, message) {
    try { await promise; expect.fail("Expected transaction to revert"); }
    catch (error) { expect(error.message).to.include(message); }
  }
  it("deploys with an empty registry", async function () {
    expect(await registry.getAllTransactions()).to.have.length(0);
  });
  it("stores a payment proof with its application hash", async function () {
    await create();
    const proof = await registry.getTransaction("BP-001");
    expect(proof.senderUsername).to.equal("alice");
    expect(proof.receiverUsername).to.equal("bob");
    expect(proof.amount).to.equal(1250n);
    expect(proof.applicationHash).to.equal("sha256:abc123");
    expect(proof.timestamp > 0n).to.equal(true);
  });
  it("emits TransactionCreated with the receipt identity", async function () {
    const receipt = await (await create()).wait();
    const event = receipt.logs.map((log) => {
      try { return registry.interface.parseLog(log); } catch { return null; }
    }).find((log) => log?.name === "TransactionCreated");
    expect(event.args.paymentId.hash).to.equal(ethers.id("BP-001"));
    expect(event.args.senderUsername).to.equal("alice");
    expect(event.args.receiverUsername).to.equal("bob");
    expect(event.args.amount).to.equal(1250n);
    expect(event.args.applicationHash).to.equal("sha256:abc123");
  });
  it("rejects an empty payment id", async function () {
    await expectRevert(create(""), "Payment ID required");
  });
  it("rejects duplicate payment ids", async function () {
    await create();
    await expectRevert(create(), "Payment already exists");
  });
  it("verifies the exact application hash", async function () {
    await create();
    expect(await registry.verifyTransaction("BP-001", "sha256:abc123")).to.equal(true);
  });
  it("rejects a modified or unknown proof", async function () {
    await create();
    expect(await registry.verifyTransaction("BP-001", "sha256:modified")).to.equal(false);
    expect(await registry.verifyTransaction("missing", "sha256:abc123")).to.equal(false);
  });
  it("returns every proof in insertion order", async function () {
    await create("BP-001", "hash-one");
    await create("BP-002", "hash-two");
    const all = await registry.getAllTransactions();
    expect(all.map((proof) => proof.paymentId)).to.deep.equal(["BP-001", "BP-002"]);
  });
  it("rejects lookup for an unknown payment id", async function () {
    await expectRevert(registry.getTransaction("missing"), "Transaction not found");
  });
});
