"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  XCircle,
  Loader2,
  ScanLine,
  ShieldAlert,
  Clock,
  RefreshCw,
  Wifi,
  Fingerprint,
} from "lucide-react";
import AuthGuard from "../../components/AuthGuard";
import toast from "react-hot-toast";
import api from "../../lib/api";
import { getDevicePayload } from "../../lib/deviceId";
import { authenticateBiometricPasskey } from "../../lib/webauthn";

// Dynamic import — QR scanner uses browser APIs that break SSR
const Scanner = dynamic(
  () => import("@yudiel/react-qr-scanner").then((m) => m.Scanner),
  { ssr: false }
);

// ─── Types ────────────────────────────────────────────────────────────────────

type ScanStatus = "idle" | "scanning" | "processing" | "success" | "error";

// ─── Component ────────────────────────────────────────────────────────────────

export default function ScanPage() {
  const router = useRouter();
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const processedRef = useRef(false);

  // Parse the QR value — extract sessionId and token
  const parseQR = (raw: string): { sessionId: string; token: string } | null => {
    try {
      const url = new URL(raw, "http://placeholder");
      const sessionId =
        url.searchParams.get("session") || url.searchParams.get("sessionId");
      const token = url.searchParams.get("token");
      if (sessionId && token) return { sessionId, token };

      const json = JSON.parse(raw);
      if (json.sessionId && json.token)
        return { sessionId: json.sessionId, token: json.token };
    } catch {
      // ignore parsing errors
    }
    return null;
  };

  const handleScan = useCallback(
    async (detectedCodes: { rawValue: string }[]) => {
      if (processedRef.current) return;
      if (!detectedCodes || detectedCodes.length === 0) return;

      const raw = detectedCodes[0].rawValue;
      if (!raw) return;

      processedRef.current = true;
      setPaused(true);
      setStatus("processing");
      setErrorCode(null);

      const parsed = parseQR(raw);
      if (!parsed) {
        setStatus("error");
        setErrorMsg("Invalid QR code format");
        toast.error("Invalid QR code format");
        setTimeout(() => {
          processedRef.current = false;
          setPaused(false);
          setStatus("scanning");
        }, 3000);
        return;
      }

      try {
        const userStr = localStorage.getItem("user");
        const user = userStr ? JSON.parse(userStr) : null;
        if (!user?.id) {
          setStatus("error");
          setErrorMsg("User session not found");
          return;
        }

        const devicePayload = await getDevicePayload();

        const postAttendance = async (webauthnAssertion?: unknown) => {
          return await api.post("/api/attendance", {
            userId: user.id,
            status: "present",
            sessionId: parsed.sessionId,
            token: parsed.token,
            deviceId: devicePayload.deviceId,
            fingerprintHash: devicePayload.fingerprintHash,
            webauthnAssertion,
          });
        };

        try {
          await postAttendance();
        } catch (firstErr: unknown) {
          const err = firstErr as { response?: { status?: number; data?: { message?: string; code?: string } } };
          if (err.response?.data?.code === "WEBAUTHN_REQUIRED") {
            toast("Biometric verification required. Touch sensor to verify...", { icon: "👆" });
            const bioRes = await authenticateBiometricPasskey();
            if (bioRes.success && bioRes.assertion) {
              await postAttendance(bioRes.assertion);
            } else {
              throw new Error(bioRes.message || "Biometric authentication required.");
            }
          } else {
            throw firstErr;
          }
        }

        setStatus("success");
        toast.success("Attendance marked successfully!");

        setTimeout(() => {
          router.push("/student/dashboard");
        }, 2500);
      } catch (error: unknown) {
        const err = error as { response?: { status?: number; data?: { message?: string; code?: string } }; message?: string };
        const msg = err.response?.data?.message || err.message || "Failed to mark attendance";
        const code = err.response?.data?.code || null;
        const statusCode = err.response?.status;

        setStatus("error");
        setErrorMsg(msg);
        setErrorCode(code);
        toast.error(msg);

        // If device mismatch / forbidden (403), stop auto-retrying and show mismatch UI
        if (statusCode === 403 || code) {
          return;
        }

        // Allow retry after delay for transient errors
        setTimeout(() => {
          processedRef.current = false;
          setPaused(false);
          setStatus("scanning");
        }, 3000);
      }
    },
    [router]
  );

  const startScanning = () => {
    setStatus("scanning");
    setPaused(false);
    processedRef.current = false;
    setErrorMsg("");
    setErrorCode(null);
  };

  return (
    <AuthGuard allowedRoles={["student"]}>
      <div className="min-h-screen bg-[#F8FAFC]">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#4F46E5] flex items-center justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <span className="text-lg font-bold text-[#1E293B]">AttendEase</span>
          </div>
        </header>

        <main className="flex items-center justify-center px-4 sm:px-6 py-6 sm:py-8" style={{ minHeight: "calc(100vh - 65px)" }}>
          <div className="w-full max-w-md">
            {/* Back link */}
            <button
              onClick={() => router.push("/student/dashboard")}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#64748B] hover:text-[#4F46E5] transition-colors duration-150 mb-6 cursor-pointer"
            >
              <ArrowLeft size={16} />
              Back to Dashboard
            </button>

            {/* Card */}
            <div className="bg-white rounded-2xl shadow-md border border-gray-50 overflow-hidden">
              {/* Title bar */}
              <div className="p-6 pb-4">
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-11 h-11 rounded-xl bg-[#4F46E5]/10 text-[#4F46E5] flex items-center justify-center">
                    <Camera size={22} />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-[#1E293B]">
                      Give Attendance
                    </h1>
                    <p className="text-sm text-[#94A3B8]">
                      Scan the QR code shown by your teacher
                    </p>
                  </div>
                </div>
              </div>

              {/* Scanner or Mismatch Screen Area */}
              <div className="relative">
                {/* ─── Dedicated Mismatch & Security Failure Screen ─── */}
                {status === "error" && (errorCode === "DEVICE_MISMATCH" || errorCode === "DEVICE_NOT_BOUND" || errorCode === "RESET_PENDING" || errorCode === "IP_MISMATCH" || errorCode === "WEBAUTHN_FAILED" || errorCode === "WEBAUTHN_REQUIRED") ? (
                  <div className="p-6 sm:p-8 flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mb-4">
                      {errorCode === "RESET_PENDING" ? (
                        <Clock size={32} />
                      ) : errorCode === "IP_MISMATCH" ? (
                        <Wifi size={32} />
                      ) : errorCode === "WEBAUTHN_FAILED" || errorCode === "WEBAUTHN_REQUIRED" ? (
                        <Fingerprint size={32} />
                      ) : (
                        <ShieldAlert size={32} />
                      )}
                    </div>

                    <h2 className="text-lg font-bold text-[#1E293B] mb-2">
                      {errorCode === "DEVICE_MISMATCH" && "Device & Fingerprint Mismatch"}
                      {errorCode === "DEVICE_NOT_BOUND" && "Device Not Bound"}
                      {errorCode === "RESET_PENDING" && "Reset Request Under Review"}
                      {errorCode === "IP_MISMATCH" && "Classroom Wi-Fi Network Required"}
                      {(errorCode === "WEBAUTHN_FAILED" || errorCode === "WEBAUTHN_REQUIRED") && "Biometric Verification Required"}
                    </h2>

                    <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed mb-6">
                      {errorCode === "DEVICE_MISMATCH" &&
                        "This device hardware or browser fingerprint does not match your registered device. To prevent proxy attendance, attendance can only be marked from your primary phone. If you changed devices, please request a device reset."}
                      {errorCode === "DEVICE_NOT_BOUND" &&
                        "Your account has not been bound to a verified device yet. Please log out and sign in from your primary phone."}
                      {errorCode === "RESET_PENDING" &&
                        "Your device reset request is currently awaiting teacher approval. Once approved, you will have 24 hours to bind this device."}
                      {errorCode === "IP_MISMATCH" &&
                        "Your teacher has enabled Classroom Network Verification. You must be connected to the classroom Wi-Fi network where the session was created."}
                      {(errorCode === "WEBAUTHN_FAILED" || errorCode === "WEBAUTHN_REQUIRED") &&
                        "Your account is protected by hardware biometric passkeys. Please scan using TouchID or FaceID to verify physical presence."}
                    </p>

                    <div className="w-full space-y-2.5">
                      {errorCode === "DEVICE_MISMATCH" && (
                        <button
                          onClick={() => router.push("/student/dashboard")}
                          className="w-full flex items-center justify-center gap-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white text-sm font-semibold py-3 px-4 rounded-xl shadow-md transition-all cursor-pointer"
                        >
                          <RefreshCw size={16} />
                          Go to Dashboard & Request Reset
                        </button>
                      )}

                      <button
                        onClick={startScanning}
                        className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-[#1E293B] text-sm font-medium py-3 px-4 rounded-xl transition-all cursor-pointer"
                      >
                        Try Scanning Again
                      </button>
                    </div>
                  </div>
                ) : status === "idle" ? (
                  /* ─── Start state ─── */
                  <div className="flex flex-col items-center justify-center py-16 px-6">
                    <div className="w-20 h-20 rounded-2xl bg-[#4F46E5]/5 flex items-center justify-center mb-5">
                      <ScanLine size={36} className="text-[#4F46E5]/50" />
                    </div>
                    <p className="text-sm text-[#64748B] text-center mb-6">
                      Point your camera at the QR code displayed on the teacher&apos;s screen
                    </p>
                    <button
                      onClick={startScanning}
                      className="flex items-center gap-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white text-sm font-semibold px-6 py-3 rounded-xl shadow-lg shadow-[#4F46E5]/25 transition-all duration-150 cursor-pointer"
                    >
                      <Camera size={16} />
                      Start Scanner
                    </button>
                  </div>
                ) : status === "success" ? (
                  /* ─── Success state ─── */
                  <div className="flex flex-col items-center justify-center py-16 px-6">
                    <div className="w-20 h-20 rounded-full bg-[#10B981]/10 flex items-center justify-center mb-5 animate-pulse">
                      <CheckCircle2 size={40} className="text-[#10B981]" />
                    </div>
                    <h2 className="text-lg font-bold text-[#1E293B] mb-1">
                      Attendance Marked!
                    </h2>
                    <p className="text-sm text-[#64748B] text-center">
                      Redirecting to dashboard…
                    </p>
                  </div>
                ) : (
                  /* ─── Scanner Feed ─── */
                  <>
                    <div className="relative aspect-square bg-black">
                      <Scanner
                        onScan={handleScan}
                        paused={paused}
                        constraints={{ facingMode: "environment" }}
                        allowMultiple={false}
                        scanDelay={1000}
                        styles={{
                          container: { width: "100%", height: "100%" },
                          video: { width: "100%", height: "100%", objectFit: "cover" as const },
                        }}
                      />

                      {status === "scanning" && (
                        <div className="absolute inset-0 pointer-events-none">
                          <div className="absolute top-1/4 left-1/4 w-1/2 h-1/2">
                            <div className="absolute top-0 left-0 w-8 h-8 border-t-3 border-l-3 border-[#4F46E5] rounded-tl-lg" />
                            <div className="absolute top-0 right-0 w-8 h-8 border-t-3 border-r-3 border-[#4F46E5] rounded-tr-lg" />
                            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-3 border-l-3 border-[#4F46E5] rounded-bl-lg" />
                            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-3 border-r-3 border-[#4F46E5] rounded-br-lg" />
                          </div>

                          <div className="absolute top-1/4 left-1/4 w-1/2 h-1/2 overflow-hidden">
                            <div className="w-full h-0.5 bg-[#4F46E5] shadow-[0_0_8px_rgba(79,70,229,0.6)] animate-[scanline_2s_ease-in-out_infinite]" />
                          </div>
                        </div>
                      )}

                      {status === "processing" && (
                        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
                          <Loader2 size={32} className="text-white animate-spin mb-3" />
                          <p className="text-white text-sm font-medium">
                            Marking attendance…
                          </p>
                        </div>
                      )}

                      {status === "error" && (
                        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center p-6 text-center">
                          <XCircle size={32} className="text-[#F43F5E] mb-3" />
                          <p className="text-white text-sm font-medium mb-1">
                            {errorMsg}
                          </p>
                          <p className="text-white/60 text-xs">
                            Retrying in a moment…
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="px-6 py-4 bg-[#F8FAFC] border-t border-gray-100">
                      <div className="flex items-center gap-2">
                        {status === "scanning" && (
                          <>
                            <div className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
                            <span className="text-xs font-medium text-[#64748B]">
                              Camera active — position QR code in frame
                            </span>
                          </>
                        )}
                        {status === "processing" && (
                          <>
                            <Loader2 size={12} className="text-[#4F46E5] animate-spin" />
                            <span className="text-xs font-medium text-[#64748B]">
                              Verifying QR code…
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </main>

        <style jsx>{`
          @keyframes scanline {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(calc(100% * 2)); }
          }
        `}</style>
      </div>
    </AuthGuard>
  );
}
