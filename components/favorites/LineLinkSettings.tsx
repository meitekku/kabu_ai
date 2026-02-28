'use client';

import { useState, useEffect } from 'react';
import { MessageCircle, Link2, Unlink, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LineLinkInfo {
  linked: boolean;
  displayName?: string;
}

export function LineLinkSettings() {
  const [linkInfo, setLinkInfo] = useState<LineLinkInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const fetchLinkInfo = async () => {
      try {
        const res = await fetch('/api/line/link');
        if (res.ok) {
          const data = await res.json();
          setLinkInfo(data);
        } else {
          setLinkInfo({ linked: false });
        }
      } catch {
        setLinkInfo({ linked: false });
      } finally {
        setIsLoading(false);
      }
    };
    fetchLinkInfo();
  }, []);

  const handleLink = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/line/link', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.authUrl) {
          window.location.href = data.authUrl;
        }
      }
    } catch {
      // ignore
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUnlink = async () => {
    if (!confirm('LINE連携を解除しますか？レポートのLINE通知が届かなくなります。')) return;
    setIsProcessing(true);
    try {
      const res = await fetch('/api/line/unlink', { method: 'POST' });
      if (res.ok) {
        setLinkInfo({ linked: false });
      }
    } catch {
      // ignore
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-green-100">
          <MessageCircle className="w-5 h-5 text-green-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">LINE通知設定</h3>
          <p className="text-xs text-gray-500">AIレポートをLINEで受け取る</p>
        </div>
      </div>

      {linkInfo?.linked ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 border border-green-200">
            <Link2 className="w-4 h-4 text-green-600" />
            <span className="text-sm text-green-700 font-medium">
              連携済み: {linkInfo.displayName || 'LINEユーザー'}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleUnlink}
            disabled={isProcessing}
            className="text-red-600 border-red-200 hover:bg-red-50"
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Unlink className="w-4 h-4 mr-1" />}
            連携解除
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            LINE連携すると、AIレポートが自動でLINEに届きます。
          </p>
          <Button
            onClick={handleLink}
            disabled={isProcessing}
            className="bg-[#06C755] hover:bg-[#05b54d] text-white"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1" />
            ) : (
              <ExternalLink className="w-4 h-4 mr-1" />
            )}
            LINEと連携する
          </Button>
        </div>
      )}
    </div>
  );
}
