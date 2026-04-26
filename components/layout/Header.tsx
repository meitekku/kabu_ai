'use client';

import CompanySearch from "@/components/parts/common/CompanySearch";
import { CurrentPriceInfo, CurrentPriceInfoSkeleton, type CompanyData } from "@/components/common/CurrentPriceInfo";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Image from 'next/image';
import { useState, useRef, useEffect, Suspense } from 'react';
import { Crown, Settings, LogOut, LogIn, ChevronDown, Heart } from 'lucide-react';
import { useSession, signOut } from '@/lib/auth/auth-client';
import { Button } from '@/components/ui/button';

export const UserMenu = ({ user }: { user: { name?: string | null; email?: string | null; image?: string | null } }) => {
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
        className="flex items-center gap-2 px-2 py-1 rounded hover:bg-white/10 transition-colors"
      >
        {user.image ? (
          <Image
            src={user.image}
            alt={displayName}
            width={24}
            height={24}
            className="rounded-full"
          />
        ) : (
          <div className="w-6 h-6 rounded-full bg-[#bf0000] text-white flex items-center justify-center text-xs font-medium">
            {initial}
          </div>
        )}
        <span className="hidden sm:inline text-xs text-white/80">{displayName}</span>
        <ChevronDown className={`w-3 h-3 text-white/60 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-[#d9d9d9] py-1 z-50">
          <div className="px-4 py-3 border-b border-[#e5e5e5]">
            <p className="text-sm font-semibold text-[#333] truncate">{displayName}</p>
            <p className="text-xs text-[#888] truncate mt-0.5">{user.email}</p>
          </div>

          <div className="py-1">
            <Link
              href="/premium"
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#555] hover:bg-[#f5f5f5] hover:text-[#333] min-h-[44px] transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <Crown className="w-4 h-4 text-amber-500" />
              プレミアム
            </Link>
            <Link
              href="/favorites"
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#555] hover:bg-[#f5f5f5] hover:text-[#333] min-h-[44px] transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <Heart className="w-4 h-4 text-rose-400" />
              お気に入り
            </Link>
            <Link
              href="/settings/billing"
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#555] hover:bg-[#f5f5f5] hover:text-[#333] min-h-[44px] transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <Settings className="w-4 h-4 text-[#888]" />
              請求・プラン管理
            </Link>
          </div>

          <div className="border-t border-[#e5e5e5] py-1">
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-[#555] hover:bg-red-50 hover:text-red-600 min-h-[44px] transition-colors"
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

const HeaderContent = ({ isRoot, pathname, user, marketData, suspendFetch = false }: {
  isRoot: boolean;
  pathname: string;
  user: { name?: string | null; email?: string | null; image?: string | null } | null;
  marketData?: Record<string, CompanyData>;
  suspendFetch?: boolean;
}) => {
  const isAdminPage = pathname.includes('/admin/');
  const icon = <Image src='/logo.webp' alt='' width={120} height={60} className="h-[34px] w-auto" />;
  const logoLink = (
    <Link href="/" className="hover:opacity-80 flex items-center justify-center transition-opacity">
      {isAdminPage ? (
        <span className="text-xl font-bold text-foreground">株AI 管理画面</span>
      ) : (
        icon
      )}
    </Link>
  );

  return (
    <header className="sticky top-0 z-40">
      {/* Top Bar - black ticker bar (hidden on admin pages) */}
      {!isAdminPage && (
        <div className="bg-[#1a1a1a]">
          <div className="max-w-[1280px] mx-auto flex items-center justify-between px-4 sm:px-6" style={{ minHeight: '36px' }}>
            {/* Left: Market Ticker */}
            <div className="hidden sm:flex items-center overflow-x-auto">
              <CurrentPriceInfo code="0" initialData={marketData?.['0']} suspendFetch={suspendFetch} isDark />
              <div className="w-px h-4 bg-white/20 mx-1 flex-shrink-0" />
              <CurrentPriceInfo code="3" initialData={marketData?.['3']} suspendFetch={suspendFetch} isDark />
              <div className="w-px h-4 bg-white/20 mx-1 flex-shrink-0" />
              <CurrentPriceInfo code="1" initialData={marketData?.['1']} suspendFetch={suspendFetch} isDark />
              <div className="w-px h-4 bg-white/20 mx-1 flex-shrink-0" />
              <CurrentPriceInfo code="2" initialData={marketData?.['2']} suspendFetch={suspendFetch} isDark />
            </div>
            {/* Mobile: all 4 indicators with horizontal scroll */}
            <div className="flex sm:hidden items-center overflow-x-auto">
              <CurrentPriceInfo code="0" initialData={marketData?.['0']} suspendFetch={suspendFetch} isDark />
              <div className="w-px h-4 bg-white/20 mx-1 flex-shrink-0" />
              <CurrentPriceInfo code="3" initialData={marketData?.['3']} suspendFetch={suspendFetch} isDark />
              <div className="w-px h-4 bg-white/20 mx-1 flex-shrink-0" />
              <CurrentPriceInfo code="1" initialData={marketData?.['1']} suspendFetch={suspendFetch} isDark />
              <div className="w-px h-4 bg-white/20 mx-1 flex-shrink-0" />
              <CurrentPriceInfo code="2" initialData={marketData?.['2']} suspendFetch={suspendFetch} isDark />
            </div>
            {/* Right: Login / User Menu */}
            <div className="flex-shrink-0 flex items-center">
              {user ? (
                <UserMenu user={user} />
              ) : (
                <Link
                  href="/login"
                  className="flex items-center gap-1.5 bg-[#cc0000] text-white hover:bg-[#990000] rounded px-4 py-1.5 text-xs font-bold transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">ログイン</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Header - white background */}
      <div className={`bg-white ${isAdminPage ? 'border-b border-[#d9d9d9]' : 'border-b border-[#d9d9d9]'}`}>
        <div className="flex items-center w-full gap-4 px-4 sm:px-6 py-3 max-w-[1280px] mx-auto">
          {/* Left: Logo */}
          <div className="flex-shrink-0 border-r border-[#e5e5e5] pr-4 mr-4">
            {isRoot ? (
              <h1 className="text-xl">{logoLink}</h1>
            ) : (
              <div className="text-xl">{logoLink}</div>
            )}
          </div>
          {/* Center: Search Bar */}
          <div className="flex-1 min-w-0 max-w-2xl mx-auto">
            <CompanySearch />
          </div>
          {/* Right: user menu for admin pages (normal pages have user menu in top bar) */}
          {isAdminPage && (
            <div className="flex-shrink-0 flex items-center gap-2">
              {user ? (
                <UserMenu user={user} />
              ) : (
                <Button asChild size="sm" className="min-h-[44px] min-w-[44px] px-5">
                  <Link href="/login" className="flex items-center gap-1.5">
                    <LogIn className="w-4 h-4 md:hidden" />
                    <span className="hidden md:inline">ログイン</span>
                  </Link>
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

    </header>
  );
};

const HeaderInner = ({
  marketData,
  suspendFetch,
}: {
  marketData?: Record<string, CompanyData>;
  suspendFetch?: boolean;
}) => {
  const pathname = usePathname();
  const isRoot = pathname === "/";
  const { data: session } = useSession();

  return <HeaderContent isRoot={isRoot} pathname={pathname} user={session?.user || null} marketData={marketData} suspendFetch={suspendFetch} />;
};

const Header = ({
  isDark: _isDark,
  marketData,
  suspendFetch = false,
}: {
  isDark?: boolean;
  marketData?: Record<string, CompanyData>;
  suspendFetch?: boolean;
}) => {
  return (
    <Suspense fallback={
      <header className="sticky top-0 z-40">
        {/* Top Bar Skeleton */}
        <div className="bg-[#1a1a1a]">
          <div className="max-w-[1280px] mx-auto flex items-center justify-between px-4 sm:px-6" style={{ minHeight: '30px' }}>
            <div className="hidden sm:flex items-center gap-3 text-[11px] text-white/80">
              {[0, 1, 2, 3].map((i) => (
                <CurrentPriceInfoSkeleton key={i} />
              ))}
            </div>
            <div className="flex sm:hidden items-center gap-3 text-[11px] text-white/80">
              {[0, 1].map((i) => (
                <CurrentPriceInfoSkeleton key={i} />
              ))}
            </div>
          </div>
        </div>
        {/* Main Header Skeleton */}
        <div className="bg-white border-b border-[#d9d9d9]">
          <div className="flex items-center w-full gap-4 px-4 sm:px-6 py-3 max-w-[1280px] mx-auto">
            <div className="flex-shrink-0 text-xl border-r border-[#e5e5e5] pr-4 mr-4">
              <Image src='/logo.webp' alt='' width={120} height={60} className="h-[34px] w-auto" />
            </div>
            <div className="flex-1 min-w-0 max-w-2xl mx-auto py-2"></div>
            <div className="flex-shrink-0 flex items-center"></div>
          </div>
        </div>
        {/* Global Navigation Skeleton */}
        <nav className="bg-white border-b border-[#d9d9d9]">
          <div className="max-w-[1280px] mx-auto px-4">
            <div className="flex justify-start gap-0" style={{ minHeight: '44px' }}>
              {['トップ', 'ニュース', 'ランキング', 'お気に入り', 'AI予測', 'AIチャット', '掲示板'].map((label) => (
                <span key={label} className="inline-flex items-center px-5 py-2.5 text-[13px] font-semibold text-[#333]">
                  {label}
                </span>
              ))}
            </div>
          </div>
        </nav>
      </header>
    }>
      <HeaderInner marketData={marketData} suspendFetch={suspendFetch} />
    </Suspense>
  );
};

export default Header;
