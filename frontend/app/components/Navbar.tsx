"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md bg-[#F8FAFC]/80 border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#4F46E5] flex items-center justify-center">
            <span className="text-white font-bold text-sm">A</span>
          </div>
          <span className="text-lg font-bold text-[#1E293B]">AttendEase</span>
        </a>

        {/* Desktop buttons */}
        <div className="hidden md:flex items-center gap-3">
          <a
            href="#features"
            className="text-sm text-[#64748B] hover:text-[#1E293B] transition-colors duration-150 px-3 py-2"
          >
            Features
          </a>
          <a
            href="#how-it-works"
            className="text-sm text-[#64748B] hover:text-[#1E293B] transition-colors duration-150 px-3 py-2"
          >
            How It Works
          </a>
          <a
            href="/login"
            className="text-sm font-medium text-[#4F46E5] hover:text-[#4338CA] transition-colors duration-150 px-4 py-2 rounded-lg"
          >
            Login
          </a>
          <a
            href="/register"
            className="text-sm font-medium text-white bg-[#4F46E5] hover:bg-[#4338CA] hover:scale-105 transition-all duration-150 px-5 py-2.5 rounded-lg"
          >
            Get Started
          </a>
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden p-2 text-[#64748B] hover:text-[#1E293B]"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-gray-100 bg-white px-6 py-4 space-y-3">
          <a href="#features" className="block text-sm text-[#64748B] hover:text-[#1E293B] py-2">
            Features
          </a>
          <a href="#how-it-works" className="block text-sm text-[#64748B] hover:text-[#1E293B] py-2">
            How It Works
          </a>
          <a
            href="/login"
            className="block text-sm font-medium text-[#4F46E5] py-2"
          >
            Login
          </a>
          <a
            href="/register"
            className="block text-center text-sm font-medium text-white bg-[#4F46E5] hover:bg-[#4338CA] px-5 py-2.5 rounded-lg"
          >
            Get Started
          </a>
        </div>
      )}
    </nav>
  );
}
