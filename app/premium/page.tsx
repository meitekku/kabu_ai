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
    Newspaper,
    Heart,
    Bot,
} from "lucide-react";
import Link from "next/link";

export default function PremiumPage() {
    return (
        <DefaultTemplate>
            <div className="min-h-screen bg-[#0a0a0f] text-slate-50 selection:bg-amber-500/30 overflow-hidden">
                {/* Ambient background */}
                <div className="fixed inset-0 z-0 pointer-events-none">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[700px] bg-gradient-to-b from-amber-500/10 via-orange-500/5 to-transparent rounded-full blur-[120px]" />
                    <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-[140px]" />
                    <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[140px]" />
                </div>

                <div className="relative z-10">
                    {/* Hero */}
                    <section className="pt-20 pb-16 md:pt-32 md:pb-24">
                        <div className="max-w-5xl mx-auto px-4 text-center">
                            <div className="inline-flex items-center gap-2 px-4 py-2 mb-10 rounded-full border border-amber-500/25 bg-amber-500/5 backdrop-blur-md">
                                <Crown className="w-4 h-4 text-amber-400" />
                                <span className="text-xs font-bold text-amber-300 tracking-[0.2em] uppercase">
                                    Premium Plan
                                </span>
                            </div>

                            <h1 className="text-4xl md:text-6xl lg:text-8xl font-black tracking-tighter leading-[1.05] mb-8">
                                <span className="bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-400">
                                    AIが導く、
                                </span>
                                <br />
                                <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-200 via-amber-400 to-orange-500">
                                    一歩先の投資判断。
                                </span>
                            </h1>

                            <p className="text-lg md:text-xl text-slate-400 mb-12 max-w-2xl mx-auto leading-relaxed">
                                銘柄の深層を読み解く<span className="text-white font-medium">「AIチャット」</span>、
                                独自の予測アルゴリズムによる<span className="text-white font-medium">「株価予測」</span>、
                                <br className="hidden md:block" />
                                そしてあなた専用の<span className="text-white font-medium">「お気に入りニュース」</span>。
                                <br className="hidden md:block" />
                                高度なAI機能が、あなたの株式投資を強力にサポートします。
                            </p>

                            <a href="#plans">
                                <Button
                                    size="lg"
                                    className="h-14 px-10 text-base font-bold bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-full shadow-[0_0_30px_rgba(245,158,11,0.3)] transition-all hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    月額 3,000円から始める
                                    <ArrowRight className="ml-2 w-5 h-5" />
                                </Button>
                            </a>
                            <p className="mt-4 text-xs text-slate-500">
                                申込み前に
                                <Link href="/terms" className="mx-1 underline hover:text-slate-300">
                                    利用規約
                                </Link>
                                ・
                                <Link href="/privacy-policy" className="mx-1 underline hover:text-slate-300">
                                    プライバシーポリシー
                                </Link>
                                ・
                                <Link href="/commercial-transactions" className="mx-1 underline hover:text-slate-300">
                                    特定商取引法に基づく表記
                                </Link>
                                をご確認ください。
                            </p>
                        </div>
                    </section>

                    {/* Pricing Plans */}
                    <section id="plans" className="py-16 md:py-24">
                        <div className="max-w-5xl mx-auto px-4">
                            <div className="text-center mb-12">
                                <h2 className="text-3xl md:text-5xl font-black text-white mb-4 tracking-tight">
                                    プランを選ぶ
                                </h2>
                                <p className="text-slate-400 text-lg">あなたの投資スタイルに合ったプランを。</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                                {/* Standard Plan */}
                                <div className="relative rounded-3xl border border-slate-700 bg-slate-900/60 backdrop-blur-xl p-8 md:p-10 transition-all hover:border-blue-500/40">
                                    <div className="mb-6">
                                        <h3 className="text-xl font-bold text-white mb-1">スタンダード</h3>
                                        <p className="text-sm text-slate-400">AI株価予測 & AIチャット</p>
                                    </div>
                                    <div className="mb-8">
                                        <span className="text-4xl font-black text-white">¥3,000</span>
                                        <span className="text-slate-400 ml-1">/月（税込）</span>
                                    </div>
                                    <ul className="space-y-3 mb-8">
                                        {["AIチャット無制限", "株価予測無制限", "お気に入りニュース", "リアルタイム市場分析"].map((f, i) => (
                                            <li key={i} className="flex items-center gap-3 text-sm text-slate-300">
                                                <CheckCircle2 className="w-4 h-4 text-blue-400 flex-shrink-0" />
                                                {f}
                                            </li>
                                        ))}
                                    </ul>
                                    <Link href="/settings/billing?plan=standard">
                                        <Button className="w-full h-12 font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl">
                                            スタンダードを始める
                                        </Button>
                                    </Link>
                                </div>

                                {/* Agent Plan */}
                                <div className="relative rounded-3xl border border-amber-500/30 bg-gradient-to-b from-amber-500/5 to-slate-900/60 backdrop-blur-xl p-8 md:p-10 transition-all hover:border-amber-500/50">
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 text-xs font-bold text-white tracking-wider">
                                        RECOMMENDED
                                    </div>
                                    <div className="mb-6">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-xl font-bold text-white mb-1">エージェント</h3>
                                            <Bot className="w-5 h-5 text-amber-400" />
                                        </div>
                                        <p className="text-sm text-amber-300/70">全機能 + AI Agent</p>
                                    </div>
                                    <div className="mb-8">
                                        <span className="text-4xl font-black text-white">¥5,000</span>
                                        <span className="text-slate-400 ml-1">/月（税込）</span>
                                    </div>
                                    <ul className="space-y-3 mb-8">
                                        {["スタンダードの全機能", "AI Agent（高度な投資分析）"].map((f, i) => (
                                            <li key={i} className="flex items-center gap-3 text-sm text-slate-300">
                                                <CheckCircle2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
                                                {f}
                                            </li>
                                        ))}
                                    </ul>
                                    <Link href="/settings/billing?plan=agent">
                                        <Button className="w-full h-12 font-bold bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                                            エージェントを始める
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Two pillars */}
                    <section className="py-12 md:py-24 bg-gradient-to-b from-transparent via-slate-900/20 to-transparent">
                        <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Pillar 1: AI Chat */}
                            <div className="group relative rounded-3xl border border-slate-800 bg-slate-900/40 backdrop-blur-xl overflow-hidden transition-all hover:border-blue-500/40 hover:shadow-[0_0_40px_rgba(59,130,246,0.1)]">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50" />

                                <div className="p-8 md:p-10">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20">
                                            <MessageSquare className="w-6 h-6 text-blue-400" />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-bold text-white">AI投資アシスタント</h2>
                                            <p className="text-xs text-blue-400 font-semibold tracking-wider">AI CHAT ANALYST</p>
                                        </div>
                                    </div>
                                    <p className="text-slate-400 mb-8 leading-relaxed">
                                        業績、競合、リスク。あらゆる投資の疑問に、AIが膨大なデータから即座に回答。決算説明会の要約も一瞬で。
                                    </p>

                                    {/* Chat demo */}
                                    <div className="rounded-2xl bg-[#0d1117] border border-slate-800 shadow-2xl overflow-hidden">
                                        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2.5 h-2.5 rounded-full bg-slate-700" />
                                                <div className="w-2.5 h-2.5 rounded-full bg-slate-700" />
                                                <div className="w-2.5 h-2.5 rounded-full bg-slate-700" />
                                            </div>
                                            <span className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">AI Intelligence</span>
                                        </div>
                                        <div className="p-5 space-y-4">
                                            <div className="flex justify-end">
                                                <div className="bg-blue-600 text-white text-[13px] rounded-2xl rounded-br-none py-2 px-4 shadow-lg">
                                                    ソニーグループの成長戦略は？
                                                </div>
                                            </div>
                                            <div className="flex justify-start">
                                                <div className="bg-slate-800/80 text-slate-300 text-[13px] rounded-2xl rounded-bl-none py-3 px-4 max-w-[90%] border border-slate-700/50">
                                                    <span className="text-blue-400 font-bold block mb-1">AI解析レポート</span>
                                                    IP（知的財産）の価値最大化を軸に、ゲーム・映画・音楽を融合した
                                                    <span className="text-white font-semibold">「エンタメ経済圏」</span>の拡大が鍵です。特に...
                                                </div>
                                            </div>
                                            <div className="flex justify-end">
                                                <div className="bg-blue-600 text-white text-[13px] rounded-2xl rounded-br-none py-2 px-4 shadow-lg">
                                                    競合他社と比較した強みは？
                                                </div>
                                            </div>
                                            <div className="flex justify-start">
                                                <div className="bg-slate-800/80 text-slate-300 text-[13px] rounded-2xl rounded-bl-none py-3 px-4 max-w-[90%] border border-slate-700/50">
                                                    任天堂がハード・ソフトの一体型に強を持つのに対し、ソニーは
                                                    <span className="text-emerald-400 font-bold">リカーリング（継続課金）モデル</span>の比率が高く、収益の安定性が...
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Chat features */}
                                    <div className="mt-8 space-y-3">
                                        {[
                                            "決算資料・ニュースを多角的に分析",
                                            "24時間365日、いつでも投資相談が可能",
                                            "プレミアム会員は質問回数無制限",
                                        ].map((text, i) => (
                                            <div
                                                key={i}
                                                className="flex items-center gap-3 text-sm text-slate-300"
                                            >
                                                <CheckCircle2 className="w-5 h-5 text-blue-400 flex-shrink-0" />
                                                {text}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Pillar 2: Stock Prediction */}
                            <div className="group relative rounded-3xl border border-slate-800 bg-slate-900/40 backdrop-blur-xl overflow-hidden transition-all hover:border-emerald-500/40 hover:shadow-[0_0_40px_rgba(16,185,129,0.1)]">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-50" />

                                <div className="p-8 md:p-10">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                                            <TrendingUp className="w-6 h-6 text-emerald-400" />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-bold text-white">AI株価トレンド予測</h2>
                                            <p className="text-xs text-emerald-400 font-semibold tracking-wider">PREDICTION ENGINE</p>
                                        </div>
                                    </div>
                                    <p className="text-slate-400 mb-8 leading-relaxed">
                                        過去10年の値動きパターンを学習。独自のアルゴリズムでトレンドを予測し、売買タイミングの精度を高めます。
                                    </p>

                                    {/* Chart demo */}
                                    <div className="rounded-2xl bg-[#0d1117] border border-slate-800 shadow-2xl overflow-hidden">
                                        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <LineChart className="w-4 h-4 text-emerald-500" />
                                                <span className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">Predictive Analysis</span>
                                            </div>
                                            <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400">Next 48h</span>
                                        </div>
                                        <div className="p-5">
                                            <div className="flex items-baseline justify-between mb-4">
                                                <div>
                                                    <div className="text-[11px] text-slate-500 mb-1">
                                                        トヨタ自動車 (7203)
                                                    </div>
                                                    <div className="text-3xl font-black text-white tracking-tight">
                                                        ¥3,512
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-emerald-400 text-lg font-black leading-none mb-1">
                                                        +4.1%
                                                    </div>
                                                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                                        Predicted
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Mini chart */}
                                            <div className="mt-4 flex items-end gap-[4px] h-24">
                                                {[
                                                    { h: 40, past: true },
                                                    { h: 35, past: true },
                                                    { h: 48, past: true },
                                                    { h: 42, past: true },
                                                    { h: 55, past: true },
                                                    { h: 68, past: false },
                                                    { h: 80, past: false },
                                                ].map((bar, i) => (
                                                    <div
                                                        key={i}
                                                        className="flex-1 rounded-t-md relative overflow-hidden transition-all duration-500"
                                                        style={{ height: "100%" }}
                                                    >
                                                        <div
                                                            className={`absolute bottom-0 w-full rounded-t-md transition-all ${
                                                                bar.past
                                                                    ? "bg-slate-800"
                                                                    : "bg-gradient-to-t from-emerald-600 to-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                                                            }`}
                                                            style={{ height: `${bar.h}%` }}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="flex justify-between mt-3 text-[10px] font-bold tracking-wider uppercase">
                                                <span className="text-slate-600">Historical</span>
                                                <span className="text-emerald-500">AI Forecast</span>
                                            </div>

                                            {/* Signal */}
                                            <div className="mt-5 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                                                <span className="text-xs text-emerald-300 font-bold">
                                                    強い上昇シグナルを検出
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Prediction features */}
                                    <div className="mt-8 space-y-3">
                                        {[
                                            "全上場銘柄のトレンドをAIが毎晩算出",
                                            "上昇・下降の可能性を数値で可視化",
                                            "中長期・短期両方の時間軸に対応",
                                        ].map((text, i) => (
                                            <div
                                                key={i}
                                                className="flex items-center gap-3 text-sm text-slate-300"
                                            >
                                                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                                                {text}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Favorites News */}
                    <section className="py-12 md:py-16 bg-gradient-to-b from-transparent via-slate-900/10 to-transparent">
                        <div className="max-w-6xl mx-auto px-4">
                            <div className="group relative rounded-3xl border border-slate-800 bg-slate-900/40 backdrop-blur-xl overflow-hidden transition-all hover:border-orange-500/40 hover:shadow-[0_0_40px_rgba(249,115,22,0.1)]">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent opacity-50" />

                                <div className="p-8 md:p-10">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="p-3 rounded-2xl bg-orange-500/10 border border-orange-500/20">
                                            <Newspaper className="w-6 h-6 text-orange-400" />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-bold text-white">お気に入りニュース</h2>
                                            <p className="text-xs text-orange-400 font-semibold tracking-wider">PERSONALIZED NEWS</p>
                                        </div>
                                    </div>
                                    <p className="text-slate-400 mb-8 leading-relaxed max-w-3xl">
                                        お気に入り銘柄を登録するだけで、AIがあなた専用のニュースレポートを毎日自動生成。
                                        昼と引け後の2回、重要な情報をピックアップしてお届けします。LINE連携で通知・銘柄管理も可能。
                                    </p>

                                    {/* Demo cards */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="rounded-2xl bg-[#0d1117] border border-slate-800 p-5">
                                            <div className="flex items-center gap-2 mb-3">
                                                <Heart className="w-4 h-4 text-red-400" />
                                                <span className="text-xs font-bold text-slate-400 tracking-wider uppercase">Registration</span>
                                            </div>
                                            <p className="text-sm text-slate-300">
                                                最大50銘柄を登録。重要度を星で設定し、優先的に分析。
                                            </p>
                                        </div>
                                        <div className="rounded-2xl bg-[#0d1117] border border-slate-800 p-5">
                                            <div className="flex items-center gap-2 mb-3">
                                                <Newspaper className="w-4 h-4 text-orange-400" />
                                                <span className="text-xs font-bold text-slate-400 tracking-wider uppercase">AI Report</span>
                                            </div>
                                            <p className="text-sm text-slate-300">
                                                毎日11:30/15:30にAIが市況・ニュース・材料を分析してレポート。
                                            </p>
                                        </div>
                                        <div className="rounded-2xl bg-[#0d1117] border border-slate-800 p-5">
                                            <div className="flex items-center gap-2 mb-3">
                                                <MessageSquare className="w-4 h-4 text-green-400" />
                                                <span className="text-xs font-bold text-slate-400 tracking-wider uppercase">LINE Bot</span>
                                            </div>
                                            <p className="text-sm text-slate-300">
                                                LINEでレポート自動通知＆銘柄の追加・削除・情報取得が可能。
                                            </p>
                                        </div>
                                    </div>

                                    {/* Features */}
                                    <div className="mt-8 space-y-3">
                                        {[
                                            "お気に入り銘柄の株価・ニュースを毎日AIが自動分析",
                                            "重要度設定で優先銘柄を重点的にカバー",
                                            "LINEで通知受信＆お気に入り銘柄の管理",
                                        ].map((text, i) => (
                                            <div
                                                key={i}
                                                className="flex items-center gap-3 text-sm text-slate-300"
                                            >
                                                <CheckCircle2 className="w-5 h-5 text-orange-400 flex-shrink-0" />
                                                {text}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Why Premium */}
                    <section className="py-20 md:py-32">
                        <div className="max-w-5xl mx-auto px-4">
                            <div className="text-center mb-16">
                                <h2 className="text-3xl md:text-5xl font-black text-white mb-6 tracking-tight">
                                    プレミアムで投資を加速。
                                </h2>
                                <p className="text-slate-400 text-lg">
                                    無料プランを大幅に超える、プロフェッショナルな支援機能。
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                {[
                                    {
                                        icon: MessageSquare,
                                        color: "blue",
                                        title: "AIチャット無制限",
                                        desc: "無料プランは1日3回まで。プレミアムなら制限なく、納得いくまでAIと対話できます。",
                                    },
                                    {
                                        icon: BarChart3,
                                        color: "emerald",
                                        title: "全銘柄の株価予測",
                                        desc: "AIによる独自の株価トレンド予測。全上場銘柄のシグナルをチェック可能です。",
                                    },
                                    {
                                        icon: Shield,
                                        color: "amber",
                                        title: "優先サポート・先行体験",
                                        desc: "新機能の優先案内や、テクニカルサポートを提供。ユーザーの要望も優先的に開発へ反映。",
                                    },
                                    {
                                        icon: Newspaper,
                                        color: "orange",
                                        title: "お気に入りニュース",
                                        desc: "お気に入り銘柄のAIニュースレポートを毎日自動配信。LINE通知にも対応。",
                                    },
                                ].map((item, i) => {
                                    const colorMap: Record<string, string> = {
                                        blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
                                        emerald:
                                            "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
                                        amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
                                        orange: "text-orange-400 bg-orange-500/10 border-orange-500/20",
                                    };
                                    const c = colorMap[item.color];

                                    return (
                                        <div
                                            key={i}
                                            className="group relative rounded-2xl border border-slate-800 bg-slate-900/30 p-8 transition-all hover:bg-slate-900/50 hover:border-slate-700"
                                        >
                                            <div
                                                className={`inline-flex p-3 rounded-xl border mb-6 transition-transform group-hover:scale-110 ${c}`}
                                            >
                                                <item.icon className="w-6 h-6" />
                                            </div>
                                            <h3 className="text-lg font-bold text-white mb-3">
                                                {item.title}
                                            </h3>
                                            <p className="text-sm text-slate-400 leading-relaxed">
                                                {item.desc}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </section>

                    {/* CTA */}
                    <section className="py-24 md:py-32">
                        <div className="max-w-4xl mx-auto px-4">
                            <div className="relative group">
                                {/* Decorative Glow */}
                                <div className="absolute -inset-1 bg-gradient-to-r from-amber-500 to-orange-600 rounded-[2.5rem] blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />
                                
                                <div className="relative rounded-[2rem] overflow-hidden border border-amber-500/20 bg-[#0a0a0f] p-10 md:p-20 text-center">
                                    <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 to-transparent pointer-events-none" />
                                    
                                    <Crown className="w-16 h-16 text-amber-400 mx-auto mb-8 animate-pulse" />

                                    <h2 className="text-3xl md:text-5xl font-black text-white mb-6 tracking-tight">
                                        月額 3,000円からAIを味方に。
                                    </h2>
                                    <p className="text-lg text-slate-400 mb-12 max-w-lg mx-auto leading-relaxed">
                                        制限なしのAI対話と、高精度な株価予測。
                                        投資の精度を、今日から変えてみませんか。
                                    </p>

                                    <a href="#plans">
                                        <Button
                                            size="lg"
                                            className="h-16 px-12 text-lg font-bold bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-full shadow-[0_20px_40px_rgba(245,158,11,0.2)] transition-all hover:scale-[1.05] active:scale-[0.95]"
                                        >
                                            プランを選ぶ
                                        </Button>
                                    </a>
                                    <p className="mt-4 text-xs text-slate-500">
                                        申込みにより
                                        <Link href="/terms" className="mx-1 underline hover:text-slate-300">
                                            利用規約
                                        </Link>
                                        および
                                        <Link href="/privacy-policy" className="mx-1 underline hover:text-slate-300">
                                            プライバシーポリシー
                                        </Link>
                                        に同意したものとみなされます。
                                    </p>

                                    <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm font-medium text-slate-500">
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-amber-500/70" />
                                            いつでも解約可能
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Shield className="w-4 h-4 text-amber-500/70" />
                                            安心のStripe決済
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 className="w-4 h-4 text-amber-500/70" />
                                            全機能即時アクセス
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
