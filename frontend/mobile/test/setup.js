const React = require("react");
if (!React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE) {
  React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = {
    H: null,
    A: null,
    T: null,
    S: null,
    actQueue: null,
    asyncTransitions: null,
    isBatchingLegacy: null,
    didScheduleLegacyUpdate: null,
    didUsePromise: null,
    thrownErrors: [],
    getCurrentStack: null,
    recentlyCreatedOwnerStacks: null
  };
}

const mockSecureStoreMap = new Map();
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(async (key) => mockSecureStoreMap.get(key) || null),
  setItemAsync: jest.fn(async (key, val) => { mockSecureStoreMap.set(key, val); }),
  deleteItemAsync: jest.fn(async (key) => { mockSecureStoreMap.delete(key); })
}));

const mockAsyncStorageMap = new Map();
jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key) => mockAsyncStorageMap.get(key) || null),
    setItem: jest.fn(async (key, val) => { mockAsyncStorageMap.set(key, String(val)); }),
    removeItem: jest.fn(async (key) => { mockAsyncStorageMap.delete(key); }),
    clear: jest.fn(async () => { mockAsyncStorageMap.clear(); })
  }
}));
jest.mock("expo-linear-gradient", () => {
  const React = require("react"); const { View } = require("react-native");
  return { LinearGradient: ({ children, ...props }) => React.createElement(View, props, children) };
});
jest.mock("@expo/vector-icons", () => {
  const React = require("react"); const { Text } = require("react-native");
  return { Ionicons: ({ name, ...props }) => React.createElement(Text, props, name) };
});
jest.mock("react-native-qrcode-svg", () => {
  const React = require("react"); const { View } = require("react-native");
  return function MockQr(props) { return React.createElement(View, { testID: "qr-code", ...props }); };
});
jest.mock("expo-local-authentication", () => ({
  hasHardwareAsync: jest.fn(async () => true),
  isEnrolledAsync: jest.fn(async () => true),
  supportedAuthenticationTypesAsync: jest.fn(async () => [1]),
  authenticateAsync: jest.fn(async () => ({ success: true })),
  AuthenticationType: {
    FINGERPRINT: 1,
    FACIAL_RECOGNITION: 2,
    IRIS: 3
  }
}));
