import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StyleSheet, Text, View, Image, ActivityIndicator } from "react-native";
import { colors, shadow } from "../constants/theme";
import { useAuth } from "../context/AuthContext";
import AdminScreen from "../screens/admin/AdminScreen";
import { ForgotPasswordScreen, LoginScreen, RegisterScreen } from "../screens/auth/AuthScreens";
import HomeScreen from "../screens/dashboard/HomeScreen";
import FriendsScreen from "../screens/friends/FriendsScreen";
import NotificationsScreen from "../screens/notifications/NotificationsScreen";
import { ProfileScreen, SettingsScreen } from "../screens/profile/ProfileScreens";
import { SecurityScreen } from "../screens/profile/SecurityScreen";
import RequestsScreen from "../screens/requests/RequestsScreen";
import ScanQrScreen from "../screens/scan/ScanQrScreen";
import SplitBillScreen from "../screens/split/SplitBillScreen";
import { ReceiptScreen, TransactionsScreen, VerifyReceiptScreen } from "../screens/transactions/TransactionScreens";
import { ReceiveScreen, SendMoneyScreen, WalletScreen } from "../screens/wallet/WalletScreens";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const icons = {
  Home: ["home", "home-outline"],
  Wallet: ["wallet", "wallet-outline"],
  Transactions: ["swap-horizontal", "swap-horizontal-outline"],
  Requests: ["receipt", "receipt-outline"],
  Profile: ["person", "person-outline"]
};

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.teal,
        tabBarInactiveTintColor: colors.subtle,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
        tabBarIcon: ({ color, focused }) => (
          <View style={[styles.iconShell, focused && styles.iconActive]}>
            <Ionicons name={icons[route.name][focused ? 0 : 1]} color={color} size={21} />
          </View>
        )
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Wallet" component={WalletScreen} />
      <Tab.Screen name="Transactions" component={TransactionsScreen} />
      <Tab.Screen name="Requests" component={RequestsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const stackOptions = {
  headerStyle: { backgroundColor: colors.bgElevated },
  headerShadowVisible: false,
  headerTintColor: colors.text,
  headerTitleStyle: { fontWeight: "900", fontSize: 17 },
  contentStyle: { backgroundColor: colors.bg }
};

export default function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.opening}>
        <View style={styles.openingLogoShell}>
          <Image
            source={require("../../assets/logo.png")}
            style={styles.openingLogoImg}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.openingTitle}>BlockPay</Text>
        <Text style={styles.openingCopy}>Opening your secure campus wallet…</Text>
        <ActivityIndicator size="small" color={colors.teal} style={{ marginTop: 22 }} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={stackOptions}>
      {user ? (
        <>
          <Stack.Screen name="Main" component={Tabs} options={{ headerShown: false }} />
          <Stack.Screen name="SendMoney" component={SendMoneyScreen} options={{ title: "Send money" }} />
          <Stack.Screen name="Receive" component={ReceiveScreen} options={{ title: "Receive money" }} />
          <Stack.Screen name="ScanQr" component={ScanQrScreen} options={{ title: "Scan QR", headerShown: false }} />
          <Stack.Screen name="Receipt" component={ReceiptScreen} />
          <Stack.Screen name="VerifyReceipt" component={VerifyReceiptScreen} options={{ title: "Verify receipt" }} />
          <Stack.Screen name="SplitBill" component={SplitBillScreen} options={{ title: "Split bill" }} />
          <Stack.Screen name="Friends" component={FriendsScreen} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="Security" component={SecurityScreen} options={{ title: "Security & PIN" }} />
          {user.role === "admin" ? <Stack.Screen name="Admin" component={AdminScreen} /> : null}
        </>
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Register" component={RegisterScreen} options={{ title: "Create account" }} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ title: "Forgot password" }} />
        </>
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: "absolute",
    height: 76,
    paddingTop: 8,
    paddingBottom: 9,
    backgroundColor: "rgba(13,17,36,.98)",
    borderTopColor: colors.border,
    borderTopWidth: 1,
    ...shadow.card
  },
  tabItem: { paddingVertical: 2 },
  tabLabel: { fontSize: 10, fontWeight: "800" },
  iconShell: {
    width: 38,
    height: 30,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center"
  },
  iconActive: { backgroundColor: "rgba(84,229,209,.11)" },
  opening: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center"
  },
  openingLogoShell: {
    width: 120,
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.cyan,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 12
  },
  openingLogoImg: {
    width: 104,
    height: 104
  },
  openingTitle: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.5,
    marginTop: 18
  },
  openingCopy: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 6
  }
});

