import { ShieldCheck, Users, Clock, BarChart3 } from "lucide-react";
import { ReactNode } from "react";

const features: { icon: ReactNode; title: string; description: string }[] = [
  {
    icon: <ShieldCheck size={24} />,
    title: "Secure Authentication",
    description:
      "JWT-based authentication with bcrypt password hashing ensures your data stays protected.",
  },
  {
    icon: <Users size={24} />,
    title: "Role-Based Access",
    description:
      "Fine-grained permissions for students, teachers, and admins — each sees only what they need.",
  },
  {
    icon: <Clock size={24} />,
    title: "Real-Time Tracking",
    description:
      "Mark and monitor attendance instantly. No delays, no manual sheets, no errors.",
  },
  {
    icon: <BarChart3 size={24} />,
    title: "Analytics Dashboard",
    description:
      "Visual insights into attendance patterns, trends, and statistics at a glance.",
  },
];

export default function Features() {
  return (
    <section id="features" className="py-20 md:py-28">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-semibold uppercase tracking-widest text-[#4F46E5]">
            Features
          </span>
          <h2 className="mt-3 text-3xl md:text-4xl font-bold text-[#1E293B]">
            Everything you need to manage attendance
          </h2>
          <p className="mt-4 text-[#64748B] text-lg">
            Built with modern technologies and designed for simplicity.
          </p>
        </div>

        {/* Cards grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <div
              key={i}
              className="bg-white rounded-xl shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-150 p-6 border border-gray-50 group"
            >
              <div className="w-12 h-12 rounded-xl bg-[#4F46E5]/10 text-[#4F46E5] flex items-center justify-center mb-4 group-hover:bg-[#4F46E5] group-hover:text-white transition-colors duration-150">
                {f.icon}
              </div>
              <h3 className="text-base font-semibold text-[#1E293B] mb-2">
                {f.title}
              </h3>
              <p className="text-sm text-[#64748B] leading-relaxed">
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
