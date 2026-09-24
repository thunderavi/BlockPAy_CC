import {
  Bell,
  Camera,
  ChartNoAxesColumn,
  Check,
  Clock3,
  ContactRound,
  Copy,
  CreditCard,
  History,
  Home,
  LogOut,
  QrCode,
  ReceiptText,
  RefreshCcw,
  ScanLine,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Split,
  UserRound,
  UsersRound,
  Wallet
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { useAuth } from "./context/AuthContext";
import { api } from "./services/api";
import { dateTime, initials, inr } from "./utils/format";

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: Home },
  { id: "wallet", label: "Wallet", icon: Wallet },
  { id: "send", label: "Send", icon: Send },
  { id: "receive", label: "Receive", icon: QrCode },
  { id: "scan", label: "Scan", icon: ScanLine },
  { id: "requests", label: "Requests", icon: ReceiptText },
  { id: "split", label: "Split", icon: Split },
  { id: "history", label: "History", icon: History },
  { id: "friends", label: "Friends", icon: UsersRound },
  { id: "notifications", label: "Alerts", icon: Bell },
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "settings", label: "Settings", icon: Settings },
  { id: "admin", label: "Admin", icon: ChartNoAxesColumn }
];

function AuthScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    username: "",
    password: ""
  });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      if (mode === "login") {
        await login({ email: form.email, password: form.password });
      } else if (mode === "register") {
        await register(form);
      } else {
        const data = await api.forgotPassword({ email: form.email });
        setMessage(`${data.message} OTP: ${data.otp || "sent"}`);
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="brand-panel">
        <div className="brand-mark">
          <ShieldCheck size={30} />
        </div>
        <h1>BlockPay</h1>
        <p>Send money instantly. Verify forever.</p>
        <div className="receipt-preview">
          <div>
            <span>Campus transfer</span>
            <strong>INR 2,450</strong>
          </div>
          <small>0x9f1c... verified</small>
        </div>
      </section>

      <section className="auth-panel">
        <div className="segmented">
          <button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>
            Login
          </button>
          <button className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>
            Register
          </button>
          <button className={mode === "forgot" ? "active" : ""} onClick={() => setMode("forgot")}>
            OTP
          </button>
        </div>

        <form onSubmit={submit} className="stack">
          {mode === "register" && (
            <>
              <label>
                Name
                <input value={form.name} onChange={(event) => update("name", event.target.value)} required />
              </label>
              <label>
                Phone
                <input value={form.phone} onChange={(event) => update("phone", event.target.value)} required />
              </label>
              <label>
                Username
                <input value={form.username} onChange={(event) => update("username", event.target.value)} placeholder="@avi" required />
              </label>
            </>
          )}
          <label>
            Email
            <input type="email" value={form.email} onChange={(event) => update("email", event.target.value)} required />
          </label>
          {mode !== "forgot" && (
            <label>
              Password
              <input type="password" value={form.password} onChange={(event) => update("password", event.target.value)} required />
            </label>
          )}
          <button className="primary-button" disabled={busy}>
            {busy ? "Working..." : mode === "login" ? "Login" : mode === "register" ? "Create wallet" : "Generate OTP"}
          </button>
          {message && <p className="form-message">{message}</p>}
        </form>
      </section>
    </main>
  );
}

function App() {
  const { user, loading, logout } = useAuth();
  const [active, setActive] = useState("dashboard");
  const data = useBlockPayData(user);

  if (loading) {
    return <div className="loading">Opening BlockPay...</div>;
  }

  if (!user) {
    return <AuthScreen />;
  }

  const ActiveIcon = navItems.find((item) => item.id === active)?.icon || Home;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="logo-row">
          <div className="logo"><ShieldCheck size={24} /></div>
          <div>
            <strong>BlockPay</strong>
            <span>Campus wallet</span>
          </div>
        </div>
        <nav>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} className={active === item.id ? "active" : ""} onClick={() => setActive(item.id)}>
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>
        <button className="logout" onClick={logout}>
          <LogOut size={18} />
          Logout
        </button>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <span className="eyebrow"><ActiveIcon size={15} /> {active}</span>
            <h2>Hello {user.name.split(" ")[0]}</h2>
          </div>
          <button className="icon-button" onClick={data.refresh} title="Refresh data">
            <RefreshCcw size={18} />
          </button>
        </header>

        {data.error && <div className="banner">{data.error}</div>}
        {active === "dashboard" && <Dashboard user={user} data={data} setActive={setActive} />}
        {active === "wallet" && <WalletView data={data} setActive={setActive} />}
        {active === "send" && <SendMoney data={data} />}
        {active === "receive" && <ReceiveMoney user={user} data={data} />}
        {active === "scan" && <ScanPay data={data} />}
        {active === "requests" && <Requests data={data} />}
        {active === "split" && <SplitBill data={data} />}
        {active === "history" && <HistoryView data={data} />}
        {active === "friends" && <FriendsView data={data} />}
        {active === "notifications" && <NotificationsView data={data} />}
        {active === "profile" && <Profile user={user} data={data} />}
        {active === "settings" && <SettingsView />}
        {active === "admin" && <Admin data={data} />}
      </main>
    </div>
  );
}

function useBlockPayData(user) {
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [requests, setRequests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [friends, setFriends] = useState([]);
  const [admin, setAdmin] = useState(null);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);

  async function refresh() {
    setTick((value) => value + 1);
  }

  useEffect(() => {
    if (!user) return;

    let active = true;
    setError("");
    Promise.all([
      api.wallet(),
      api.transactions(),
      api.requests(),
      api.notifications(),
      api.friends(),
      api.adminSummary().catch(() => ({ totalUsers: 0, totalPayments: 0, totalVolume: 0, latestTransactions: [], fraudAlerts: [] }))
    ])
      .then(([walletData, transactionData, requestData, notificationData, friendData, adminData]) => {
        if (!active) return;
        setWallet(walletData.wallet);
        setTransactions(transactionData.transactions);
        setRequests(requestData.requests);
        setNotifications(notificationData.notifications);
        setFriends(friendData.friends);
        setAdmin(adminData);
      })
      .catch((apiError) => setError(apiError.message));

    return () => {
      active = false;
    };
  }, [user, tick]);

  return {
    wallet,
    transactions,
    requests,
    notifications,
    friends,
    admin,
    error,
    refresh
  };
}

function Dashboard({ user, data, setActive }) {
  const recent = data.transactions.slice(0, 5);
  const chartData = useMemo(
    () =>
      data.transactions
        .slice(0, 8)
        .reverse()
        .map((transaction, index) => ({
          name: String(index + 1),
          amount: transaction.amount
        })),
    [data.transactions]
  );

  return (
    <div className="grid two">
      <section className="panel balance-panel">
        <span>Demo balance</span>
        <strong>{inr(data.wallet?.balance || 0)}</strong>
        <p>Wallet {data.wallet?.walletNumber || "creating..."}</p>
        <div className="actions">
          <button onClick={() => setActive("send")}><Send size={17} /> Send</button>
          <button onClick={() => setActive("requests")}><ReceiptText size={17} /> Request</button>
          <button onClick={() => setActive("split")}><Split size={17} /> Split</button>
        </div>
      </section>

      <section className="panel qr-panel">
        <div className="qr-card">
          <QRCodeCanvas value={JSON.stringify({ type: "BLOCKPAY_QR", username: user.username })} size={124} bgColor="#ffffff" fgColor="#10131d" />
        </div>
        <div>
          <span className="eyebrow"><QrCode size={15} /> QR pay</span>
          <h3>@{user.username}</h3>
          <p>Students can scan this payload and pay your BlockPay username.</p>
        </div>
      </section>

      <section className="panel">
        <div className="panel-title">
          <h3>Recent transactions</h3>
          <button className="ghost" onClick={() => setActive("history")}>View all</button>
        </div>
        <div className="list">
          {recent.length ? recent.map((transaction) => <TransactionRow key={transaction._id} transaction={transaction} userId={user._id} />) : <Empty label="No transactions yet" />}
        </div>
      </section>

      <section className="panel">
        <div className="panel-title">
          <h3>Spending pulse</h3>
          <span className="chip">Verified</span>
        </div>
        <div className="chart-box">
          <ResponsiveContainer width="100%" height={190}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="amount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#35d0ba" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#e45a92" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#283044" />
              <XAxis dataKey="name" stroke="#8c95aa" />
              <YAxis stroke="#8c95aa" />
              <Tooltip contentStyle={{ background: "#151a27", border: "1px solid #30384d", color: "#fff" }} />
              <Area type="monotone" dataKey="amount" stroke="#35d0ba" fillOpacity={1} fill="url(#amount)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}

function WalletView({ data, setActive }) {
  const [amount, setAmount] = useState("1000");
  const [message, setMessage] = useState("");
  const incoming = data.transactions.filter(
    (transaction) => String(transaction.receiverId?._id || transaction.receiverId) === String(data.wallet?.userId)
  );
  const outgoing = data.transactions.filter(
    (transaction) => String(transaction.senderId?._id || transaction.senderId) === String(data.wallet?.userId)
  );
  const received = incoming.reduce((sum, transaction) => sum + transaction.amount, 0);
  const spent = outgoing.reduce((sum, transaction) => sum + transaction.amount, 0);

  async function deposit(event) {
    event.preventDefault();
    setMessage("");
    try {
      await api.depositDemo({ amount: Number(amount) });
      setMessage(`${inr(Number(amount))} demo balance added.`);
      data.refresh();
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <div className="grid two">
      <section className="panel balance-panel wallet-hero">
        <span>Available demo balance</span>
        <strong>{inr(data.wallet?.balance || 0)}</strong>
        <p>{data.wallet?.walletNumber || "Wallet is being created"}</p>
        <div className="actions">
          <button onClick={() => setActive("send")}><Send size={17} /> Send</button>
          <button onClick={() => setActive("scan")}><ScanLine size={17} /> Scan</button>
          <button onClick={() => setActive("receive")}><QrCode size={17} /> Receive</button>
        </div>
      </section>

      <section className="panel">
        <div className="panel-title">
          <h3>Demo top up</h3>
          <span className="chip">test money</span>
        </div>
        <form className="stack" onSubmit={deposit}>
          <label>Amount<input type="number" min="1" value={amount} onChange={(event) => setAmount(event.target.value)} /></label>
          <button className="primary-button"><Wallet size={17} /> Add demo balance</button>
          {message && <p className="form-message">{message}</p>}
        </form>
      </section>

      <div className="metric-grid span-two">
        <section className="metric">
          <span>Received</span>
          <strong>{inr(received)}</strong>
        </section>
        <section className="metric">
          <span>Spent</span>
          <strong>{inr(spent)}</strong>
        </section>
        <section className="metric">
          <span>Receipts</span>
          <strong>{data.transactions.length}</strong>
        </section>
      </div>
    </div>
  );
}

function ReceiveMoney({ user }) {
  const [amount, setAmount] = useState("250");
  const [purpose, setPurpose] = useState("Lunch");
  const [qr, setQr] = useState(null);
  const [payload, setPayload] = useState({
    type: "BLOCKPAY_QR",
    username: user.username,
    amount: 250,
    purpose: "Lunch"
  });
  const [message, setMessage] = useState("");

  async function generate(event) {
    event?.preventDefault();
    setMessage("");
    try {
      const response = await api.generateQr({ amount: Number(amount), purpose });
      setQr(response.qrImage);
      setPayload(response.payload);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function copyPayload() {
    await navigator.clipboard.writeText(JSON.stringify(payload));
    setMessage("QR payload copied.");
  }

  return (
    <div className="grid two">
      <section className="panel">
        <div className="panel-title">
          <h3>Receive money</h3>
          <span className="chip">@{user.username}</span>
        </div>
        <form className="stack" onSubmit={generate}>
          <label>Amount<input type="number" min="1" value={amount} onChange={(event) => setAmount(event.target.value)} /></label>
          <label>Purpose<input value={purpose} onChange={(event) => setPurpose(event.target.value)} /></label>
          <button className="primary-button"><QrCode size={17} /> Generate QR</button>
          {message && <p className="form-message">{message}</p>}
        </form>
      </section>

      <section className="panel receive-panel">
        <div className="qr-display large-qr">
          {qr ? <img src={qr} alt="BlockPay receive QR" /> : <QRCodeCanvas value={JSON.stringify(payload)} size={220} />}
        </div>
        <div className="payload-box">
          <span>Pay @{payload.username}</span>
          <strong>{inr(payload.amount || 0)}</strong>
          <small>{payload.purpose || "No purpose"}</small>
          <button className="ghost" onClick={copyPayload}><Copy size={16} /> Copy payload</button>
        </div>
      </section>
    </div>
  );
}

function ScanPay({ data }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanTimerRef = useRef(null);
  const [rawPayload, setRawPayload] = useState("");
  const [form, setForm] = useState({ username: "", amount: "", note: "", pin: "1234" });
  const [receipt, setReceipt] = useState(null);
  const [message, setMessage] = useState("");
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    return () => stopCamera();
  }, []);

  async function parsePayload(payloadValue = rawPayload) {
    setMessage("");
    try {
      const response = await api.scanQr({ payload: payloadValue });
      setForm({
        username: `@${response.username}`,
        amount: String(response.amount || ""),
        note: response.note || "",
        pin: "1234"
      });
      setMessage(`Ready to pay @${response.username}.`);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function startCamera() {
    setMessage("");
    if (!("BarcodeDetector" in window)) {
      setMessage("This browser does not expose QR camera scanning. Paste a BlockPay payload below.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setScanning(true);

      const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
      scanTimerRef.current = window.setInterval(async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) return;
        const codes = await detector.detect(videoRef.current);
        if (codes.length > 0) {
          const value = codes[0].rawValue;
          setRawPayload(value);
          await parsePayload(value);
          stopCamera();
        }
      }, 700);
    } catch (error) {
      setMessage(error.message || "Could not start camera scanner.");
    }
  }

  function stopCamera() {
    if (scanTimerRef.current) {
      window.clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setScanning(false);
  }

  function useRahulDemo() {
    const payload = JSON.stringify({
      type: "BLOCKPAY_QR",
      username: "rahul93032",
      amount: 250,
      purpose: "Lunch"
    });
    setRawPayload(payload);
    parsePayload(payload);
  }

  async function pay(event) {
    event.preventDefault();
    setMessage("");
    try {
      const response = await api.transfer({ ...form, amount: Number(form.amount) });
      setReceipt(response.transaction);
      data.refresh();
      setMessage("Scan payment completed.");
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <div className="grid two">
      <section className="panel scanner-panel">
        <div className="panel-title">
          <h3>Scan QR</h3>
          <span className="chip"><Camera size={14} /> camera</span>
        </div>
        <div className="scanner-frame">
          <video ref={videoRef} muted playsInline />
          {!scanning && <div><ScanLine size={44} /><span>Camera preview</span></div>}
        </div>
        <div className="actions">
          <button type="button" onClick={startCamera}><Camera size={17} /> Start scan</button>
          <button type="button" onClick={stopCamera}><Clock3 size={17} /> Stop</button>
          <button type="button" onClick={useRahulDemo}><QrCode size={17} /> Rahul demo</button>
        </div>
        <label>
          QR payload
          <input value={rawPayload} onChange={(event) => setRawPayload(event.target.value)} placeholder='{"type":"BLOCKPAY_QR","username":"rahul","amount":250,"purpose":"Lunch"}' />
        </label>
        <button className="ghost" onClick={() => parsePayload()}><ScanLine size={16} /> Read payload</button>
        {message && <p className="form-message">{message}</p>}
      </section>

      <div className="stack">
        <section className="panel">
          <div className="panel-title">
            <h3>Confirm scanned payment</h3>
            <span className="chip">PIN 1234</span>
          </div>
          <form className="stack" onSubmit={pay}>
            <label>Pay to<input value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} required /></label>
            <label>Amount<input type="number" min="1" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} required /></label>
            <label>Note<input value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} /></label>
            <label>Payment PIN<input value={form.pin} onChange={(event) => setForm({ ...form, pin: event.target.value })} /></label>
            <button className="primary-button"><ShieldCheck size={17} /> Pay scanned QR</button>
          </form>
        </section>
        <ReceiptPanel receipt={receipt} />
      </div>
    </div>
  );
}

function SendMoney({ data }) {
  const [form, setForm] = useState({ username: "", amount: "", note: "", pin: "1234" });
  const [results, setResults] = useState([]);
  const [receipt, setReceipt] = useState(null);
  const [message, setMessage] = useState("");

  async function search(value) {
    setForm((current) => ({ ...current, username: value }));
    if (value.replace("@", "").length > 1) {
      const response = await api.searchUsers(value);
      setResults(response.users);
    } else {
      setResults([]);
    }
  }

  async function submit(event) {
    event.preventDefault();
    setMessage("");
    try {
      const response = await api.transfer({ ...form, amount: Number(form.amount) });
      setReceipt(response.transaction);
      setForm({ username: "", amount: "", note: "", pin: "1234" });
      data.refresh();
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <div className="grid two">
      <section className="panel">
        <div className="panel-title">
          <h3>Send money</h3>
          <span className="chip">PIN 1234</span>
        </div>
        <form className="stack" onSubmit={submit}>
          <label>
            Username
            <div className="input-icon">
              <Search size={16} />
              <input value={form.username} onChange={(event) => search(event.target.value)} placeholder="@rahul" required />
            </div>
          </label>
          {results.length > 0 && (
            <div className="search-results">
              {results.map((user) => (
                <button type="button" key={user._id} onClick={() => search(`@${user.username}`)}>
                  <Avatar user={user} />
                  <span>{user.name}</span>
                  <small>@{user.username}</small>
                </button>
              ))}
            </div>
          )}
          <label>
            Amount
            <input type="number" min="1" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} required />
          </label>
          <label>
            Note
            <input value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} placeholder="Mess bill" />
          </label>
          <label>
            Payment PIN
            <input value={form.pin} onChange={(event) => setForm({ ...form, pin: event.target.value })} />
          </label>
          <button className="primary-button"><Send size={17} /> Verify and send</button>
          {message && <p className="form-message">{message}</p>}
        </form>
      </section>

      <ReceiptPanel receipt={receipt} />
    </div>
  );
}

function Requests({ data }) {
  const { user } = useAuth();
  const [form, setForm] = useState({ username: "", amount: "", note: "" });
  const [message, setMessage] = useState("");

  async function submit(event) {
    event.preventDefault();
    setMessage("");
    try {
      await api.requestPayment({ ...form, amount: Number(form.amount) });
      setForm({ username: "", amount: "", note: "" });
      data.refresh();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function accept(id) {
    await api.acceptRequest(id, { pin: "1234" });
    data.refresh();
  }

  async function reject(id) {
    await api.rejectRequest(id);
    data.refresh();
  }

  return (
    <div className="grid two">
      <section className="panel">
        <h3>Request payment</h3>
        <form className="stack" onSubmit={submit}>
          <label>Username<input value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} placeholder="@priya" required /></label>
          <label>Amount<input type="number" min="1" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} required /></label>
          <label>Purpose<input value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} placeholder="Dinner" /></label>
          <button className="primary-button"><ReceiptText size={17} /> Send request</button>
          {message && <p className="form-message">{message}</p>}
        </form>
      </section>
      <section className="panel">
        <h3>Payment requests</h3>
        <div className="list">
          {data.requests.length ? data.requests.map((request) => (
            <div className="request-row" key={request._id}>
              <div>
                <strong>{request.note || "Payment request"}</strong>
                <span>{request.requesterId?.name} asks {request.payerId?.name}</span>
                <small>{inr(request.amount)} · {request.status}</small>
              </div>
              {request.status === "pending" && request.payerId?._id === user?._id && (
                <div className="mini-actions">
                  <button onClick={() => accept(request._id)} title="Accept request"><Check size={15} /></button>
                  <button onClick={() => reject(request._id)} title="Reject request">×</button>
                </div>
              )}
            </div>
          )) : <Empty label="No payment requests" />}
        </div>
      </section>
    </div>
  );
}

function SplitBill({ data }) {
  const [form, setForm] = useState({ title: "Pizza", amount: "", members: "" });
  const [message, setMessage] = useState("");

  async function submit(event) {
    event.preventDefault();
    setMessage("");
    try {
      const response = await api.splitBill({
        title: form.title,
        amount: Number(form.amount),
        members: form.members.split(",").map((item) => item.trim()).filter(Boolean)
      });
      setMessage(`Split created at ${inr(response.perHead)} each.`);
      data.refresh();
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <section className="panel narrow">
      <div className="panel-title">
        <h3>Split bill</h3>
        <span className="chip"><Split size={14} /> auto requests</span>
      </div>
      <form className="stack" onSubmit={submit}>
        <label>Title<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required /></label>
        <label>Total amount<input type="number" min="1" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} required /></label>
        <label>Members<input value={form.members} onChange={(event) => setForm({ ...form, members: event.target.value })} placeholder="@avi, @rahul, @priya" required /></label>
        <button className="primary-button"><Split size={17} /> Create split</button>
        {message && <p className="form-message">{message}</p>}
      </form>
    </section>
  );
}

function HistoryView({ data }) {
  const [filter, setFilter] = useState("all");
  const [transactions, setTransactions] = useState(data.transactions);

  useEffect(() => setTransactions(data.transactions), [data.transactions]);

  async function applyFilter(value) {
    setFilter(value);
    const response = await api.transactions(value);
    setTransactions(response.transactions);
  }

  return (
    <section className="panel">
      <div className="panel-title">
        <h3>Transaction history</h3>
        <div className="segmented compact">
          {["all", "today", "week", "month"].map((item) => (
            <button key={item} className={filter === item ? "active" : ""} onClick={() => applyFilter(item)}>
              {item}
            </button>
          ))}
        </div>
      </div>
      <div className="list wide">
        {transactions.length ? transactions.map((transaction) => (
          <TransactionRow key={transaction._id} transaction={transaction} userId={data.wallet?.userId} detailed />
        )) : <Empty label="No transactions match this filter" />}
      </div>
    </section>
  );
}

function FriendsView({ data }) {
  const [username, setUsername] = useState("");
  const [results, setResults] = useState([]);
  const [message, setMessage] = useState("");

  async function search(value) {
    setUsername(value);
    if (value.replace("@", "").length > 1) {
      const response = await api.searchUsers(value);
      setResults(response.users);
    } else {
      setResults([]);
    }
  }

  async function addFriend(value = username) {
    setMessage("");
    try {
      await api.addFriend({ username: value });
      setUsername("");
      setResults([]);
      setMessage("Friend added.");
      data.refresh();
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <div className="grid two">
      <section className="panel">
        <div className="panel-title">
          <h3>Add friend</h3>
          <span className="chip"><UsersRound size={14} /> campus</span>
        </div>
        <div className="stack">
          <label>
            Search username
            <div className="input-icon">
              <Search size={16} />
              <input value={username} onChange={(event) => search(event.target.value)} placeholder="@rahul" />
            </div>
          </label>
          <button className="primary-button" onClick={() => addFriend()}><UsersRound size={17} /> Add friend</button>
          {message && <p className="form-message">{message}</p>}
          {results.length > 0 && (
            <div className="search-results">
              {results.map((user) => (
                <button type="button" key={user._id} onClick={() => addFriend(user.username)}>
                  <Avatar user={user} />
                  <span>{user.name}</span>
                  <small>@{user.username}</small>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>
      <section className="panel">
        <h3>Friends</h3>
        <div className="list">
          {data.friends.length ? data.friends.map((friend) => (
            <div className="friend-row" key={friend._id}>
              <Avatar user={friend.friendId} />
              <div>
                <strong>{friend.friendId?.name}</strong>
                <span>@{friend.friendId?.username}</span>
              </div>
              <span className="chip">{friend.favorite ? "favorite" : "friend"}</span>
            </div>
          )) : <Empty label="No friends added yet" />}
        </div>
      </section>
    </div>
  );
}

function NotificationsView({ data }) {
  const unread = data.notifications.filter((notification) => !notification.read).length;
  const [message, setMessage] = useState("");

  async function markAllRead() {
    setMessage("");
    try {
      await api.readAllNotifications();
      setMessage("Notifications marked as read.");
      data.refresh();
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <section className="panel">
      <div className="panel-title">
        <h3>Notifications</h3>
        <div className="actions">
          <span className="chip">{unread} unread</span>
          <button onClick={markAllRead}><Check size={17} /> Read all</button>
        </div>
      </div>
      <div className="list">
        {data.notifications.length ? data.notifications.map((notification) => (
          <div className={`notification-row ${notification.read ? "read" : ""}`} key={notification._id}>
            <div className="tx-icon incoming"><Bell size={17} /></div>
            <div>
              <strong>{notification.title}</strong>
              <span>{notification.message}</span>
              <small>{dateTime(notification.createdAt)}</small>
            </div>
            <span className="chip">{notification.type}</span>
          </div>
        )) : <Empty label="No notifications yet" />}
      </div>
      {message && <p className="form-message">{message}</p>}
    </section>
  );
}

function SettingsView() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({
    name: user.name || "",
    phone: user.phone || "",
    collegeId: user.collegeId || "",
    bio: user.bio || "",
    avatar: user.avatar || ""
  });
  const [message, setMessage] = useState("");

  async function save(event) {
    event.preventDefault();
    setMessage("");
    try {
      const response = await api.updateProfile(form);
      setUser(response.user);
      setMessage("Profile updated.");
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <section className="panel narrow">
      <div className="panel-title">
        <h3>Settings</h3>
        <span className="chip"><Settings size={14} /> profile</span>
      </div>
      <form className="stack" onSubmit={save}>
        <label>Name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
        <label>Phone<input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
        <label>College ID<input value={form.collegeId} onChange={(event) => setForm({ ...form, collegeId: event.target.value })} /></label>
        <label>Bio<input value={form.bio} onChange={(event) => setForm({ ...form, bio: event.target.value })} /></label>
        <label>Avatar URL<input value={form.avatar} onChange={(event) => setForm({ ...form, avatar: event.target.value })} /></label>
        <button className="primary-button"><Check size={17} /> Save settings</button>
        {message && <p className="form-message">{message}</p>}
      </form>
    </section>
  );
}

function Profile({ user, data }) {
  const [qr, setQr] = useState(null);
  const [purpose, setPurpose] = useState("Lunch");
  const [amount, setAmount] = useState("250");

  async function generate() {
    const response = await api.generateQr({ amount: Number(amount), purpose });
    setQr(response.qrImage);
  }

  return (
    <div className="grid two">
      <section className="panel profile-card">
        <Avatar user={user} large />
        <h3>{user.name}</h3>
        <span>@{user.username}</span>
        <p>{user.bio || "Campus wallet ready for verified payments."}</p>
        <div className="profile-meta">
          <span><ContactRound size={15} /> {user.collegeId || "College ID pending"}</span>
          <span><Wallet size={15} /> {inr(data.wallet?.balance || 0)}</span>
        </div>
      </section>
      <section className="panel">
        <div className="panel-title">
          <h3>Payment QR</h3>
          <button className="ghost" onClick={generate}><QrCode size={16} /> Generate</button>
        </div>
        <div className="stack">
          <label>Amount<input type="number" value={amount} onChange={(event) => setAmount(event.target.value)} /></label>
          <label>Purpose<input value={purpose} onChange={(event) => setPurpose(event.target.value)} /></label>
          <div className="qr-display">
            {qr ? <img src={qr} alt="BlockPay QR" /> : <QRCodeCanvas value={JSON.stringify({ type: "BLOCKPAY_QR", username: user.username })} size={180} />}
          </div>
        </div>
      </section>
    </div>
  );
}

function Admin({ data }) {
  const cards = [
    ["Users", data.admin?.totalUsers || 0],
    ["Payments", data.admin?.totalPayments || 0],
    ["Volume", inr(data.admin?.totalVolume || 0)]
  ];

  return (
    <div className="stack">
      <div className="metric-grid">
        {cards.map(([label, value]) => (
          <section className="metric" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </section>
        ))}
      </div>
      <section className="panel">
        <h3>Fraud alerts</h3>
        <div className="list">
          {data.admin?.fraudAlerts?.length ? data.admin.fraudAlerts.map((transaction) => (
            <TransactionRow key={transaction._id} transaction={transaction} detailed />
          )) : <Empty label="No high-value demo transfers" />}
        </div>
      </section>
    </div>
  );
}

function ReceiptPanel({ receipt }) {
  if (!receipt) {
    return (
      <section className="panel receipt-empty">
        <ShieldCheck size={42} />
        <h3>Blockchain receipt</h3>
        <p>After a successful payment, the verification hash and reference ID appear here.</p>
      </section>
    );
  }

  return (
    <section className="panel receipt-panel">
      <div className="success-ring"><Check size={30} /></div>
      <h3>Payment successful</h3>
      <strong>{inr(receipt.amount)}</strong>
      <span>{receipt.referenceId}</span>
      <code>{receipt.hash}</code>
    </section>
  );
}

function TransactionRow({ transaction, userId, detailed = false }) {
  const incoming = userId && String(transaction.receiverId?._id || transaction.receiverId) === String(userId);
  const peer = incoming ? transaction.senderId : transaction.receiverId;

  return (
    <div className="transaction-row">
      <div className={`tx-icon ${incoming ? "incoming" : "outgoing"}`}>
        {incoming ? <CreditCard size={17} /> : <Send size={17} />}
      </div>
      <div>
        <strong>{peer?.name || "BlockPay user"}</strong>
        <span>{transaction.note || "Campus payment"}</span>
        {detailed && <small>{dateTime(transaction.createdAt)} · {transaction.referenceId}</small>}
      </div>
      <div className="amount">
        <strong>{incoming ? "+" : "-"}{inr(transaction.amount)}</strong>
        <small><ShieldCheck size={13} /> {transaction.status}</small>
      </div>
    </div>
  );
}

function Avatar({ user, large = false }) {
  return user?.avatar ? (
    <img className={large ? "avatar large" : "avatar"} src={user.avatar} alt={user.name} />
  ) : (
    <div className={large ? "avatar large" : "avatar"}>{initials(user?.name)}</div>
  );
}

function Empty({ label }) {
  return (
    <div className="empty">
      <Clock3 size={18} />
      <span>{label}</span>
    </div>
  );
}

export default App;
