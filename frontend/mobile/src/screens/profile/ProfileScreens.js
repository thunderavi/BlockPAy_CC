import React, { useState } from "react";
import { StyleSheet, Text, View, Pressable, Alert, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import QRCode from "react-native-qrcode-svg";
import { Button, Card, Header, Input, Message, Screen, SectionTitle, ui } from "../../components/UI";
import { AvatarDisplay, AvatarPicker } from "../../components/AvatarPicker";
import { colors, gradients, radius, shadow } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import ProfileCompletionCard from "../../components/ProfileCompletionCard";

export function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [showQr, setShowQr] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copiedVpa, setCopiedVpa] = useState(false);

  async function signOut() {
    setBusy(true);
    setError("");
    try {
      await logout();
    } catch (e) {
      setError(e.message || "Unable to log out.");
      setBusy(false);
    }
  }

  const vpaHandle = `${user.username}@blockpay`;

  const copyVpa = () => {
    setCopiedVpa(true);
    setTimeout(() => setCopiedVpa(false), 2000);
    Alert.alert("VPA Copied", `BlockPay handle "${vpaHandle}" copied to clipboard.`);
  };

  return (
    <Screen contentStyle={styles.screen}>
      <Header eyebrow={user.role === "admin" ? "Super Admin" : "Verified Account"} title="My Account" subtitle={`@${user.username}`} />

      {/* Profile Completion Checklist */}
      <ProfileCompletionCard navigation={navigation} />

      {/* Modern Virtual Payment Card */}
      <LinearGradient colors={gradients.wallet} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.virtualCard}>
        <View style={styles.cardTopRow}>
          <View style={styles.brandRow}>
            <Image
              source={require("../../../assets/logo.png")}
              style={styles.cardLogoImg}
              resizeMode="contain"
            />
            <Text style={styles.cardBrandName}>BlockPay ID</Text>
          </View>
          <Ionicons name="wifi" size={20} color="rgba(255,255,255,0.7)" style={{ transform: [{ rotate: "90deg" }] }} />
        </View>

        <View style={styles.cardMiddleRow}>
          <AvatarDisplay avatarId={user.avatar} size={54} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.cardUserName}>{user.name}</Text>
            <Pressable onPress={copyVpa} style={styles.vpaRow}>
              <Text style={styles.cardVpaText}>{vpaHandle}</Text>
              <Ionicons name={copiedVpa ? "checkmark" : "copy-outline"} size={14} color={colors.teal} />
            </Pressable>
          </View>
          <Pressable style={styles.qrToggleBtn} onPress={() => setShowQr(!showQr)}>
            <Ionicons name="qr-code-outline" size={20} color={colors.text} />
          </Pressable>
        </View>

        <View style={styles.cardBottomRow}>
          <View>
            <Text style={styles.cardMetaLabel}>COLLEGE ID</Text>
            <Text style={styles.cardMetaVal}>{user.collegeId || "CAMPUS-MEMBER"}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.cardMetaLabel}>STATUS</Text>
            <Text style={styles.cardMetaValActive}>ACTIVE • VERIFIED</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Expandable Payment QR Code Card */}
      {showQr && (
        <Card style={styles.qrCard}>
          <View style={styles.qrHeader}>
            <Text style={styles.qrTitle}>My Payment QR</Text>
            <Pressable onPress={() => setShowQr(false)}>
              <Ionicons name="close-circle-outline" size={22} color={colors.muted} />
            </Pressable>
          </View>
          <View style={styles.qrWrapper}>
            <QRCode value={JSON.stringify({ type: "BLOCKPAY_QR", username: user.username })} size={170} backgroundColor="#fff" color="#07111f" />
          </View>
          <Text style={styles.qrVpaText}>{vpaHandle}</Text>
          <Text style={ui.muted}>Show this QR to any BlockPay user to receive funds instantly.</Text>
        </Card>
      )}

      {/* Quick Action Navigation Menu */}
      <Card>
        <SectionTitle>Account & Settings</SectionTitle>

        <Pressable style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]} onPress={() => navigation.navigate("Settings")}>
          <View style={[styles.menuIcon, { backgroundColor: "rgba(128,107,255,0.12)" }]}>
            <Ionicons name="person-circle" size={22} color={colors.purple} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuTitle}>Manage Profile & Avatar</Text>
            <Text style={styles.menuSubtitle}>Update persona, bio, phone, and college ID</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.subtle} />
        </Pressable>

        <Pressable style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]} onPress={() => navigation.navigate("Security")}>
          <View style={[styles.menuIcon, { backgroundColor: "rgba(84,229,209,0.12)" }]}>
            <Ionicons name="shield-checkmark" size={22} color={colors.teal} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuTitle}>Payment PIN & Security</Text>
            <Text style={styles.menuSubtitle}>Change 4-digit PIN, biometrics & recovery</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.subtle} />
        </Pressable>

        <Pressable style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]} onPress={() => navigation.navigate("Friends")}>
          <View style={[styles.menuIcon, { backgroundColor: "rgba(87,199,255,0.12)" }]}>
            <Ionicons name="people" size={22} color={colors.cyan} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuTitle}>Friends Directory</Text>
            <Text style={styles.menuSubtitle}>Manage favorite peers for 1-tap fast pay</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.subtle} />
        </Pressable>

        <Pressable style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]} onPress={() => navigation.navigate("Notifications")}>
          <View style={[styles.menuIcon, { backgroundColor: "rgba(248,200,90,0.12)" }]}>
            <Ionicons name="notifications" size={22} color={colors.yellow} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuTitle}>Payment Notifications</Text>
            <Text style={styles.menuSubtitle}>View incoming alerts and receipt updates</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.subtle} />
        </Pressable>

        {user.role === "admin" && (
          <Pressable style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]} onPress={() => navigation.navigate("Admin")}>
            <View style={[styles.menuIcon, { backgroundColor: "rgba(255,112,166,0.12)" }]}>
              <Ionicons name="speedometer" size={22} color={colors.pink} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuTitle}>Super Admin Dashboard</Text>
              <Text style={styles.menuSubtitle}>Macro platform analytics & audit monitor</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.subtle} />
          </Pressable>
        )}
      </Card>

      <Message>{error}</Message>

      {/* Logout Confirmation */}
      {confirming ? (
        <Card style={styles.logoutCard}>
          <Text style={styles.logoutTitle}>Log out of BlockPay?</Text>
          <Text style={styles.logoutCopy}>You will need to re-authenticate to access your wallet balance.</Text>
          <View style={ui.row}>
            <Button title="Stay signed in" variant="secondary" onPress={() => setConfirming(false)} style={{ flex: 1 }} />
            <Button title="Confirm logout" variant="danger" onPress={signOut} loading={busy} style={{ flex: 1 }} />
          </View>
        </Card>
      ) : (
        <Button title="Logout" variant="danger" onPress={() => setConfirming(true)} />
      )}
    </Screen>
  );
}

export function SettingsScreen() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({
    name: user.name || "",
    phone: user.phone || "",
    avatar: user.avatar || "avatar_1",
    collegeId: user.collegeId || "",
    bio: user.bio || ""
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function save() {
    setBusy(true);
    setMessage("");
    try {
      const d = await api.updateProfile(form);
      setUser(d.user);
      setMessage("Profile updated successfully!");
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Header eyebrow="Account Persona" title="Edit Profile" subtitle="Customize your avatar persona and campus profile details." />
      <Card>
        <AvatarPicker selectedId={form.avatar} onSelect={(avatar) => setForm({ ...form, avatar })} />
        <Input label="Full Name" value={form.name} onChangeText={(name) => setForm({ ...form, name })} />
        <Input label="Mobile Phone" keyboardType="phone-pad" value={form.phone} onChangeText={(phone) => setForm({ ...form, phone })} />
        <Input label="College / Organization ID" value={form.collegeId} onChangeText={(collegeId) => setForm({ ...form, collegeId })} />
        <Input label="Bio" multiline value={form.bio} onChangeText={(bio) => setForm({ ...form, bio })} />
        <Message type={message.includes("success") ? "success" : "error"}>{message}</Message>
        <Button title="Save Profile Changes" icon="checkmark" loading={busy} onPress={save} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingBottom: 110 },
  virtualCard: {
    borderRadius: radius.lg,
    padding: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    ...shadow.glow
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  cardLogoImg: {
    width: 32,
    height: 32
  },
  cardBrandName: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 1
  },
  cardMiddleRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  cardUserName: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "900"
  },
  vpaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2
  },
  cardVpaText: {
    color: colors.teal,
    fontSize: 13,
    fontWeight: "800"
  },
  qrToggleBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center"
  },
  cardBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.14)",
    paddingTop: 12
  },
  cardMetaLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8
  },
  cardMetaVal: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2
  },
  cardMetaValActive: {
    color: colors.teal,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.5,
    marginTop: 2
  },
  qrCard: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 18
  },
  qrHeader: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4
  },
  qrTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900"
  },
  qrWrapper: {
    padding: 14,
    backgroundColor: "#fff",
    borderRadius: 16
  },
  qrVpaText: {
    color: colors.teal,
    fontSize: 15,
    fontWeight: "900"
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft
  },
  menuItemPressed: {
    opacity: 0.7
  },
  menuIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center"
  },
  menuTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "800"
  },
  menuSubtitle: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 2
  },
  logoutCard: { borderColor: "rgba(255,107,122,.35)" },
  logoutTitle: { color: colors.text, fontSize: 17, fontWeight: "900" },
  logoutCopy: { color: colors.muted, fontSize: 13, lineHeight: 19 }
});
