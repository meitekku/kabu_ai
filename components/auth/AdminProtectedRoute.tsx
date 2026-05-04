"use client";

import { useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { isAdminRole } from "@/lib/auth/admin";

interface AdminProtectedRouteProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function AdminProtectedRoute({
  children,
  fallback = null,
}: AdminProtectedRouteProps) {
  const { isLogin, isLoading, user } = useAuth();
  const router = useRouter();

  const isAdmin = isAdminRole(user?.role);

  useEffect(() => {
    if (!isLoading) {
      if (!isLogin) {
        // 未ログインの場合は/loginへリダイレクト
        router.push("/login");
      } else if (!isAdmin) {
        // ログイン済みだが管理者でない場合はトップへリダイレクト
        router.push("/");
      }
    }
  }, [isLogin, isLoading, isAdmin, router]);

  if (isLoading) {
    return (
      fallback || (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      )
    );
  }

  if (!isLogin || !isAdmin) {
    return null;
  }

  return <>{children}</>;
}
