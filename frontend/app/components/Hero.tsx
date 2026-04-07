import { ArrowRight, PlayCircle } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#EEF2FF] via-[#F8FAFC] to-[#F0F9FF] -z-10" />
      <div className="absolute top-20 right-0 w-96 h-96 bg-[#4F46E5]/5 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 left-10 w-72 h-72 bg-[#2563EB]/5 rounded-full blur-3xl -z-10" />

      <div className="max-w-7xl mx-auto px-6 py-20 md:py-32">
        <div className="flex flex-col md:flex-row items-center gap-12 md:gap-16">
          {/* Left — Text */}
          <div className="flex-1 text-center md:text-left">
            <div className="inline-flex items-center gap-2 bg-[#4F46E5]/10 text-[#4F46E5] text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4F46E5]" />
              Automated Attendance System
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#1E293B] leading-tight tracking-tight">
              Smart Attendance,{" "}
              <span className="text-[#4F46E5]">Simplified</span>
            </h1>

            <p className="mt-6 text-lg text-[#64748B] leading-relaxed max-w-lg mx-auto md:mx-0">
              A clean and efficient system to track, manage, and analyze
              attendance in real time.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center gap-4 justify-center md:justify-start">
              <a
                href="/register"
                className="inline-flex items-center gap-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-medium text-sm px-7 py-3.5 rounded-xl transition-all duration-150 shadow-lg shadow-[#4F46E5]/25 hover:shadow-xl hover:shadow-[#4F46E5]/30"
              >
                Get Started
                <ArrowRight size={16} />
              </a>
              <a
                href="#preview"
                className="inline-flex items-center gap-2 text-[#64748B] hover:text-[#1E293B] font-medium text-sm px-6 py-3.5 rounded-xl border border-gray-200 hover:border-gray-300 transition-all duration-150 bg-white"
              >
                <PlayCircle size={16} />
                View Demo
              </a>
            </div>

            {/* Micro-stats */}
            <div className="mt-12 flex items-center gap-8 justify-center md:justify-start text-sm text-[#64748B]">
              <div>
                <span className="block text-2xl font-bold text-[#1E293B]">99.9%</span>
                Uptime
              </div>
              <div className="w-px h-10 bg-gray-200" />
              <div>
                <span className="block text-2xl font-bold text-[#1E293B]">500+</span>
                Users
              </div>
              <div className="w-px h-10 bg-gray-200" />
              <div>
                <span className="block text-2xl font-bold text-[#1E293B]">Real-time</span>
                Tracking
              </div>
            </div>
          </div>

          {/* Right — Illustration (abstract dashboard card) */}
          <div className="flex-1 w-full max-w-md md:max-w-lg">
            <div className="relative">
              {/* Main card */}
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 space-y-4">
                {/* Header bar */}
                <div className="flex items-center justify-between">
                  <div className="flex gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-[#F43F5E]" />
                    <span className="w-3 h-3 rounded-full bg-[#F59E0B]" />
                    <span className="w-3 h-3 rounded-full bg-[#10B981]" />
                  </div>
                  <span className="text-xs text-[#64748B]">Dashboard</span>
                </div>

                {/* Stat row */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-[#10B981]/10 rounded-xl p-3 text-center">
                    <div className="text-xl font-bold text-[#10B981]">87%</div>
                    <div className="text-xs text-[#64748B] mt-1">Present</div>
                  </div>
                  <div className="bg-[#F43F5E]/10 rounded-xl p-3 text-center">
                    <div className="text-xl font-bold text-[#F43F5E]">8%</div>
                    <div className="text-xs text-[#64748B] mt-1">Absent</div>
                  </div>
                  <div className="bg-[#F59E0B]/10 rounded-xl p-3 text-center">
                    <div className="text-xl font-bold text-[#F59E0B]">5%</div>
                    <div className="text-xs text-[#64748B] mt-1">Late</div>
                  </div>
                </div>

                {/* Fake chart bars */}
                <div className="flex items-end gap-1.5 h-20 px-2">
                  {[65, 80, 45, 90, 70, 85, 55, 92, 78, 88, 60, 95].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-t bg-[#4F46E5]/20 hover:bg-[#4F46E5]/40 transition-colors duration-150"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              </div>

              {/* Floating badge */}
              <div className="absolute -bottom-4 -left-4 bg-white rounded-xl shadow-lg border border-gray-100 px-4 py-2 flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#10B981]/10 flex items-center justify-center">
                  <span className="text-[#10B981] text-sm font-bold">✓</span>
                </div>
                <div>
                  <div className="text-xs font-semibold text-[#1E293B]">Attendance Marked</div>
                  <div className="text-xs text-[#64748B]">Just now</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
