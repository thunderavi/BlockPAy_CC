import React, { useState } from "react";
import { Alert, StyleSheet, Text, View, Pressable, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Button, Card, Header, Input, Message, Screen, ui } from "../../components/UI";
import { PinDots, PinKeypad } from "../../components/PinInput";
import { AvatarPicker } from "../../components/AvatarPicker";
import { colors, radius, shadow } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { api, DEMO_MODE } from "../../services/api";

function Brand() {
  return (
    <View style={styles.brand}>
      <View style={styles.logoGlowShell}>
        <Image
          source={require("../../../assets/logo.png")}
          style={styles.brandLogoImage}
          resizeMode="contain"
        />
      </View>
      <Text style={styles.brandName}>BlockPay</Text>
      <View style={styles.tagRow}>
        <Ionicons name="shield-checkmark" size={14} color={colors.teal} />
        <Text style={styles.tag}>Fast payments. Verifiable receipts.</Text>
      </View>
    </View>
  );
}

export function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [form, setForm] = useState(
    DEMO_MODE ? { email: "demo@blockpay.app", password: "demo123" } : { email: "", password: "" }
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!form.email.trim() || !form.password) {
      setError("Email and password are required.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await login(form);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen contentStyle={styles.screen}>
      <Brand />
      {DEMO_MODE ? <Message type="info">Demo mode: demo@blockpay.app / demo123 • PIN: 1234</Message> : null}
      <Card style={styles.authCard} gradient>
        <Header eyebrow="Welcome back" title="Sign in" subtitle="Access your secure campus wallet." />
        <Input
          label="Email address"
          accessibilityLabel="Email"
          placeholder="you@college.edu"
          autoCapitalize="none"
          keyboardType="email-address"
          value={form.email}
          onChangeText={(email) => setForm({ ...form, email })}
        />
        <Input
          label="Password"
          placeholder="Enter your password"
          secureTextEntry
          value={form.password}
          onChangeText={(password) => setForm({ ...form, password })}
        />
        <Message>{error}</Message>
        <Button title={DEMO_MODE ? "Open demo app" : "Login"} icon="arrow-forward" onPress={submit} loading={busy} />
        <Button title="Forgot password?" variant="ghost" onPress={() => navigation.navigate("ForgotPassword")} />
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>NEW TO BLOCKPAY?</Text>
          <View style={styles.dividerLine} />
        </View>
        <Button title="Create an account" variant="secondary" onPress={() => navigation.navigate("Register")} />
      </Card>
    </Screen>
  );
}

export function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    username: "",
    password: "",
    collegeId: ""
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim() || !form.username.trim() || form.password.length < 6) {
      setError("Please fill all required fields. Password must be at least 6 characters.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        username: form.username.trim().toLowerCase(),
        password: form.password,
        collegeId: form.collegeId.trim()
      });
      // AuthProvider applyAuth updates session and automatically moves into the app
    } catch (e) {
      setError(e.message || "Registration failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen contentStyle={styles.screen}>
      <Card style={styles.authCard} gradient>
        <Header
          eyebrow="Instant Wallet Onboarding"
          title="Create account"
          subtitle="Open your campus digital wallet in seconds."
        />

        <Input
          label="Full name"
          placeholder="Alice Johnson"
          value={form.name}
          onChangeText={(name) => setForm({ ...form, name })}
        />
        <Input
          label="Username (@handle)"
          placeholder="alice_j"
          autoCapitalize="none"
          value={form.username}
          onChangeText={(username) => setForm({ ...form, username: username.replace(/[^a-zA-Z0-9_]/g, "") })}
        />
        <Input
          label="Email address"
          placeholder="alice@college.edu"
          autoCapitalize="none"
          keyboardType="email-address"
          value={form.email}
          onChangeText={(email) => setForm({ ...form, email })}
        />
        <Input
          label="Mobile phone"
          placeholder="9876543210"
          keyboardType="phone-pad"
          value={form.phone}
          onChangeText={(phone) => setForm({ ...form, phone })}
        />
        <Input
          label="Password (min 6 chars)"
          placeholder="Create a strong password"
          secureTextEntry
          value={form.password}
          onChangeText={(password) => setForm({ ...form, password })}
        />
        <Input
          label="College / Student ID (optional)"
          placeholder="e.g. CS-2026-042"
          value={form.collegeId}
          onChangeText={(collegeId) => setForm({ ...form, collegeId })}
        />

        <Message>{error}</Message>

        <Button
          title="Create Account"
          icon="arrow-forward"
          onPress={submit}
          loading={busy}
        />

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>ALREADY HAVE AN ACCOUNT?</Text>
          <View style={styles.dividerLine} />
        </View>

        <Button
          title="Sign in instead"
          variant="secondary"
          onPress={() => navigation?.navigate ? navigation.navigate("Login") : null}
        />
      </Card>
    </Screen>
  );
}

export function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit() {
    setBusy(true);
    try {
      const data = await api.forgotPassword({ email });
      setMessage(data.message);
      Alert.alert("Demo reset", data.otp ? `${data.message}\nOTP: ${data.otp}` : data.message);
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Header eyebrow="Account recovery" title="Forgot password" subtitle="The current backend provides a demonstration OTP flow." />
      <Card>
        <Input label="Registered email" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
        <Message type="info">{message}</Message>
        <Button title="Generate demo OTP" onPress={submit} loading={busy} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { justifyContent: "center", flexGrow: 1, paddingVertical: 24 },
  brand: { alignItems: "center", marginBottom: 28 },
  logoGlowShell: {
    width: 104,
    height: 104,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.cyan,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 22,
    elevation: 10
  },
  brandLogoImage: {
    width: 98,
    height: 98
  },
  brandName: { fontSize: 35, fontWeight: "900", letterSpacing: -1.5, color: colors.text, marginTop: 14 },
  tagRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 5 },
  tag: { color: colors.muted, fontSize: 12, fontWeight: "600" },
  authCard: { padding: 20, gap: 13 },
  divider: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 2 },
  dividerLine: { height: 1, backgroundColor: colors.border, flex: 1 },
  dividerText: { color: colors.subtle, fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  stepPills: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12
  },
  stepPill: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    alignItems: "center",
    justifyContent: "center"
  },
  stepPillActive: {
    borderColor: colors.teal,
    backgroundColor: "rgba(84,229,209,0.08)"
  },
  stepPillText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700"
  },
  stepPillTextActive: {
    color: colors.teal,
    fontWeight: "900"
  },
  pinTabs: {
    gap: 8
  },
  pinTab: {
    padding: 10,
    borderRadius: radius.md,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    alignItems: "center"
  },
  pinTabActive: {
    borderColor: colors.teal,
    backgroundColor: "rgba(84,229,209,0.05)"
  },
  pinTabText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800"
  },
  pinTabTextActive: {
    color: colors.teal
  },
  matchBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 6,
    backgroundColor: "rgba(84,229,209,0.1)",
    borderRadius: radius.sm
  },
  matchText: {
    color: colors.teal,
    fontSize: 12,
    fontWeight: "800"
  }
});
