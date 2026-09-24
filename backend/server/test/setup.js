import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
process.env.NODE_ENV = "test"; process.env.JWT_SECRET = "blockpay-test-secret"; process.env.MONGO_TRANSACTIONS = "true"; process.env.BLOCKCHAIN_ENABLED = "false";
let replica;
beforeAll(async () => { replica = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: "wiredTiger" } }); await mongoose.connect(replica.getUri()); });
afterEach(async () => { await Promise.all(Object.values(mongoose.connection.collections).map((collection) => collection.deleteMany({}))); });
afterAll(async () => { await mongoose.disconnect(); await replica?.stop(); });
