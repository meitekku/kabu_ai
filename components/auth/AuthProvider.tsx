"use client";

import { createContext, useContext, ReactNode } from "react";
import { useSession as useBetterAuthSession } from "@/lib/auth/auth-client";

interface User {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface Session {
  user: User;
  session: {
    id: string;
    expiresAt: Date;
    token: string;
  };
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isLogin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: true,
  isLogin: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, isPending } = useBetterAuthSession();

  const value: AuthContextType = {
    user: session?.user || null,
    session: session || null,
    isLoading: isPending,
    isLogin: !!session?.user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
