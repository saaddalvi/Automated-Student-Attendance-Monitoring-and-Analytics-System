"use client";

import { useState, FormEvent } from "react";
import { UserPlus, Eye, EyeOff, Loader2 } from "lucide-react";
import api from "../lib/api";
import axios from "axios";
import toast from "react-hot-toast";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name || !email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/api/auth/register", {
        name,
        email,
        password,
        role,
      });

      const { token, user } = res.data.data;
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      toast.success("Account created successfully!");
      window.location.href = "/teacher/dashboard";
    } catch (err: unknown) {
      let message = "Something went wrong. Please try again.";
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        message = err.response.data.message;
      }
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-4">
      {/* Background blobs */}
      <div className="absolute top-20 left-10 w-80 h-80 bg-[#4F46E5]/5 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-[#2563EB]/5 rounded-full blur-3xl" />

      <div className="relative w-full max-w-4xl grid md:grid-cols-2 bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        {/* Left — Branding */}
        <div className="hidden md:flex flex-col justify-between bg-gradient-to-br from-[#4F46E5] to-[#2563EB] p-10 text-white">
          <div>
            <div className="flex items-center gap-2 mb-12">
              <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur">
                <span className="font-bold text-sm">A</span>
              </div>
              <span className="text-lg font-bold">AttendEase</span>
            </div>

            <h2 className="text-3xl font-bold leading-snug">
              Join the smart attendance revolution
            </h2>
            <p className="mt-4 text-white/70 leading-relaxed">
              Create your account and start tracking attendance in real time.
              Setup takes less than a minute.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-10">
            <div className="bg-white/10 backdrop-blur rounded-xl p-3 text-center">
              <div className="text-lg font-bold">Free</div>
              <div className="text-xs text-white/60 mt-0.5">To Start</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-3 text-center">
              <div className="text-lg font-bold">30s</div>
              <div className="text-xs text-white/60 mt-0.5">Setup</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-3 text-center">
              <div className="text-lg font-bold">Secure</div>
              <div className="text-xs text-white/60 mt-0.5">JWT Auth</div>
            </div>
          </div>
        </div>

        {/* Right — Register form */}
        <div className="p-6 md:p-10 flex flex-col justify-center">
          {/* Mobile logo */}
          <div className="md:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-[#4F46E5] flex items-center justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <span className="text-lg font-bold text-[#1E293B]">AttendEase</span>
          </div>

          <h1 className="text-2xl font-bold text-[#1E293B]">Create account</h1>
          <p className="mt-1 text-sm text-[#64748B]">
            Fill in your details to get started
          </p>

          {error && (
            <div className="mt-5 bg-[#F43F5E]/10 border border-[#F43F5E]/20 text-[#F43F5E] text-sm px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-[#1E293B] mb-1.5">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                autoComplete="name"
                className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-[#1E293B] placeholder:text-[#94A3B8] outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent transition-all duration-150"
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#1E293B] mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-[#1E293B] placeholder:text-[#94A3B8] outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent transition-all duration-150"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#1E293B] mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  autoComplete="new-password"
                  className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 pr-10 text-sm text-[#1E293B] placeholder:text-[#94A3B8] outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent transition-all duration-150"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748B] transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Role */}
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-[#1E293B] mb-1.5">
                Role
              </label>
              <div className="flex gap-2">
                {(["student", "teacher"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`flex-1 text-sm font-medium py-2.5 rounded-lg border transition-all duration-150 capitalize ${
                      role === r
                        ? "bg-[#4F46E5] text-white border-[#4F46E5] shadow-md shadow-[#4F46E5]/20"
                        : "bg-white text-[#64748B] border-gray-200 hover:border-[#4F46E5]/40 hover:text-[#4F46E5]"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-[#4F46E5] hover:bg-[#4338CA] hover:scale-[1.02] hover:shadow-xl disabled:bg-[#4F46E5]/60 disabled:cursor-not-allowed disabled:hover:scale-100 text-white font-medium text-sm px-5 py-3 rounded-xl transition-all duration-150 shadow-lg shadow-[#4F46E5]/25"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Creating account…
                </>
              ) : (
                <>
                  <UserPlus size={16} />
                  Register
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-[#64748B]">
            Already have an account?{" "}
            <a
              href="/login"
              className="text-[#4F46E5] hover:text-[#4338CA] font-medium transition-colors duration-150"
            >
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
