'use client';

import { useState, useEffect, useCallback } from 'react';
import { Heart } from 'lucide-react';
import { useAuth } from '@/components/auth';
import { LoginModal } from '@/components/common/LoginModal';

interface FavoriteButtonProps {
  code: string;
  className?: string;
}

export function FavoriteButton({ code, className = '' }: FavoriteButtonProps) {
  const { isLogin } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!isLogin) return;
    const check = async () => {
      try {
        const res = await fetch(`/api/favorites/check?code=${encodeURIComponent(code)}`);
        const data = await res.json();
        setIsFavorite(data.isFavorite);
      } catch {
        // ignore
      }
    };
    check();
  }, [isLogin, code]);

  const toggle = useCallback(async () => {
    if (!isLogin) {
      setShowModal(true);
      return;
    }
    if (isLoading) return;
    setIsLoading(true);
    try {
      if (isFavorite) {
        await fetch(`/api/favorites?code=${encodeURIComponent(code)}`, { method: 'DELETE' });
        setIsFavorite(false);
      } else {
        await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        });
        setIsFavorite(true);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [isLogin, isLoading, isFavorite, code]);

  return (
    <>
      <button
        onClick={toggle}
        disabled={isLoading}
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-sm transition-colors ${
          isFavorite
            ? 'text-shikiho-negative hover:text-shikiho-negative/80'
            : 'text-muted-foreground hover:text-shikiho-negative/70'
        } ${className}`}
        title={isFavorite ? 'お気に入り解除' : 'お気に入りに追加'}
      >
        <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
      </button>

      <LoginModal
        open={showModal}
        onOpenChange={setShowModal}
        title="お気に入り登録"
        description="ログインするとお気に入り機能が使えます。"
      />
    </>
  );
}
