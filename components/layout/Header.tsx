'use client';

import CompanySearch from "@/components/parts/common/CompanySearch";
import { CurrentPriceInfo, CurrentPriceInfoSkeleton, type CompanyData } from "@/components/common/CurrentPriceInfo";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Image from 'next/image';
import { useState, useRef, useEffect, Suspense } from 'react';
import { Crown, Settings, LogOut, LogIn, ChevronDown, Heart } from 'lucide-react';
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
        className="flex items-center gap-2 px-2 py-2 min-h-[44px] rounded-lg hover:bg-gray-100 transition-colors"
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
              className="flex items-center gap-2 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 min-h-[44px]"
              onClick={() => setIsOpen(false)}
            >
              <Crown className="w-4 h-4 text-amber-500" />
              プレミアム
            </Link>
            <Link
              href="/favorites"
              className="flex items-center gap-2 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 min-h-[44px]"
              onClick={() => setIsOpen(false)}
            >
              <Heart className="w-4 h-4 text-red-400" />
              お気に入り
            </Link>
            <Link
              href="/settings/billing"
              className="flex items-center gap-2 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 min-h-[44px]"
              onClick={() => setIsOpen(false)}
            >
              <Settings className="w-4 h-4 text-gray-500" />
              請求・プラン管理
            </Link>
          </div>

          <div className="border-t border-gray-100 py-1">
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 min-h-[44px]"
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

const HeaderContent = ({ isRoot, pathname, user, isDark, marketData, suspendFetch = false }: {
  isRoot: boolean;
  pathname: string;
  user: { name?: string | null; email?: string | null; image?: string | null } | null;
  isDark?: boolean;
  marketData?: Record<string, CompanyData>;
  suspendFetch?: boolean;
}) => {
  const icon =<Image src='/logo.webp' alt='' width={100} height={50} className={isDark ? "brightness-0 invert" : ""} />;
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
      <div className="flex items-center w-full gap-2 px-2 sm:px-4">
        <div className="flex-shrink-0">
          {isRoot ? (
            <h1 className="text-xl">{logoLink}</h1>
          ) : (
            <div className="text-xl">{logoLink}</div>
          )}
        </div>
        <div className="flex-1 min-w-0 py-2">
          <CompanySearch isDark={isDark}/>
        </div>
        <div className="flex-shrink-0 flex items-center">
          {user ? (
            <UserMenu user={user} />
          ) : (
            <Link
              href="/login"
              className="min-h-[44px] min-w-[44px] px-3 py-2 text-sm bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1"
            >
              <LogIn className="w-4 h-4 md:hidden" />
              <span className="hidden md:inline">ログイン</span>
            </Link>
          )}
        </div>
      </div>
      {!pathname.includes('/admin/') && (
        <div className="md:flex md:justify-center">
          <div className="overflow-x-auto">
            <div className="flex min-h-[52px] min-w-max items-center gap-2 px-2 py-1">
              <CurrentPriceInfo code="0" initialData={marketData?.['0']} suspendFetch={suspendFetch} isDark={isDark} />
              <CurrentPriceInfo code="3" initialData={marketData?.['3']} suspendFetch={suspendFetch} isDark={isDark} />
              <CurrentPriceInfo code="1" initialData={marketData?.['1']} suspendFetch={suspendFetch} isDark={isDark} />
              <CurrentPriceInfo code="2" initialData={marketData?.['2']} suspendFetch={suspendFetch} isDark={isDark} />
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

const HeaderInner = ({
  isDark,
  marketData,
  suspendFetch,
}: {
  isDark?: boolean;
  marketData?: Record<string, CompanyData>;
  suspendFetch?: boolean;
}) => {
  const pathname = usePathname();
  const isRoot = pathname === "/";
  const { data: session } = useSession();

  return <HeaderContent isRoot={isRoot} pathname={pathname} user={session?.user || null} isDark={isDark} marketData={marketData} suspendFetch={suspendFetch} />;
};

const Header = ({
  isDark,
  marketData,
  suspendFetch = false,
}: {
  isDark?: boolean;
  marketData?: Record<string, CompanyData>;
  suspendFetch?: boolean;
}) => {
  return (
    <Suspense fallback={
      <header className={`border-b ${isDark ? 'bg-[#0a0a0f] border-slate-800' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center w-full gap-2 px-2 sm:px-4">
          <div className="flex-shrink-0 text-xl">
            <Image src='/logo.webp' alt='' width={100} height={50} className={isDark ? "brightness-0 invert" : ""} />
          </div>
          <div className="flex-1 min-w-0 py-2"></div>
          <div className="flex-shrink-0 flex items-center"></div>
        </div>
        <div className="md:flex md:justify-center">
          <div className="overflow-x-auto">
            <div className="flex min-h-[52px] min-w-max items-center gap-2 px-2 py-1">
              {[0, 1, 2, 3].map((i) => (
                <CurrentPriceInfoSkeleton key={i} isDark={isDark} />
              ))}
            </div>
          </div>
        </div>
      </header>
    }>
      <HeaderInner isDark={isDark} marketData={marketData} suspendFetch={suspendFetch} />
    </Suspense>
  );
};

export default Header;
