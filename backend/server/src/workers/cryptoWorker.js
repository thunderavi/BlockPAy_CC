import { parentPort } from "worker_threads";
import bcrypt from "bcryptjs";
import crypto from "crypto";

if (parentPort) {
  parentPort.on("message", async ({ id, task, data }) => {
    try {
      let result;
      switch (task) {
        case "bcrypt_hash":
          result = await bcrypt.hash(data.password, data.rounds || 10);
          break;

        case "bcrypt_compare":
          result = await bcrypt.compare(data.password, data.hash);
          break;

        case "sha256_proof":
          result = crypto.createHash("sha256").update(data.raw).digest("hex");
          break;

        default:
          throw new Error(`Unknown task: ${task}`);
      }
      parentPort.postMessage({ id, success: true, result });
    } catch (error) {
      parentPort.postMessage({ id, success: false, error: error.message });
    }
  });
}
