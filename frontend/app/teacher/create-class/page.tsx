"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, BookOpen, Loader2 } from "lucide-react";
import AuthGuard from "../../components/AuthGuard";
import { useState } from "react";
import toast from "react-hot-toast";
import api from "../../lib/api";

export default function CreateClassPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    className: "",
    department: "",
    year: "",
    division: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { className, department, year, division } = form;

    if (!className.trim() || !department.trim() || !year.trim() || !division.trim()) {
      toast.error("All fields are required");
      return;
    }

    setLoading(true);
    try {
      await api.post("/api/classes", { className, department, year, division });
      toast.success("Class created successfully");
      router.push("/teacher/dashboard");
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || "Failed to create class");
    } finally {
      setLoading(false);
    }
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
          </div>
        </header>

        <main className="max-w-xl mx-auto px-6 py-10">
          {/* Back link */}
          <button
            onClick={() => router.push("/teacher/dashboard")}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#64748B] hover:text-[#4F46E5] transition-colors duration-150 mb-8 cursor-pointer"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </button>

          {/* Form card */}
          <div className="bg-white rounded-xl shadow-md border border-gray-50 p-6">
            {/* Title */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[#4F46E5]/10 text-[#4F46E5] flex items-center justify-center">
                <BookOpen size={20} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#1E293B]">Create New Class</h1>
                <p className="text-sm text-[#94A3B8]">
                  A unique class code will be generated automatically
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Class Name */}
              <div>
                <label htmlFor="className" className="block text-sm font-medium text-[#1E293B] mb-1.5">
                  Class Name
                </label>
                <input
                  id="className"
                  name="className"
                  type="text"
                  placeholder="e.g. Web Development A"
                  value={form.className}
                  onChange={handleChange}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-[#1E293B] placeholder:text-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/40 focus:border-[#4F46E5] transition-all duration-150"
                />
              </div>

              {/* Department */}
              <div>
                <label htmlFor="department" className="block text-sm font-medium text-[#1E293B] mb-1.5">
                  Department
                </label>
                <input
                  id="department"
                  name="department"
                  type="text"
                  placeholder="e.g. Computer Science"
                  value={form.department}
                  onChange={handleChange}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-[#1E293B] placeholder:text-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/40 focus:border-[#4F46E5] transition-all duration-150"
                />
              </div>

              {/* Year & Division row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="year" className="block text-sm font-medium text-[#1E293B] mb-1.5">
                    Year
                  </label>
                  <select
                    id="year"
                    name="year"
                    value={form.year}
                    onChange={handleChange}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/40 focus:border-[#4F46E5] transition-all duration-150 bg-white"
                  >
                    <option value="">Select year</option>
                    <option value="1">1st Year</option>
                    <option value="2">2nd Year</option>
                    <option value="3">3rd Year</option>
                    <option value="4">4th Year</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="division" className="block text-sm font-medium text-[#1E293B] mb-1.5">
                    Division
                  </label>
                  <input
                    id="division"
                    name="division"
                    type="text"
                    placeholder="e.g. A"
                    value={form.division}
                    onChange={handleChange}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-[#1E293B] placeholder:text-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/40 focus:border-[#4F46E5] transition-all duration-150"
                  />
                </div>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#4F46E5] hover:bg-[#4338CA] disabled:bg-[#4F46E5]/60 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 rounded-xl shadow-sm hover:shadow-md transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Class"
                )}
              </button>
            </form>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
