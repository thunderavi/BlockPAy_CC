import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "./src/context/AuthContext";
import RootNavigator from "./src/navigation/RootNavigator";
import { colors } from "./src/constants/theme";

const navigationTheme = { ...DarkTheme, colors: { ...DarkTheme.colors, primary: colors.purple, background: colors.bg, card: colors.bgElevated, text: colors.text, border: colors.border, notification: colors.pink } };
export default function App() {
  return <SafeAreaProvider><AuthProvider><NavigationContainer theme={navigationTheme}><StatusBar style="light" /><RootNavigator /></NavigationContainer></AuthProvider></SafeAreaProvider>;
}
