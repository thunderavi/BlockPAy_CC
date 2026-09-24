export const AVATAR_PRESETS = [
  { id: "avatar_1", name: "Scholar", icon: "school", color: "#806BFF", bg: ["#8A73FF", "#5C45E8"] },
  { id: "avatar_2", name: "Developer", icon: "code-slash", color: "#54E5D1", bg: ["#4DDBD1", "#1CA9B4"] },
  { id: "avatar_3", name: "Innovator", icon: "rocket", color: "#FF70A6", bg: ["#FF70A6", "#E83A82"] },
  { id: "avatar_4", name: "Financier", icon: "wallet", color: "#F8C85A", bg: ["#F8C85A", "#E5A024"] },
  { id: "avatar_5", name: "Shield", icon: "shield-checkmark", color: "#57C7FF", bg: ["#57C7FF", "#2E90FA"] },
  { id: "avatar_6", name: "Campus Merchant", icon: "cart", color: "#6AA7FF", bg: ["#6AA7FF", "#4478E6"] },
  { id: "avatar_7", name: "Designer", icon: "color-palette", color: "#B692F6", bg: ["#B692F6", "#7F56D9"] },
  { id: "avatar_8", name: "Explorer", icon: "planet", color: "#32D583", bg: ["#32D583", "#039855"] },
];

export function getAvatarPreset(idOrUrl) {
  if (!idOrUrl) return AVATAR_PRESETS[0];
  const found = AVATAR_PRESETS.find((a) => a.id === idOrUrl);
  if (found) return found;
  return { id: "custom", name: "Custom", icon: "person", color: "#54E5D1", bg: ["#8A73FF", "#54E5D1"], url: idOrUrl };
}
