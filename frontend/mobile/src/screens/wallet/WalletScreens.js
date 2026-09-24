import React, { useCallback, useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import BalanceCard from "../../components/BalanceCard";
import { Button, Card, Header, Input, Message, Screen, SectionTitle, ui } from "../../components/UI";
import { PinDots, PinKeypad } from "../../components/PinInput";
import { AvatarDisplay } from "../../components/AvatarPicker";
import { colors, radius, shadow } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { inr } from "../../utils/format";
import {
  checkBiometricsStatus,
  getBiometricPreference,
  promptBiometricAuth
} from "../../services/biometrics";

export function WalletScreen({ navigation }) {
  const [wallet, setWallet] = useState(null);
  const [amount, setAmount] = useState("1000");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    api
      .wallet()
      .then((d) => setWallet(d.wallet))
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    const unsub = navigation.addListener("focus", load);
    return unsub;
  }, [navigation, load]);

  async function adjust(type) {
    setBusy(true);
    setError("");
    try {
      const d = type === "deposit" ? await api.depositDemo(Number(amount)) : await api.withdrawDemo(Number(amount));
      setWallet(d.wallet);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Header eyebrow="Campus Digital Wallet" title="My Balance" subtitle="Fast transfers backed by tamper-evident receipts." />
      <BalanceCard wallet={wallet} />

      <View style={ui.row}>
        <Button title="Send Money" icon="arrow-up" onPress={() => navigation.navigate("SendMoney")} style={{ flex: 1 }} />
        <Button title="Receive QR" icon="qr-code" variant="secondary" onPress={() => navigation.navigate("Receive")} style={{ flex: 1 }} />
      </View>

      <Card>
        <SectionTitle>Adjust Demo Balance</SectionTitle>
        <Input label="Amount (₹)" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} />
        <Message>{error}</Message>
        <View style={ui.row}>
          <Button title="Demo Deposit" onPress={() => adjust("deposit")} loading={busy} style={{ flex: 1 }} />
          <Button title="Demo Withdraw" variant="secondary" onPress={() => adjust("withdraw")} loading={busy} style={{ flex: 1 }} />
        </View>
      </Card>
    </Screen>
  );
}

export function SendMoneyScreen({ navigation, route }) {
  const prefill = route.params || {};
  const [form, setForm] = useState({
    username: prefill.username || "",
    amount: String(prefill.amount || ""),
    note: prefill.note || "",
    pin: ""
  });
  const [friends, setFriends] = useState([]);
  const [searchedUsers, setSearchedUsers] = useState([]);
  const [showPinModal, setShowPinModal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Biometric state
  const [biometricsReady, setBiometricsReady] = useState(false);
  const [bioLabel, setBioLabel] = useState("Biometric");

  // Load recent / favorite contacts for quick selection and check biometrics
  useEffect(() => {
    api
      .friends()
      .then((d) => setFriends(d.friends || []))
      .catch(() => {});

    async function checkBio() {
      try {
        const pref = await getBiometricPreference();
        const status = await checkBiometricsStatus();
        setBioLabel(status.label);
        setBiometricsReady(pref && status.isSupported);
      } catch {}
    }
    checkBio();
  }, []);

  async function search(username) {
    setForm({ ...form, username });
    const query = username.replace("@", "").trim();
    if (query.length > 1) {
      try {
        const d = await api.searchUsers(query);
        setSearchedUsers(d.users || []);
      } catch {
        setSearchedUsers([]);
      }
    } else {
      setSearchedUsers([]);
    }
  }

  const addAmountChip = (delta) => {
    const current = Number(form.amount) || 0;
    setForm({ ...form, amount: String(current + delta) });
  };

  const handleKeypadPress = (digit) => {
    if (form.pin.length < 4) {
      setForm({ ...form, pin: form.pin + digit });
    }
  };

  const handleBackspace = () => {
    if (form.pin.length > 0) {
      setForm({ ...form, pin: form.pin.slice(0, -1) });
    }
  };

  const handleClear = () => {
    setForm({ ...form, pin: "" });
  };

  async function executeTransfer(pinToUse) {
    if (!pinToUse || pinToUse.length !== 4) {
      setError("Please enter your 4-digit payment PIN.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const d = await api.transfer({
        username: form.username,
        amount: Number(form.amount),
        note: form.note,
        pin: pinToUse
      });

      setShowPinModal(false);
      Alert.alert(
        "Payment Successful 🎉",
        `${inr(d.transaction.amount)} sent to @${form.username.replace("@", "")}\nReference: ${d.transaction.referenceId}`,
        [
          { text: "View Receipt", onPress: () => navigation.replace("Receipt", { id: d.transaction._id }) }
        ]
      );
    } catch (e) {
      setError(e.message || "Payment authorization failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleBiometricPay() {
    setError("");
    try {
      const auth = await promptBiometricAuth(
        `Authorize payment of ${inr(Number(form.amount) || 0)} to @${form.username.replace("@", "")}`
      );
      if (auth.success) {
        if (auth.savedPin && auth.savedPin.length === 4) {
          setForm((prev) => ({ ...prev, pin: auth.savedPin }));
          await executeTransfer(auth.savedPin);
        } else {
          setError("No saved PIN linked with biometrics. Please enter your 4-digit PIN below.");
        }
      } else if (auth.error && auth.error !== "Authentication cancelled" && auth.error !== "user_cancel") {
        setError(auth.error);
      }
    } catch (err) {
      setError(err.message || "Biometric sensor error.");
    }
  }

  async function onProceedToPay() {
    if (!form.username.trim() || !Number(form.amount) || Number(form.amount) <= 0) {
      setError("Please enter a valid recipient username and amount.");
      return;
    }
    setError("");
    setForm((prev) => ({ ...prev, pin: "" }));
    setShowPinModal(true);

    // If biometrics is ready, auto-prompt sensor immediately for supreme UX
    if (biometricsReady) {
      setTimeout(() => {
        handleBiometricPay();
      }, 300);
    }
  }

  return (
    <Screen>
      <Header eyebrow="Protected by 4-digit PIN" title="Send Money" subtitle="Instant peer-to-peer campus transfers." />

      {/* Recent / Favorite Friends Tray */}
      {friends.length > 0 && (
        <Card style={styles.trayCard}>
          <SectionTitle>Recent & Favorites</SectionTitle>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.friendsScroll}>
            {friends.map((f) => {
              const friend = f.friendId || f;
              return (
                <Pressable
                  key={friend._id || friend.username}
                  style={({ pressed }) => [styles.friendAvatarItem, pressed && { opacity: 0.7 }]}
                  onPress={() => setForm({ ...form, username: friend.username })}
                >
                  <AvatarDisplay avatarId={friend.avatar || "avatar_1"} size={46} />
                  <Text style={styles.friendNameText} numberOfLines={1}>
                    {friend.name?.split(" ")[0] || friend.username}
                  </Text>
                  <Text style={styles.friendHandleText} numberOfLines={1}>
                    @{friend.username}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </Card>
      )}

      {/* Main Payment Details Form */}
      <Card>
        <Input
          label="Recipient Username"
          placeholder="@username"
          autoCapitalize="none"
          value={form.username}
          onChangeText={search}
        />

        {searchedUsers.map((u) => (
          <Pressable
            key={u._id}
            style={({ pressed }) => [styles.searchResultItem, pressed && { backgroundColor: colors.panelHighlight }]}
            onPress={() => {
              setForm({ ...form, username: u.username });
              setSearchedUsers([]);
            }}
          >
            <AvatarDisplay avatarId={u.avatar || "avatar_1"} size={36} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.searchName}>{u.name}</Text>
              <Text style={styles.searchHandle}>@{u.username}</Text>
            </View>
            <Ionicons name="add-circle-outline" size={20} color={colors.teal} />
          </Pressable>
        ))}

        <Input
          label="Transfer Amount (₹)"
          placeholder="0.00"
          keyboardType="decimal-pad"
          value={form.amount}
          onChangeText={(amount) => setForm({ ...form, amount })}
        />

        {/* Quick Amount Chips */}
        <View style={styles.chipsRow}>
          {[100, 200, 500, 1000, 2000].map((chip) => (
            <Pressable key={chip} style={({ pressed }) => [styles.chipBtn, pressed && styles.chipBtnPressed]} onPress={() => addAmountChip(chip)}>
              <Text style={styles.chipBtnText}>+₹{chip}</Text>
            </Pressable>
          ))}
        </View>

        <Input label="Add a note (optional)" placeholder="e.g. Lunch split, project fee" value={form.note} onChangeText={(note) => setForm({ ...form, note })} />

        <Message>{error}</Message>

        <Button
          title={form.amount ? `Proceed to Pay ${inr(Number(form.amount) || 0)}` : "Enter Amount to Pay"}
          icon="lock-closed"
          onPress={onProceedToPay}
          disabled={!form.username.trim() || !Number(form.amount) || Number(form.amount) <= 0}
        />
      </Card>

      {/* Authorization Bottom Sheet / PIN Modal */}
      {showPinModal && (
        <Card style={styles.pinModalCard}>
          <View style={styles.pinModalHeader}>
            <View>
              <Text style={styles.pinModalTitle}>Authorize Transfer</Text>
              <Text style={styles.pinModalSubtitle}>Sending {inr(Number(form.amount))} to @{form.username.replace("@", "")}</Text>
            </View>
            <Pressable onPress={() => setShowPinModal(false)} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={colors.muted} />
            </Pressable>
          </View>

          {/* Biometric One-Touch Button */}
          {biometricsReady && (
            <>
              <Pressable
                style={({ pressed }) => [styles.bioPayBtn, pressed && styles.bioPayBtnPressed]}
                onPress={handleBiometricPay}
              >
                <View style={styles.bioPayIconShell}>
                  <Ionicons
                    name={bioLabel === "Face ID" ? "scan-outline" : "finger-print"}
                    size={24}
                    color={colors.teal}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.bioPayTitle}>Authorize with {bioLabel}</Text>
                  <Text style={styles.bioPaySub}>Touch sensor for 1-tap fast payment</Text>
                </View>
                <Ionicons name="flash" size={18} color={colors.teal} />
              </Pressable>

              <View style={styles.orDividerRow}>
                <View style={styles.orLine} />
                <Text style={styles.orText}>OR USE 4-DIGIT PIN</Text>
                <View style={styles.orLine} />
              </View>
            </>
          )}

          <View style={styles.pinPromptBox}>
            <Text style={styles.pinPromptLabel}>ENTER 4-DIGIT PAYMENT PIN</Text>
            <PinDots length={4} value={form.pin} />
          </View>

          <PinKeypad value={form.pin} onKeyPress={handleKeypadPress} onBackspace={handleBackspace} onClear={handleClear} />

          <Message>{error}</Message>

          <Button
            title="Confirm & Send Funds"
            icon="arrow-forward"
            onPress={() => executeTransfer(form.pin)}
            loading={busy}
            disabled={form.pin.length !== 4}
            style={{ marginTop: 8 }}
          />
        </Card>
      )}
    </Screen>
  );
}

export function ReceiveScreen() {
  const { user } = useAuth();
  const [amount, setAmount] = useState("");
  const [purpose, setPurpose] = useState("");

  const payload = JSON.stringify({
    type: "BLOCKPAY_QR",
    username: user.username,
    ...(amount ? { amount: Number(amount) } : {}),
    purpose
  });

  return (
    <Screen>
      <Header eyebrow="Instant Settlement" title="Receive Money" subtitle="Show your QR code or share your BlockPay handle." />

      <Card style={styles.qrCard}>
        <View style={styles.qrWhiteBox}>
          <QRCode value={payload} size={210} backgroundColor="#fff" color="#07111f" />
        </View>
        <Text style={styles.qrUsername}>@{user.username}</Text>
        <Text style={styles.qrHandle}>{user.username}@blockpay</Text>
        <Text style={ui.muted}>Compatible with any BlockPay scanner.</Text>
      </Card>

      <Card>
        <SectionTitle>Request Specific Amount</SectionTitle>
        <Input label="Amount (₹) - optional" placeholder="e.g. 250" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} />
        <Input label="Payment Purpose / Note - optional" placeholder="e.g. Workshop fee, Event pass" value={purpose} onChangeText={setPurpose} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  trayCard: {
    paddingVertical: 12
  },
  friendsScroll: {
    gap: 14,
    paddingHorizontal: 4,
    paddingTop: 8
  },
  friendAvatarItem: {
    alignItems: "center",
    width: 68,
    gap: 4
  },
  friendNameText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center"
  },
  friendHandleText: {
    color: colors.muted,
    fontSize: 10,
    textAlign: "center"
  },
  searchResultItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderRadius: radius.sm,
    backgroundColor: colors.bgElevated,
    marginVertical: 2
  },
  searchName: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "800"
  },
  searchHandle: {
    color: colors.muted,
    fontSize: 11
  },
  chipsRow: {
    flexDirection: "row",
    gap: 8,
    marginVertical: 4
  },
  chipBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    alignItems: "center",
    justifyContent: "center"
  },
  chipBtnPressed: {
    borderColor: colors.teal,
    backgroundColor: "rgba(84,229,209,0.1)"
  },
  chipBtnText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: "800"
  },
  pinModalCard: {
    borderColor: colors.teal,
    borderWidth: 1.5,
    backgroundColor: colors.bgElevated,
    padding: 18,
    gap: 12,
    ...shadow.glow
  },
  pinModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  pinModalTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900"
  },
  pinModalSubtitle: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.panel
  },
  pinPromptBox: {
    alignItems: "center",
    paddingVertical: 6
  },
  pinPromptLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1
  },
  qrCard: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 20
  },
  qrWhiteBox: {
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 18
  },
  qrUsername: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "900",
    marginTop: 6
  },
  qrHandle: {
    color: colors.teal,
    fontSize: 13,
    fontWeight: "800"
  },
  bioPayBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: "rgba(84,229,209,0.1)",
    borderWidth: 1.5,
    borderColor: colors.teal
  },
  bioPayBtnPressed: {
    opacity: 0.8,
    backgroundColor: "rgba(84,229,209,0.2)"
  },
  bioPayIconShell: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(84,229,209,0.2)",
    alignItems: "center",
    justifyContent: "center"
  },
  bioPayTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "900"
  },
  bioPaySub: {
    color: colors.teal,
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2
  },
  orDividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 4
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.borderSoft
  },
  orText: {
    color: colors.subtle,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1
  }
});
