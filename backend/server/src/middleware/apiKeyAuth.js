import { ApiKey } from "../models/ApiKey.js";
import { Merchant } from "../models/Merchant.js";
import { offloadedCompare } from "../workers/cryptoPool.js";

/**
 * Middleware to authenticate requests via API Keys (pk_live_... or sk_live_...)
 */
export async function requireApiKey(req, res, next) {
  const authHeader = req.headers.authorization;
  const rawKey =
    req.headers["x-api-key"] ||
    req.headers["x-publishable-key"] ||
    (authHeader && authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null);

  if (!rawKey) {
    return res.status(401).json({ message: "API key is required in Authorization or X-API-Key header" });
  }

  // Check if public key format
  if (rawKey.startsWith("pk_live_")) {
    const apiKey = await ApiKey.findOne({ publishableKey: rawKey, isActive: true });
    if (!apiKey) {
      return res.status(401).json({ message: "Invalid or inactive publishable key" });
    }

    const merchant = await Merchant.findById(apiKey.merchantId);
    if (!merchant || merchant.status === "suspended") {
      return res.status(403).json({ message: "Merchant account is suspended or inactive" });
    }

    req.apiKey = apiKey;
    req.merchant = merchant;
    req.isPublishableKey = true;
    return next();
  }

  // Check if secret key format
  if (rawKey.startsWith("sk_live_")) {
    const prefix = rawKey.slice(0, 16);
    // Find keys matching the prefix to avoid comparing against all keys
    const candidateKeys = await ApiKey.find({ secretKeyPrefix: prefix, isActive: true });

    let matchedKey = null;
    for (const key of candidateKeys) {
      const match = await offloadedCompare(rawKey, key.secretKeyHash);
      if (match) {
        matchedKey = key;
        break;
      }
    }

    if (!matchedKey) {
      return res.status(401).json({ message: "Invalid or inactive secret key" });
    }

    const merchant = await Merchant.findById(matchedKey.merchantId);
    if (!merchant || merchant.status === "suspended") {
      return res.status(403).json({ message: "Merchant account is suspended or inactive" });
    }

    // Update last used asynchronously
    ApiKey.findByIdAndUpdate(matchedKey._id, { lastUsedAt: new Date() }).exec();

    req.apiKey = matchedKey;
    req.merchant = merchant;
    req.isPublishableKey = false;
    return next();
  }

  return res.status(401).json({ message: "Invalid API key format. Expected pk_live_... or sk_live_..." });
}
