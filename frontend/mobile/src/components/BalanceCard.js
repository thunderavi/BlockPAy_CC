import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, View, Image } from "react-native";
import { colors, gradients, radius, shadow } from "../constants/theme";
import { inr } from "../utils/format";

export default function BalanceCard({ wallet, hidden = false, onToggle }) {
  return (
    <LinearGradient
      colors={gradients.wallet}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.card, shadow.glow]}
    >
      <View style={styles.orbOne} />
      <View style={styles.orbTwo} />
      <View style={styles.top}>
        <View>
          <Text style={styles.kicker}>AVAILABLE BALANCE</Text>
          <Text style={styles.walletType}>BlockPay wallet</Text>
        </View>
        {onToggle ? (
          <Pressable
            accessibilityRole="button"
            onPress={onToggle}
            style={styles.toggle}
          >
            <Ionicons
              name={hidden ? "eye-outline" : "eye-off-outline"}
              size={18}
              color={colors.white}
            />
            <Text style={styles.toggleText}>{hidden ? "Show" : "Hide"}</Text>
          </Pressable>
        ) : null}
      </View>
      <Text style={styles.balance}>
        {hidden ? "INR ••••••" : inr(wallet?.balance)}
      </Text>
      <View style={styles.bottom}>
        <View>
          <Text style={styles.numberLabel}>WALLET NUMBER</Text>
          <Text style={styles.number}>
            {wallet?.walletNumber || "Preparing wallet..."}
          </Text>
        </View>
        <View style={styles.logoShell}>
          <Image
            source={require("../../assets/logo.png")}
            style={styles.cardLogoImg}
            resizeMode="contain"
          />
        </View>
      </View>
    </LinearGradient>
  );
}
const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: 22,
    minHeight: 214,
    overflow: "hidden",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.2)",
  },
  orbOne: {
    position: "absolute",
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: "rgba(255,255,255,.09)",
    right: -55,
    top: -75,
  },
  orbTwo: {
    position: "absolute",
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 24,
    borderColor: "rgba(255,255,255,.06)",
    right: 40,
    bottom: -75,
  },
  top: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  kicker: {
    color: "rgba(255,255,255,.72)",
    fontWeight: "900",
    fontSize: 10,
    letterSpacing: 1.5,
  },
  walletType: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 13,
    marginTop: 5,
  },
  toggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,.14)",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 99,
  },
  toggleText: { color: colors.white, fontSize: 11, fontWeight: "800" },
  balance: {
    color: colors.white,
    fontWeight: "900",
    fontSize: 36,
    letterSpacing: -1.5,
    marginVertical: 18,
  },
  bottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  numberLabel: {
    color: "rgba(255,255,255,.58)",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.3,
  },
  number: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "800",
    marginTop: 5,
    letterSpacing: 1,
  },
  logoShell: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(7,17,31,0.35)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden"
  },
  cardLogoImg: {
    width: 36,
    height: 36
  }
});
