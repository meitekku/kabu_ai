'use client';

import CompanySearch from "@/components/parts/common/CompanySearch";
import { CurrentPriceInfo } from "@/components/common/CurrentPriceInfo";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from 'next/image';
import { useState, useRef, useEffect, Suspense } from 'react';
import { Crown, Settings, LogOut, LogIn, ChevronDown } from 'lucide-react';
import { useSession, signOut } from '@/lib/auth/auth-client';

const UserMenu = ({ user }: { user: { name?: string | null; email?: string | null; image?: string | null } }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
    router.refresh();
  };

  const displayName = user.name || user.email?.split('@')[0] || 'ユーザー';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
      >
        {user.image ? (
          <Image
            src={user.image}
            alt={displayName}
            width={32}
            height={32}
            className="rounded-full"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-sm font-medium">
            {initial}
          </div>
        )}
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
          <div className="px-4 py-2 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
          </div>

          <div className="py-1">
            <Link
              href="/premium"
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              onClick={() => setIsOpen(false)}
            >
              <Crown className="w-4 h-4 text-amber-500" />
              プレミアム
            </Link>
            <Link
              href="/settings/billing"
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              onClick={() => setIsOpen(false)}
            >
              <Settings className="w-4 h-4 text-gray-500" />
              請求・プラン管理
            </Link>
          </div>

          <div className="border-t border-gray-100 py-1">
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              <LogOut className="w-4 h-4" />
              ログアウト
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const HeaderContent = ({ isRoot, pathname, user, isDark }: {
  isRoot: boolean;
  pathname: string;
  user: { name?: string | null; email?: string | null; image?: string | null } | null;
  isDark?: boolean;
}) => {
  const [showLoginButton, setShowLoginButton] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    // localhostまたは?test=1パラメータがある場合のみログインボタンを表示
    const hostname = window.location.hostname;
    const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";
    const hasTestParam = searchParams.get("test") === "1";
    setShowLoginButton(isLocalhost || hasTestParam);
  }, [searchParams]);

  const commonClasses = "logo pl-4 text-center w-full text-xl";
  const icon = <Image src='/logo.webp' alt='' width={100} height={50} className={isDark ? "brightness-0 invert" : ""} />;
  const logoLink = (
    <Link href="/" className="hover:opacity-80 flex items-center justify-center">
      {pathname.includes('/admin/') ? (
        <span className={`text-xl font-bold ${isDark ? 'text-white' : ''}`}>株AI 管理画面</span>
      ) : (
        icon
      )}
    </Link>
  );

  return (
    <header className={`border-b ${isDark ? 'bg-[#0a0a0f] border-slate-800 text-white' : 'bg-white border-gray-200 text-gray-900'}`}>
      <div className="grid grid-cols-[1fr_60%_1fr] items-center w-full">
        {isRoot ? (
          <h1 className={commonClasses}>{logoLink}</h1>
        ) : (
          <div className={commonClasses}>{logoLink}</div>
        )}
        <div className="p-2">
          <CompanySearch isDark={isDark}/>
        </div>
        <div className="iiarea pr-4 flex items-center justify-end gap-2">
          {user ? (
            <UserMenu user={user} />
          ) : showLoginButton ? (
            <Link
              href="/login?test=1"
              className="px-3 py-1 text-sm bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors flex items-center gap-1"
            >
              <LogIn className="w-4 h-4 md:hidden" />
              <span className="hidden md:inline">ログイン</span>
            </Link>
          ) : null}
        </div>
      </div>
      {!pathname.includes('/admin/') && (
        <div className="md:flex md:justify-center">
          <div className="overflow-x-auto">
            <div className="flex items-center space-x-4 whitespace-nowrap min-w-min">
              <div className="flex space-x-4">
                <CurrentPriceInfo code="0" />
                <CurrentPriceInfo code="3" />
                <CurrentPriceInfo code="1" />
                <CurrentPriceInfo code="2" />
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

const HeaderInner = ({ isDark }: { isDark?: boolean }) => {
  const pathname = usePathname();
  const isRoot = pathname === "/";
  const { data: session } = useSession();

  return <HeaderContent isRoot={isRoot} pathname={pathname} user={session?.user || null} isDark={isDark} />;
};

const Header = ({ isDark }: { isDark?: boolean }) => {
  return (
    <Suspense fallback={
      <header className={`border-b ${isDark ? 'bg-[#0a0a0f] border-slate-800' : 'bg-white border-gray-200'}`}>
        <div className="grid grid-cols-[1fr_60%_1fr] items-center w-full">
          <div className="logo pl-4 text-center w-full text-xl">
            <Image src='/logo.webp' alt='' width={100} height={50} className={isDark ? "brightness-0 invert" : ""} />
          </div>
          <div className="p-2"></div>
          <div className="iiarea pr-4 flex items-center justify-end gap-2"></div>
        </div>
        <div className="md:flex md:justify-center">
          <div className="overflow-x-auto">
            <div className="flex items-center space-x-4 whitespace-nowrap min-w-min">
              <div className="flex space-x-4">
                {[0,1,2,3].map(i => (
                  <div key={i} className="flex items-center space-x-4 p-2">
                    <div className="animate-pulse flex items-center space-x-4">
                      <div className={`h-4 ${isDark ? 'bg-slate-800' : 'bg-gray-200'} rounded w-16`}></div>
                      <div className={`h-4 ${isDark ? 'bg-slate-800' : 'bg-gray-200'} rounded w-14`}></div>
                      <div className={`h-4 ${isDark ? 'bg-slate-800' : 'bg-gray-200'} rounded w-12`}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>
    }>
      <HeaderInner isDark={isDark} />
    </Suspense>
  );
};

export default Header;