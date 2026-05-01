"use client";

import { useEffect, useState, useCallback } from "react";
import {
  X,
  CheckCircle2,
  XCircle,
  Loader2,
  Save,
} from "lucide-react";
import api from "../../lib/api";
import toast from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StudentAttendance {
  userId: string;
  name: string;
  status: "present" | "absent";
}

interface SessionAttendanceModalProps {
  sessionId: string;
  lecture: string;
  date: string;
  onClose: () => void;
  onSaved: () => void; // callback to refresh parent data
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SessionAttendanceModal({
  sessionId,
  lecture,
  date,
  onClose,
  onSaved,
}: SessionAttendanceModalProps) {
  const [students, setStudents] = useState<StudentAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalData, setOriginalData] = useState<string>(""); // JSON snapshot for diff

  // ─── Fetch session attendance details ───────────────────────────────────

  const fetchDetails = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/attendance/session/${sessionId}`);
      const data = res.data.data;

      // Merge present + absent into a single flat list
      const merged: StudentAttendance[] = [
        ...data.present.map((s: { id: string; name: string }) => ({
          userId: s.id,
          name: s.name,
          status: "present" as const,
        })),
        ...data.absent.map((s: { id: string; name: string }) => ({
          userId: s.id,
          name: s.name,
          status: "absent" as const,
        })),
      ].sort((a, b) => a.name.localeCompare(b.name));

      setStudents(merged);
      setOriginalData(JSON.stringify(merged));
      setHasChanges(false);
    } catch {
      toast.error("Failed to load attendance details");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  // ─── Close on Escape ────────────────────────────────────────────────────

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  // ─── Toggle status ──────────────────────────────────────────────────────

  const toggleStatus = (userId: string) => {
    setStudents((prev) => {
      const updated = prev.map((s) =>
        s.userId === userId
          ? { ...s, status: s.status === "present" ? ("absent" as const) : ("present" as const) }
          : s
      );
      setHasChanges(JSON.stringify(updated) !== originalData);
      return updated;
    });
  };

  // ─── Save ───────────────────────────────────────────────────────────────

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(
        `/api/attendance/session/${sessionId}`,
        students.map((s) => ({ userId: s.userId, status: s.status }))
      );
      toast.success("Attendance updated!");
      onSaved();
      onClose();
    } catch {
      toast.error("Failed to save attendance");
    } finally {
      setSaving(false);
    }
  };

  // ─── Counts ─────────────────────────────────────────────────────────────

  const presentCount = students.filter((s) => s.status === "present").length;
  const absentCount = students.filter((s) => s.status === "absent").length;

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 bg-white rounded-2xl shadow-2xl border border-gray-100 max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-[#1E293B]">{lecture}</h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              {new Date(date).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-[#94A3B8] hover:text-[#1E293B] hover:bg-gray-100 transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Stats bar */}
        {!loading && (
          <div className="flex gap-3 px-6 py-3 border-b border-gray-50 bg-[#F8FAFC]">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#10B981] bg-[#10B981]/10 px-3 py-1.5 rounded-full">
              <CheckCircle2 size={12} />
              {presentCount} Present
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#F43F5E] bg-[#F43F5E]/10 px-3 py-1.5 rounded-full">
              <XCircle size={12} />
              {absentCount} Absent
            </span>
            <span className="ml-auto text-xs text-[#94A3B8]">
              {students.length} total
            </span>
          </div>
        )}

        {/* Student list */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 size={24} className="text-[#4F46E5] animate-spin mb-3" />
              <p className="text-sm text-[#64748B]">Loading students…</p>
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-[#94A3B8]">No students enrolled in this class.</p>
            </div>
          ) : (
            students.map((student) => {
              const isPresent = student.status === "present";
              return (
                <button
                  key={student.userId}
                  onClick={() => toggleStatus(student.userId)}
                  className={`w-full flex items-center justify-between rounded-xl border p-3.5 transition-all duration-150 cursor-pointer ${
                    isPresent
                      ? "border-[#10B981]/20 bg-[#10B981]/5 hover:bg-[#10B981]/10"
                      : "border-[#F43F5E]/20 bg-[#F43F5E]/5 hover:bg-[#F43F5E]/10"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                        isPresent
                          ? "bg-[#10B981]/10 text-[#10B981]"
                          : "bg-[#F43F5E]/10 text-[#F43F5E]"
                      }`}
                    >
                      {student.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-[#1E293B]">
                      {student.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isPresent ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#10B981] bg-[#10B981]/10 px-2.5 py-1 rounded-full">
                        <CheckCircle2 size={12} />
                        Present
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#F43F5E] bg-[#F43F5E]/10 px-2.5 py-1 rounded-full">
                        <XCircle size={12} />
                        Absent
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer with save */}
        {!loading && students.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-[#94A3B8]">
              {hasChanges ? "You have unsaved changes" : "Click a student to toggle status"}
            </p>
            <button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className="inline-flex items-center gap-2 bg-[#4F46E5] hover:bg-[#4338CA] disabled:bg-[#4F46E5]/40 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-all duration-150 shadow-md shadow-[#4F46E5]/20 cursor-pointer"
            >
              {saving ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save size={14} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
