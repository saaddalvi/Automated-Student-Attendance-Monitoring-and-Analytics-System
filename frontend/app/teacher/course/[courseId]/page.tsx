"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowLeft,
  QrCode,
  ChevronDown,
  Download,
  Timer,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import AuthGuard from "../../../components/AuthGuard";
import api from "../../../lib/api";
import toast from "react-hot-toast";

// ─── Mock Data (courses/lectures remain client-side for now) ──────────────────

const coursesMap: Record<string, { name: string; code: string }> = {
  "1": { name: "Web Development", code: "CS101" },
  "2": { name: "Database Systems", code: "CS202" },
  "3": { name: "Operating Systems", code: "CS303" },
};

const lectures = ["Lecture 1", "Lecture 2", "Lecture 3", "Lecture 4", "Lecture 5"];

const durationOptions = [
  { label: "30 sec", value: 30 },
  { label: "1 min", value: 60 },
  { label: "2 min", value: 120 },
];

const mockStudents = [
  { id: 1, name: "Rahul Sharma", status: "present" },
  { id: 2, name: "Amit Patel", status: "absent" },
  { id: 3, name: "Priya Singh", status: "present" },
  { id: 4, name: "Neha Gupta", status: "present" },
  { id: 5, name: "Vikram Joshi", status: "absent" },
  { id: 6, name: "Sneha Reddy", status: "present" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ─── Page Component ───────────────────────────────────────────────────────────

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;
  const course = coursesMap[courseId];

  // Form state
  const [selectedLecture, setSelectedLecture] = useState("");
  const [duration, setDuration] = useState(60);

  // QR session state
  const [qrValue, setQrValue] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [currentToken, setCurrentToken] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [qrRefreshing, setQrRefreshing] = useState(false);

  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const rotationRef = useRef<NodeJS.Timeout | null>(null);

  // ─── Build QR URL ───────────────────────────────────────────────────────

  const buildQrUrl = useCallback((sid: string, token: string) => {
    return `${window.location.origin}/mark-attendance?session=${sid}&token=${token}`;
  }, []);

  // ─── Clear timers ───────────────────────────────────────────────────────

  const clearCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  const clearRotation = useCallback(() => {
    if (rotationRef.current) {
      clearInterval(rotationRef.current);
      rotationRef.current = null;
    }
  }, []);

  const clearAllTimers = useCallback(() => {
    clearCountdown();
    clearRotation();
  }, [clearCountdown, clearRotation]);

  // Cleanup on unmount
  useEffect(() => {
    return clearAllTimers;
  }, [clearAllTimers]);

  // ─── Session expiry handler ─────────────────────────────────────────────

  const handleSessionExpiry = useCallback(async (sid: string) => {
    clearAllTimers();
    setIsActive(false);
    setSessionExpired(true);
    setShowResults(true);
    toast.error("Session expired");

    // Notify backend
    try {
      await api.put(`/api/session/${sid}/end`);
    } catch {
      // Best-effort — session may already be ended
    }
  }, [clearAllTimers]);

  // ─── Countdown logic ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!isActive || timeLeft <= 0) return;

    countdownRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Use sessionId from the ref-like state
          setSessionId((sid) => {
            handleSessionExpiry(sid);
            return sid;
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return clearCountdown;
  }, [isActive, timeLeft, clearCountdown, handleSessionExpiry]);

  // ─── Token rotation ─────────────────────────────────────────────────────

  const rotateToken = useCallback(async (sid: string) => {
    try {
      const res = await api.post(`/api/session/${sid}/token`);
      const { token } = res.data.data;
      setCurrentToken(token);
      setQrValue(buildQrUrl(sid, token));

      // Brief flash animation
      setQrRefreshing(true);
      setTimeout(() => setQrRefreshing(false), 300);
    } catch {
      // If rotation fails, session may be expired — handled by countdown
    }
  }, [buildQrUrl]);

  // ─── Start rotation interval ────────────────────────────────────────────

  const startRotation = useCallback((sid: string) => {
    // Rotate every 10 seconds
    rotationRef.current = setInterval(() => {
      rotateToken(sid);
    }, 10_000);
  }, [rotateToken]);

  // ─── Generate QR (calls backend) ───────────────────────────────────────

  const generateQR = async () => {
    if (!selectedLecture) {
      toast.error("Please select a lecture first");
      return;
    }
    if (isActive) return;

    setGenerating(true);

    try {
      const res = await api.post("/api/session", {
        courseId,
        lecture: selectedLecture,
        duration,
      });

      const { session, token } = res.data.data;

      setSessionId(session.id);
      setCurrentToken(token);
      setShowResults(false);
      setSessionExpired(false);

      const url = buildQrUrl(session.id, token);
      setQrValue(url);
      setTimeLeft(duration);
      setIsActive(true);

      // Start 10-second rotation
      startRotation(session.id);

      toast.success("QR code generated!");
    } catch {
      toast.error("Failed to create session. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  // ─── Reset for new session ──────────────────────────────────────────────

  const resetSession = () => {
    clearAllTimers();
    setQrValue("");
    setSessionId("");
    setCurrentToken("");
    setSessionExpired(false);
    setShowResults(false);
    setIsActive(false);
    setTimeLeft(0);
  };

  // ─── Download QR ──────────────────────────────────────────────────────────

  const downloadQR = () => {
    const svg = document.getElementById("attendance-qr");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const link = document.createElement("a");
      link.download = `attendance-${course?.code}-${selectedLecture}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };

    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  // ─── Derived values ──────────────────────────────────────────────────────

  const timerUrgent = timeLeft <= 10;
  const progress = duration > 0 ? (timeLeft / duration) * 100 : 0;
  const presentStudents = mockStudents.filter((s) => s.status === "present");
  const absentStudents = mockStudents.filter((s) => s.status === "absent");

  // ─── 404 ──────────────────────────────────────────────────────────────────

  if (!course) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-[#1E293B] mb-2">Course not found</h2>
          <button
            onClick={() => router.push("/teacher/dashboard")}
            className="text-sm text-[#4F46E5] hover:text-[#4338CA] font-medium"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <AuthGuard allowedRoles={["teacher", "admin"]}>
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#4F46E5] flex items-center justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <span className="text-lg font-bold text-[#1E293B]">AttendEase</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-8 h-8 rounded-full bg-[#4F46E5]/10 flex items-center justify-center">
              <span className="text-[#4F46E5] font-semibold text-xs">T</span>
            </div>
            <span className="hidden sm:inline font-medium text-[#1E293B]">Teacher</span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        {/* Back */}
        <button
          onClick={() => router.push("/teacher/dashboard")}
          className="inline-flex items-center gap-1.5 text-sm text-[#64748B] hover:text-[#1E293B] transition-colors duration-150 mb-6"
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </button>

        {/* Course header */}
        <div className="mb-8">
          <span className="inline-block text-xs font-semibold text-[#4F46E5] bg-[#4F46E5]/10 px-2.5 py-1 rounded-full mb-3">
            {course.code}
          </span>
          <h1 className="text-2xl font-bold text-[#1E293B]">{course.name}</h1>
          <p className="text-[#64748B] mt-1">
            Select a lecture, set duration, and generate a QR code for attendance
          </p>
        </div>

        {/* ─── Main Card ─────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-50 p-6 md:p-8">
          {/* 1. Lecture selector */}
          <label htmlFor="lecture" className="block text-sm font-medium text-[#1E293B] mb-2">
            Select Lecture
          </label>
          <div className="relative mb-6">
            <select
              id="lecture"
              value={selectedLecture}
              onChange={(e) => {
                setSelectedLecture(e.target.value);
                if (!isActive) {
                  setQrValue("");
                  setShowResults(false);
                  setSessionExpired(false);
                }
              }}
              disabled={isActive}
              className="w-full appearance-none border border-gray-200 rounded-lg px-3.5 py-2.5 pr-10 text-sm text-[#1E293B] bg-white outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent transition-all duration-150 disabled:bg-gray-50 disabled:text-[#94A3B8]"
            >
              <option value="">Choose a lecture…</option>
              {lectures.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
          </div>

          {/* 2. Duration selector */}
          <label className="block text-sm font-medium text-[#1E293B] mb-2">
            QR Duration
          </label>
          <div className="flex gap-2 mb-6">
            {durationOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setDuration(opt.value)}
                disabled={isActive}
                className={`flex-1 text-sm font-medium py-2.5 rounded-lg border transition-all duration-150 ${
                  duration === opt.value
                    ? "bg-[#4F46E5] text-white border-[#4F46E5] shadow-md shadow-[#4F46E5]/20"
                    : "bg-white text-[#64748B] border-gray-200 hover:border-[#4F46E5]/40 hover:text-[#4F46E5]"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* 3. Generate button */}
          <button
            onClick={generateQR}
            disabled={!selectedLecture || isActive || generating}
            className="w-full flex items-center justify-center gap-2 bg-[#4F46E5] hover:bg-[#4338CA] hover:scale-[1.02] hover:shadow-xl disabled:bg-[#4F46E5]/40 disabled:cursor-not-allowed disabled:hover:scale-100 text-white font-medium text-sm px-5 py-3 rounded-xl transition-all duration-150 shadow-lg shadow-[#4F46E5]/25"
          >
            {generating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <QrCode size={16} />
                {isActive ? "Session Active" : "Generate QR Code"}
              </>
            )}
          </button>

          {/* ─── 4. QR + Timer ──────────────────────────────────────────── */}
          {(isActive || (qrValue && !showResults)) && (
            <div className="mt-8 text-center transition-all duration-200">
              {/* Timer */}
              {isActive && (
                <div className="mb-6">
                  <div className="inline-flex items-center gap-2 mb-3">
                    <Timer size={16} className={timerUrgent ? "text-[#F43F5E]" : "text-[#4F46E5]"} />
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                      Expires in
                    </span>
                  </div>
                  <div className={`text-4xl font-bold font-mono tracking-wider transition-colors duration-200 ${timerUrgent ? "text-[#F43F5E] animate-pulse" : "text-[#1E293B]"}`}>
                    {formatTime(timeLeft)}
                  </div>

                  {/* Progress bar */}
                  <div className="mt-3 max-w-xs mx-auto h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ease-linear ${timerUrgent ? "bg-[#F43F5E]" : "bg-[#4F46E5]"}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* QR Code with refresh animation */}
              <div className={`inline-block bg-white p-6 rounded-2xl border border-gray-100 shadow-sm transition-all duration-300 ${qrRefreshing ? "scale-95 opacity-70" : "scale-100 opacity-100"}`}>
                <QRCodeSVG
                  id="attendance-qr"
                  value={qrValue}
                  size={220}
                  level="H"
                  includeMargin
                  fgColor="#1E293B"
                />
              </div>

              {/* QR rotation info */}
              {isActive && (
                <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-[#64748B]">
                  <RefreshCw size={12} className={qrRefreshing ? "animate-spin" : ""} />
                  QR refreshes every 10 seconds
                </div>
              )}

              {/* Session info */}
              <div className="mt-4 space-y-1">
                <p className="text-sm font-medium text-[#1E293B]">
                  {course.code} — {selectedLecture}
                </p>
                <p className="text-xs text-[#64748B]">
                  Session: <span className="font-mono text-[#4F46E5]">{sessionId.slice(0, 8)}</span>
                </p>
                {currentToken && (
                  <p className="text-xs text-[#94A3B8]">
                    Token: <span className="font-mono">{currentToken.slice(0, 8)}…</span>
                  </p>
                )}
              </div>

              {/* URL preview */}
              <div className="mt-5 bg-[#F8FAFC] rounded-xl p-4">
                <p className="text-xs text-[#64748B] mb-1">Students scan to open:</p>
                <p className="text-xs font-mono text-[#1E293B] break-all">{qrValue}</p>
              </div>
            </div>
          )}

          {/* ─── Session Expired Overlay ─────────────────────────────────── */}
          {sessionExpired && !showResults && (
            <div className="mt-8 text-center py-10">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#F43F5E]/10 mb-4">
                <AlertTriangle size={28} className="text-[#F43F5E]" />
              </div>
              <h3 className="text-lg font-bold text-[#1E293B] mb-1">Session Expired</h3>
              <p className="text-sm text-[#64748B] mb-6">
                The QR code session has ended. Generate a new one to continue.
              </p>
              <button
                onClick={resetSession}
                className="inline-flex items-center gap-2 bg-[#4F46E5] hover:bg-[#4338CA] hover:scale-[1.02] text-white font-medium text-sm px-6 py-3 rounded-xl transition-all duration-150 shadow-lg shadow-[#4F46E5]/25"
              >
                <RefreshCw size={16} />
                Generate New Session
              </button>
            </div>
          )}

          {/* ─── 5. Attendance Results ──────────────────────────────────── */}
          {showResults && (
            <div className="mt-8 transition-all duration-200">
              {/* Session expired banner */}
              <div className="flex items-center gap-3 bg-[#F43F5E]/5 border border-[#F43F5E]/10 rounded-xl p-4 mb-6">
                <AlertTriangle size={18} className="text-[#F43F5E] flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-[#1E293B]">Session Expired</p>
                  <p className="text-xs text-[#64748B]">The attendance window has closed. Results are shown below.</p>
                </div>
                <button
                  onClick={resetSession}
                  className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium text-[#4F46E5] hover:text-[#4338CA] transition-colors flex-shrink-0"
                >
                  <RefreshCw size={14} />
                  New Session
                </button>
              </div>

              {/* Results header */}
              <div className="flex items-center gap-2 mb-6">
                <Clock size={18} className="text-[#64748B]" />
                <h3 className="text-base font-semibold text-[#1E293B]">
                  Attendance Results
                </h3>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {/* Present */}
                <div className="bg-[#10B981]/5 rounded-xl p-5 border border-[#10B981]/10">
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle2 size={18} className="text-[#10B981]" />
                    <h4 className="text-sm font-semibold text-[#1E293B]">
                      Present ({presentStudents.length})
                    </h4>
                  </div>
                  {presentStudents.length === 0 ? (
                    <p className="text-sm text-[#94A3B8] text-center py-4">No students marked present</p>
                  ) : (
                    <div className="space-y-2">
                      {presentStudents.map((s) => (
                        <div
                          key={s.id}
                          className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-[#10B981]/10"
                        >
                          <span className="text-sm text-[#1E293B]">{s.name}</span>
                          <span className="text-xs font-semibold text-[#10B981] bg-[#10B981]/10 px-2 py-0.5 rounded-full">
                            Present
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Absent */}
                <div className="bg-[#F43F5E]/5 rounded-xl p-5 border border-[#F43F5E]/10">
                  <div className="flex items-center gap-2 mb-4">
                    <XCircle size={18} className="text-[#F43F5E]" />
                    <h4 className="text-sm font-semibold text-[#1E293B]">
                      Absent ({absentStudents.length})
                    </h4>
                  </div>
                  {absentStudents.length === 0 ? (
                    <p className="text-sm text-[#94A3B8] text-center py-4">No absent students</p>
                  ) : (
                    <div className="space-y-2">
                      {absentStudents.map((s) => (
                        <div
                          key={s.id}
                          className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-[#F43F5E]/10"
                        >
                          <span className="text-sm text-[#1E293B]">{s.name}</span>
                          <span className="text-xs font-semibold text-[#F43F5E] bg-[#F43F5E]/10 px-2 py-0.5 rounded-full">
                            Absent
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Summary bar */}
              <div className="mt-4 bg-[#F8FAFC] rounded-xl p-4 flex items-center justify-between text-sm">
                <span className="text-[#64748B]">
                  {course.code} — {selectedLecture} — Session{" "}
                  <span className="font-mono text-[#4F46E5]">{sessionId.slice(0, 8)}</span>
                </span>
                <span className="font-semibold text-[#10B981]">
                  {Math.round((presentStudents.length / mockStudents.length) * 100)}% Attendance
                </span>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
    </AuthGuard>
  );
}
