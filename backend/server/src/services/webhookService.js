import crypto from "crypto";
import { MerchantOrder } from "../models/MerchantOrder.js";

/**
 * Sign payload using HMAC-SHA256 with merchant webhook secret
 */
export function signWebhookPayload(payload, secret) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${JSON.stringify(payload)}`)
    .digest("hex");

  return {
    header: `t=${timestamp},v1=${signature}`,
    timestamp
  };
}

/**
 * Dispatch webhook event to merchant endpoint asynchronously
 */
export async function dispatchWebhook(order, merchant, event = "order.paid") {
  if (!merchant.webhookUrl || !merchant.webhookSecret) {
    await MerchantOrder.findByIdAndUpdate(order._id, {
      "webhookDelivery.status": "not_configured"
    });
    return;
  }

  const payload = {
    event,
    data: {
      orderId: order.orderId,
      merchantReference: order.merchantReference,
      amount: order.amount,
      feeAmount: order.feeAmount,
      netAmount: order.netAmount,
      currency: order.currency,
      status: order.status,
      receiptHash: order.receiptHash,
      blockchainTxHash: order.blockchainTxHash,
      customer: order.customer,
      paidAt: new Date().toISOString()
    }
  };

  const { header } = signWebhookPayload(payload, merchant.webhookSecret);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(merchant.webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-BlockPay-Signature": header,
        "User-Agent": "BlockPay-Webhook-Agent/1.0"
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeout);

    await MerchantOrder.findByIdAndUpdate(order._id, {
      $inc: { "webhookDelivery.attempts": 1 },
      "webhookDelivery.status": res.ok ? "delivered" : "failed",
      "webhookDelivery.lastAttemptAt": new Date(),
      "webhookDelivery.lastError": res.ok ? null : `HTTP status ${res.status}`
    });
  } catch (error) {
    await MerchantOrder.findByIdAndUpdate(order._id, {
      $inc: { "webhookDelivery.attempts": 1 },
      "webhookDelivery.status": "failed",
      "webhookDelivery.lastAttemptAt": new Date(),
      "webhookDelivery.lastError": error.message
    });
  }
}
