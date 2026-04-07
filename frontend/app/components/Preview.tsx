export default function Preview() {
  const rows = [
    { name: "Alice Johnson", role: "Student", date: "2026-03-17", status: "present" },
    { name: "Bob Smith", role: "Student", date: "2026-03-17", status: "absent" },
    { name: "Carol Lee", role: "Student", date: "2026-03-17", status: "late" },
    { name: "David Kim", role: "Student", date: "2026-03-17", status: "present" },
    { name: "Eva Martinez", role: "Student", date: "2026-03-17", status: "present" },
  ];

  const statusColor: Record<string, string> = {
    present: "bg-[#10B981]/10 text-[#10B981]",
    absent: "bg-[#F43F5E]/10 text-[#F43F5E]",
    late: "bg-[#F59E0B]/10 text-[#F59E0B]",
  };

  return (
    <section id="preview" className="py-20 md:py-28">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-semibold uppercase tracking-widest text-[#4F46E5]">
            Preview
          </span>
          <h2 className="mt-3 text-3xl md:text-4xl font-bold text-[#1E293B]">
            A glimpse of the dashboard
          </h2>
          <p className="mt-4 text-[#64748B] text-lg">
            Clean, intuitive, and built for productivity.
          </p>
        </div>

        {/* Mock Dashboard */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden max-w-5xl mx-auto">
          {/* Top bar */}
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#F43F5E]" />
                <span className="w-3 h-3 rounded-full bg-[#F59E0B]" />
                <span className="w-3 h-3 rounded-full bg-[#10B981]" />
              </div>
              <span className="text-sm font-medium text-[#1E293B]">Admin Dashboard</span>
            </div>
            <span className="text-xs text-[#64748B]">March 17, 2026</span>
          </div>

          <div className="p-6">
            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-[#F8FAFC] rounded-xl p-4">
                <div className="text-xs text-[#64748B] mb-1">Total Students</div>
                <div className="text-2xl font-bold text-[#1E293B]">248</div>
              </div>
              <div className="bg-[#10B981]/5 rounded-xl p-4">
                <div className="text-xs text-[#64748B] mb-1">Present Today</div>
                <div className="text-2xl font-bold text-[#10B981]">218</div>
              </div>
              <div className="bg-[#F43F5E]/5 rounded-xl p-4">
                <div className="text-xs text-[#64748B] mb-1">Absent</div>
                <div className="text-2xl font-bold text-[#F43F5E]">19</div>
              </div>
              <div className="bg-[#F59E0B]/5 rounded-xl p-4">
                <div className="text-xs text-[#64748B] mb-1">Late</div>
                <div className="text-2xl font-bold text-[#F59E0B]">11</div>
              </div>
            </div>

            {/* Attendance percentage */}
            <div className="mb-8">
              <div className="flex items-end justify-between mb-2">
                <span className="text-sm text-[#64748B]">Overall Attendance</span>
                <span className="text-sm font-semibold text-[#10B981]">87.9%</span>
              </div>
              <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#4F46E5] to-[#2563EB] rounded-full" style={{ width: "87.9%" }} />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-[#64748B] uppercase tracking-wider border-b border-gray-100">
                    <th className="pb-3 pr-4">Name</th>
                    <th className="pb-3 pr-4 hidden sm:table-cell">Role</th>
                    <th className="pb-3 pr-4 hidden md:table-cell">Date</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-b border-gray-50 last:border-0">
                      <td className="py-3 pr-4 font-medium text-[#1E293B]">{r.name}</td>
                      <td className="py-3 pr-4 text-[#64748B] hidden sm:table-cell">{r.role}</td>
                      <td className="py-3 pr-4 text-[#64748B] hidden md:table-cell">{r.date}</td>
                      <td className="py-3">
                        <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${statusColor[r.status]}`}>
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
