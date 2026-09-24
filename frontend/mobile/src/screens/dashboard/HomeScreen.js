import React, { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import BalanceCard from "../../components/BalanceCard";
import TransactionItem from "../../components/TransactionItem";
import ProfileCompletionCard from "../../components/ProfileCompletionCard";
import { Card, Empty, Header, Message, Screen, SectionTitle } from "../../components/UI";
import { colors, radius, shadow } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";

const actions = [
  { label: "Send", route: "SendMoney", icon: "arrow-up" },
  { label: "Receive", route: "Receive", icon: "arrow-down" },
  { label: "Scan", route: "ScanQr", icon: "scan" },
  { label: "Request", route: "Requests", icon: "receipt-outline" },
  { label: "Split", route: "SplitBill", icon: "people-outline" }
];

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [unread, setUnread] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [hidden, setHidden] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    setError("");
    try {
      const [w, t, n] = await Promise.all([
        api.wallet(),
        api.transactions(),
        api.notifications()
      ]);
      setWallet(w.wallet);
      setTransactions(t.transactions);
      setUnread(n.notifications.filter((x) => !x.read).length);
    } catch (e) {
      setError(e.message);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const unsub = navigation.addListener("focus", load);
    return unsub;
  }, [navigation, load]);

  const now = Date.now();
  const outgoing = transactions.filter(
    (x) => String(x.senderId?._id || x.senderId) === String(user._id)
  );
  const spent = (days) =>
    outgoing
      .filter((x) => now - new Date(x.createdAt).getTime() <= days * 86400000)
      .reduce((sum, x) => sum + x.amount, 0);

  return (
    <Screen refreshing={refreshing} onRefresh={load}>
      <Header
        eyebrow="Campus Digital Wallet"
        title={`Hey, ${user.name.split(" ")[0]} 👋`}
        subtitle={`Welcome back  •  @${user.username}`}
        right={
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Image
              source={require("../../../assets/logo.png")}
              style={{ width: 38, height: 38 }}
              resizeMode="contain"
            />
            <Pressable onPress={() => navigation.navigate("Notifications")} style={styles.bell}>
              <Ionicons name="notifications-outline" size={22} color={colors.text} />
              {unread ? <Text style={styles.badge}>{unread}</Text> : null}
            </Pressable>
          </View>
        }
      />

      <Message>{error}</Message>

      {/* Profile Completion Progress Widget (Persona & Payment PIN / Biometrics) */}
      <ProfileCompletionCard navigation={navigation} />

      <BalanceCard wallet={wallet} hidden={hidden} onToggle={() => setHidden(!hidden)} />

      <View style={styles.actions}>
        {actions.map((action) => (
          <Pressable
            key={action.route}
            onPress={() => navigation.navigate(action.route)}
            style={({ pressed }) => [styles.action, pressed && { transform: [{ scale: 0.96 }] }]}
          >
            <View style={styles.actionIcon}>
              <Ionicons name={action.icon} size={21} color={colors.teal} />
            </View>
            <Text style={styles.actionText}>{action.label}</Text>
          </Pressable>
        ))}
      </View>

      <SectionTitle>Spending insight</SectionTitle>
      <View style={styles.summary}>
        {[
          ["Today", spent(1), "sunny-outline"],
          ["7 days", spent(7), "calendar-outline"],
          ["30 days", spent(30), "analytics-outline"]
        ].map(([label, value, icon]) => (
          <Card key={label} style={styles.metric}>
            <Ionicons name={icon} size={17} color={colors.purple} />
            <Text style={styles.metricValue}>₹{Number(value).toLocaleString("en-IN")}</Text>
            <Text style={styles.metricLabel}>{label}</Text>
          </Card>
        ))}
      </View>

      <Card style={styles.qrCard} gradient>
        <View style={styles.qrWrap}>
          <QRCode
            value={JSON.stringify({ type: "BLOCKPAY_QR", username: user.username })}
            size={86}
            backgroundColor="#fff"
            color={colors.bg}
          />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.qrHeading}>
            <Ionicons name="qr-code-outline" size={18} color={colors.teal} />
            <Text style={styles.qrTitle}>Your payment QR</Text>
          </View>
          <Text style={styles.qrSub}>Let friends scan to pay you instantly.</Text>
          <Pressable onPress={() => navigation.navigate("Receive")}>
            <Text style={styles.qrLink}>Open full QR  →</Text>
          </Pressable>
        </View>
      </Card>

      <SectionTitle>Recent activity</SectionTitle>
      <Card gradient>
        {transactions.length ? (
          transactions
            .slice(0, 5)
            .map((tx) => (
              <TransactionItem
                key={tx._id}
                item={tx}
                userId={user._id}
                onPress={() => navigation.navigate("Receipt", { id: tx._id })}
              />
            ))
        ) : (
          <Empty label="No payments yet" />
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  bell: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.card
  },
  badge: {
    position: "absolute",
    right: -3,
    top: -4,
    backgroundColor: colors.pink,
    color: colors.white,
    fontWeight: "900",
    fontSize: 10,
    minWidth: 19,
    height: 19,
    borderRadius: 10,
    textAlign: "center",
    paddingTop: 2,
    borderWidth: 2,
    borderColor: colors.bg
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 7
  },
  action: {
    flex: 1,
    alignItems: "center",
    gap: 7
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 17,
    backgroundColor: colors.panel,
    borderColor: colors.borderSoft,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.card
  },
  actionText: {
    color: colors.muted,
    fontWeight: "800",
    fontSize: 11
  },
  summary: {
    flexDirection: "row",
    gap: 9
  },
  metric: {
    flex: 1,
    padding: 12,
    gap: 5,
    minHeight: 100,
    justifyContent: "space-between"
  },
  metricLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "700"
  },
  metricValue: {
    color: colors.text,
    fontWeight: "900",
    fontSize: 15,
    letterSpacing: -0.4
  },
  qrCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16
  },
  qrWrap: {
    padding: 8,
    backgroundColor: colors.white,
    borderRadius: radius.sm
  },
  qrHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7
  },
  qrTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900"
  },
  qrSub: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 5
  },
  qrLink: {
    color: colors.teal,
    fontWeight: "900",
    fontSize: 12,
    marginTop: 8
  }
});
