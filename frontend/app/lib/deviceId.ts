/**
 * Device ID utility for device binding security.
 *
 * Generates a persistent device ID on first call and stores it in localStorage.
 * This ID is sent with attendance requests to bind the user's account to a single device,
 * preventing students from logging into friends' accounts to mark attendance.
 */

export const getDeviceId = (): string => {
  if (typeof window === "undefined") return "";

  let deviceId = localStorage.getItem("deviceId");

  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem("deviceId", deviceId);
  }

  return deviceId;
};
