"use client";

import { usePathname } from "next/navigation";
import { AuthProvider, ProtectedRoute } from "@/components/auth";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/admin/login";

  return (
    <AuthProvider>
      {isLoginPage ? (
        <main className="dashboard-content">{children}</main>
      ) : (
        <ProtectedRoute redirectTo="/login">
          <main className="dashboard-content">{children}</main>
        </ProtectedRoute>
      )}
    </AuthProvider>
  );
}
