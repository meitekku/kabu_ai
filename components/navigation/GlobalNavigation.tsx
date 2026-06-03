"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/auth';
import { isAdminRole } from '@/lib/auth/admin';

const NAVIGATION_LINKS = [
  { href: '/admin/accept_ai', label: '承認リスト' },
  { href: '/admin/accept_ai_us', label: 'US承認リスト' },
  { href: '/admin/prompt', label: 'プロンプト変更' },
  { href: '/admin/prompt/article-prompt', label: '確認' },
  { href: '/admin/all-article', label: '全記事コピー' },
  { href: '/admin/comment', label: 'コメントコピー' },
  { href: '/admin/post/new', label: '投稿ページ' },
  { href: '/admin/news-summary', label: 'ニュース要約' },
] as const;

const GlobalNavigation = () => {
  const { user, isLogin } = useAuth();
  const pathname = usePathname();
  const isAdmin = isLogin && isAdminRole(user?.role);

  // 現在のURLが記事ページかどうかをチェック
  const newsArticleMatch = pathname?.match(/^\/([^/]+)\/news\/article\/([^/]+)$/);
  const additionalLinks = [];

  if (newsArticleMatch) {
    const [, , id] = newsArticleMatch;
    additionalLinks.push({
      href: `/admin/post/${id}`,
      label: '記事を編集する'
    });
  }

  return (
    <>
      {isAdmin && (
        <nav className="fixed top-0 left-0 right-0 bg-gray-800 text-white z-50 py-1 px-2">
          <div className="max-w-7xl mx-auto overflow-x-auto">
            <div className="flex items-center h-full min-w-max">
              <div className="flex items-center gap-1 sm:gap-4 text-xs sm:text-sm">
                {NAVIGATION_LINKS.map((link) => (
                  <Link key={link.href} href={link.href} className="hover:text-gray-300 whitespace-nowrap py-1 px-1 sm:px-0 min-h-[32px] flex items-center">
                    {link.label}
                  </Link>
                ))}
                {additionalLinks.map((link) => (
                  <Link key={link.href} href={link.href} className="hover:text-gray-300 text-blue-300 whitespace-nowrap py-1 px-1 sm:px-0 min-h-[32px] flex items-center">
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </nav>
      )}
      <div className={`transition-all duration-300 ease-in-out ${isAdmin ? 'h-8' : 'h-0'}`} />
    </>
  );
};

export default GlobalNavigation;