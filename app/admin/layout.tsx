"use client";

import { AuthProvider, AdminProtectedRoute } from "@/components/auth";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <AdminProtectedRoute>
        <main className="dashboard-content">{children}</main>
      </AdminProtectedRoute>
    </AuthProvider>
  );
}
