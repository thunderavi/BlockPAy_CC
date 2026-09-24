import { User } from "../models/User.js";

export async function searchUsers(req, res) {
  const q = String(req.query.q || "").replace("@", "").trim();
  if (q.length < 2) {
    return res.json({ users: [] });
  }

  const users = await User.find({
    _id: { $ne: req.user._id },
    $or: [
      { username: new RegExp(q, "i") },
      { name: new RegExp(q, "i") },
      { email: new RegExp(q, "i") }
    ]
  })
    .select("name username avatar collegeId")
    .limit(8);

  res.json({ users });
}
