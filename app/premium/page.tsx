"use client";

import DefaultTemplate from "@/components/template/DefaultTemplate";
import { Button } from "@/components/ui/button";
import {
    Check,
    Minus,
    MessageSquare,
    ArrowRight,
    Newspaper,
    Heart,
    LineChart,
    Shield,
    Clock,
    BarChart3,
    Bot,
    ChevronDown,
    Bell,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

function FAQItem({ question, answer }: { question: string; answer: string }) {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="border-b border-slate-200 last:border-b-0">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between py-5 text-left group cursor-pointer"
            >
                <span className="text-[15px] font-semibold text-slate-800 pr-8 group-hover:text-primary transition-colors">
                    {question}
                </span>
                <ChevronDown
                    className={`w-5 h-5 text-slate-400 flex-shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                />
            </button>
            <div
                className={`overflow-hidden transition-all duration-200 ${isOpen ? "max-h-96 pb-5" : "max-h-0"}`}
            >
                <p className="text-sm text-slate-600 leading-relaxed">
                    {answer}
                </p>
            </div>
        </div>
    );
}

export default function PremiumPage() {
    return (
        <DefaultTemplate>
            <div className="bg-card text-foreground">
                {/* ===== Hero ===== */}
                <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 via-slate-50/80 to-white border-b border-slate-100">
                    <div className="max-w-5xl mx-auto px-4 pt-16 pb-14 md:pt-24 md:pb-20 text-center">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-8 rounded-full bg-accent border border-primary/20">
                            <span className="text-[11px] font-bold text-primary tracking-[0.15em] uppercase">
                                Premium Plan
                            </span>
                        </div>

                        <h1 className="text-3xl md:text-5xl lg:text-[3.5rem] font-extrabold text-slate-900 leading-tight tracking-tight mb-6">
                            AIが導く、
                            <br className="md:hidden" />
                            一歩先の投資判断。
                        </h1>

                        <p className="text-base md:text-lg text-slate-500 mb-10 max-w-2xl mx-auto leading-relaxed">
                            銘柄の深層を読み解く
                            <span className="text-slate-700 font-medium">
                                「AIチャット」
                            </span>
                            、独自の予測アルゴリズムによる
                            <span className="text-slate-700 font-medium">
                                「株価予測」
                            </span>
                            、
                            <br className="hidden lg:block" />
                            そしてあなた専用の
                            <span className="text-slate-700 font-medium">
                                「お気に入りニュース」
                            </span>
                            で、投資判断を強力にサポート。
                        </p>

                        <a href="#plans">
                            <Button
                                size="lg"
                                className="h-12 px-10 text-base font-bold bg-primary hover:bg-primary/90 text-white rounded-lg shadow-sm hover:shadow-md transition-all"
                            >
                                月額 1,000円から始める
                                <ArrowRight className="ml-2 w-4 h-4" />
                            </Button>
                        </a>
                        <p className="mt-4 text-xs text-slate-400">
                            クレジットカード決済 / いつでも解約可能
                        </p>
                    </div>
                </section>

                {/* ===== POINT 01: AI Chat ===== */}
                <section className="py-16 md:py-24">
                    <div className="max-w-6xl mx-auto px-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center">
                            <div>
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white text-xs font-bold">
                                        01
                                    </span>
                                    <span className="text-xs font-bold text-primary tracking-[0.15em] uppercase">
                                        POINT
                                    </span>
                                </div>
                                <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">
                                    AI投資アシスタント
                                </h2>
                                <p className="text-slate-500 mb-8 leading-relaxed">
                                    業績、競合、リスク。あらゆる投資の疑問に、AIが膨大なデータから即座に回答。決算説明会の要約も一瞬で確認できます。
                                </p>
                                <ul className="space-y-3">
                                    {[
                                        "決算資料・ニュースを多角的に分析",
                                        "24時間365日、いつでも投資相談が可能",
                                        "プレミアム会員は質問回数無制限",
                                    ].map((text, i) => (
                                        <li
                                            key={i}
                                            className="flex items-center gap-3 text-sm text-slate-600"
                                        >
                                            <Check className="w-4 h-4 text-primary flex-shrink-0" />
                                            {text}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Chat Demo */}
                            <div className="rounded-xl border border-border bg-card shadow-lg overflow-hidden">
                                <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2 bg-slate-50">
                                    <div className="flex gap-1.5">
                                        <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                                        <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                                        <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                                    </div>
                                    <span className="ml-auto text-[10px] font-semibold text-slate-400 tracking-widest uppercase">
                                        AI Chat
                                    </span>
                                </div>
                                <div className="p-5 space-y-4">
                                    <div className="flex justify-end">
                                        <div className="bg-primary text-white text-[13px] rounded-2xl rounded-br-sm py-2.5 px-4 max-w-[80%]">
                                            ソニーグループの成長戦略は？
                                        </div>
                                    </div>
                                    <div className="flex justify-start">
                                        <div className="bg-slate-100 text-slate-700 text-[13px] rounded-2xl rounded-bl-sm py-3 px-4 max-w-[85%]">
                                            <span className="text-primary font-bold text-xs block mb-1.5">
                                                AI解析レポート
                                            </span>
                                            IP（知的財産）の価値最大化を軸に、ゲーム・映画・音楽を融合した
                                            <span className="text-slate-900 font-semibold">
                                                「エンタメ経済圏」
                                            </span>
                                            の拡大が鍵です。特に...
                                        </div>
                                    </div>
                                    <div className="flex justify-end">
                                        <div className="bg-primary text-white text-[13px] rounded-2xl rounded-br-sm py-2.5 px-4 max-w-[80%]">
                                            競合他社と比較した強みは？
                                        </div>
                                    </div>
                                    <div className="flex justify-start">
                                        <div className="bg-slate-100 text-slate-700 text-[13px] rounded-2xl rounded-bl-sm py-3 px-4 max-w-[85%]">
                                            任天堂がハード・ソフト一体型に強みを持つのに対し、ソニーは
                                            <span className="text-emerald-600 font-bold">
                                                リカーリング（継続課金）モデル
                                            </span>
                                            の比率が高く、収益の安定性が...
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ===== POINT 02: Stock Prediction ===== */}
                <section className="py-16 md:py-24 bg-slate-50">
                    <div className="max-w-6xl mx-auto px-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center">
                            {/* Chart Demo (left on desktop) */}
                            <div className="order-2 md:order-1 rounded-xl border border-border bg-card shadow-lg overflow-hidden">
                                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                                    <div className="flex items-center gap-2">
                                        <LineChart className="w-4 h-4 text-emerald-600" />
                                        <span className="text-[10px] font-semibold text-slate-400 tracking-widest uppercase">
                                            Predictive Analysis
                                        </span>
                                    </div>
                                    <span className="px-2 py-0.5 rounded bg-slate-200 text-[10px] font-medium text-slate-500">
                                        Next 48h
                                    </span>
                                </div>
                                <div className="p-5">
                                    <div className="flex items-baseline justify-between mb-4">
                                        <div>
                                            <div className="text-[11px] text-slate-400 mb-1">
                                                トヨタ自動車 (7203)
                                            </div>
                                            <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
                                                ¥3,512
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-emerald-600 text-lg font-extrabold leading-none mb-1">
                                                +4.1%
                                            </div>
                                            <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                                                Predicted
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-4 flex items-end gap-[5px] h-24">
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
                                                className="flex-1 relative"
                                                style={{ height: "100%" }}
                                            >
                                                <div
                                                    className={`absolute bottom-0 w-full rounded-t ${
                                                        bar.past
                                                            ? "bg-slate-200"
                                                            : "bg-emerald-500"
                                                    }`}
                                                    style={{
                                                        height: `${bar.h}%`,
                                                    }}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex justify-between mt-3 text-[10px] font-semibold tracking-wider uppercase">
                                        <span className="text-slate-400">
                                            過去実績
                                        </span>
                                        <span className="text-emerald-600">
                                            AI予測
                                        </span>
                                    </div>

                                    <div className="mt-5 flex items-center gap-3 px-4 py-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                        <span className="text-xs text-emerald-700 font-semibold">
                                            強い上昇シグナルを検出
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Text (right on desktop) */}
                            <div className="order-1 md:order-2">
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-600 text-white text-xs font-bold">
                                        02
                                    </span>
                                    <span className="text-xs font-bold text-emerald-600 tracking-[0.15em] uppercase">
                                        POINT
                                    </span>
                                </div>
                                <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">
                                    AI株価トレンド予測
                                </h2>
                                <p className="text-slate-500 mb-8 leading-relaxed">
                                    過去10年の値動きパターンを学習。独自のアルゴリズムでトレンドを予測し、売買タイミングの精度を高めます。
                                </p>
                                <ul className="space-y-3">
                                    {[
                                        "全上場銘柄のトレンドをAIが毎晩算出",
                                        "上昇・下降の可能性を数値で可視化",
                                        "中長期・短期両方の時間軸に対応",
                                    ].map((text, i) => (
                                        <li
                                            key={i}
                                            className="flex items-center gap-3 text-sm text-slate-600"
                                        >
                                            <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                                            {text}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ===== POINT 03: Favorites News ===== */}
                <section className="py-16 md:py-24">
                    <div className="max-w-6xl mx-auto px-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-start">
                            <div>
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-orange-500 text-white text-xs font-bold">
                                        03
                                    </span>
                                    <span className="text-xs font-bold text-orange-500 tracking-[0.15em] uppercase">
                                        POINT
                                    </span>
                                </div>
                                <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">
                                    お気に入りニュース
                                </h2>
                                <p className="text-slate-500 mb-8 leading-relaxed">
                                    お気に入り銘柄を登録するだけで、AIがあなた専用のニュースレポートを毎日自動生成。昼と引け後の2回、重要な情報をピックアップ。LINE連携で通知・銘柄管理も可能です。
                                </p>
                                <ul className="space-y-3">
                                    {[
                                        "お気に入り銘柄の株価・ニュースを毎日AIが自動分析",
                                        "重要度設定で優先銘柄を重点的にカバー",
                                        "LINEで通知受信＆お気に入り銘柄の管理",
                                    ].map((text, i) => (
                                        <li
                                            key={i}
                                            className="flex items-center gap-3 text-sm text-slate-600"
                                        >
                                            <Check className="w-4 h-4 text-orange-500 flex-shrink-0" />
                                            {text}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="space-y-4">
                                {[
                                    {
                                        icon: Heart,
                                        iconColor: "text-shikiho-negative",
                                        bgColor: "bg-shikiho-negative/10",
                                        label: "銘柄登録",
                                        desc: "最大50銘柄を登録。重要度を星で設定し、優先的に分析。",
                                    },
                                    {
                                        icon: Newspaper,
                                        iconColor: "text-orange-500",
                                        bgColor: "bg-orange-50",
                                        label: "AIレポート",
                                        desc: "毎日11:30/15:30にAIが市況・ニュース・材料を分析してレポート。",
                                    },
                                    {
                                        icon: MessageSquare,
                                        iconColor: "text-shikiho-positive",
                                        bgColor: "bg-green-50",
                                        label: "LINE Bot",
                                        desc: "LINEでレポート自動通知＆銘柄の追加・削除・情報取得が可能。",
                                    },
                                ].map((card, i) => (
                                    <div
                                        key={i}
                                        className="flex items-start gap-4 p-5 rounded-xl border border-border bg-card hover:border-border/80 transition-colors"
                                    >
                                        <div
                                            className={`p-2.5 rounded-lg ${card.bgColor} flex-shrink-0`}
                                        >
                                            <card.icon
                                                className={`w-5 h-5 ${card.iconColor}`}
                                            />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-800 mb-1">
                                                {card.label}
                                            </h4>
                                            <p className="text-sm text-slate-500 leading-relaxed">
                                                {card.desc}
                                            </p>
                                        </div>
                                    </div>
                                ))}

                                {/* LINE実際の通知スクリーンショット */}
                                <div className="mt-6 grid grid-cols-2 gap-3">
                                    <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                                        <Image
                                            src="/images/line-report.png"
                                            alt="LINEお気に入りニュースレポート"
                                            width={300}
                                            height={400}
                                            className="w-full h-auto object-cover"
                                        />
                                    </div>
                                    <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                                        <Image
                                            src="/images/line-pts.png"
                                            alt="LINE PTS速報通知"
                                            width={300}
                                            height={400}
                                            className="w-full h-auto object-cover"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ===== Premium Features Grid ===== */}
                <section className="py-16 md:py-24 bg-slate-50 border-y border-slate-100">
                    <div className="max-w-5xl mx-auto px-4">
                        <div className="text-center mb-12">
                            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-3">
                                プレミアムで投資を加速
                            </h2>
                            <p className="text-slate-500">
                                無料プランを大幅に超える、プロフェッショナルな支援機能。
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                            {[
                                {
                                    icon: MessageSquare,
                                    color: "text-primary",
                                    bg: "bg-accent",
                                    title: "AIチャット無制限",
                                    desc: "無料プランは1日3回。プレミアムなら制限なく対話できます。",
                                },
                                {
                                    icon: BarChart3,
                                    color: "text-emerald-600",
                                    bg: "bg-emerald-50",
                                    title: "全銘柄の株価予測",
                                    desc: "AIによる独自の株価トレンド予測。全上場銘柄のシグナルをチェック。",
                                },
                                {
                                    icon: Newspaper,
                                    color: "text-orange-500",
                                    bg: "bg-orange-50",
                                    title: "お気に入りニュース",
                                    desc: "お気に入り銘柄のAIニュースレポートを毎日自動配信。",
                                },
                                {
                                    icon: Bell,
                                    color: "text-shikiho-positive",
                                    bg: "bg-shikiho-positive/10",
                                    title: "LINE通知連携",
                                    desc: "LINEでレポート自動通知＆銘柄管理。外出先でも見逃さない。",
                                },
                                {
                                    icon: Shield,
                                    color: "text-amber-600",
                                    bg: "bg-amber-50",
                                    title: "優先サポート",
                                    desc: "新機能の優先案内やテクニカルサポートを提供。",
                                },
                                {
                                    icon: Bot,
                                    color: "text-violet-600",
                                    bg: "bg-violet-50",
                                    title: "AI Agent",
                                    desc: "エージェントプラン限定。DB＋Webを活用した高度な投資分析。",
                                },
                            ].map((item, i) => (
                                <div
                                    key={i}
                                    className="p-6 rounded-xl bg-card border border-border hover:border-border/80 hover:shadow-sm transition-all"
                                >
                                    <div
                                        className={`inline-flex p-2.5 rounded-lg ${item.bg} mb-4`}
                                    >
                                        <item.icon
                                            className={`w-5 h-5 ${item.color}`}
                                        />
                                    </div>
                                    <h3 className="text-sm font-bold text-slate-800 mb-2">
                                        {item.title}
                                    </h3>
                                    <p className="text-sm text-slate-500 leading-relaxed">
                                        {item.desc}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ===== Pricing Plans ===== */}
                <section id="plans" className="py-16 md:py-24">
                    <div className="max-w-5xl mx-auto px-4">
                        <div className="text-center mb-12">
                            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-3">
                                プランを選ぶ
                            </h2>
                            <p className="text-slate-500">
                                あなたの投資スタイルに合ったプランを。
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 max-w-4xl mx-auto rounded-xl border border-border overflow-hidden bg-card text-left">
                            {/* Free Plan */}
                            <div className="p-6 md:p-8 border-b md:border-b-0 md:border-r border-slate-200 flex flex-col">
                                <div className="mb-6">
                                    <h3 className="text-lg font-bold text-slate-900 mb-1">
                                        無料
                                    </h3>
                                    <p className="text-xs text-slate-400">
                                        まずは試してみたい方に
                                    </p>
                                </div>
                                <div className="mb-6">
                                    <span className="text-3xl font-extrabold text-slate-900">
                                        ¥0
                                    </span>
                                </div>
                                <ul className="space-y-3 mb-8 text-sm flex-1">
                                    <li className="flex items-center gap-2.5 text-slate-600">
                                        <Check className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                        AIチャット（1日3回）
                                    </li>
                                    <li className="flex items-center gap-2.5 text-slate-400">
                                        <Minus className="w-4 h-4 flex-shrink-0" />
                                        株価予測
                                    </li>
                                    <li className="flex items-center gap-2.5 text-slate-400">
                                        <Minus className="w-4 h-4 flex-shrink-0" />
                                        お気に入りニュース
                                    </li>
                                    <li className="flex items-center gap-2.5 text-slate-400">
                                        <Minus className="w-4 h-4 flex-shrink-0" />
                                        リアルタイム市場分析
                                    </li>
                                    <li className="flex items-center gap-2.5 text-slate-400">
                                        <Minus className="w-4 h-4 flex-shrink-0" />
                                        AI Agent
                                    </li>
                                </ul>
                                <Button
                                    variant="outline"
                                    className="w-full h-11 font-semibold rounded-lg border-slate-300 text-slate-600 hover:bg-slate-50"
                                >
                                    登録不要で利用
                                </Button>
                            </div>

                            {/* Agent Plan */}
                            <div className="relative p-6 md:p-8 bg-amber-50/30 border-b md:border-b-0 md:border-r border-slate-200 flex flex-col">
                                <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
                                <div className="mb-6">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-lg font-bold text-slate-900">
                                            エージェント
                                        </h3>
                                        <span className="px-2 py-0.5 rounded bg-amber-500 text-[10px] font-bold text-white tracking-wider">
                                            人気 No.1
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-400">
                                        全機能 + AI Agent
                                    </p>
                                </div>
                                <div className="mb-6">
                                    <span className="text-3xl font-extrabold text-slate-900">
                                        ¥1,000
                                    </span>
                                    <span className="text-sm text-slate-400 ml-1">
                                        /月（税込）
                                    </span>
                                </div>
                                <ul className="space-y-3 mb-8 text-sm flex-1">
                                    <li className="flex items-center gap-2.5 text-slate-700">
                                        <Check className="w-4 h-4 text-amber-500 flex-shrink-0" />
                                        AIチャット無制限
                                    </li>
                                    <li className="flex items-center gap-2.5 text-slate-700">
                                        <Check className="w-4 h-4 text-amber-500 flex-shrink-0" />
                                        株価予測無制限
                                    </li>
                                    <li className="flex items-center gap-2.5 text-slate-700">
                                        <Check className="w-4 h-4 text-amber-500 flex-shrink-0" />
                                        お気に入りニュース
                                    </li>
                                    <li className="flex items-center gap-2.5 text-slate-700">
                                        <Check className="w-4 h-4 text-amber-500 flex-shrink-0" />
                                        リアルタイム市場分析
                                    </li>
                                    <li className="flex items-center gap-2.5 text-amber-600 font-medium">
                                        <Check className="w-4 h-4 text-amber-500 flex-shrink-0" />
                                        AI Agent（高度な投資分析）
                                    </li>
                                </ul>
                                <Link href="/settings/billing?plan=agent">
                                    <Button className="w-full h-11 font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-lg">
                                        エージェントを始める
                                    </Button>
                                </Link>
                            </div>

                            {/* Standard Plan */}
                            <div className="relative p-6 md:p-8 flex flex-col">
                                <div className="mb-6">
                                    <h3 className="text-lg font-bold text-slate-900 mb-1">
                                        スタンダード
                                    </h3>
                                    <p className="text-xs text-slate-400">
                                        AI株価予測 & AIチャット
                                    </p>
                                </div>
                                <div className="mb-6">
                                    <span className="text-3xl font-extrabold text-slate-900">
                                        ¥3,000
                                    </span>
                                    <span className="text-sm text-slate-400 ml-1">
                                        /月（税込）
                                    </span>
                                </div>
                                <ul className="space-y-3 mb-8 text-sm flex-1">
                                    <li className="flex items-center gap-2.5 text-slate-700">
                                        <Check className="w-4 h-4 text-primary flex-shrink-0" />
                                        AIチャット無制限
                                    </li>
                                    <li className="flex items-center gap-2.5 text-slate-700">
                                        <Check className="w-4 h-4 text-primary flex-shrink-0" />
                                        株価予測無制限
                                    </li>
                                    <li className="flex items-center gap-2.5 text-slate-700">
                                        <Check className="w-4 h-4 text-primary flex-shrink-0" />
                                        お気に入りニュース
                                    </li>
                                    <li className="flex items-center gap-2.5 text-slate-700">
                                        <Check className="w-4 h-4 text-primary flex-shrink-0" />
                                        リアルタイム市場分析
                                    </li>
                                    <li className="flex items-center gap-2.5 text-slate-400">
                                        <Minus className="w-4 h-4 flex-shrink-0" />
                                        AI Agent
                                    </li>
                                </ul>
                                <Link href="/settings/billing">
                                    <Button className="w-full h-11 font-bold bg-primary hover:bg-primary/90 text-white rounded-lg">
                                        スタンダードを始める
                                    </Button>
                                </Link>
                            </div>
                        </div>

                        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-slate-400">
                            <div className="flex items-center gap-2">
                                <Shield className="w-4 h-4" />
                                GMO fincode 安全決済
                            </div>
                            <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                いつでも解約可能
                            </div>
                            <div className="flex items-center gap-2">
                                <Check className="w-4 h-4" />
                                全機能即時アクセス
                            </div>
                        </div>
                    </div>
                </section>

                {/* ===== FAQ ===== */}
                <section className="py-16 md:py-24 bg-slate-50 border-t border-slate-100">
                    <div className="max-w-3xl mx-auto px-4">
                        <div className="text-center mb-12">
                            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-3">
                                よくある質問
                            </h2>
                        </div>
                        <div className="bg-card rounded-xl border border-border px-4 sm:px-6 md:px-8">
                            <FAQItem
                                question="プレミアムプランはいつでも解約できますか？"
                                answer="はい、いつでも解約可能です。設定画面の請求・プラン管理から手続きでき、次回以降の自動課金は停止されます。"
                            />
                            <FAQItem
                                question="無料プランとの違いは何ですか？"
                                answer="無料プランではAIチャットが1日3回までに制限されます。プレミアムプランではAIチャット無制限、全銘柄の株価予測、お気に入りニュースの自動配信、リアルタイム市場分析など、すべての機能をご利用いただけます。"
                            />
                            <FAQItem
                                question="支払い方法は何がありますか？"
                                answer="クレジットカード（Visa, Mastercard, JCB, American Express, Diners Club）に対応しています。GMO fincode による安全な決済処理を行っており、カード情報は当サイトでは保持しません。"
                            />
                            <FAQItem
                                question="スタンダードとエージェントプランの違いは？"
                                answer="エージェントプランにはスタンダードの全機能に加え、AI Agentによる高度な投資分析機能が含まれます。AI Agentはデータベースとウェブの両方を活用し、より深い銘柄分析やカスタムレポート生成が可能です。"
                            />
                            <FAQItem
                                question="プランの変更やアップグレードはできますか？"
                                answer="はい、設定画面の請求・プラン管理から変更手続きが可能です。変更内容に応じて、再度カード登録が必要になる場合があります。"
                            />
                        </div>
                    </div>
                </section>

                {/* ===== CTA ===== */}
                <section className="py-20 md:py-28 bg-slate-900">
                    <div className="max-w-3xl mx-auto px-4 text-center">
                        <h2 className="text-2xl md:text-4xl font-bold text-white mb-4 tracking-tight">
                            月額 1,000円からAIを味方に。
                        </h2>
                        <p className="text-base text-slate-400 mb-10 max-w-lg mx-auto leading-relaxed">
                            制限なしのAI対話と、高精度な株価予測。
                            <br className="hidden md:block" />
                            投資の精度を、今日から変えてみませんか。
                        </p>
                        <a href="#plans">
                            <Button
                                size="lg"
                                className="h-12 px-10 text-base font-bold bg-primary hover:bg-primary/90 text-white rounded-lg"
                            >
                                プランを選ぶ
                            </Button>
                        </a>
                        <p className="mt-6 text-xs text-slate-500">
                            申込み前に
                            <Link
                                href="/terms"
                                className="mx-1 underline hover:text-slate-300 transition-colors"
                            >
                                利用規約
                            </Link>
                            ・
                            <Link
                                href="/privacy-policy"
                                className="mx-1 underline hover:text-slate-300 transition-colors"
                            >
                                プライバシーポリシー
                            </Link>
                            ・
                            <Link
                                href="/commercial-transactions"
                                className="mx-1 underline hover:text-slate-300 transition-colors"
                            >
                                特定商取引法に基づく表記
                            </Link>
                            をご確認ください。
                        </p>
                    </div>
                </section>
            </div>
        </DefaultTemplate>
    );
}
