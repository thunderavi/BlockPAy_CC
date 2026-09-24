import {
  checkBiometricsStatus,
  getBiometricPreference,
  setBiometricPreference,
  getSavedPinForBiometrics,
  promptBiometricAuth
} from "../src/services/biometrics";

describe("Biometrics Service", () => {
  beforeEach(async () => {
    await setBiometricPreference(false);
  });

  test("checks biometric status correctly with mock hardware", async () => {
    const status = await checkBiometricsStatus();
    expect(status.hasHardware).toBe(true);
    expect(status.isEnrolled).toBe(true);
    expect(status.isSupported).toBe(true);
    expect(status.label).toBe("Fingerprint");
  });

  test("persists biometric preference and saved PIN", async () => {
    expect(await getBiometricPreference()).toBe(false);

    await setBiometricPreference(true, "4321");
    expect(await getBiometricPreference()).toBe(true);
    expect(await getSavedPinForBiometrics()).toBe("4321");

    await setBiometricPreference(false);
    expect(await getBiometricPreference()).toBe(false);
    expect(await getSavedPinForBiometrics()).toBeNull();
  });

  test("prompts biometric authentication and retrieves saved PIN", async () => {
    await setBiometricPreference(true, "9876");

    const authResult = await promptBiometricAuth("Test Reason");
    expect(authResult.success).toBe(true);
    expect(authResult.savedPin).toBe("9876");
    expect(authResult.label).toBe("Fingerprint");
  });
});
