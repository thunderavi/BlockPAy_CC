const API_URL =
  import.meta.env.VITE_API_URL || "/api";

let authToken = localStorage.getItem("blockpay_token") || "";

export function setToken(token) {
  authToken = token || "";
  if (token) {
    localStorage.setItem("blockpay_token", token);
  } else {
    localStorage.removeItem("blockpay_token");
  }
}

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(options.headers || {})
    }
  });

  const data = response.status === 204 ? null : await response.json();

  if (!response.ok) {
    throw new Error(data?.message || "Request failed");
  }

  return data;
}

export const api = {
  register: (payload) => request("/auth/register", { method: "POST", body: JSON.stringify(payload) }),
  login: (payload) => request("/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  forgotPassword: (payload) => request("/auth/forgot-password", { method: "POST", body: JSON.stringify(payload) }),
  profile: () => request("/auth/profile"),
  updateProfile: (payload) => request("/auth/profile", { method: "PUT", body: JSON.stringify(payload) }),
  wallet: () => request("/wallet"),
  transfer: (payload) => request("/wallet/transfer", { method: "POST", body: JSON.stringify(payload) }),
  depositDemo: (payload) => request("/wallet/deposit-demo", { method: "POST", body: JSON.stringify(payload) }),
  transactions: (filter = "all") => request(`/transactions?filter=${filter}`),
  requests: () => request("/transactions/requests"),
  requestPayment: (payload) => request("/transactions/request", { method: "POST", body: JSON.stringify(payload) }),
  acceptRequest: (id, payload) => request(`/transactions/accept/${id}`, { method: "POST", body: JSON.stringify(payload) }),
  rejectRequest: (id) => request(`/transactions/reject/${id}`, { method: "POST", body: JSON.stringify({}) }),
  splitBill: (payload) => request("/transactions/split", { method: "POST", body: JSON.stringify(payload) }),
  searchUsers: (query) => request(`/users/search?q=${encodeURIComponent(query)}`),
  friends: () => request("/friends"),
  addFriend: (payload) => request("/friends", { method: "POST", body: JSON.stringify(payload) }),
  notifications: () => request("/notifications"),
  readAllNotifications: () => request("/notifications/read-all", { method: "PUT", body: JSON.stringify({}) }),
  generateQr: (payload) => request("/qr/generate", { method: "POST", body: JSON.stringify(payload) }),
  scanQr: (payload) => request("/qr/scan", { method: "POST", body: JSON.stringify(payload) }),
  adminSummary: () => request("/admin/summary")
};
