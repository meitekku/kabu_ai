"use client";

import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth/auth-client";
import { useAuth } from "./AuthProvider";
import { Button } from "@/components/ui/button";

interface LoginButtonProps {
  className?: string;
}

export function LoginButton({ className }: LoginButtonProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const handleClick = async () => {
    if (isAuthenticated) {
      await signOut();
      router.push("/login");
      router.refresh();
    } else {
      router.push("/login");
    }
  };

  if (isLoading) {
    return (
      <Button variant="outline" className={className} disabled>
        読み込み中...
      </Button>
    );
  }

  return (
    <Button variant="outline" className={className} onClick={handleClick}>
      {isAuthenticated ? "ログアウト" : "ログイン"}
    </Button>
  );
}
