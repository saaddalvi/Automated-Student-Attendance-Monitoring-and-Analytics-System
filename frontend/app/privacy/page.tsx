"use client";

import Link from "next/link";
import { ArrowLeft, ShieldCheck, Lock, EyeOff, FileText, CheckCircle } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#4F46E5] flex items-center justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <span className="text-lg font-bold text-[#1E293B]">AttendEase</span>
          </div>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#4F46E5] hover:text-[#4338CA] transition-colors"
          >
            <ArrowLeft size={14} /> Back to Home
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 sm:p-12">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#4F46E5]">
              <ShieldCheck size={26} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1E293B]">
                Device Binding Privacy Notice
              </h1>
              <p className="text-xs sm:text-sm text-[#64748B] mt-0.5">
                Compliance with India&apos;s Digital Personal Data Protection (DPDP) Act, 2023
              </p>
            </div>
          </div>

          <div className="prose prose-slate max-w-none text-sm text-[#475569] space-y-6 leading-relaxed">
            <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-5 text-indigo-950">
              <p className="font-semibold text-xs uppercase tracking-wider text-[#4F46E5] mb-1">
                Executive Notice
              </p>
              <p className="text-sm">
                AttendEase binds student accounts to a single physical device solely to verify physical presence during lectures and prevent proxy attendance. We prioritize your privacy and collect the minimum data necessary to guarantee academic integrity.
              </p>
            </div>

            <section className="space-y-3 pt-2">
              <h2 className="text-lg font-bold text-[#1E293B] flex items-center gap-2">
                <FileText size={18} className="text-[#4F46E5]" /> 1. Data Collected
              </h2>
              <p>When you log in and mark attendance, AttendEase processes only:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>
                  <strong>Cryptographic Device Identifier:</strong> A randomly generated client UUID, hashed using a secret-peppered SHA-256 algorithm on our server. The raw device ID is never exposed or shared.
                </li>
                <li>
                  <strong>Non-identifying Browser Signals:</strong> Browser type and operating system label (e.g., &ldquo;Chrome on Android&rdquo;) and device timezone.
                </li>
              </ul>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-900 text-xs flex items-start gap-2">
                <CheckCircle size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                <p>
                  <strong>What we NEVER collect:</strong> AttendEase does <em>not</em> collect hardware serial numbers, IMEI, MAC addresses, GPS tracking coordinates, contacts, photos, or browsing history.
                </p>
              </div>
            </section>

            <section className="space-y-3 pt-2">
              <h2 className="text-lg font-bold text-[#1E293B] flex items-center gap-2">
                <Lock size={18} className="text-[#4F46E5]" /> 2. Purpose of Processing
              </h2>
              <p>
                In accordance with legitimate academic verification under the DPDP Act 2023:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>To bind each student account to a single device, stopping proxy attendance.</li>
                <li>To detect multi-account logins on a single device and alert teachers.</li>
                <li>To provide an auditable reset workflow when students legitimately replace their phones.</li>
              </ul>
            </section>

            <section className="space-y-3 pt-2">
              <h2 className="text-lg font-bold text-[#1E293B] flex items-center gap-2">
                <EyeOff size={18} className="text-[#4F46E5]" /> 3. Data Retention &amp; Revocation
              </h2>
              <p>
                Device bindings and audit logs are retained strictly for the duration of the student&apos;s active academic enrollment. When a device reset is approved and a new device is bound, the previous device identifier is permanently revoked.
              </p>
            </section>

            <section className="space-y-3 pt-2">
              <h2 className="text-lg font-bold text-[#1E293B]">4. Student Rights &amp; Device Recovery</h2>
              <p>
                If you purchase a new phone, lose your device, or perform a factory reset, you have the right to request a device unbinding directly from your student dashboard. Your enrolled course teachers can review and approve your request within 24 hours.
              </p>
            </section>

            <div className="pt-6 border-t border-gray-100 text-xs text-[#94A3B8]">
              Last updated: October 12, 2026 · AttendEase Institutional Privacy Office
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
