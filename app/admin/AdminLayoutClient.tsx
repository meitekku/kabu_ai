"use client";

import { AdminProtectedRoute } from "@/components/auth";

export default function AdminLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminProtectedRoute>
      <main className="dashboard-content">{children}</main>
    </AdminProtectedRoute>
  );
}
