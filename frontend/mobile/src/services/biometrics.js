import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

const BIOMETRICS_KEY = "blockpay_biometrics_enabled";
const SAVED_PIN_KEY = "blockpay_biometric_pin";

/**
 * Inspect device biometric hardware, enrollment, and sensor type
 */
export async function checkBiometricsStatus() {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();

    let label = "Biometric";
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      label = "Face ID";
    } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      label = "Fingerprint";
    } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      label = "Iris";
    }

    return {
      hasHardware: Boolean(hasHardware),
      isEnrolled: Boolean(isEnrolled),
      isSupported: Boolean(hasHardware && isEnrolled),
      label
    };
  } catch (e) {
    return {
      hasHardware: false,
      isEnrolled: false,
      isSupported: false,
      label: "Biometric",
      error: e.message
    };
  }
}

/**
 * Check if the device hardware supports biometrics and has enrolled prints/faces
 */
export async function isBiometricsSupported() {
  const status = await checkBiometricsStatus();
  return status.isSupported;
}

/**
 * Get human-readable biometric sensor type (Face ID, Fingerprint, Iris)
 */
export async function getBiometricLabel() {
  const status = await checkBiometricsStatus();
  return status.label;
}

/**
 * Get stored preference for biometric authorization
 */
export async function getBiometricPreference() {
  try {
    const val = await AsyncStorage.getItem(BIOMETRICS_KEY);
    return val === "true";
  } catch {
    return false;
  }
}

/**
 * Enable or disable biometric authorization and store PIN in SecureStore
 */
export async function setBiometricPreference(enabled, pin = null) {
  try {
    await AsyncStorage.setItem(BIOMETRICS_KEY, enabled ? "true" : "false");
    if (enabled && pin) {
      try {
        await SecureStore.setItemAsync(SAVED_PIN_KEY, String(pin));
      } catch {
        // Fallback for environments where SecureStore is unavailable
        await AsyncStorage.setItem(SAVED_PIN_KEY, String(pin));
      }
    } else if (!enabled) {
      try {
        await SecureStore.deleteItemAsync(SAVED_PIN_KEY);
      } catch {}
      try {
        await AsyncStorage.removeItem(SAVED_PIN_KEY);
      } catch {}
    }
  } catch (e) {
    console.warn("[Biometrics] Failed to persist preference:", e.message);
  }
}

/**
 * Retrieve saved PIN associated with biometric authorization
 */
export async function getSavedPinForBiometrics() {
  try {
    const pin = await SecureStore.getItemAsync(SAVED_PIN_KEY);
    if (pin) return pin;
  } catch {}
  try {
    return await AsyncStorage.getItem(SAVED_PIN_KEY);
  } catch {
    return null;
  }
}

/**
 * Prompt device biometric sensor (Face ID / Fingerprint)
 */
export async function promptBiometricAuth(reason = "Authorize BlockPay Transfer") {
  try {
    const status = await checkBiometricsStatus();
    if (!status.hasHardware) {
      return { success: false, error: "This device does not have biometric hardware." };
    }
    if (!status.isEnrolled) {
      return {
        success: false,
        error: `No ${status.label} enrolled. Please configure your fingerprint or face in device settings first.`
      };
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: reason,
      cancelLabel: "Cancel",
      fallbackLabel: "Use PIN",
      disableDeviceFallback: false
    });

    if (result.success) {
      const savedPin = await getSavedPinForBiometrics();
      return { success: true, savedPin, label: status.label };
    }
    return { success: false, error: result.error || "Authentication cancelled", label: status.label };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
