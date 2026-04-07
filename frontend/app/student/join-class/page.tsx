"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, KeyRound, Loader2 } from "lucide-react";
import AuthGuard from "../../components/AuthGuard";
import toast from "react-hot-toast";
import api from "../../lib/api";

export default function JoinClassPage() {
  const router = useRouter();
  const [classCode, setClassCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = classCode.trim().toUpperCase();
    if (!trimmed) {
      toast.error("Please enter a class code");
      return;
    }

    setLoading(true);
    try {
      await api.post("/api/classes/join", { classCode: trimmed });
      toast.success("Joined class successfully!");
      router.push("/student/dashboard");
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || "Failed to join class");
    } finally {
      setLoading(false);
    }
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

        <main className="flex items-center justify-center px-6" style={{ minHeight: "calc(100vh - 65px)" }}>
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
            <div className="bg-white rounded-2xl shadow-md border border-gray-50 p-6 md:p-8">
              {/* Title */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-11 h-11 rounded-xl bg-[#4F46E5]/10 text-[#4F46E5] flex items-center justify-center">
                  <KeyRound size={22} />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-[#1E293B]">Join a Class</h1>
                  <p className="text-sm text-[#94A3B8]">
                    Enter the code shared by your teacher
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Class Code Input */}
                <div>
                  <label
                    htmlFor="classCode"
                    className="block text-sm font-medium text-[#1E293B] mb-1.5"
                  >
                    Class Code
                  </label>
                  <input
                    id="classCode"
                    type="text"
                    placeholder="e.g. JTCIV8"
                    value={classCode}
                    onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                    maxLength={8}
                    autoFocus
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-center text-lg font-bold tracking-[0.3em] text-[#1E293B] placeholder:text-[#CBD5E1] placeholder:font-normal placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/40 focus:border-[#4F46E5] transition-all duration-150 uppercase"
                  />
                  <p className="mt-1.5 text-xs text-[#94A3B8]">
                    The code is usually 6 characters, provided by your teacher
                  </p>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={loading || !classCode.trim()}
                  className="w-full flex items-center justify-center gap-2 bg-[#4F46E5] hover:bg-[#4338CA] hover:scale-[1.01] disabled:bg-[#4F46E5]/40 disabled:cursor-not-allowed disabled:hover:scale-100 text-white text-sm font-semibold py-3 rounded-xl shadow-lg shadow-[#4F46E5]/25 hover:shadow-xl transition-all duration-150 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Joining…
                    </>
                  ) : (
                    "Join Class"
                  )}
                </button>
              </form>
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
