"use client";

import { useEffect, useState, ReactNode, useCallback } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type Status = "polling" | "active" | "timeout";

const POLL_INTERVAL = 3000;
const TIMEOUT = 60000;

export function PollingWrapper({ children }: { children: ReactNode }) {
    const [status, setStatus] = useState<Status>("polling");

    const poll = useCallback(async () => {
        try {
            const res = await fetch("/api/subscription");
            if (res.ok) {
                const data = await res.json();
                if (data.isPremium) {
                    setStatus("active");
                    return true;
                }
            }
        } catch {
            // Continue polling on error
        }
        return false;
    }, []);

    useEffect(() => {
        let stopped = false;

        const run = async () => {
            const done = await poll();
            if (done || stopped) return;

            const timer = setInterval(async () => {
                const success = await poll();
                if (success || stopped) {
                    clearInterval(timer);
                }
            }, POLL_INTERVAL);

            const timeoutTimer = setTimeout(() => {
                stopped = true;
                clearInterval(timer);
                setStatus((prev) => (prev === "active" ? prev : "timeout"));
            }, TIMEOUT);

            return () => {
                stopped = true;
                clearInterval(timer);
                clearTimeout(timeoutTimer);
            };
        };

        let cleanup: (() => void) | undefined;
        run().then((fn) => {
            cleanup = fn;
        });

        return () => {
            stopped = true;
            cleanup?.();
        };
    }, [poll]);

    if (status === "active") {
        return <>{children}</>;
    }

    if (status === "timeout") {
        return (
            <>
                <div className="w-16 h-16 bg-red-50 border border-red-200/60 rounded-full flex items-center justify-center mx-auto mb-6">
                    <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
                <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight mb-4">
                    処理に時間がかかっています
                </h1>
                <p className="text-base text-slate-500 mb-10 leading-relaxed">
                    サブスクリプションの反映に時間がかかっています。<br />
                    しばらく経ってからページを再読み込みしてください。<br />
                    問題が続く場合はお問い合わせください。
                </p>
                <div className="flex gap-3 justify-center">
                    <Button
                        size="lg"
                        variant="outline"
                        className="h-12 px-8 text-base font-bold rounded-lg"
                        onClick={() => window.location.reload()}
                    >
                        再読み込み
                    </Button>
                    <Link href="/contact">
                        <Button
                            size="lg"
                            className="h-12 px-8 text-base font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm"
                        >
                            お問い合わせ
                        </Button>
                    </Link>
                </div>
            </>
        );
    }

    return (
        <>
            <div className="w-16 h-16 bg-blue-50 border border-blue-200/60 rounded-full flex items-center justify-center mx-auto mb-6">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 rounded-full bg-blue-50 border border-blue-200/60">
                <span className="text-[11px] font-bold text-blue-600 tracking-[0.15em] uppercase">
                    Premium Plan
                </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight mb-4">
                登録処理中...
            </h1>
            <p className="text-base text-slate-500 mb-10 leading-relaxed">
                プレミアムプランの登録を処理しています。<br />
                このまましばらくお待ちください。
            </p>
        </>
    );
}
