import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { colors, radius, shadow } from "../constants/theme";

/**
 * Modern 4-Digit Bubble PIN Indicator
 */
export function PinDots({ length = 4, value = "", error = false }) {
  return (
    <View style={styles.dotsRow}>
      {Array.from({ length }).map((_, index) => {
        const isFilled = index < value.length;
        return (
          <View
            key={index}
            style={[
              styles.dotShell,
              isFilled && styles.dotShellFilled,
              error && styles.dotShellError
            ]}
          >
            {isFilled ? (
              <LinearGradient
                colors={error ? [colors.danger, "#FF4055"] : ["#54E5D1", "#806BFF"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.dotFilled}
              />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

/**
 * Full PhonePe/GPay-Style Numeric PIN Keypad
 */
export function PinKeypad({ onKeyPress, onBackspace, onClear, maxLength = 4, value = "" }) {
  const handlePress = (num) => {
    if (value.length < maxLength) {
      onKeyPress(num);
    }
  };

  const keys = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    ["clear", "0", "back"]
  ];

  return (
    <View style={styles.keypad}>
      {keys.map((row, rowIdx) => (
        <View key={rowIdx} style={styles.keypadRow}>
          {row.map((k) => {
            if (k === "clear") {
              return (
                <Pressable
                  key={k}
                  style={({ pressed }) => [styles.keyBtn, pressed && styles.keyBtnPressed]}
                  onPress={onClear}
                >
                  <Text style={styles.keyActionText}>CLEAR</Text>
                </Pressable>
              );
            }
            if (k === "back") {
              return (
                <Pressable
                  key={k}
                  style={({ pressed }) => [styles.keyBtn, pressed && styles.keyBtnPressed]}
                  onPress={onBackspace}
                >
                  <Ionicons name="backspace-outline" size={24} color={colors.text} />
                </Pressable>
              );
            }
            return (
              <Pressable
                key={k}
                style={({ pressed }) => [styles.keyBtn, pressed && styles.keyBtnPressed]}
                onPress={() => handlePress(k)}
              >
                <Text style={styles.keyDigitText}>{k}</Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 18,
    marginVertical: 14
  },
  dotShell: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.04)",
    alignItems: "center",
    justifyContent: "center"
  },
  dotShellFilled: {
    borderColor: colors.teal,
    ...shadow.glow
  },
  dotShellError: {
    borderColor: colors.danger
  },
  dotFilled: {
    width: 12,
    height: 12,
    borderRadius: 6
  },
  keypad: {
    width: "100%",
    maxWidth: 320,
    alignSelf: "center",
    marginTop: 10,
    gap: 12
  },
  keypadRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 14
  },
  keyBtn: {
    flex: 1,
    height: 62,
    borderRadius: radius.md,
    backgroundColor: colors.panelSoft,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    alignItems: "center",
    justifyContent: "center"
  },
  keyBtnPressed: {
    backgroundColor: colors.panelHighlight,
    transform: [{ scale: 0.96 }]
  },
  keyDigitText: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "800"
  },
  keyActionText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1
  }
});
