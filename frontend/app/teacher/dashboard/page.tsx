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

export default function TeacherDashboard() {
  const router = useRouter();
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

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

    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const res = await api.get("/api/classes");
      setClasses(res.data.data.classes);
    } catch (error) {
      console.error("Failed to fetch classes:", error);
      toast.error("Failed to load classes");
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
                className="text-[#64748B] hover:text-[#F43F5E] transition-colors duration-150"
                title="Logout"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 py-10">
          {/* Header row with title + Create button */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <LayoutDashboard size={20} className="text-[#4F46E5]" />
              <h1 className="text-2xl font-bold text-[#1E293B]">Dashboard</h1>
            </div>
            <button
              onClick={() => router.push("/teacher/create-class")}
              className="inline-flex items-center gap-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm hover:shadow-md transition-all duration-150 cursor-pointer"
            >
              <Plus size={16} />
              Create Class
            </button>
          </div>
          <p className="text-[#64748B] mb-8">
            Select a class to manage attendance
          </p>

          {/* Loading skeleton state */}
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

          {/* Empty state */}
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

          {/* Class cards */}
          {!loading && classes.length > 0 && (
            <div className="grid md:grid-cols-3 gap-6">
              {classes.map((cls) => (
                <button
                  key={cls.id}
                  onClick={() => router.push(`/teacher/class/${cls.id}`)}
                  className="group bg-white rounded-xl shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-150 p-5 border border-gray-50 text-left cursor-pointer"
                >
                  {/* Icon */}
                  <div className="w-12 h-12 rounded-xl bg-[#4F46E5]/10 text-[#4F46E5] flex items-center justify-center mb-4 group-hover:bg-[#4F46E5] group-hover:text-white transition-colors duration-150">
                    <BookOpen size={22} />
                  </div>

                  {/* Class code badge */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="inline-block text-xs font-bold tracking-widest text-[#4F46E5] bg-[#4F46E5]/10 px-2.5 py-1 rounded-full">
                      {cls.classCode}
                    </span>
                    <button
                      onClick={(e) => handleCopyCode(e, cls.classCode)}
                      className="text-[#94A3B8] hover:text-[#4F46E5] transition-colors duration-150"
                      title="Copy class code"
                    >
                      {copiedCode === cls.classCode ? (
                        <Check size={14} className="text-emerald-500" />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                  </div>

                  {/* Class name */}
                  <h3 className="text-base font-semibold text-[#1E293B] mb-2">
                    {cls.className}
                  </h3>

                  {/* Meta info */}
                  <div className="flex items-center gap-3 text-xs text-[#64748B]">
                    <span>{cls.department}</span>
                    <span className="w-1 h-1 bg-gray-300 rounded-full" />
                    <span>Year {cls.year}</span>
                    <span className="w-1 h-1 bg-gray-300 rounded-full" />
                    <span>Div {cls.division}</span>
                  </div>

                  {/* Hover CTA */}
                  <div className="mt-4 flex items-center gap-1 text-xs font-medium text-[#4F46E5] opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                    Manage class <ChevronRight size={14} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}
