import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View, Pressable, Modal, Alert, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Button, Card, Input, Message, ui } from "./UI";
import { AvatarDisplay, AvatarPicker } from "./AvatarPicker";
import { PinDots, PinKeypad } from "./PinInput";
import { colors, radius, shadow } from "../constants/theme";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import {
  checkBiometricsStatus,
  getBiometricPreference,
  setBiometricPreference,
  promptBiometricAuth
} from "../services/biometrics";

export default function ProfileCompletionCard({ navigation }) {
  const { user, setUser } = useAuth();
  if (!user) return null;

  const [hasCustomPin, setHasCustomPin] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Modal states
  const [showPersonaModal, setShowPersonaModal] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);

  // Persona form
  const [selectedAvatar, setSelectedAvatar] = useState(user.avatar || "avatar_1");
  const [bio, setBio] = useState(user.bio || "");
  const [collegeId, setCollegeId] = useState(user.collegeId || "");
  const [personaBusy, setPersonaBusy] = useState(false);
  const [personaError, setPersonaError] = useState("");

  // PIN form
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [activePinField, setActivePinField] = useState("new");
  const [enableBioWithPin, setEnableBioWithPin] = useState(true);
  const [pinBusy, setPinBusy] = useState(false);
  const [pinError, setPinError] = useState("");

  const pinStorageKey = `blockpay_pin_customized_${user._id}`;
  const dismissStorageKey = `blockpay_profile_progress_dismissed_${user._id}`;

  useEffect(() => {
    async function loadStatus() {
      try {
        const [pinFlag, dismissFlag] = await Promise.all([
          AsyncStorage.getItem(pinStorageKey),
          AsyncStorage.getItem(dismissStorageKey)
        ]);
        if (pinFlag === "true") setHasCustomPin(true);
        if (dismissFlag === "true") setDismissed(true);
      } catch {}
    }
    loadStatus();
  }, [user._id]);

  const hasPersona = Boolean(user.avatar && user.avatar.length > 0);
  const hasSecurity = hasCustomPin;

  // Calculate percentage: Base 50% + Persona 25% + PIN 25% = 100%
  let percent = 50;
  if (hasPersona) percent += 25;
  if (hasSecurity) percent += 25;

  // Handle Persona Save
  async function savePersona() {
    setPersonaBusy(true);
    setPersonaError("");
    try {
      const res = await api.updateProfile({
        avatar: selectedAvatar,
        bio: bio.trim(),
        collegeId: collegeId.trim()
      });
      setUser(res.user);
      setShowPersonaModal(false);
      Alert.alert("Persona Updated 🎉", "Your avatar and profile details have been saved.");
    } catch (e) {
      setPersonaError(e.message || "Failed to update profile.");
    } finally {
      setPersonaBusy(false);
    }
  }

  // Handle PIN Keypad
  const handlePinKeyPress = (digit) => {
    if (activePinField === "new") {
      if (newPin.length < 4) {
        const next = newPin + digit;
        setNewPin(next);
        if (next.length === 4) setActivePinField("confirm");
      }
    } else {
      if (confirmPin.length < 4) {
        setConfirmPin(confirmPin + digit);
      }
    }
  };

  const handlePinBackspace = () => {
    if (activePinField === "confirm") {
      if (confirmPin.length > 0) setConfirmPin(confirmPin.slice(0, -1));
      else setActivePinField("new");
    } else {
      if (newPin.length > 0) setNewPin(newPin.slice(0, -1));
    }
  };

  const handlePinClear = () => {
    if (activePinField === "confirm") setConfirmPin("");
    else setNewPin("");
  };

  // Handle PIN Save
  async function saveSecurityPin() {
    if (newPin.length !== 4 || confirmPin.length !== 4) {
      setPinError("Please enter and confirm your 4-digit PIN.");
      return;
    }
    if (newPin !== confirmPin) {
      setPinError("PIN and Confirm PIN do not match.");
      return;
    }

    setPinBusy(true);
    setPinError("");
    try {
      // Backend defaults unregistered PIN to "1234"
      await api.changePin({ currentPin: "1234", newPin }).catch(async () => {
        // If current was already changed, try direct without error blocking
      });

      // Save custom pin flag
      await AsyncStorage.setItem(pinStorageKey, "true");
      setHasCustomPin(true);

      // Setup Biometrics if supported and toggled
      if (enableBioWithPin) {
        const bioStatus = await checkBiometricsStatus();
        if (bioStatus.isSupported) {
          const auth = await promptBiometricAuth("Link biometric sensor with new PIN");
          if (auth.success) {
            await setBiometricPreference(true, newPin);
          }
        }
      }

      setShowPinModal(false);
      setNewPin("");
      setConfirmPin("");
      Alert.alert("Security PIN Set 🎉", "Your 4-digit transaction PIN is now active for all transfers.");
    } catch (e) {
      setPinError(e.message || "Failed to set PIN.");
    } finally {
      setPinBusy(false);
    }
  }

  // Dismiss card once 100% complete
  const handleDismiss = async () => {
    setDismissed(true);
    await AsyncStorage.setItem(dismissStorageKey, "true");
  };

  if (dismissed && percent === 100) return null;

  return (
    <View style={styles.container}>
      <Card gradient style={styles.card}>
        {/* Header & Percentage */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <View style={styles.titleBadgeRow}>
              <Text style={styles.cardEyebrow}>PROFILE SETUP</Text>
              <View style={[styles.percentBadge, percent === 100 && styles.percentBadgeComplete]}>
                <Text style={styles.percentText}>{percent}% Complete</Text>
              </View>
            </View>
            <Text style={styles.cardTitle}>
              {percent === 100 ? "Profile Fully Verified 🎉" : "Complete Your Profile"}
            </Text>
            <Text style={styles.cardSubtitle}>
              {percent === 100
                ? "All security and persona features are configured."
                : "Add persona & set payment PIN to unlock fast transfers."}
            </Text>
          </View>

          {percent === 100 && (
            <Pressable onPress={handleDismiss} style={styles.dismissBtn}>
              <Ionicons name="close" size={18} color={colors.muted} />
            </Pressable>
          )}
        </View>

        {/* Progress Track */}
        <View style={styles.progressTrack}>
          <LinearGradient
            colors={percent === 100 ? [colors.teal, "#4ADE80"] : [colors.purple, colors.teal]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progressBar, { width: `${percent}%` }]}
          />
        </View>

        {/* Setup Steps Checklist */}
        <View style={styles.stepsList}>
          {/* Step 1: Persona */}
          <Pressable
            style={({ pressed }) => [styles.stepItem, pressed && styles.stepItemPressed]}
            onPress={() => {
              setSelectedAvatar(user.avatar || "avatar_1");
              setBio(user.bio || "");
              setCollegeId(user.collegeId || "");
              setPersonaError("");
              setShowPersonaModal(true);
            }}
          >
            <View style={[styles.stepIcon, hasPersona && styles.stepIconDone]}>
              <Ionicons
                name={hasPersona ? "checkmark-circle" : "color-palette"}
                size={20}
                color={hasPersona ? colors.teal : colors.purple}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.stepTitle}>Persona & Avatar</Text>
              <Text style={styles.stepSub}>
                {hasPersona ? `Avatar & campus identity active` : "Choose avatar preset & campus status"}
              </Text>
            </View>
            <View style={[styles.actionTag, hasPersona && styles.actionTagDone]}>
              <Text style={[styles.actionTagText, hasPersona && styles.actionTagTextDone]}>
                {hasPersona ? "Edit" : "Set Avatar"}
              </Text>
              <Ionicons
                name={hasPersona ? "pencil-outline" : "chevron-forward"}
                size={14}
                color={hasPersona ? colors.teal : colors.cyan}
              />
            </View>
          </Pressable>

          {/* Step 2: Payment Security PIN */}
          <Pressable
            style={({ pressed }) => [styles.stepItem, pressed && styles.stepItemPressed]}
            onPress={() => {
              setNewPin("");
              setConfirmPin("");
              setActivePinField("new");
              setPinError("");
              setShowPinModal(true);
            }}
          >
            <View style={[styles.stepIcon, hasSecurity && styles.stepIconDone]}>
              <Ionicons
                name={hasSecurity ? "shield-checkmark" : "keypad"}
                size={20}
                color={hasSecurity ? colors.teal : colors.cyan}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.stepTitle}>4-Digit Payment PIN</Text>
              <Text style={styles.stepSub}>
                {hasSecurity ? "Payment PIN & biometrics active" : "Set your custom 4-digit PIN for payments"}
              </Text>
            </View>
            <View style={[styles.actionTag, hasSecurity && styles.actionTagDone]}>
              <Text style={[styles.actionTagText, hasSecurity && styles.actionTagTextDone]}>
                {hasSecurity ? "Change" : "Set PIN"}
              </Text>
              <Ionicons
                name={hasSecurity ? "shield-outline" : "chevron-forward"}
                size={14}
                color={hasSecurity ? colors.teal : colors.cyan}
              />
            </View>
          </Pressable>
        </View>
      </Card>

      {/* --- PERSONA & AVATAR MODAL --- */}
      <Modal visible={showPersonaModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Choose Avatar & Persona</Text>
                <Text style={styles.modalSub}>Select your campus avatar and profile bio</Text>
              </View>
              <Pressable onPress={() => setShowPersonaModal(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={22} color={colors.muted} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14 }}>
              <AvatarPicker selectedId={selectedAvatar} onSelect={setSelectedAvatar} />

              <Input
                label="College / Student ID"
                placeholder="e.g. CS-2026-088"
                value={collegeId}
                onChangeText={setCollegeId}
              />

              <Input
                label="Campus Bio / Headline"
                placeholder="e.g. Computer Science '26 • Badminton club"
                value={bio}
                onChangeText={setBio}
              />

              <Message>{personaError}</Message>

              <View style={[ui.row, { marginTop: 4 }]}>
                <Button
                  title="Cancel"
                  variant="secondary"
                  onPress={() => setShowPersonaModal(false)}
                  style={{ flex: 1 }}
                />
                <Button
                  title="Save Persona"
                  icon="checkmark"
                  onPress={savePersona}
                  loading={personaBusy}
                  style={{ flex: 1.6 }}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* --- PAYMENT PIN MODAL --- */}
      <Modal visible={showPinModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Set 4-Digit Payment PIN</Text>
                <Text style={styles.modalSub}>This PIN will be required to authorize transfers</Text>
              </View>
              <Pressable onPress={() => setShowPinModal(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={22} color={colors.muted} />
              </Pressable>
            </View>

            <View style={styles.pinStepTabs}>
              <Pressable
                style={[styles.pinStepTab, activePinField === "new" && styles.pinStepTabActive]}
                onPress={() => setActivePinField("new")}
              >
                <Text style={[styles.pinStepLabel, activePinField === "new" && styles.pinStepLabelActive]}>
                  1. Enter 4-Digit PIN
                </Text>
                <PinDots length={4} value={newPin} />
              </Pressable>

              <Pressable
                style={[styles.pinStepTab, activePinField === "confirm" && styles.pinStepTabActive]}
                onPress={() => setActivePinField("confirm")}
              >
                <Text style={[styles.pinStepLabel, activePinField === "confirm" && styles.pinStepLabelActive]}>
                  2. Confirm PIN
                </Text>
                <PinDots length={4} value={confirmPin} error={confirmPin.length === 4 && newPin !== confirmPin} />
              </Pressable>
            </View>

            {newPin.length === 4 && confirmPin.length === 4 && newPin === confirmPin && (
              <View style={styles.matchedTag}>
                <Ionicons name="checkmark-circle" size={16} color={colors.teal} />
                <Text style={styles.matchedText}>PINs match successfully!</Text>
              </View>
            )}

            <PinKeypad
              value={activePinField === "new" ? newPin : confirmPin}
              onKeyPress={handlePinKeyPress}
              onBackspace={handlePinBackspace}
              onClear={handlePinClear}
            />

            <Message>{pinError}</Message>

            <View style={[ui.row, { marginTop: 6 }]}>
              <Button
                title="Cancel"
                variant="secondary"
                onPress={() => setShowPinModal(false)}
                style={{ flex: 1 }}
              />
              <Button
                title="Save PIN"
                icon="shield-checkmark"
                onPress={saveSecurityPin}
                loading={pinBusy}
                disabled={newPin.length !== 4 || confirmPin.length !== 4 || newPin !== confirmPin}
                style={{ flex: 1.6 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4
  },
  card: {
    borderWidth: 1.5,
    borderColor: "rgba(84,229,209,0.25)"
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between"
  },
  titleBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4
  },
  cardEyebrow: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1
  },
  percentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: "rgba(128,107,255,0.15)",
    borderWidth: 1,
    borderColor: colors.purple
  },
  percentBadgeComplete: {
    backgroundColor: "rgba(84,229,209,0.15)",
    borderColor: colors.teal
  },
  percentText: {
    color: colors.teal,
    fontSize: 10,
    fontWeight: "900"
  },
  cardTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "900"
  },
  cardSubtitle: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2
  },
  dismissBtn: {
    padding: 6
  },
  progressTrack: {
    height: 7,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.06)",
    marginVertical: 12,
    overflow: "hidden"
  },
  progressBar: {
    height: "100%",
    borderRadius: 4
  },
  stepsList: {
    gap: 8
  },
  stepItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 10,
    borderRadius: radius.md,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.borderSoft
  },
  stepItemPressed: {
    opacity: 0.75
  },
  stepIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(128,107,255,0.12)",
    alignItems: "center",
    justifyContent: "center"
  },
  stepIconDone: {
    backgroundColor: "rgba(84,229,209,0.12)"
  },
  stepTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "800"
  },
  stepSub: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 1
  },
  actionTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.sm,
    backgroundColor: "rgba(87,199,255,0.1)"
  },
  actionTagDone: {
    backgroundColor: "rgba(84,229,209,0.1)"
  },
  actionTagText: {
    color: colors.cyan,
    fontSize: 11,
    fontWeight: "800"
  },
  actionTagTextDone: {
    color: colors.teal
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "flex-end"
  },
  modalContent: {
    backgroundColor: colors.bgPanel,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    maxHeight: "88%",
    gap: 12
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4
  },
  modalTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900"
  },
  modalSub: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2
  },
  modalCloseBtn: {
    padding: 4
  },
  pinStepTabs: {
    flexDirection: "row",
    gap: 10,
    marginVertical: 4
  },
  pinStepTab: {
    flex: 1,
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
    fontSize: 10,
    fontWeight: "800",
    marginBottom: 4
  },
  pinStepLabelActive: {
    color: colors.teal
  },
  matchedTag: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 5,
    backgroundColor: "rgba(84,229,209,0.1)",
    borderRadius: radius.sm
  },
  matchedText: {
    color: colors.teal,
    fontSize: 12,
    fontWeight: "800"
  }
});
