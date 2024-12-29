"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAVIGATION_LINKS = [
  { href: '/admin/accept_ai', label: '承認リスト' },
  { href: '/admin/comment', label: 'コメントコピー' },
  { href: '/admin/post/new', label: '投稿ページ' },
] as const;

const GlobalNavigation = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth', {
          method: 'GET',
          credentials: 'include',
        });
        const data = await response.json();
        setIsAuthenticated(data.isAuthenticated);
      } catch (error) {
        console.error('Authentication check failed:', error);
      }
    };

    checkAuth();
  }, []);

  // 現在のURLが記事ページかどうかをチェック
  const newsArticleMatch = pathname?.match(/^\/([^/]+)\/news\/article\/([^/]+)$/);
  const additionalLinks = [];

  if (newsArticleMatch) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_fullMatch, _code, id] = newsArticleMatch;
    additionalLinks.push({
      href: `/admin/post/${id}`,
      label: '記事を編集する'
    });
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 bg-gray-800 text-white z-50 py-1 px-2">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center h-full">
            <div className="flex items-center space-x-4 text-sm">
              {NAVIGATION_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="hover:text-gray-300"
                >
                  {link.label}
                </Link>
              ))}
              {additionalLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="hover:text-gray-300 text-blue-300"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </nav>
      {/* コンテンツのためのマージン */}
      <div className="mt-8" />
    </>
  );
};

export default GlobalNavigation;