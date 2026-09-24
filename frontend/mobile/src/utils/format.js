export const inr = (value = 0) => `INR ${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
export const dateTime = (value) => value ? new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "-";
export const initials = (name = "BP") => name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
export const peerFor = (transaction, userId) => { const incoming = String(transaction?.receiverId?._id || transaction?.receiverId) === String(userId); return { incoming, peer: incoming ? transaction?.senderId : transaction?.receiverId }; };
