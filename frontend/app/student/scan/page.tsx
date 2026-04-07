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
} from "lucide-react";
import AuthGuard from "../../components/AuthGuard";
import toast from "react-hot-toast";
import api from "../../lib/api";

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
  const [paused, setPaused] = useState(false);
  const processedRef = useRef(false);

  // Parse the QR value — extract sessionId and token
  const parseQR = (raw: string): { sessionId: string; token: string } | null => {
    try {
      // Try URL format: ...?session=xxx&token=yyy
      const url = new URL(raw, "http://placeholder");
      const sessionId =
        url.searchParams.get("session") || url.searchParams.get("sessionId");
      const token = url.searchParams.get("token");
      if (sessionId && token) return { sessionId, token };

      // Try JSON format: {"sessionId":"...","token":"..."}
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

      // Prevent duplicate processing
      processedRef.current = true;
      setPaused(true);
      setStatus("processing");

      const parsed = parseQR(raw);
      if (!parsed) {
        setStatus("error");
        setErrorMsg("Invalid QR code format");
        toast.error("Invalid QR code format");
        // Allow retry after a delay
        setTimeout(() => {
          processedRef.current = false;
          setPaused(false);
          setStatus("scanning");
        }, 3000);
        return;
      }

      try {
        // Get user from localStorage
        const userStr = localStorage.getItem("user");
        const user = userStr ? JSON.parse(userStr) : null;
        if (!user?.id) {
          setStatus("error");
          setErrorMsg("User session not found");
          return;
        }

        await api.post("/api/attendance", {
          userId: user.id,
          status: "present",
          sessionId: parsed.sessionId,
          token: parsed.token,
        });

        setStatus("success");
        toast.success("Attendance marked successfully!");

        // Redirect after 3 seconds
        setTimeout(() => {
          router.push("/student/dashboard");
        }, 3000);
      } catch (error: unknown) {
        const err = error as { response?: { data?: { message?: string } } };
        const msg = err.response?.data?.message || "Failed to mark attendance";
        setStatus("error");
        setErrorMsg(msg);
        toast.error(msg);

        // Allow retry after delay
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
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <AuthGuard allowedRoles={["student"]}>
      <div className="min-h-screen bg-[#F8FAFC]">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#4F46E5] flex items-center justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <span className="text-lg font-bold text-[#1E293B]">AttendEase</span>
          </div>
        </header>

        <main className="flex items-center justify-center px-6 py-8" style={{ minHeight: "calc(100vh - 65px)" }}>
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

              {/* Scanner area */}
              <div className="relative">
                {status === "idle" ? (
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
                  /* ─── Scanner / Processing / Error states ─── */
                  <>
                    {/* Video feed */}
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

                      {/* Scanning overlay */}
                      {status === "scanning" && (
                        <div className="absolute inset-0 pointer-events-none">
                          {/* Corner brackets */}
                          <div className="absolute top-1/4 left-1/4 w-1/2 h-1/2">
                            <div className="absolute top-0 left-0 w-8 h-8 border-t-3 border-l-3 border-[#4F46E5] rounded-tl-lg" />
                            <div className="absolute top-0 right-0 w-8 h-8 border-t-3 border-r-3 border-[#4F46E5] rounded-tr-lg" />
                            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-3 border-l-3 border-[#4F46E5] rounded-bl-lg" />
                            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-3 border-r-3 border-[#4F46E5] rounded-br-lg" />
                          </div>

                          {/* Scan line animation */}
                          <div className="absolute top-1/4 left-1/4 w-1/2 h-1/2 overflow-hidden">
                            <div className="w-full h-0.5 bg-[#4F46E5] shadow-[0_0_8px_rgba(79,70,229,0.6)] animate-[scanline_2s_ease-in-out_infinite]" />
                          </div>
                        </div>
                      )}

                      {/* Processing overlay */}
                      {status === "processing" && (
                        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
                          <Loader2 size={32} className="text-white animate-spin mb-3" />
                          <p className="text-white text-sm font-medium">
                            Marking attendance…
                          </p>
                        </div>
                      )}

                      {/* Error overlay */}
                      {status === "error" && (
                        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
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

                    {/* Status bar below video */}
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
                        {status === "error" && (
                          <>
                            <div className="w-2 h-2 rounded-full bg-[#F43F5E]" />
                            <span className="text-xs font-medium text-[#F43F5E]">
                              {errorMsg} — retrying…
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

        {/* Scan line keyframe */}
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
