export function parseBlockPayQr(raw) {
  let payload;
  try { payload = typeof raw === "string" ? JSON.parse(raw) : raw; } catch { throw new Error("This QR code does not contain valid BlockPay JSON."); }
  if (payload?.type !== "BLOCKPAY_QR" || !payload.username) throw new Error("Unsupported QR code. Scan a BlockPay payment QR.");
  return { username: payload.username, amount: payload.amount || "", note: payload.purpose || "" };
}
