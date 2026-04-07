import { ArrowRight } from "lucide-react";

export default function CTA() {
  return (
    <section className="py-20 md:py-28 bg-gradient-to-br from-[#EEF2FF] to-[#E0E7FF]">
      <div className="max-w-3xl mx-auto px-6 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-[#1E293B]">
          Start managing attendance smarter today
        </h2>
        <p className="mt-4 text-lg text-[#64748B] max-w-xl mx-auto">
          Join hundreds of institutions already using AttendEase to streamline
          their attendance workflow.
        </p>
        <a
          href="/register"
          className="inline-flex items-center gap-2 mt-8 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-medium text-sm px-8 py-4 rounded-xl transition-all duration-150 shadow-lg shadow-[#4F46E5]/25 hover:shadow-xl hover:shadow-[#4F46E5]/30"
        >
          Get Started
          <ArrowRight size={16} />
        </a>
      </div>
    </section>
  );
}
