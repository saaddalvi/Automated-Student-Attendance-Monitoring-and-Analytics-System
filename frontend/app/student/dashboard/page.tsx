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
} from "lucide-react";
import AuthGuard from "../../components/AuthGuard";
import Skeleton from "../../components/Skeleton";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../../lib/api";
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
        const [classRes, summaryRes] = await Promise.all([
          api.get("/api/student/classes"),
          api.get("/api/attendance/summary/me"),
        ]);
        setClasses(classRes.data.data.classes);

        // Build a lookup map: classId -> summary
        const map: Record<string, ClassSummary> = {};
        for (const s of summaryRes.data.data.classes) {
          map[s.classId] = s;
        }
        setSummaryMap(map);
        setOverallAttendance(summaryRes.data.data.overall.percentage);
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
    router.push("/login");
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
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#4F46E5] flex items-center justify-center">
                <span className="text-white font-bold text-sm">A</span>
              </div>
              <span className="text-lg font-bold text-[#1E293B]">
                AttendEase
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#4F46E5]/10 flex items-center justify-center">
                <span className="text-[#4F46E5] font-semibold text-xs">S</span>
              </div>
              <span className="hidden sm:inline text-sm font-medium text-[#1E293B]">
                {userName || "Student"}
              </span>
              <button
                onClick={handleLogout}
                className="ml-1 p-1.5 rounded-lg text-[#94A3B8] hover:text-[#F43F5E] hover:bg-[#F43F5E]/5 transition-all duration-150 cursor-pointer"
                title="Logout"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 py-8">
          {/* Welcome */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-1">
              <LayoutDashboard size={22} className="text-[#4F46E5]" />
              <h1 className="text-2xl font-bold text-[#1E293B]">Dashboard</h1>
            </div>
            <p className="text-sm text-[#64748B]">
              Welcome back, <span className="font-medium text-[#1E293B]">{userName || "Student"}</span>
            </p>
          </div>

          {/* Stats + Actions Row */}
          <div className="grid md:grid-cols-4 gap-4 mb-8">
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
                            { name: "Present", value: overallAttendance },
                            { name: "Absent", value: 100 - overallAttendance },
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={65}
                          outerRadius={90}
                          paddingAngle={4}
                          dataKey="value"
                          strokeWidth={0}
                        >
                          {[0, 1].map((index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={PIE_COLORS[index]}
                              className="transition-all duration-300"
                            />
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
                          formatter={(value: any) => [`${value}%`]}
                        />
                      </PieChart>
                    </ResponsiveContainer>

                    {/* Center label */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="text-center">
                        <p className="text-3xl font-bold text-[#1E293B]">
                          {overallAttendance}%
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
                        Present ({overallAttendance}%)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#F43F5E]" />
                      <span className="text-xs text-[#64748B]">
                        Absent ({100 - overallAttendance}%)
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* ─── Classes List ────────────────────────────────────────── */}
            <div className="lg:col-span-3">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BookOpen size={18} className="text-[#4F46E5]" />
                  <h2 className="text-base font-semibold text-[#1E293B]">
                    My Classes
                  </h2>
                </div>
                {!loading && classes.length > 0 && (
                  <span className="text-xs text-[#94A3B8] bg-[#F1F5F9] px-2.5 py-1 rounded-full">
                    {classes.length} class{classes.length !== 1 && "es"}
                  </span>
                )}
              </div>

              {/* Loading skeleton */}
              {loading && (
                <div className="grid md:grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="bg-white rounded-2xl shadow-md border border-gray-50 p-5"
                    >
                      <Skeleton className="w-10 h-10 rounded-xl mb-3" />
                      <Skeleton className="w-2/3 h-5 mb-2" />
                      <Skeleton className="w-1/2 h-3" />
                    </div>
                  ))}
                </div>
              )}

              {/* Empty state */}
              {!loading && classes.length === 0 && (
                <div className="bg-white rounded-2xl shadow-md border border-gray-50 p-12 text-center">
                  <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 rounded-2xl bg-[#4F46E5]/5 flex items-center justify-center">
                      <Inbox size={28} className="text-[#4F46E5]/40" />
                    </div>
                  </div>
                  <h3 className="text-base font-semibold text-[#1E293B] mb-1">
                    No classes yet
                  </h3>
                  <p className="text-sm text-[#94A3B8] mb-5">
                    Join a class to get started
                  </p>
                  <button
                    onClick={() => router.push("/student/join-class")}
                    className="inline-flex items-center gap-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-all duration-150 shadow-md shadow-[#4F46E5]/20 cursor-pointer"
                  >
                    <UserPlus size={16} />
                    Join a Class
                  </button>
                </div>
              )}

              {/* Class cards */}
              {!loading && classes.length > 0 && (
                <div className="grid md:grid-cols-2 gap-4">
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
                        className="bg-white rounded-2xl shadow-md border border-gray-50 p-5 text-left hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group"
                      >
                        {/* Top row: icon + attendance badge */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="w-10 h-10 rounded-xl bg-[#4F46E5]/10 flex items-center justify-center">
                            <BookOpen
                              size={18}
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
      </div>
    </AuthGuard>
  );
}
