export default function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-white">
      <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-[#64748B]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-[#4F46E5] flex items-center justify-center">
            <span className="text-white font-bold text-xs">A</span>
          </div>
          <span className="font-semibold text-[#1E293B]">AttendEase</span>
        </div>

        <p className="text-center md:text-right">
          Built with{" "}
          <span className="font-medium text-[#1E293B]">
            Node.js, Express, Sequelize, PostgreSQL &amp; Next.js
          </span>
        </p>
      </div>
    </footer>
  );
}
