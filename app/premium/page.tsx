"use client";

import DefaultTemplate from "@/components/template/DefaultTemplate";
import { Button } from "@/components/ui/button";
import {
    CheckCircle2,
    TrendingUp,
    MessageSquare,
    ArrowRight,
    Crown,
    BarChart3,
    LineChart,
    Shield,
    Clock,
} from "lucide-react";
import Link from "next/link";

export default function PremiumPage() {
    return (
        <DefaultTemplate>
            <div className="min-h-screen bg-[#0a0a0f] text-slate-50 selection:bg-amber-500/30 overflow-hidden">
                {/* Ambient background */}
                <div className="fixed inset-0 z-0 pointer-events-none">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-amber-500/8 via-orange-500/4 to-transparent rounded-full blur-[100px]" />
                    <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[120px]" />
                    <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[120px]" />
                </div>

                <div className="relative z-10">
                    {/* Hero */}
                    <section className="pt-20 pb-12 md:pt-28 md:pb-16">
                        <div className="max-w-5xl mx-auto px-4 text-center">
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-8 rounded-full border border-amber-500/25 bg-amber-500/5 backdrop-blur-sm">
                                <Crown className="w-3.5 h-3.5 text-amber-400" />
                                <span className="text-xs font-semibold text-amber-300 tracking-widest uppercase">
                                    Premium
                                </span>
                            </div>

                            <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6">
                                <span className="bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-400">
                                    AIを味方につけた
                                </span>
                                <br />
                                <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-300 via-amber-400 to-orange-400">
                                    投資判断
                                </span>
                            </h1>

                            <p className="text-base md:text-lg text-slate-400 mb-10 max-w-xl mx-auto leading-relaxed">
                                銘柄について何でも聞ける
                                <span className="text-slate-200">AIチャット</span>と、
                                過去データから未来を読む
                                <span className="text-slate-200">株価予測</span>。
                                <br className="hidden md:block" />
                                2つのAI機能で、投資の精度が変わります。
                            </p>

                            <Link href="/settings/billing">
                                <Button
                                    size="lg"
                                    className="h-12 px-8 text-sm font-semibold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-full shadow-[0_0_24px_rgba(245,158,11,0.25)] transition-all hover:scale-[1.03] hover:shadow-[0_0_32px_rgba(245,158,11,0.4)]"
                                >
                                    月額¥3,000で始める
                                    <ArrowRight className="ml-2 w-4 h-4" />
                                </Button>
                            </Link>
                        </div>
                    </section>

                    {/* Two pillars */}
                    <section className="py-12 md:py-20">
                        <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Pillar 1: AI Chat */}
                            <div className="group rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-sm overflow-hidden transition-colors hover:border-blue-500/30">
                                {/* Top accent */}
                                <div className="h-px bg-gradient-to-r from-transparent via-blue-500 to-transparent" />

                                <div className="p-6 md:p-8">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                                            <MessageSquare className="w-5 h-5 text-blue-400" />
                                        </div>
                                        <h2 className="text-xl font-bold text-white">AIチャット</h2>
                                    </div>
                                    <p className="text-sm text-slate-400 mb-6">
                                        銘柄の業績、競合、リスクまで。
                                        自然な言葉で聞くだけで、AIが即座に分析・回答。
                                    </p>

                                    {/* Chat demo */}
                                    <div className="rounded-xl bg-[#0d1117] border border-slate-800 overflow-hidden">
                                        <div className="px-4 py-2.5 border-b border-slate-800 flex items-center gap-2">
                                            <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                                            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                                            <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                                            <span className="ml-2 text-[11px] text-slate-500">AI Chat</span>
                                        </div>
                                        <div className="p-4 space-y-3">
                                            <div className="flex justify-end">
                                                <div className="bg-blue-600 text-white text-[13px] rounded-2xl rounded-br-md py-2 px-3.5 max-w-[75%]">
                                                    ソニーの今期の業績見通しは？
                                                </div>
                                            </div>
                                            <div className="flex justify-start">
                                                <div className="bg-slate-800/80 text-slate-300 text-[13px] rounded-2xl rounded-bl-md py-2.5 px-3.5 max-w-[85%] border border-slate-700/50">
                                                    <span className="text-blue-400 font-semibold">
                                                        ソニーグループ(6758)
                                                    </span>
                                                    の今期は
                                                    <span className="text-emerald-400 font-semibold">
                                                        増収増益
                                                    </span>
                                                    の見通しです。ゲーム&amp;ネットワーク事業が牽引し、営業利益は前年比
                                                    <span className="text-white font-semibold">
                                                        +12%
                                                    </span>
                                                    を予想...
                                                </div>
                                            </div>
                                            <div className="flex justify-end">
                                                <div className="bg-blue-600 text-white text-[13px] rounded-2xl rounded-br-md py-2 px-3.5 max-w-[75%]">
                                                    競合と比べてどう？
                                                </div>
                                            </div>
                                            <div className="flex justify-start">
                                                <div className="bg-slate-800/80 text-slate-300 text-[13px] rounded-2xl rounded-bl-md py-2.5 px-3.5 max-w-[85%] border border-slate-700/50">
                                                    任天堂・バンナムと比較すると、ソニーは
                                                    <span className="text-white font-semibold">
                                                        サブスク収益の安定性
                                                    </span>
                                                    が強み。PS Plusの会員数は...
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Chat features */}
                                    <div className="mt-6 grid grid-cols-1 gap-2">
                                        {[
                                            "銘柄の強み・リスクを瞬時に把握",
                                            "決算データに基づいた正確な回答",
                                            "質問回数は無制限",
                                        ].map((text, i) => (
                                            <div
                                                key={i}
                                                className="flex items-center gap-2.5 text-sm text-slate-300"
                                            >
                                                <CheckCircle2 className="w-4 h-4 text-blue-400 flex-shrink-0" />
                                                {text}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Pillar 2: Stock Prediction */}
                            <div className="group rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-sm overflow-hidden transition-colors hover:border-emerald-500/30">
                                <div className="h-px bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />

                                <div className="p-6 md:p-8">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                            <TrendingUp className="w-5 h-5 text-emerald-400" />
                                        </div>
                                        <h2 className="text-xl font-bold text-white">AI株価予測</h2>
                                    </div>
                                    <p className="text-sm text-slate-400 mb-6">
                                        過去の値動きパターンをAIが学習。
                                        翌日以降のトレンドを予測し、売買タイミングの参考に。
                                    </p>

                                    {/* Chart demo */}
                                    <div className="rounded-xl bg-[#0d1117] border border-slate-800 overflow-hidden">
                                        <div className="px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <LineChart className="w-3.5 h-3.5 text-slate-500" />
                                                <span className="text-[11px] text-slate-500">
                                                    AI Prediction
                                                </span>
                                            </div>
                                            <span className="text-[11px] text-slate-600">7日間</span>
                                        </div>
                                        <div className="p-4">
                                            <div className="flex items-baseline justify-between mb-1">
                                                <div>
                                                    <div className="text-[11px] text-slate-500 mb-0.5">
                                                        トヨタ自動車 (7203)
                                                    </div>
                                                    <div className="text-2xl font-bold text-white tracking-tight">
                                                        ¥3,245
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-emerald-400 text-sm font-bold">
                                                        +3.2%
                                                    </div>
                                                    <div className="text-[11px] text-slate-500">
                                                        予測上昇率
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Mini chart */}
                                            <div className="mt-3 flex items-end gap-[3px] h-28">
                                                {[
                                                    { h: 45, past: true },
                                                    { h: 38, past: true },
                                                    { h: 52, past: true },
                                                    { h: 48, past: true },
                                                    { h: 55, past: true },
                                                    { h: 62, past: false },
                                                    { h: 70, past: false },
                                                ].map((bar, i) => (
                                                    <div
                                                        key={i}
                                                        className="flex-1 rounded-sm relative overflow-hidden"
                                                        style={{ height: "100%" }}
                                                    >
                                                        <div
                                                            className={`absolute bottom-0 w-full rounded-t-sm transition-all ${
                                                                bar.past
                                                                    ? "bg-slate-700"
                                                                    : "bg-gradient-to-t from-emerald-600 to-emerald-400"
                                                            }`}
                                                            style={{ height: `${bar.h}%` }}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="flex justify-between mt-2 text-[10px] text-slate-600">
                                                <span>過去5日</span>
                                                <span className="text-emerald-500 font-medium">
                                                    予測 2日
                                                </span>
                                            </div>

                                            {/* Signal */}
                                            <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                                <span className="text-xs text-emerald-300 font-medium">
                                                    上昇トレンド継続の可能性が高い
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Prediction features */}
                                    <div className="mt-6 grid grid-cols-1 gap-2">
                                        {[
                                            "過去データからAIがトレンドを予測",
                                            "上昇・下降シグナルを表示",
                                            "すべての銘柄に対応",
                                        ].map((text, i) => (
                                            <div
                                                key={i}
                                                className="flex items-center gap-2.5 text-sm text-slate-300"
                                            >
                                                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                                {text}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Why Premium */}
                    <section className="py-12 md:py-16">
                        <div className="max-w-4xl mx-auto px-4">
                            <div className="text-center mb-10">
                                <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
                                    プレミアムで得られること
                                </h2>
                                <p className="text-sm text-slate-400">
                                    無料プランとの違い
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {[
                                    {
                                        icon: MessageSquare,
                                        color: "blue",
                                        title: "AIチャット無制限",
                                        desc: "無料プランは1日3回まで。プレミアムなら何度でも質問OK。",
                                    },
                                    {
                                        icon: BarChart3,
                                        color: "emerald",
                                        title: "株価予測の利用",
                                        desc: "AIによる株価トレンド予測機能はプレミアム限定。",
                                    },
                                    {
                                        icon: Shield,
                                        color: "amber",
                                        title: "優先サポート",
                                        desc: "不具合や要望に優先的に対応。あなたの声を反映。",
                                    },
                                ].map((item, i) => {
                                    const colorMap: Record<string, string> = {
                                        blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
                                        emerald:
                                            "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
                                        amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
                                    };
                                    const c = colorMap[item.color];

                                    return (
                                        <div
                                            key={i}
                                            className="rounded-xl border border-slate-800 bg-slate-900/30 p-5 text-center"
                                        >
                                            <div
                                                className={`inline-flex p-2.5 rounded-lg border mb-3 ${c}`}
                                            >
                                                <item.icon className="w-5 h-5" />
                                            </div>
                                            <h3 className="font-bold text-white text-sm mb-1.5">
                                                {item.title}
                                            </h3>
                                            <p className="text-xs text-slate-400 leading-relaxed">
                                                {item.desc}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </section>

                    {/* CTA */}
                    <section className="py-16 md:py-20">
                        <div className="max-w-3xl mx-auto px-4">
                            <div className="relative rounded-2xl overflow-hidden">
                                {/* Glow */}
                                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 blur-2xl -z-10 scale-110" />

                                <div className="border border-amber-500/20 bg-slate-900/60 backdrop-blur-xl rounded-2xl p-8 md:p-12 text-center">
                                    <Crown className="w-10 h-10 text-amber-400 mx-auto mb-4" />

                                    <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
                                        月額¥3,000でAIを活用
                                    </h2>
                                    <p className="text-sm text-slate-400 mb-8 max-w-md mx-auto">
                                        AIチャット無制限 + 株価予測。
                                        いつでもキャンセル可能です。
                                    </p>

                                    <Link href="/settings/billing">
                                        <Button
                                            size="lg"
                                            className="h-12 px-10 text-sm font-semibold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-full shadow-[0_0_24px_rgba(245,158,11,0.3)] transition-all hover:scale-[1.03]"
                                        >
                                            プレミアムに申し込む
                                        </Button>
                                    </Link>

                                    <div className="mt-6 flex items-center justify-center gap-4 text-xs text-slate-500">
                                        <div className="flex items-center gap-1.5">
                                            <Clock className="w-3 h-3" />
                                            いつでも解約OK
                                        </div>
                                        <div className="w-px h-3 bg-slate-700" />
                                        <div className="flex items-center gap-1.5">
                                            <Shield className="w-3 h-3" />
                                            Stripe安全決済
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </DefaultTemplate>
    );
}
