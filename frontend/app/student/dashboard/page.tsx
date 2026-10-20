"use client";

import { useRouter } from "next/navigation";
import {
  BookOpen,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Inbox,
  QrCode,
  UserPlus,
  TrendingUp,
  GraduationCap,
  PieChart as PieChartIcon,
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  RefreshCw,
  Fingerprint,
  Cpu,
  Loader2,
} from "lucide-react";
import AuthGuard from "../../components/AuthGuard";
import Skeleton from "../../components/Skeleton";
import { useEffect, useState, FormEvent } from "react";
import toast from "react-hot-toast";
import api from "../../lib/api";
import { registerBiometricPasskey } from "../../lib/webauthn";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClassItem {
  id: string;
  className: string;
  department: string;
  year: string;
  division: string;
  classCode: string;
}

interface ClassSummary {
  classId: string;
  percentage: number;
  totalLectures: number;
  attended: number;
}

interface DeviceInfo {
  id: string;
  label: string;
  status: string;
  boundAt: string;
  lastSeenAt: string;
  hasWebAuthn?: boolean;
}

interface ActiveResetInfo {
  id: string;
  status: "pending" | "approved" | "rejected" | "expired" | "completed";
  reasonCode: string;
  note?: string;
  bindingExpiresAt?: string;
  createdAt: string;
}

// ─── Pie chart colors ─────────────────────────────────────────────────────────

const PIE_COLORS = ["#10B981", "#F43F5E"];

// ─── Component ────────────────────────────────────────────────────────────────

export default function StudentDashboard() {
  const router = useRouter();
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [summaryMap, setSummaryMap] = useState<Record<string, ClassSummary>>({});
  const [overallAttendance, setOverallAttendance] = useState(0);

  // Device binding state
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [activeReset, setActiveReset] = useState<ActiveResetInfo | null>(null);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetReason, setResetReason] = useState<"lost" | "replaced" | "factory_reset" | "other">("replaced");
  const [resetNote, setResetNote] = useState("");
  const [resetConfirm, setResetConfirm] = useState(false);
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [registeringPasskey, setRegisteringPasskey] = useState(false);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        setUserName(u.name || "Student");
      } catch {
        setUserName("Student");
      }
    }

    const fetchData = async () => {
      try {
        const [classRes, summaryRes, deviceRes] = await Promise.all([
          api.get("/api/student/classes"),
          api.get("/api/attendance/summary/me"),
          api.get("/api/devices/me").catch(() => ({ data: { data: { device: null, activeReset: null } } })),
        ]);
        setClasses(classRes.data.data.classes);

        // Build a lookup map: classId -> summary
        const map: Record<string, ClassSummary> = {};
        for (const s of summaryRes.data.data.classes) {
          map[s.classId] = s;
        }
        setSummaryMap(map);
        setOverallAttendance(summaryRes.data.data.overall.percentage);

        if (deviceRes.data?.data) {
          setDeviceInfo(deviceRes.data.data.device);
          setActiveReset(deviceRes.data.data.activeReset);
        }
      } catch {
        toast.error("Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("deviceStatus");
    router.push("/login");
  };

  const handleRegisterPasskey = async () => {
    setRegisteringPasskey(true);
    try {
      const res = await registerBiometricPasskey();
      if (res.success) {
        toast.success(res.message);
        const devRes = await api.get("/api/devices/me");
        if (devRes.data?.data) {
          setDeviceInfo(devRes.data.data.device);
        }
      } else {
        toast.error(res.message);
      }
    } catch {
      toast.error("Failed to enable biometric passkey");
    } finally {
      setRegisteringPasskey(false);
    }
  };

  const handleSubmitReset = async (e: FormEvent) => {
    e.preventDefault();
    if (!resetConfirm) {
      toast.error("Please confirm that your old device will be replaced.");
      return;
    }

    setResetSubmitting(true);
    try {
      const res = await api.post("/api/device-resets", {
        reasonCode: resetReason,
        note: resetNote,
      });
      setActiveReset(res.data.data);
      toast.success("Device reset request submitted to your teachers!");
      setResetModalOpen(false);
      setResetNote("");
      setResetConfirm(false);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || "Failed to submit reset request");
    } finally {
      setResetSubmitting(false);
    }
  };

  // getAttendance helper using real data
  const getAttendance = (classId: string): number => {
    return summaryMap[classId]?.percentage ?? 0;
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <AuthGuard allowedRoles={["student"]}>
      <div className="min-h-screen bg-[#F8FAFC]">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#4F46E5] flex items-center justify-center">
                <span className="text-white font-bold text-sm">A</span>
              </div>
              <span className="text-lg font-bold text-[#1E293B]">
                AttendEase
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs sm:text-sm text-[#64748B]">
                {userName || "Student"}
              </span>
              <button
                onClick={handleLogout}
                className="p-2 text-[#94A3B8] hover:text-[#F43F5E] hover:bg-[#F43F5E]/10 rounded-lg transition-colors cursor-pointer"
                title="Sign out"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          {/* Welcome */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-1">
              <LayoutDashboard size={22} className="text-[#4F46E5]" />
              <h1 className="text-2xl font-bold text-[#1E293B]">Dashboard</h1>
            </div>
            <p className="text-sm text-[#64748B]">
              Welcome back, <span className="font-medium text-[#1E293B]">{userName || "Student"}</span>
            </p>
          </div>

          {/* ─── Approved State Banner (FR-14, FR-15, FR-17) ────────────────── */}
          {activeReset?.status === "approved" && (
            <div className="mb-6 bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-4 sm:p-5 rounded-2xl shadow-lg shadow-emerald-600/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <CheckCircle2 size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Device Change Approved!</h3>
                  <p className="text-xs sm:text-sm text-white/90">
                    Your teacher approved your reset request. You have <strong>24 hours</strong> to log in from your new device to bind it.
                  </p>
                </div>
              </div>
              <div className="text-xs bg-white/20 backdrop-blur px-3 py-1.5 rounded-lg font-medium whitespace-nowrap self-end sm:self-center">
                Expires: {new Date(activeReset.bindingExpiresAt || "").toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          )}

          {/* ─── Pending State Alert (FR-17) ────────────────────────────────── */}
          {activeReset?.status === "pending" && (
            <div className="mb-6 bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-2xl flex items-center justify-between gap-3 text-sm">
              <div className="flex items-center gap-3">
                <Clock size={20} className="text-amber-600 shrink-0" />
                <div>
                  <p className="font-medium">Device Reset Request Pending</p>
                  <p className="text-xs text-amber-700">
                    Reason: <span className="capitalize">{activeReset.reasonCode.replace("_", " ")}</span>. Your class teacher is reviewing your request.
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full">
                Under Review
              </span>
            </div>
          )}

          {/* Stats + Actions Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
            {/* Stat: Total Classes */}
            <div className="bg-white rounded-2xl shadow-md border border-gray-50 p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#4F46E5]/10 flex items-center justify-center flex-shrink-0">
                <GraduationCap size={22} className="text-[#4F46E5]" />
              </div>
              <div>
                <p className="text-xs text-[#94A3B8] font-medium uppercase tracking-wider">
                  Classes Joined
                </p>
                {loading ? (
                  <Skeleton className="w-8 h-7 mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-[#1E293B]">
                    {classes.length}
                  </p>
                )}
              </div>
            </div>

            {/* Stat: Overall Attendance */}
            <div className="bg-white rounded-2xl shadow-md border border-gray-50 p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#10B981]/10 flex items-center justify-center flex-shrink-0">
                <TrendingUp size={22} className="text-[#10B981]" />
              </div>
              <div>
                <p className="text-xs text-[#94A3B8] font-medium uppercase tracking-wider">
                  Attendance
                </p>
                {loading ? (
                  <Skeleton className="w-12 h-7 mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-[#1E293B]">
                    {overallAttendance}
                    <span className="text-sm font-normal text-[#64748B]">%</span>
                  </p>
                )}
              </div>
            </div>

            {/* Action: Give Attendance */}
            <button
              onClick={() => router.push("/student/scan")}
              className="bg-[#4F46E5] hover:bg-[#4338CA] hover:scale-[1.02] text-white rounded-2xl shadow-lg shadow-[#4F46E5]/20 p-5 flex items-center gap-4 transition-all duration-200 cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0 group-hover:bg-white/30 transition-colors">
                <QrCode size={22} className="text-white" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold">Give Attendance</p>
                <p className="text-xs text-white/70">Scan QR code</p>
              </div>
              <ChevronRight
                size={18}
                className="ml-auto opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all"
              />
            </button>

            {/* Action: Join Class */}
            <button
              onClick={() => router.push("/student/join-class")}
              className="bg-white hover:bg-[#F8FAFC] hover:scale-[1.02] text-[#1E293B] rounded-2xl shadow-md border border-gray-100 p-5 flex items-center gap-4 transition-all duration-200 cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-xl bg-[#4F46E5]/10 flex items-center justify-center flex-shrink-0">
                <UserPlus size={22} className="text-[#4F46E5]" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold">Join Class</p>
                <p className="text-xs text-[#94A3B8]">Enter class code</p>
              </div>
              <ChevronRight
                size={18}
                className="ml-auto text-[#94A3B8] opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all"
              />
            </button>
          </div>

          {/* ─── Device Status Card with Layered Security Badges ───────────── */}
          <div className="bg-white rounded-2xl shadow-md border border-gray-50 p-5 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                <Smartphone size={22} className="text-[#4F46E5]" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-bold text-[#1E293B]">
                    {deviceInfo?.label || "Primary Device Registered"}
                  </h3>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                    <ShieldCheck size={12} /> Bound Active
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">
                    <Cpu size={12} /> GPU Fingerprinted
                  </span>
                  {deviceInfo?.hasWebAuthn && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200">
                      <Fingerprint size={12} /> Biometrics Active
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#64748B] mt-1">
                  {deviceInfo?.boundAt ? (
                    <>Bound on {new Date(deviceInfo.boundAt).toLocaleDateString()} · Last seen {new Date(deviceInfo.lastSeenAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</>
                  ) : (
                    "Securely bound with hardware & rendering fingerprinting"
                  )}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {!deviceInfo?.hasWebAuthn && (
                <button
                  onClick={handleRegisterPasskey}
                  disabled={registeringPasskey}
                  className="text-xs font-semibold px-3.5 py-2 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {registeringPasskey ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      Scanning…
                    </>
                  ) : (
                    <>
                      <Fingerprint size={14} />
                      Enable Biometrics
                    </>
                  )}
                </button>
              )}

              <button
                onClick={() => setResetModalOpen(true)}
                disabled={activeReset?.status === "pending"}
                className="text-xs font-semibold px-3.5 py-2 rounded-xl border border-gray-200 hover:border-[#4F46E5] hover:text-[#4F46E5] bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw size={13} />
                {activeReset?.status === "pending" ? "Reset Pending" : "Request Device Change"}
              </button>
            </div>
          </div>

          {/* Attendance Graph + Classes */}
          <div className="grid lg:grid-cols-5 gap-6">
            {/* ─── Pie Chart — Attendance Overview ──────────────────── */}
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-md border border-gray-50 p-6">
              <div className="flex items-center gap-2 mb-4">
                <PieChartIcon size={18} className="text-[#4F46E5]" />
                <h2 className="text-base font-semibold text-[#1E293B]">
                  Attendance Overview
                </h2>
              </div>

              {loading ? (
                <div className="flex items-center justify-center h-[250px]">
                  <Skeleton className="w-40 h-40 rounded-full" />
                </div>
              ) : (
                <>
                  <div className="relative">
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: "Attended", value: overallAttendance },
                            {
                              name: "Missed",
                              value: Math.max(0, 100 - overallAttendance),
                            },
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={65}
                          outerRadius={95}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          <Cell fill={PIE_COLORS[0]} />
                          <Cell fill={PIE_COLORS[1]} />
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Centered label */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-3xl font-extrabold text-[#1E293B]">
                        {overallAttendance}%
                      </span>
                      <span className="text-xs text-[#94A3B8]">Overall</span>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="flex items-center justify-center gap-6 mt-2">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-[#10B981]" />
                      <span className="text-xs text-[#64748B]">Attended</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-[#F43F5E]" />
                      <span className="text-xs text-[#64748B]">Missed</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* ─── Class Cards Grid ─────────────────────────────────── */}
            <div className="lg:col-span-3 bg-white rounded-2xl shadow-md border border-gray-50 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BookOpen size={18} className="text-[#4F46E5]" />
                  <h2 className="text-base font-semibold text-[#1E293B]">
                    Enrolled Classes
                  </h2>
                </div>
                <span className="text-xs text-[#94A3B8]">
                  {classes.length} classes
                </span>
              </div>

              {loading ? (
                <div className="grid sm:grid-cols-2 gap-4">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className="border border-gray-100 rounded-xl p-4 space-y-3"
                    >
                      <Skeleton className="w-12 h-5 rounded-full" />
                      <Skeleton className="w-3/4 h-5" />
                      <Skeleton className="w-1/2 h-4" />
                      <Skeleton className="w-full h-2 rounded-full mt-2" />
                    </div>
                  ))}
                </div>
              ) : classes.length === 0 ? (
                <div className="text-center py-12">
                  <Inbox size={40} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-sm text-[#94A3B8]">
                    You haven&apos;t joined any classes yet
                  </p>
                  <button
                    onClick={() => router.push("/student/join-class")}
                    className="mt-3 text-xs font-semibold text-[#4F46E5] hover:underline"
                  >
                    Join a class now &rarr;
                  </button>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  {classes.map((cls) => {
                    const att = getAttendance(cls.id);
                    const attColor =
                      att >= 85
                        ? "text-[#10B981] bg-[#10B981]/10"
                        : att >= 70
                        ? "text-[#F59E0B] bg-[#F59E0B]/10"
                        : "text-[#F43F5E] bg-[#F43F5E]/10";

                    return (
                      <button
                        key={cls.id}
                        onClick={() =>
                          router.push(`/student/class/${cls.id}`)
                        }
                        className="text-left border border-gray-100 hover:border-[#4F46E5]/40 rounded-xl p-4 transition-all duration-150 hover:shadow-md cursor-pointer group bg-white"
                      >
                        {/* Top row: badge + percentage */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="w-7 h-7 rounded-lg bg-[#4F46E5]/10 flex items-center justify-center">
                            <BookOpen
                              size={14}
                              className="text-[#4F46E5]"
                            />
                          </div>
                          <span
                            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${attColor}`}
                          >
                            {att}%
                          </span>
                        </div>

                        {/* Class name */}
                        <h3 className="text-sm font-semibold text-[#1E293B] mb-1 group-hover:text-[#4F46E5] transition-colors">
                          {cls.className}
                        </h3>

                        {/* Details */}
                        <p className="text-xs text-[#94A3B8]">
                          {cls.department} · Year {cls.year} · Div{" "}
                          {cls.division}
                        </p>

                        {/* Progress bar */}
                        <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              att >= 85
                                ? "bg-[#10B981]"
                                : att >= 70
                                ? "bg-[#F59E0B]"
                                : "bg-[#F43F5E]"
                            }`}
                            style={{ width: `${att}%` }}
                          />
                        </div>

                        {/* Hover arrow */}
                        <div className="flex justify-end mt-3">
                          <ChevronRight
                            size={14}
                            className="text-[#CBD5E1] group-hover:text-[#4F46E5] group-hover:translate-x-0.5 transition-all"
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </main>

        {/* ─── Device Reset Modal (FR-11, UX) ───────────────────────────────── */}
        {resetModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 relative animate-in fade-in duration-200">
              <button
                onClick={() => setResetModalOpen(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#4F46E5]/10 flex items-center justify-center text-[#4F46E5]">
                  <Smartphone size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#1E293B]">Request Device Change</h3>
                  <p className="text-xs text-[#64748B]">Submit for approval by your teachers</p>
                </div>
              </div>

              <form onSubmit={handleSubmitReset} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#1E293B] mb-1.5">
                    Reason for Change <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={resetReason}
                    onChange={(e) => setResetReason(e.target.value as "lost" | "replaced" | "factory_reset" | "other")}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-[#1E293B] bg-white outline-none focus:ring-2 focus:ring-[#4F46E5]"
                  >
                    <option value="replaced">New / Replaced Phone</option>
                    <option value="lost">Lost / Stolen Phone</option>
                    <option value="factory_reset">Factory Reset Phone</option>
                    <option value="other">Other Reason</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1E293B] mb-1.5">
                    Additional Notes (Optional)
                  </label>
                  <textarea
                    value={resetNote}
                    onChange={(e) => setResetNote(e.target.value)}
                    rows={3}
                    placeholder="Provide details if needed (e.g. bought a new iPhone)..."
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-sm text-[#1E293B] outline-none focus:ring-2 focus:ring-[#4F46E5]"
                  />
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2.5">
                  <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-semibold">Important Security Policy</strong>
                    Once approved, your old device will be permanently revoked. You will have 24 hours to log in from your new device to bind it.
                  </div>
                </div>

                <label className="flex items-start gap-2.5 text-xs text-[#64748B] cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={resetConfirm}
                    onChange={(e) => setResetConfirm(e.target.checked)}
                    className="mt-0.5 rounded border-gray-300 text-[#4F46E5] focus:ring-[#4F46E5]"
                  />
                  <span>
                    I confirm that I am changing my device, and my old phone will no longer mark attendance.
                  </span>
                </label>

                <div className="flex items-center justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setResetModalOpen(false)}
                    className="px-4 py-2.5 text-xs font-semibold text-[#64748B] hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resetSubmitting || !resetConfirm}
                    className="px-5 py-2.5 text-xs font-semibold text-white bg-[#4F46E5] hover:bg-[#4338CA] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-md transition-all"
                  >
                    {resetSubmitting ? "Submitting..." : "Submit Request"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
