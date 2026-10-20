"use client";

import { useRouter } from "next/navigation";
import {
  BookOpen,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Inbox,
  Plus,
  Copy,
  Check,
  Smartphone,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  X,
  RefreshCw,
} from "lucide-react";
import AuthGuard from "../../components/AuthGuard";
import Skeleton from "../../components/Skeleton";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../../lib/api";

interface ClassItem {
  id: string;
  className: string;
  department: string;
  year: string;
  division: string;
  classCode: string;
  teacherId: string;
  createdAt: string;
  updatedAt: string;
}

interface ResetRequest {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  classNames: string[];
  reasonCode: string;
  note: string | null;
  status: "pending" | "approved" | "rejected" | "expired" | "completed";
  reviewedBy: string | null;
  reviewNote: string | null;
  reviewedAt: string | null;
  bindingExpiresAt: string | null;
  createdAt: string;
  priorResetsCount: number;
}

interface IntegrityAlert {
  id: string;
  action: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  classNames: string[];
  metadata: Record<string, unknown>;
  ip: string;
  createdAt: string;
}

type TabType = "classes" | "resets" | "alerts";

export default function TeacherDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("classes");
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Device Binding State
  const [resetRequests, setResetRequests] = useState<ResetRequest[]>([]);
  const [alerts, setAlerts] = useState<IntegrityAlert[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<ResetRequest | null>(null);
  const [reviewAction, setReviewAction] = useState<"approve" | "reject" | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setUserName(user.name || "Teacher");
      } catch {
        setUserName("Teacher");
      }
    }

    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [classRes, resetRes, alertRes] = await Promise.all([
        api.get("/api/classes"),
        api.get("/api/device-resets").catch(() => ({ data: { data: { requests: [] } } })),
        api.get("/api/integrity-alerts").catch(() => ({ data: { data: { alerts: [] } } })),
      ]);

      setClasses(classRes.data.data.classes || []);
      setResetRequests(resetRes.data.data.requests || []);
      setAlerts(alertRes.data.data.alerts || []);
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
      toast.error("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    toast.success("Logged out successfully");
    window.location.href = "/login";
  };

  const handleCopyCode = (e: React.MouseEvent, code: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success("Class code copied!");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleReviewSubmit = async () => {
    if (!selectedRequest || !reviewAction) return;

    setReviewLoading(true);
    try {
      const endpoint = `/api/device-resets/${selectedRequest.id}/${reviewAction}`;
      await api.patch(endpoint, { note: reviewNote });

      toast.success(
        reviewAction === "approve"
          ? "Reset request approved! Student has 24h to bind."
          : "Reset request rejected."
      );

      // Refresh list
      const resetRes = await api.get("/api/device-resets");
      setResetRequests(resetRes.data.data.requests || []);

      setSelectedRequest(null);
      setReviewAction(null);
      setReviewNote("");
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || `Failed to ${reviewAction} request`);
    } finally {
      setReviewLoading(false);
    }
  };

  const pendingResetsCount = resetRequests.filter((r) => r.status === "pending").length;

  return (
    <AuthGuard allowedRoles={["teacher", "admin"]}>
      <div className="min-h-screen bg-[#F8FAFC]">
        {/* Top bar */}
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#4F46E5] flex items-center justify-center">
                <span className="text-white font-bold text-sm">A</span>
              </div>
              <span className="text-lg font-bold text-[#1E293B]">AttendEase</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-8 h-8 rounded-full bg-[#4F46E5]/10 flex items-center justify-center">
                  <span className="text-[#4F46E5] font-semibold text-xs">
                    {userName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="hidden sm:inline font-medium text-[#1E293B]">{userName}</span>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-[#64748B] hover:text-[#F43F5E] transition-colors duration-150"
                title="Logout"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
          {/* Header row with title + Create button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-3">
                <LayoutDashboard size={22} className="text-[#4F46E5]" />
                <h1 className="text-2xl font-bold text-[#1E293B]">Teacher Dashboard</h1>
              </div>
              <p className="text-sm text-[#64748B] mt-1">
                Manage attendance, review device resets, and monitor proxy alerts
              </p>
            </div>
            <button
              onClick={() => router.push("/teacher/create-class")}
              className="inline-flex items-center gap-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm hover:shadow-md transition-all duration-150 cursor-pointer self-start sm:self-auto"
            >
              <Plus size={16} />
              Create Class
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-gray-200 mb-8 overflow-x-auto">
            <button
              onClick={() => setActiveTab("classes")}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === "classes"
                  ? "border-[#4F46E5] text-[#4F46E5]"
                  : "border-transparent text-[#64748B] hover:text-[#1E293B]"
              }`}
            >
              <BookOpen size={16} />
              My Classes ({classes.length})
            </button>

            <button
              onClick={() => setActiveTab("resets")}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === "resets"
                  ? "border-[#4F46E5] text-[#4F46E5]"
                  : "border-transparent text-[#64748B] hover:text-[#1E293B]"
              }`}
            >
              <Smartphone size={16} />
              Reset Requests
              {pendingResetsCount > 0 && (
                <span className="bg-rose-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                  {pendingResetsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("alerts")}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === "alerts"
                  ? "border-[#4F46E5] text-[#4F46E5]"
                  : "border-transparent text-[#64748B] hover:text-[#1E293B]"
              }`}
            >
              <ShieldAlert size={16} />
              Integrity Alerts
              {alerts.length > 0 && (
                <span className="bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                  {alerts.length}
                </span>
              )}
            </button>
          </div>

          {/* ─── TAB 1: Classes ────────────────────────────────────────────── */}
          {activeTab === "classes" && (
            <div>
              {loading && (
                <div className="grid md:grid-cols-3 gap-6">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white rounded-xl shadow-md p-6 border border-gray-50">
                      <Skeleton className="w-12 h-12 rounded-xl mb-4" />
                      <Skeleton className="w-16 h-5 rounded-full mb-3" />
                      <Skeleton className="w-3/4 h-5 mb-2" />
                      <Skeleton className="w-1/2 h-4" />
                    </div>
                  ))}
                </div>
              )}

              {!loading && classes.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-[#4F46E5]/10 flex items-center justify-center mb-4">
                    <Inbox size={28} className="text-[#4F46E5]" />
                  </div>
                  <h3 className="text-lg font-semibold text-[#1E293B] mb-1">No classes created yet</h3>
                  <p className="text-sm text-[#94A3B8] max-w-xs mb-6">
                    Create your first class to start tracking attendance.
                  </p>
                  <button
                    onClick={() => router.push("/teacher/create-class")}
                    className="inline-flex items-center gap-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow-sm hover:shadow-md transition-all duration-150 cursor-pointer"
                  >
                    <Plus size={16} />
                    Create Class
                  </button>
                </div>
              )}

              {!loading && classes.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {classes.map((cls) => (
                    <div
                      key={cls.id}
                      onClick={() => router.push(`/teacher/class/${cls.id}`)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ")
                          router.push(`/teacher/class/${cls.id}`);
                      }}
                      className="group bg-white rounded-xl shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-150 p-5 border border-gray-50 text-left cursor-pointer"
                    >
                      <div className="w-12 h-12 rounded-xl bg-[#4F46E5]/10 text-[#4F46E5] flex items-center justify-center mb-4 group-hover:bg-[#4F46E5] group-hover:text-white transition-colors duration-150">
                        <BookOpen size={22} />
                      </div>

                      <div className="flex items-center gap-2 mb-3">
                        <span className="inline-block text-xs font-bold tracking-widest text-[#4F46E5] bg-[#4F46E5]/10 px-2.5 py-1 rounded-full">
                          {cls.classCode}
                        </span>
                        <button
                          onClick={(e) => handleCopyCode(e, cls.classCode)}
                          className="text-[#94A3B8] hover:text-[#4F46E5] transition-colors duration-150 cursor-pointer"
                          title="Copy class code"
                        >
                          {copiedCode === cls.classCode ? (
                            <Check size={14} className="text-emerald-500" />
                          ) : (
                            <Copy size={14} />
                          )}
                        </button>
                      </div>

                      <h3 className="text-base font-semibold text-[#1E293B] mb-2">
                        {cls.className}
                      </h3>

                      <div className="flex items-center gap-3 text-xs text-[#64748B]">
                        <span>{cls.department}</span>
                        <span className="w-1 h-1 bg-gray-300 rounded-full" />
                        <span>Year {cls.year}</span>
                        <span className="w-1 h-1 bg-gray-300 rounded-full" />
                        <span>Div {cls.division}</span>
                      </div>

                      <div className="mt-4 flex items-center gap-1 text-xs font-medium text-[#4F46E5] opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                        Manage class <ChevronRight size={14} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─── TAB 2: Device Reset Requests Inbox (FR-10, FR-13, UX) ──────── */}
          {activeTab === "resets" && (
            <div className="bg-white rounded-2xl shadow-md border border-gray-50 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold text-[#1E293B]">Device Reset Requests</h2>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    Students who lost or changed phones must be approved before they can bind a new device.
                  </p>
                </div>
                <button
                  onClick={fetchAllData}
                  className="p-2 text-gray-500 hover:text-[#4F46E5] rounded-lg border border-gray-200 hover:border-[#4F46E5] transition-colors text-xs font-medium flex items-center gap-1.5"
                >
                  <RefreshCw size={14} /> Refresh
                </button>
              </div>

              {resetRequests.length === 0 ? (
                <div className="text-center py-16">
                  <Smartphone size={36} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-sm font-semibold text-[#1E293B]">No reset requests</p>
                  <p className="text-xs text-[#94A3B8] mt-1">
                    None of your enrolled students have submitted device reset requests.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100 text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">
                        <th className="py-3 px-4">Student</th>
                        <th className="py-3 px-4">Enrolled Class</th>
                        <th className="py-3 px-4">Reason</th>
                        <th className="py-3 px-4">Prior Resets</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Submitted</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-sm">
                      {resetRequests.map((r) => (
                        <tr key={r.id} className="hover:bg-gray-50/60 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-[#1E293B]">{r.studentName}</div>
                            <div className="text-xs text-[#94A3B8]">{r.studentEmail}</div>
                          </td>
                          <td className="py-3.5 px-4 text-xs text-[#64748B]">
                            {r.classNames.length > 0 ? r.classNames.join(", ") : "Enrolled"}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="capitalize font-medium text-xs text-[#1E293B]">
                              {r.reasonCode.replace("_", " ")}
                            </span>
                            {r.note && (
                              <p className="text-[11px] text-[#94A3B8] italic mt-0.5 truncate max-w-xs">
                                &ldquo;{r.note}&rdquo;
                              </p>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-xs font-semibold">
                            {r.priorResetsCount > 0 ? (
                              <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                {r.priorResetsCount} prior reset{r.priorResetsCount > 1 ? "s" : ""}
                              </span>
                            ) : (
                              <span className="text-gray-400">None</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                                r.status === "pending"
                                  ? "bg-amber-100 text-amber-800"
                                  : r.status === "approved"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : r.status === "completed"
                                  ? "bg-indigo-100 text-indigo-800"
                                  : r.status === "rejected"
                                  ? "bg-rose-100 text-rose-800"
                                  : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {r.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-xs text-[#94A3B8]">
                            {new Date(r.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {r.status === "pending" ? (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => {
                                    setSelectedRequest(r);
                                    setReviewAction("approve");
                                  }}
                                  className="text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg shadow-sm transition-all"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedRequest(r);
                                    setReviewAction("reject");
                                  }}
                                  className="text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-lg shadow-sm transition-all"
                                >
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400 italic">Resolved</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ─── TAB 3: Integrity Alerts Panel (FR-9, FR-10, UX) ─────────────── */}
          {activeTab === "alerts" && (
            <div className="bg-white rounded-2xl shadow-md border border-gray-50 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold text-[#1E293B]">Integrity & Proxy Alerts</h2>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    Flagged occurrences of duplicate device sharing and repeated device mismatches.
                  </p>
                </div>
                <button
                  onClick={fetchAllData}
                  className="p-2 text-gray-500 hover:text-[#4F46E5] rounded-lg border border-gray-200 hover:border-[#4F46E5] transition-colors text-xs font-medium flex items-center gap-1.5"
                >
                  <RefreshCw size={14} /> Refresh
                </button>
              </div>

              {alerts.length === 0 ? (
                <div className="text-center py-16">
                  <ShieldAlert size={36} className="mx-auto text-emerald-400 mb-2" />
                  <p className="text-sm font-semibold text-[#1E293B]">Zero security anomalies</p>
                  <p className="text-xs text-[#94A3B8] mt-1">
                    No duplicate devices or suspicious multi-device proxy attempts detected.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="border border-gray-100 hover:border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F8FAFC]/50"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                            alert.action === "DUPLICATE_DEVICE"
                              ? "bg-rose-100 text-rose-600"
                              : "bg-amber-100 text-amber-600"
                          }`}
                        >
                          <AlertTriangle size={18} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-[#1E293B]">
                              {alert.studentName}
                            </span>
                            <span
                              className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                alert.action === "DUPLICATE_DEVICE"
                                  ? "bg-rose-100 text-rose-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {alert.action.replace("_", " ")}
                            </span>
                            <span className="text-xs text-[#94A3B8]">
                              ({alert.classNames.join(", ") || "Enrolled Class"})
                            </span>
                          </div>

                          <p className="text-xs text-[#64748B] mt-1">
                            {alert.action === "DUPLICATE_DEVICE"
                              ? "Attempted to register a physical device already actively bound to another student."
                              : "Attendance scan rejected due to device hardware fingerprint mismatch."}
                          </p>

                          <div className="flex items-center gap-3 text-[11px] text-[#94A3B8] mt-1.5">
                            <span>Email: {alert.studentEmail}</span>
                            <span>•</span>
                            <span>IP: {alert.ip}</span>
                            {typeof alert.metadata?.submittedLabel === "string" && (
                              <>
                                <span>•</span>
                                <span>Device: {alert.metadata.submittedLabel}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-xs text-[#94A3B8] whitespace-nowrap self-end sm:self-center font-medium">
                        {new Date(alert.createdAt).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>

        {/* ─── Review Confirmation Modal ────────────────────────────────────── */}
        {selectedRequest && reviewAction && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 relative animate-in fade-in duration-200">
              <button
                onClick={() => {
                  setSelectedRequest(null);
                  setReviewAction(null);
                }}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    reviewAction === "approve"
                      ? "bg-emerald-100 text-emerald-600"
                      : "bg-rose-100 text-rose-600"
                  }`}
                >
                  {reviewAction === "approve" ? (
                    <CheckCircle2 size={22} />
                  ) : (
                    <XCircle size={22} />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1E293B]">
                    {reviewAction === "approve" ? "Approve Device Reset" : "Reject Device Reset"}
                  </h3>
                  <p className="text-xs text-[#64748B]">
                    Student: {selectedRequest.studentName} ({selectedRequest.studentEmail})
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-xs text-[#64748B] mb-4">
                <p>
                  <strong>Reason stated:</strong>{" "}
                  <span className="capitalize">{selectedRequest.reasonCode.replace("_", " ")}</span>
                </p>
                {selectedRequest.note && (
                  <p className="mt-1">
                    <strong>Note:</strong> &ldquo;{selectedRequest.note}&rdquo;
                  </p>
                )}
                {selectedRequest.priorResetsCount > 0 && (
                  <p className="mt-1 text-amber-700 font-semibold">
                    ⚠️ Student has {selectedRequest.priorResetsCount} prior reset approval(s).
                  </p>
                )}
              </div>

              <div className="mb-4">
                <label className="block text-xs font-semibold text-[#1E293B] mb-1.5">
                  Reviewer Note (Optional)
                </label>
                <textarea
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder="Reason for decision..."
                  rows={2}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs text-[#1E293B] outline-none focus:ring-2 focus:ring-[#4F46E5]"
                />
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRequest(null);
                    setReviewAction(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={reviewLoading}
                  onClick={handleReviewSubmit}
                  className={`px-5 py-2 text-xs font-semibold text-white rounded-xl shadow-md transition-all ${
                    reviewAction === "approve"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-rose-600 hover:bg-rose-700"
                  }`}
                >
                  {reviewLoading ? "Saving..." : `Confirm ${reviewAction === "approve" ? "Approval" : "Rejection"}`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
