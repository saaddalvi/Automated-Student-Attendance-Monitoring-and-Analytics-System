"use client";

import { Toaster } from "react-hot-toast";

export default function ToasterProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 3000,
        style: {
          background: "#1E293B",
          color: "#F8FAFC",
          fontSize: "14px",
          borderRadius: "12px",
          padding: "12px 16px",
        },
        success: {
          iconTheme: { primary: "#10B981", secondary: "#F8FAFC" },
        },
        error: {
          iconTheme: { primary: "#F43F5E", secondary: "#F8FAFC" },
        },
      }}
    />
  );
}
