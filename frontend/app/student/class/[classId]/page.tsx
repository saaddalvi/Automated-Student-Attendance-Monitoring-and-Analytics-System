"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  CalendarCheck,
  CalendarX2,
  TrendingUp,
  ClipboardList,
  CheckCircle2,
  XCircle,
  Percent,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import AuthGuard from "../../../components/AuthGuard";
import Skeleton from "../../../components/Skeleton";
import toast from "react-hot-toast";
import api from "../../../lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClassInfo {
  id: string;
  className: string;
  department: string;
  year: string;
  division: string;
  classCode: string;
}

interface AttendanceRecord {
  date: string;
  lecture: string;
  status: "present" | "absent";
}

interface ClassAttendanceData {
  classId: string;
  className: string;
  totalLectures: number;
  presentCount: number;
  absentCount: number;
  percentage: number;
  history: AttendanceRecord[];
}

const PIE_COLORS = ["#10B981", "#F43F5E"];

// ─── Component ────────────────────────────────────────────────────────────────

export default function StudentClassDetail() {
  const { classId } = useParams();
  const router = useRouter();
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [attendanceData, setAttendanceData] = useState<ClassAttendanceData | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [classRes, attRes] = await Promise.all([
          api.get("/api/student/classes"),
          api.get(`/api/attendance/class/${classId}/me`),
        ]);

        const cls = classRes.data.data.classes.find(
          (c: ClassInfo) => c.id === classId
        );
        if (cls) setClassInfo(cls);

        setAttendanceData(attRes.data.data);
      } catch {
        toast.error("Failed to load class info");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [classId]);

  // Compute stats from real data
  const totalLectures = attendanceData?.totalLectures ?? 0;
  const presentCount = attendanceData?.presentCount ?? 0;
  const absentCount = attendanceData?.absentCount ?? 0;
  const percentage = attendanceData?.percentage ?? 0;
  const history = attendanceData?.history ?? [];

  const pieData = [
    { name: "Present", value: presentCount },
    { name: "Absent", value: absentCount },
  ];

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

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

        <main className="max-w-6xl mx-auto px-6 py-8">
          {/* Back link */}
          <button
            onClick={() => router.push("/student/dashboard")}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#64748B] hover:text-[#4F46E5] transition-colors duration-150 mb-6 cursor-pointer"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </button>

          {/* ─── Class Info Header ──────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-md border border-gray-50 p-6 mb-6">
            {loading ? (
              <div className="flex items-center gap-4">
                <Skeleton className="w-12 h-12 rounded-xl" />
                <div>
                  <Skeleton className="w-48 h-6 mb-2" />
                  <Skeleton className="w-32 h-4" />
                </div>
              </div>
            ) : classInfo ? (
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#4F46E5]/10 flex items-center justify-center flex-shrink-0">
                  <BookOpen size={24} className="text-[#4F46E5]" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-2xl font-bold text-[#1E293B]">
                    {classInfo.className}
                  </h1>
                  <p className="text-sm text-[#94A3B8]">
                    {classInfo.department} · Year {classInfo.year} · Div{" "}
                    {classInfo.division}
                  </p>
                </div>
                <div className="ml-auto hidden sm:block">
                  <span className="text-xs font-semibold text-[#4F46E5] bg-[#4F46E5]/10 px-3 py-1.5 rounded-full">
                    {classInfo.classCode}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#4F46E5]/10 flex items-center justify-center">
                  <BookOpen size={24} className="text-[#4F46E5]" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-[#1E293B]">
                    Class Details
                  </h1>
                  <p className="text-xs text-[#94A3B8] font-mono">{classId}</p>
                </div>
              </div>
            )}
          </div>

          {/* ─── Stats Cards ───────────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-2xl shadow-md border border-gray-50 p-5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#4F46E5]/10 flex items-center justify-center flex-shrink-0">
                <ClipboardList size={20} className="text-[#4F46E5]" />
              </div>
              <div>
                {loading ? (
                  <Skeleton className="w-8 h-7 mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-[#1E293B]">{totalLectures}</p>
                )}
                <p className="text-[10px] text-[#94A3B8] font-medium uppercase tracking-wider">
                  Total Lectures
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-md border border-gray-50 p-5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#10B981]/10 flex items-center justify-center flex-shrink-0">
                <CalendarCheck size={20} className="text-[#10B981]" />
              </div>
              <div>
                {loading ? (
                  <Skeleton className="w-8 h-7 mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-[#10B981]">{presentCount}</p>
                )}
                <p className="text-[10px] text-[#94A3B8] font-medium uppercase tracking-wider">
                  Present
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-md border border-gray-50 p-5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#F43F5E]/10 flex items-center justify-center flex-shrink-0">
                <CalendarX2 size={20} className="text-[#F43F5E]" />
              </div>
              <div>
                {loading ? (
                  <Skeleton className="w-8 h-7 mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-[#F43F5E]">{absentCount}</p>
                )}
                <p className="text-[10px] text-[#94A3B8] font-medium uppercase tracking-wider">
                  Absent
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-md border border-gray-50 p-5 flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  percentage >= 75 ? "bg-[#10B981]/10" : "bg-[#F43F5E]/10"
                }`}
              >
                <Percent
                  size={20}
                  className={percentage >= 75 ? "text-[#10B981]" : "text-[#F43F5E]"}
                />
              </div>
              <div>
                {loading ? (
                  <Skeleton className="w-12 h-7 mt-1" />
                ) : (
                  <p
                    className={`text-2xl font-bold ${
                      percentage >= 75 ? "text-[#10B981]" : "text-[#F43F5E]"
                    }`}
                  >
                    {percentage}%
                  </p>
                )}
                <p className="text-[10px] text-[#94A3B8] font-medium uppercase tracking-wider">
                  Attendance
                </p>
              </div>
            </div>
          </div>

          {/* ─── Chart + History ────────────────────────────────────── */}
          <div className="grid lg:grid-cols-5 gap-6">
            {/* Pie chart */}
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-md border border-gray-50 p-6">
              <h2 className="text-base font-semibold text-[#1E293B] mb-4">
                Attendance Overview
              </h2>

              {loading ? (
                <div className="flex items-center justify-center h-[220px]">
                  <Skeleton className="w-40 h-40 rounded-full" />
                </div>
              ) : totalLectures === 0 ? (
                <div className="flex flex-col items-center justify-center h-[220px] text-center">
                  <TrendingUp size={28} className="text-[#CBD5E1] mb-3" />
                  <p className="text-sm text-[#94A3B8]">No lectures yet</p>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={85}
                          paddingAngle={3}
                          dataKey="value"
                          strokeWidth={0}
                        >
                          {pieData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            background: "#1E293B",
                            border: "none",
                            borderRadius: "8px",
                            color: "#fff",
                            fontSize: "12px",
                            padding: "8px 12px",
                          }}
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          formatter={(value: any, name: any) => [
                            `${value} lectures`,
                            name,
                          ]}
                        />
                      </PieChart>
                    </ResponsiveContainer>

                    {/* Center label */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="text-center">
                        <p className="text-3xl font-bold text-[#1E293B]">
                          {percentage}%
                        </p>
                        <p className="text-[10px] font-medium text-[#94A3B8] uppercase tracking-wider">
                          Overall
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="flex items-center justify-center gap-6 mt-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#10B981]" />
                      <span className="text-xs text-[#64748B]">
                        Present ({presentCount})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#F43F5E]" />
                      <span className="text-xs text-[#64748B]">
                        Absent ({absentCount})
                      </span>
                    </div>
                  </div>

                  {/* Threshold indicator */}
                  <div className="mt-4 pt-4 border-t border-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-[#64748B]">
                        {presentCount} of {totalLectures} attended
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          percentage >= 75
                            ? "text-[#10B981] bg-[#10B981]/10"
                            : "text-[#F43F5E] bg-[#F43F5E]/10"
                        }`}
                      >
                        {percentage >= 75 ? "On Track" : "At Risk"}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          percentage >= 75 ? "bg-[#10B981]" : "bg-[#F43F5E]"
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-[#94A3B8] mt-1.5">
                      {percentage >= 75
                        ? "✅ Meets 75% minimum requirement"
                        : "⚠️ Below 75% minimum requirement"}
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* ─── Attendance History Table ─────────────────────────── */}
            <div className="lg:col-span-3 bg-white rounded-2xl shadow-md border border-gray-50 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
                <h2 className="text-base font-semibold text-[#1E293B]">
                  Attendance History
                </h2>
                <span className="text-xs text-[#94A3B8] bg-[#F1F5F9] px-2.5 py-1 rounded-full">
                  {totalLectures} records
                </span>
              </div>

              {loading ? (
                <div className="p-6 space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="w-full h-10" />
                  ))}
                </div>
              ) : history.length === 0 ? (
                <div className="py-16 text-center">
                  <TrendingUp size={28} className="text-[#CBD5E1] mx-auto mb-3" />
                  <p className="text-sm text-[#94A3B8]">
                    No attendance records yet
                  </p>
                </div>
              ) : (
                <div className="max-h-[420px] overflow-y-auto">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-[#F8FAFC]">
                      <tr>
                        <th className="text-left text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider px-6 py-3">
                          Date
                        </th>
                        <th className="text-left text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider px-6 py-3">
                          Lecture
                        </th>
                        <th className="text-right text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider px-6 py-3">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((record, i) => (
                        <tr
                          key={i}
                          className="border-t border-gray-50 hover:bg-[#F8FAFC] transition-colors duration-100"
                        >
                          <td className="px-6 py-3 text-sm text-[#1E293B]">
                            {formatDate(record.date)}
                          </td>
                          <td className="px-6 py-3 text-sm text-[#64748B]">
                            {record.lecture}
                          </td>
                          <td className="px-6 py-3 text-right">
                            {record.status === "present" ? (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#10B981] bg-[#10B981]/10 px-2.5 py-1 rounded-full">
                                <CheckCircle2 size={12} />
                                Present
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#F43F5E] bg-[#F43F5E]/10 px-2.5 py-1 rounded-full">
                                <XCircle size={12} />
                                Absent
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
