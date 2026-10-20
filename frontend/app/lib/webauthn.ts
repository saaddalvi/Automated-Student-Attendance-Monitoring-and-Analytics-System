/**
 * WebAuthn Passkeys Client Utility (Layer 3 Anti-Proxy Defense)
 *
 * Implements hardware-bound biometric authentication (TouchID, FaceID, Windows Hello)
 * using the W3C Web Authentication standard via @simplewebauthn/browser.
 */

import { startRegistration, startAuthentication } from "@simplewebauthn/browser";
import api from "./api";

/**
 * Checks if the current browser and platform support biometrics / passkeys
 */
export async function isPasskeySupported(): Promise<boolean> {
  if (typeof window === "undefined" || !window.PublicKeyCredential) {
    return false;
  }
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

/**
 * Registers a new hardware-bound biometric passkey for the current device
 */
export async function registerBiometricPasskey(): Promise<{ success: boolean; message: string }> {
  try {
    // 1. Fetch challenge and options from backend
    const optionsRes = await api.post("/api/webauthn/register/options");
    const options = optionsRes.data.data;

    // 2. Prompt user for biometric / passkey confirmation via browser dialog
    const regResponse = await startRegistration({ optionsJSON: options });

    // 3. Send signed credential to backend for cryptographic verification
    const verifyRes = await api.post("/api/webauthn/register/verify", {
      response: regResponse,
    });

    return {
      success: true,
      message: verifyRes.data.message || "Biometric passkey bound successfully!",
    };
  } catch (error: unknown) {
    const err = error as { message?: string; response?: { data?: { message?: string } } };
    const msg =
      err.response?.data?.message || err.message || "Failed to register biometric passkey";
    return { success: false, message: msg };
  }
}

/**
 * Performs biometric touch/face scan to produce an assertion signature
 */
export async function authenticateBiometricPasskey(): Promise<{
  success: boolean;
  assertion?: unknown;
  message?: string;
}> {
  try {
    // 1. Get auth challenge from backend
    const optionsRes = await api.post("/api/webauthn/auth/options");
    const options = optionsRes.data.data;

    // 2. Trigger TouchID / FaceID prompt
    const authResponse = await startAuthentication({ optionsJSON: options });

    return {
      success: true,
      assertion: authResponse,
    };
  } catch (error: unknown) {
    const err = error as { message?: string; response?: { data?: { message?: string } } };
    const msg =
      err.response?.data?.message || err.message || "Biometric verification failed";
    return {
      success: false,
      message: msg,
    };
  }
}
