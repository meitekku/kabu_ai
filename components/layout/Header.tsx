'use client';

import CompanySearch from "@/components/parts/common/CompanySearch";
import { CurrentPriceInfo } from "@/components/common/CurrentPriceInfo";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { Crown, Settings, LogOut } from 'lucide-react';

const HeaderContent = ({ isRoot, pathname, username }: { isRoot: boolean, pathname: string, username: string | null }) => {
  const commonClasses = "logo pl-4 text-center w-full text-xl";
  const icon = <Image src='/logo.webp' alt='' width={100} height={50} />;
  const logoLink = (
    <Link href="/" className="hover:opacity-80 flex items-center justify-center">
      {pathname.includes('/admin/') ? (
        <span className="text-xl font-bold">薬剤師ニュース</span>
      ) : (
        icon
      )}
    </Link>
  );

  return (
    <header className="border-b border-gray-200">
      <div className="grid grid-cols-[1fr_60%_1fr] items-center w-full">
        {isRoot ? (
          <h1 className={commonClasses}>{logoLink}</h1>
        ) : (
          <div className={commonClasses}>{logoLink}</div>
        )}
        <div className="p-2">
          <CompanySearch/>
        </div>
        <div className="iiarea pr-4 flex items-center justify-end gap-2">
          {username ? (
            <>
              <Link
                href="/premium"
                className="flex items-center gap-1 px-2 py-1 text-sm text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded transition-colors"
                title="プレミアム"
              >
                <Crown className="w-4 h-4" />
                <span className="hidden sm:inline">Premium</span>
              </Link>
              <Link
                href="/settings/billing"
                className="flex items-center gap-1 px-2 py-1 text-sm text-gray-600 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                title="設定"
              >
                <Settings className="w-4 h-4" />
              </Link>
            </>
          ) : (
            <Link
              href="/login"
              className="px-3 py-1 text-sm bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors"
            >
              ログイン
            </Link>
          )}
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

const Header = () => {
  const pathname = usePathname();
  const isRoot = pathname === "/";
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth', {
          method: 'GET',
          credentials: 'include',
        });
        const data = await response.json();
        if (data.isAuthenticated && data.username) {
          setUsername(data.username);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      }
    };
    checkAuth();
  }, []);

  return <HeaderContent isRoot={isRoot} pathname={pathname} username={username} />;
};

export default Header;