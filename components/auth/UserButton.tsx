"use client";

import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth/auth-client";
import { useAuth } from "./AuthProvider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function UserButton() {
  const { user, isLogin, isLoading } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
    router.refresh();
  };

  if (isLoading) {
    return (
      <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse"></div>
    );
  }

  if (!isLogin || !user) {
    return (
      <Button variant="outline" onClick={() => router.push("/login")}>
        ログイン
      </Button>
    );
  }

  // Twitter _normal (48x48) → _bigger (73x73) for better avatar quality
  const avatarImage = user.image?.replace(/_normal\./, "_bigger.");

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : user.email[0].toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            {avatarImage && <AvatarImage src={avatarImage} alt={user.name || ""} />}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            {user.name && (
              <p className="text-sm font-medium leading-none">{user.name}</p>
            )}
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>ログアウト</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
