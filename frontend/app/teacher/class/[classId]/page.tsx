"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowLeft,
  QrCode,
  ChevronDown,
  Timer,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  BookOpen,
} from "lucide-react";
import AuthGuard from "../../../components/AuthGuard";
import Skeleton from "../../../components/Skeleton";
import api from "../../../lib/api";
import toast from "react-hot-toast";

// ─── Static Options ───────────────────────────────────────────────────────────

const lectures = ["Lecture 1", "Lecture 2", "Lecture 3", "Lecture 4", "Lecture 5"];

const durationOptions = [
  { label: "30 sec", value: 30 },
  { label: "1 min", value: 60 },
  { label: "2 min", value: 120 },
];

// ─── Types for attendance results ─────────────────────────────────────────────

interface StudentResult {
  id: string;
  name: string;
  email: string;
  status: "present" | "absent";
}

interface AttendanceResults {
  present: StudentResult[];
  absent: StudentResult[];
  totalEnrolled: number;
  presentCount: number;
  absentCount: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClassData {
  id: string;
  className: string;
  department: string;
  year: string;
  division: string;
  classCode: string;
  teacherId: string;
}

// ─── Page Component ───────────────────────────────────────────────────────────

export default function ClassDetailPage() {
  const params = useParams();
  const router = useRouter();
  const classId = params.classId as string;

  // Class data
  const [classData, setClassData] = useState<ClassData | null>(null);
  const [loadingClass, setLoadingClass] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);

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
  const [attendanceResults, setAttendanceResults] = useState<AttendanceResults | null>(null);
  const [loadingResults, setLoadingResults] = useState(false);

  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const rotationRef = useRef<NodeJS.Timeout | null>(null);

  // ─── Fetch class data ─────────────────────────────────────────────────────

  useEffect(() => {
    const fetchClass = async () => {
      try {
        const res = await api.get(`/api/classes/${classId}`);
        setClassData(res.data.data.class);
      } catch {
        toast.error("Failed to load class details");
      } finally {
        setLoadingClass(false);
      }
    };
    fetchClass();
  }, [classId]);

  // ─── Build QR URL ─────────────────────────────────────────────────────────

  const buildQrUrl = useCallback((sid: string, token: string) => {
    return `${window.location.origin}/mark-attendance?session=${sid}&token=${token}`;
  }, []);

  // ─── Clear timers ─────────────────────────────────────────────────────────

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

  useEffect(() => {
    return clearAllTimers;
  }, [clearAllTimers]);

  // ─── Session expiry handler ───────────────────────────────────────────────

  const fetchSessionResults = useCallback(async (sid: string) => {
    setLoadingResults(true);
    try {
      const res = await api.get(`/api/attendance/session/${sid}`);
      setAttendanceResults(res.data.data);
    } catch {
      // If fetch fails, show empty results
      setAttendanceResults({ present: [], absent: [], totalEnrolled: 0, presentCount: 0, absentCount: 0 });
    } finally {
      setLoadingResults(false);
    }
  }, []);

  const handleSessionExpiry = useCallback(
    async (sid: string) => {
      clearAllTimers();
      setIsActive(false);
      setSessionExpired(true);
      setShowResults(true);
      toast.error("Session expired");

      try {
        await api.put(`/api/session/${sid}/end`);
      } catch {
        // Best-effort
      }

      // Fetch real attendance results
      fetchSessionResults(sid);
    },
    [clearAllTimers, fetchSessionResults]
  );

  // ─── Countdown logic ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!isActive || timeLeft <= 0) return;

    countdownRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
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

  // ─── Token rotation ───────────────────────────────────────────────────────

  const rotateToken = useCallback(
    async (sid: string) => {
      try {
        const res = await api.post(`/api/session/${sid}/token`);
        const { token } = res.data.data;
        setCurrentToken(token);
        setQrValue(buildQrUrl(sid, token));

        setQrRefreshing(true);
        setTimeout(() => setQrRefreshing(false), 300);
      } catch {
        // Handled by countdown
      }
    },
    [buildQrUrl]
  );

  const startRotation = useCallback(
    (sid: string) => {
      rotationRef.current = setInterval(() => {
        rotateToken(sid);
      }, 10_000);
    },
    [rotateToken]
  );

  // ─── Generate QR ──────────────────────────────────────────────────────────

  const generateQR = async () => {
    if (!selectedLecture) {
      toast.error("Please select a lecture first");
      return;
    }
    if (isActive) return;

    setGenerating(true);

    try {
      const res = await api.post("/api/session", {
        classId,
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

      startRotation(session.id);

      toast.success("QR code generated!");
    } catch {
      toast.error("Failed to create session. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  // ─── Reset session ────────────────────────────────────────────────────────

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

  // ─── Copy class code ──────────────────────────────────────────────────────

  const handleCopyCode = () => {
    if (!classData) return;
    navigator.clipboard.writeText(classData.classCode);
    setCopiedCode(true);
    toast.success("Class code copied!");
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // ─── Derived values ───────────────────────────────────────────────────────

  const timerUrgent = timeLeft <= 10;
  const progress = duration > 0 ? (timeLeft / duration) * 100 : 0;
  const presentStudents = attendanceResults?.present || [];
  const absentStudents = attendanceResults?.absent || [];
  const totalStudents = attendanceResults?.totalEnrolled || 0;

  // ─── 404 / Loading ────────────────────────────────────────────────────────

  if (loadingClass) {
    return (
      <AuthGuard allowedRoles={["teacher", "admin"]}>
        <div className="min-h-screen bg-[#F8FAFC]">
          <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100">
            <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#4F46E5] flex items-center justify-center">
                <span className="text-white font-bold text-sm">A</span>
              </div>
              <span className="text-lg font-bold text-[#1E293B]">AttendEase</span>
            </div>
          </header>
          <main className="max-w-5xl mx-auto px-6 py-10">
            <Skeleton className="w-32 h-5 mb-8" />
            <div className="bg-white rounded-2xl shadow-md border border-gray-50 p-6">
              <Skeleton className="w-20 h-6 rounded-full mb-3" />
              <Skeleton className="w-1/2 h-7 mb-2" />
              <Skeleton className="w-1/3 h-4" />
            </div>
          </main>
        </div>
      </AuthGuard>
    );
  }

  if (!classData) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-[#1E293B] mb-2">Class not found</h2>
          <button
            onClick={() => router.push("/teacher/dashboard")}
            className="text-sm text-[#4F46E5] hover:text-[#4338CA] font-medium cursor-pointer"
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

        <main className="max-w-5xl mx-auto px-6 py-10">
          {/* Back */}
          <button
            onClick={() => router.push("/teacher/dashboard")}
            className="inline-flex items-center gap-1.5 text-sm text-[#64748B] hover:text-[#1E293B] transition-colors duration-150 mb-6 cursor-pointer"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </button>

          <div className="grid lg:grid-cols-5 gap-6">
            {/* ─── Left: Class Info ──────────────────────────────────────── */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-2xl shadow-md border border-gray-50 p-6">
                <div className="w-12 h-12 rounded-xl bg-[#4F46E5]/10 text-[#4F46E5] flex items-center justify-center mb-4">
                  <BookOpen size={22} />
                </div>

                <h1 className="text-xl font-bold text-[#1E293B] mb-3">
                  {classData.className}
                </h1>

                <div className="space-y-2 text-sm text-[#64748B] mb-5">
                  <div className="flex justify-between">
                    <span>Department</span>
                    <span className="font-medium text-[#1E293B]">{classData.department}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Year</span>
                    <span className="font-medium text-[#1E293B]">Year {classData.year}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Division</span>
                    <span className="font-medium text-[#1E293B]">Div {classData.division}</span>
                  </div>
                </div>

                {/* Class Code highlight */}
                <div className="bg-[#F8FAFC] rounded-xl p-4 border border-gray-100">
                  <p className="text-xs text-[#64748B] mb-1">Class Code</p>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold tracking-widest text-[#4F46E5]">
                      {classData.classCode}
                    </span>
                    <button
                      onClick={handleCopyCode}
                      className="text-[#94A3B8] hover:text-[#4F46E5] transition-colors duration-150 cursor-pointer"
                      title="Copy class code"
                    >
                      {copiedCode ? (
                        <Check size={16} className="text-emerald-500" />
                      ) : (
                        <Copy size={16} />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ─── Right: Attendance Section ─────────────────────────────── */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-2xl shadow-md border border-gray-50 p-6 md:p-8">
                <h2 className="text-lg font-bold text-[#1E293B] mb-6">Take Attendance</h2>

                {/* Lecture selector */}
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
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={16}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none"
                  />
                </div>

                {/* Duration selector */}
                <label className="block text-sm font-medium text-[#1E293B] mb-2">
                  QR Duration
                </label>
                <div className="flex gap-2 mb-6">
                  {durationOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setDuration(opt.value)}
                      disabled={isActive}
                      className={`flex-1 text-sm font-medium py-2.5 rounded-lg border transition-all duration-150 cursor-pointer ${
                        duration === opt.value
                          ? "bg-[#4F46E5] text-white border-[#4F46E5] shadow-md shadow-[#4F46E5]/20"
                          : "bg-white text-[#64748B] border-gray-200 hover:border-[#4F46E5]/40 hover:text-[#4F46E5]"
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* Generate button */}
                <button
                  onClick={generateQR}
                  disabled={!selectedLecture || isActive || generating}
                  className="w-full flex items-center justify-center gap-2 bg-[#4F46E5] hover:bg-[#4338CA] hover:scale-[1.02] hover:shadow-xl disabled:bg-[#4F46E5]/40 disabled:cursor-not-allowed disabled:hover:scale-100 text-white font-medium text-sm px-5 py-3 rounded-xl transition-all duration-150 shadow-lg shadow-[#4F46E5]/25 cursor-pointer"
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

                {/* ─── QR + Timer ─────────────────────────────────────────── */}
                {(isActive || (qrValue && !showResults)) && (
                  <div className="mt-8 text-center transition-all duration-200">
                    {/* Timer */}
                    {isActive && (
                      <div className="mb-6">
                        <div className="inline-flex items-center gap-2 mb-3">
                          <Timer
                            size={16}
                            className={timerUrgent ? "text-[#F43F5E]" : "text-[#4F46E5]"}
                          />
                          <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                            Expires in
                          </span>
                        </div>
                        <div
                          className={`text-4xl font-bold font-mono tracking-wider transition-colors duration-200 ${
                            timerUrgent ? "text-[#F43F5E] animate-pulse" : "text-[#1E293B]"
                          }`}
                        >
                          {formatTime(timeLeft)}
                        </div>

                        {/* Progress bar */}
                        <div className="mt-3 max-w-xs mx-auto h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-1000 ease-linear ${
                              timerUrgent ? "bg-[#F43F5E]" : "bg-[#4F46E5]"
                            }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* QR Code */}
                    <div
                      className={`inline-block bg-white p-6 rounded-2xl border border-gray-100 shadow-sm transition-all duration-300 ${
                        qrRefreshing ? "scale-95 opacity-70" : "scale-100 opacity-100"
                      }`}
                    >
                      <QRCodeSVG
                        id="attendance-qr"
                        value={qrValue}
                        size={220}
                        level="H"
                        includeMargin
                        fgColor="#1E293B"
                      />
                    </div>

                    {/* Rotation info */}
                    {isActive && (
                      <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-[#64748B]">
                        <RefreshCw size={12} className={qrRefreshing ? "animate-spin" : ""} />
                        QR refreshes every 10 seconds
                      </div>
                    )}

                    {/* Session info */}
                    <div className="mt-4 space-y-1">
                      <p className="text-sm font-medium text-[#1E293B]">
                        {classData.classCode} — {selectedLecture}
                      </p>
                      <p className="text-xs text-[#64748B]">
                        Session:{" "}
                        <span className="font-mono text-[#4F46E5]">{sessionId.slice(0, 8)}</span>
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

                {/* ─── Session Expired (no results yet) ──────────────────── */}
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
                      className="inline-flex items-center gap-2 bg-[#4F46E5] hover:bg-[#4338CA] hover:scale-[1.02] text-white font-medium text-sm px-6 py-3 rounded-xl transition-all duration-150 shadow-lg shadow-[#4F46E5]/25 cursor-pointer"
                    >
                      <RefreshCw size={16} />
                      Generate New Session
                    </button>
                  </div>
                )}

                {/* ─── Attendance Results ─────────────────────────────────── */}
                {showResults && (
                  <div className="mt-8 transition-all duration-200">
                    {/* Expired banner */}
                    <div className="flex items-center gap-3 bg-[#F43F5E]/5 border border-[#F43F5E]/10 rounded-xl p-4 mb-6">
                      <AlertTriangle size={18} className="text-[#F43F5E] flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-[#1E293B]">Session Expired</p>
                        <p className="text-xs text-[#64748B]">
                          The attendance window has closed. Results are shown below.
                        </p>
                      </div>
                      <button
                        onClick={resetSession}
                        className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium text-[#4F46E5] hover:text-[#4338CA] transition-colors flex-shrink-0 cursor-pointer"
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
                          <p className="text-sm text-[#94A3B8] text-center py-4">
                            No students marked present
                          </p>
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
                          <p className="text-sm text-[#94A3B8] text-center py-4">
                            No absent students
                          </p>
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
                        {classData.classCode} — {selectedLecture} — Session{" "}
                        <span className="font-mono text-[#4F46E5]">{sessionId.slice(0, 8)}</span>
                      </span>
                      <span className="font-semibold text-[#10B981]">
                        {totalStudents > 0
                          ? Math.round((presentStudents.length / totalStudents) * 100)
                          : 0}
                        % Attendance
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
