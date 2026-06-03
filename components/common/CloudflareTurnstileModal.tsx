'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ShieldCheck, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface CloudflareTurnstileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerify: (token: string) => Promise<boolean>;
  isSubmitting?: boolean;
  title?: string;
  description?: string;
  action?: string;
  errorMessage?: string | null;
}

type TurnstileRenderOptions = {
  sitekey: string;
  action?: string;
  theme?: 'auto' | 'light' | 'dark';
  callback?: (token: string) => void;
  'expired-callback'?: () => void;
  'error-callback'?: () => void;
};

type TurnstileApi = {
  render: (container: string | HTMLElement, options: TurnstileRenderOptions) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const TURNSTILE_SCRIPT_ID = 'cloudflare-turnstile-script';
const TURNSTILE_SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

let turnstileScriptPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.resolve();
  }

  if (window.turnstile) {
    return Promise.resolve();
  }

  if (turnstileScriptPromise) {
    return turnstileScriptPromise;
  }

  turnstileScriptPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.getElementById(TURNSTILE_SCRIPT_ID) as HTMLScriptElement | null;
    if (existingScript) {
      const handleLoad = () => {
        cleanup();
        resolve();
      };
      const handleError = () => {
        cleanup();
        reject(new Error('Cloudflare Turnstile script failed to load'));
      };
      const cleanup = () => {
        existingScript.removeEventListener('load', handleLoad);
        existingScript.removeEventListener('error', handleError);
      };

      if (window.turnstile) {
        resolve();
        return;
      }

      existingScript.addEventListener('load', handleLoad);
      existingScript.addEventListener('error', handleError);
      return;
    }

    const script = document.createElement('script');
    script.id = TURNSTILE_SCRIPT_ID;
    script.src = TURNSTILE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Cloudflare Turnstile script failed to load'));
    document.head.appendChild(script);
  });

  turnstileScriptPromise = turnstileScriptPromise.catch((error) => {
    turnstileScriptPromise = null;
    throw error;
  });

  return turnstileScriptPromise;
}

export function CloudflareTurnstileModal({
  open,
  onOpenChange,
  onVerify,
  isSubmitting = false,
  title = 'Cloudflare認証が必要です',
  description = 'AI機能を利用する前にCloudflare認証を完了してください。',
  action = 'ai-feature-access',
  errorMessage,
}: CloudflareTurnstileModalProps) {
  const siteKey = process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY || '';
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [token, setToken] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const resetWidget = useCallback(() => {
    if (widgetIdRef.current && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current);
    }
    setToken('');
  }, []);

  useEffect(() => {
    if (!open) {
      setToken('');
      setLocalError(null);
      return;
    }

    if (!siteKey) {
      setLocalError('NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY が設定されていません。');
      return;
    }

    let cancelled = false;

    const mountWidget = async () => {
      try {
        await loadTurnstileScript();
        if (cancelled || !containerRef.current || !window.turnstile) {
          return;
        }

        if (widgetIdRef.current) {
          window.turnstile.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        }

        setLocalError(null);
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          action,
          theme: 'auto',
          callback: (nextToken: string) => {
            setToken(nextToken);
            setLocalError(null);
          },
          'expired-callback': () => {
            setToken('');
          },
          'error-callback': () => {
            setToken('');
            setLocalError('Cloudflare認証でエラーが発生しました。再試行してください。');
          },
        });
      } catch {
        if (!cancelled) {
          setLocalError('Cloudflare認証の読み込みに失敗しました。');
        }
      }
    };

    void mountWidget();

    return () => {
      cancelled = true;
    };
  }, [open, siteKey, action]);

  useEffect(() => {
    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!token || isSubmitting) {
      return;
    }

    const ok = await onVerify(token);
    if (!ok) {
      resetWidget();
      return;
    }

    onOpenChange(false);
  }, [token, isSubmitting, onVerify, resetWidget, onOpenChange]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen && isSubmitting) {
        return;
      }
      onOpenChange(nextOpen);
    },
    [onOpenChange, isSubmitting]
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
            </div>
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <div className="flex justify-center min-h-[72px]">
            <div ref={containerRef} />
          </div>
          {(localError || errorMessage) && (
            <p className="text-sm text-red-500 mt-3 text-center">
              {localError || errorMessage}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            閉じる
          </Button>
          <Button
            onClick={() => void handleConfirm()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            disabled={isSubmitting || !token || !!localError || !siteKey}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                認証中...
              </>
            ) : (
              '認証して続行'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
