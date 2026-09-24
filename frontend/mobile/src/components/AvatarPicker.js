import React from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { AVATAR_PRESETS, getAvatarPreset } from "../constants/avatars";
import { colors, radius, shadow } from "../constants/theme";

export function AvatarDisplay({ avatarId, size = 64, style }) {
  const preset = getAvatarPreset(avatarId);
  return (
    <LinearGradient
      colors={preset.bg}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.avatarBase,
        { width: size, height: size, borderRadius: size * 0.38 },
        style
      ]}
    >
      <Ionicons name={preset.icon} size={size * 0.52} color={colors.white} />
    </LinearGradient>
  );
}

export function AvatarPicker({ selectedId = "avatar_1", onSelect }) {
  const current = getAvatarPreset(selectedId);

  return (
    <View style={styles.container}>
      {/* Selected Large Preview */}
      <View style={styles.previewContainer}>
        <View style={styles.previewWrapper}>
          <AvatarDisplay avatarId={selectedId} size={80} style={shadow.glow} />
          <View style={styles.checkmarkBadge}>
            <Ionicons name="checkmark" size={14} color={colors.bg} />
          </View>
        </View>
        <Text style={styles.personaTitle}>{current.name} Persona</Text>
        <Text style={styles.personaSubtitle}>Choose your payment identity</Text>
      </View>

      {/* Preset Options Grid / Row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollRow}
      >
        {AVATAR_PRESETS.map((preset) => {
          const isSelected = preset.id === selectedId;
          return (
            <Pressable
              key={preset.id}
              onPress={() => onSelect(preset.id)}
              style={({ pressed }) => [
                styles.itemShell,
                isSelected && styles.itemShellSelected,
                pressed && { transform: [{ scale: 0.95 }] }
              ]}
            >
              <LinearGradient
                colors={preset.bg}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.itemAvatar}
              >
                <Ionicons name={preset.icon} size={22} color={colors.white} />
              </LinearGradient>
              <Text
                style={[styles.itemName, isSelected && { color: colors.teal, fontWeight: "900" }]}
                numberOfLines={1}
              >
                {preset.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
    gap: 12
  },
  previewContainer: {
    alignItems: "center",
    marginBottom: 6
  },
  previewWrapper: {
    position: "relative"
  },
  checkmarkBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.teal,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.panel
  },
  personaTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900",
    marginTop: 8
  },
  personaSubtitle: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2
  },
  scrollRow: {
    paddingHorizontal: 4,
    gap: 12
  },
  itemShell: {
    alignItems: "center",
    padding: 6,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: "transparent",
    gap: 6,
    width: 68
  },
  itemShellSelected: {
    borderColor: colors.teal,
    backgroundColor: "rgba(84,229,209,0.08)"
  },
  itemAvatar: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center"
  },
  itemName: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center"
  }
});
