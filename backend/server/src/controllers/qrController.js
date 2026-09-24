import QRCode from "qrcode";

export async function generateQr(req, res) {
  const amount = req.body.amount ? Number(req.body.amount) : undefined;
  const purpose = String(req.body.purpose || "");
  const payload = {
    type: "BLOCKPAY_QR",
    username: req.user.username,
    amount,
    purpose
  };
  const qrImage = await QRCode.toDataURL(JSON.stringify(payload));
  res.json({ payload, qrImage });
}

export async function scanQr(req, res) {
  const raw = req.body.payload;
  const payload = typeof raw === "string" ? JSON.parse(raw) : raw;

  if (payload?.type !== "BLOCKPAY_QR" || !payload.username) {
    return res.status(400).json({ message: "Invalid BlockPay QR payload" });
  }

  res.json({
    username: payload.username,
    amount: payload.amount || "",
    note: payload.purpose || ""
  });
}
