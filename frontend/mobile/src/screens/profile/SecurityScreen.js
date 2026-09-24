import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View, Alert, Pressable, Switch, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Button, Card, Header, Message, Screen, SectionTitle, ui } from "../../components/UI";
import { PinDots, PinKeypad } from "../../components/PinInput";
import { colors, radius, shadow } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import {
  checkBiometricsStatus,
  getBiometricPreference,
  setBiometricPreference,
  promptBiometricAuth
} from "../../services/biometrics";

export function SecurityScreen({ navigation }) {
  const { user } = useAuth();
  const [mode, setMode] = useState("overview"); // "overview" | "change_pin" | "setup_biometrics"
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [activeField, setActiveField] = useState("current"); // "current" | "new" | "confirm"

  // Biometrics State
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [bioStatus, setBioStatus] = useState({
    hasHardware: false,
    isEnrolled: false,
    isSupported: false,
    label: "Biometric"
  });
  const [enrollPin, setEnrollPin] = useState("");
  const [checkingBio, setCheckingBio] = useState(true);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Check hardware and saved biometric preference on load
  useEffect(() => {
    async function loadBiometrics() {
      try {
        const [status, pref] = await Promise.all([
          checkBiometricsStatus(),
          getBiometricPreference()
        ]);
        setBioStatus(status);
        setBiometricsEnabled(pref);
      } catch (err) {
        console.warn("Failed loading biometrics:", err);
      } finally {
        setCheckingBio(false);
      }
    }
    loadBiometrics();
  }, []);

  const handleKeypadPress = (digit) => {
    if (mode === "setup_biometrics") {
      if (enrollPin.length < 4) {
        setEnrollPin((prev) => prev + digit);
      }
      return;
    }

    if (activeField === "current") {
      if (currentPin.length < 4) {
        const next = currentPin + digit;
        setCurrentPin(next);
        if (next.length === 4) setActiveField("new");
      }
    } else if (activeField === "new") {
      if (newPin.length < 4) {
        const next = newPin + digit;
        setNewPin(next);
        if (next.length === 4) setActiveField("confirm");
      }
    } else {
      if (confirmPin.length < 4) {
        setConfirmPin(confirmPin + digit);
      }
    }
  };

  const handleBackspace = () => {
    if (mode === "setup_biometrics") {
      if (enrollPin.length > 0) setEnrollPin((prev) => prev.slice(0, -1));
      return;
    }

    if (activeField === "confirm") {
      if (confirmPin.length > 0) setConfirmPin(confirmPin.slice(0, -1));
      else setActiveField("new");
    } else if (activeField === "new") {
      if (newPin.length > 0) setNewPin(newPin.slice(0, -1));
      else setActiveField("current");
    } else {
      if (currentPin.length > 0) setCurrentPin(currentPin.slice(0, -1));
    }
  };

  const handleClear = () => {
    if (mode === "setup_biometrics") {
      setEnrollPin("");
      return;
    }
    if (activeField === "confirm") setConfirmPin("");
    else if (activeField === "new") setNewPin("");
    else setCurrentPin("");
  };

  // Switch Toggle Handler
  const handleBiometricToggle = async (nextVal) => {
    setError("");
    setSuccess("");

    if (!nextVal) {
      // Disabling biometrics
      await setBiometricPreference(false);
      setBiometricsEnabled(false);
      setSuccess(`${bioStatus.label} authentication disabled.`);
      return;
    }

    // Enabling biometrics
    if (!bioStatus.hasHardware) {
      Alert.alert(
        "Biometrics Unavailable",
        "Your device hardware does not support biometric recognition (Face ID or Fingerprint)."
      );
      return;
    }

    if (!bioStatus.isEnrolled) {
      Alert.alert(
        "No Biometrics Enrolled",
        `Please register your ${bioStatus.label} in your device settings first, then turn this on.`
      );
      return;
    }

    // Open PIN confirmation mode to link 4-digit PIN with biometrics
    setEnrollPin("");
    setMode("setup_biometrics");
  };

  // Complete Biometric Enrollment
  const completeBiometricEnrollment = async () => {
    if (enrollPin.length !== 4) {
      setError("Please enter your 4-digit payment PIN to link biometrics.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      // Prompt device biometric sensor
      const promptResult = await promptBiometricAuth(
        `Scan ${bioStatus.label} to link with BlockPay`
      );

      if (!promptResult.success) {
        setError(promptResult.error || "Biometric sensor verification failed.");
        return;
      }

      // Store in secure storage
      await setBiometricPreference(true, enrollPin);
      setBiometricsEnabled(true);
      setEnrollPin("");
      setMode("overview");
      setSuccess(`${bioStatus.label} activated successfully! You can now authorize transfers and unlock with 1 touch.`);
      Alert.alert(
        "Biometrics Activated 🎉",
        `${bioStatus.label} is now linked. You can authorize transactions instantly with biometric verification.`
      );
    } catch (e) {
      setError(e.message || "Failed to link biometrics.");
    } finally {
      setBusy(false);
    }
  };

  // Test Biometric Sensor Directly
  const testBiometricSensor = async () => {
    setError("");
    const res = await promptBiometricAuth(`Test ${bioStatus.label} Sensor`);
    if (res.success) {
      Alert.alert(
        "Sensor Operational ✅",
        `${bioStatus.label} verified successfully! Your biometric sensor is working properly.`
      );
    } else {
      Alert.alert("Authentication Result", res.error || "Biometric verification was not completed.");
    }
  };

  async function submitPinChange() {
    if (currentPin.length !== 4 || newPin.length !== 4 || confirmPin.length !== 4) {
      setError("All PIN fields must be 4 digits.");
      return;
    }
    if (newPin !== confirmPin) {
      setError("New PIN and Confirm PIN do not match.");
      return;
    }

    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await api.changePin({ currentPin, newPin });
      // If biometrics was enabled, update the stored biometric PIN as well!
      if (biometricsEnabled) {
        await setBiometricPreference(true, newPin);
      }
      setSuccess("Payment PIN changed successfully!");
      Alert.alert("Security Update", "Your 4-digit payment PIN has been updated successfully.");
      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");
      setMode("overview");
    } catch (e) {
      setError(e.message || "Failed to change PIN.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Header
        eyebrow="Security & Authorization"
        title="Payment Security"
        subtitle="Manage your 4-digit transaction PIN and biometric authentication."
      />

      {mode === "overview" ? (
        <View style={{ gap: 14 }}>
          {/* Security Status Card */}
          <Card gradient>
            <View style={styles.statusRow}>
              <View style={styles.shieldIconShell}>
                <Ionicons name="shield-checkmark" size={26} color={colors.teal} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.statusTitle}>Wallet Protection Active</Text>
                <Text style={styles.statusCopy}>4-Digit PIN required for all outgoing transfers and payments.</Text>
              </View>
            </View>
          </Card>

          {/* Quick Security Actions */}
          <Card>
            <SectionTitle>PIN & Passcode</SectionTitle>

            <Pressable
              style={({ pressed }) => [styles.actionItem, pressed && styles.actionItemPressed]}
              onPress={() => {
                setError("");
                setSuccess("");
                setMode("change_pin");
              }}
            >
              <View style={styles.itemIcon}>
                <Ionicons name="keypad" size={20} color={colors.purple} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>Change 4-Digit Payment PIN</Text>
                <Text style={styles.itemSubtitle}>Update the security PIN used to authorize transactions</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.subtle} />
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.actionItem, pressed && styles.actionItemPressed]}
              onPress={() => navigation.navigate("ForgotPassword")}
            >
              <View style={styles.itemIcon}>
                <Ionicons name="help-buoy" size={20} color={colors.cyan} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>Forgot Payment PIN?</Text>
                <Text style={styles.itemSubtitle}>Reset using OTP sent to your registered email</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.subtle} />
            </Pressable>
          </Card>

          {/* Biometrics & Fast Pay */}
          <Card>
            <SectionTitle>Biometrics & Fast Pay</SectionTitle>
            <View style={styles.toggleRow}>
              <View style={[styles.itemIcon, biometricsEnabled && styles.itemIconActive]}>
                <Ionicons
                  name={bioStatus.label === "Face ID" ? "scan-outline" : "finger-print"}
                  size={22}
                  color={biometricsEnabled ? colors.teal : colors.muted}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{bioStatus.label} Fast Pay</Text>
                <Text style={styles.itemSubtitle}>
                  {checkingBio
                    ? "Checking sensor availability..."
                    : !bioStatus.hasHardware
                    ? "Sensor unavailable on this device"
                    : !bioStatus.isEnrolled
                    ? `No ${bioStatus.label} enrolled in device settings`
                    : biometricsEnabled
                    ? `Active for 1-touch payment authorization`
                    : `Tap to enable ${bioStatus.label} fast authorization`}
                </Text>
              </View>
              {checkingBio ? (
                <ActivityIndicator size="small" color={colors.teal} />
              ) : (
                <Switch
                  value={biometricsEnabled}
                  onValueChange={handleBiometricToggle}
                  trackColor={{ false: colors.border, true: colors.teal }}
                  thumbColor={colors.white}
                />
              )}
            </View>

            {/* Test Sensor Button if Biometrics Enabled */}
            {biometricsEnabled && (
              <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.borderSoft }}>
                <Button
                  title={`Test ${bioStatus.label} Sensor`}
                  icon={bioStatus.label === "Face ID" ? "scan" : "finger-print"}
                  variant="secondary"
                  onPress={testBiometricSensor}
                />
              </View>
            )}
          </Card>

          {success ? <Message type="success">{success}</Message> : null}
          {error ? <Message>{error}</Message> : null}
        </View>
      ) : mode === "setup_biometrics" ? (
        <Card>
          <View style={styles.changeHeader}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <Ionicons
                name={bioStatus.label === "Face ID" ? "scan-outline" : "finger-print"}
                size={24}
                color={colors.teal}
              />
              <Text style={styles.changeTitle}>Enable {bioStatus.label}</Text>
            </View>
            <Text style={styles.changeSubtitle}>
              Enter your current 4-digit payment PIN to link with {bioStatus.label}.
            </Text>
          </View>

          <View style={[styles.pinStepTabs, { marginVertical: 12 }]}>
            <View style={[styles.pinStepTab, styles.pinStepTabActive]}>
              <Text style={[styles.pinStepLabel, styles.pinStepLabelActive]}>ENTER 4-DIGIT PAYMENT PIN</Text>
              <PinDots length={4} value={enrollPin} />
            </View>
          </View>

          <PinKeypad
            value={enrollPin}
            onKeyPress={handleKeypadPress}
            onBackspace={handleBackspace}
            onClear={handleClear}
          />

          <Message>{error}</Message>

          <View style={[ui.row, { marginTop: 10 }]}>
            <Button
              title="Cancel"
              variant="secondary"
              onPress={() => {
                setEnrollPin("");
                setMode("overview");
              }}
              style={{ flex: 1 }}
            />
            <Button
              title={`Verify & Enable`}
              icon="checkmark-circle"
              onPress={completeBiometricEnrollment}
              loading={busy}
              disabled={enrollPin.length !== 4}
              style={{ flex: 1.6 }}
            />
          </View>
        </Card>
      ) : (
        <Card>
          <View style={styles.changeHeader}>
            <Text style={styles.changeTitle}>Change 4-Digit Payment PIN</Text>
            <Text style={styles.changeSubtitle}>Follow the steps below to set a new security PIN.</Text>
          </View>

          <View style={styles.pinStepTabs}>
            <Pressable
              style={[styles.pinStepTab, activeField === "current" && styles.pinStepTabActive]}
              onPress={() => setActiveField("current")}
            >
              <Text style={[styles.pinStepLabel, activeField === "current" && styles.pinStepLabelActive]}>1. Current PIN</Text>
              <PinDots length={4} value={currentPin} />
            </Pressable>

            <Pressable
              style={[styles.pinStepTab, activeField === "new" && styles.pinStepTabActive]}
              onPress={() => setActiveField("new")}
            >
              <Text style={[styles.pinStepLabel, activeField === "new" && styles.pinStepLabelActive]}>2. New PIN</Text>
              <PinDots length={4} value={newPin} />
            </Pressable>

            <Pressable
              style={[styles.pinStepTab, activeField === "confirm" && styles.pinStepTabActive]}
              onPress={() => setActiveField("confirm")}
            >
              <Text style={[styles.pinStepLabel, activeField === "confirm" && styles.pinStepLabelActive]}>3. Confirm PIN</Text>
              <PinDots length={4} value={confirmPin} error={confirmPin.length === 4 && newPin !== confirmPin} />
            </Pressable>
          </View>

          {newPin.length === 4 && confirmPin.length === 4 && newPin === confirmPin ? (
            <View style={styles.matchedTag}>
              <Ionicons name="checkmark-circle" size={16} color={colors.teal} />
              <Text style={styles.matchedText}>New PIN confirmed!</Text>
            </View>
          ) : null}

          <PinKeypad
            value={activeField === "current" ? currentPin : activeField === "new" ? newPin : confirmPin}
            onKeyPress={handleKeypadPress}
            onBackspace={handleBackspace}
            onClear={handleClear}
          />

          <Message>{error}</Message>

          <View style={[ui.row, { marginTop: 10 }]}>
            <Button
              title="Cancel"
              variant="secondary"
              onPress={() => {
                setCurrentPin("");
                setNewPin("");
                setConfirmPin("");
                setMode("overview");
              }}
              style={{ flex: 1 }}
            />
            <Button
              title="Save New PIN"
              icon="shield-checkmark"
              onPress={submitPinChange}
              loading={busy}
              disabled={currentPin.length !== 4 || newPin.length !== 4 || confirmPin.length !== 4 || newPin !== confirmPin}
              style={{ flex: 1.6 }}
            />
          </View>
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 4
  },
  shieldIconShell: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: "rgba(84,229,209,0.12)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(84,229,209,0.25)"
  },
  statusTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900"
  },
  statusCopy: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft
  },
  actionItemPressed: {
    opacity: 0.7
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8
  },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.bgElevated,
    alignItems: "center",
    justifyContent: "center"
  },
  itemIconActive: {
    backgroundColor: "rgba(84,229,209,0.15)"
  },
  itemTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "800"
  },
  itemSubtitle: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 2
  },
  changeHeader: {
    marginBottom: 6
  },
  changeTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900"
  },
  changeSubtitle: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2
  },
  pinStepTabs: {
    gap: 8,
    marginVertical: 4
  },
  pinStepTab: {
    padding: 8,
    borderRadius: radius.md,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    alignItems: "center"
  },
  pinStepTabActive: {
    borderColor: colors.teal,
    backgroundColor: "rgba(84,229,209,0.06)"
  },
  pinStepLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "800"
  },
  pinStepLabelActive: {
    color: colors.teal
  },
  matchedTag: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 6,
    backgroundColor: "rgba(84,229,209,0.1)",
    borderRadius: radius.sm
  },
  matchedText: {
    color: colors.teal,
    fontSize: 12,
    fontWeight: "800"
  }
});
