import { UserPlus, CheckCircle2, LineChart } from "lucide-react";
import { ReactNode } from "react";

const steps: { icon: ReactNode; step: string; title: string; description: string }[] = [
  {
    icon: <UserPlus size={28} />,
    step: "01",
    title: "Login / Register",
    description: "Create your account or sign in with your credentials in seconds.",
  },
  {
    icon: <CheckCircle2 size={28} />,
    step: "02",
    title: "Mark Attendance",
    description: "Teachers mark attendance with a single click. Students get instant confirmation.",
  },
  {
    icon: <LineChart size={28} />,
    step: "03",
    title: "View Insights",
    description: "Access detailed reports, trends, and analytics from your personalized dashboard.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 md:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-semibold uppercase tracking-widest text-[#4F46E5]">
            How It Works
          </span>
          <h2 className="mt-3 text-3xl md:text-4xl font-bold text-[#1E293B]">
            Three simple steps to get started
          </h2>
          <p className="mt-4 text-[#64748B] text-lg">
            No complicated setup. Just sign in, mark, and track.
          </p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Connecting line (desktop) */}
          <div className="hidden md:block absolute top-16 left-[16.67%] right-[16.67%] h-px bg-gradient-to-r from-[#4F46E5]/20 via-[#4F46E5]/40 to-[#4F46E5]/20" />

          {steps.map((s, i) => (
            <div key={i} className="text-center relative">
              {/* Step circle */}
              <div className="mx-auto w-16 h-16 rounded-2xl bg-[#4F46E5]/10 text-[#4F46E5] flex items-center justify-center mb-5 relative z-10">
                {s.icon}
              </div>
              <span className="text-xs font-bold text-[#4F46E5]/50 uppercase tracking-wider">
                Step {s.step}
              </span>
              <h3 className="mt-2 text-lg font-semibold text-[#1E293B]">{s.title}</h3>
              <p className="mt-2 text-sm text-[#64748B] leading-relaxed max-w-xs mx-auto">
                {s.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
