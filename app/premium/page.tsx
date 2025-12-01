"use client";

import DefaultTemplate from "@/components/template/DefaultTemplate";
import { Button } from "@/components/ui/button";
import { CheckCircle2, TrendingUp, MessageSquare, Sparkles, Brain, LineChart, ArrowRight, Zap } from "lucide-react";
import Link from "next/link";

export default function PremiumPage() {
    return (
        <DefaultTemplate>
            <div className="min-h-screen bg-[#020617] text-slate-50 font-sans selection:bg-emerald-500/30 overflow-hidden">

                {/* Background Elements */}
                <div className="fixed inset-0 z-0 pointer-events-none">
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]"></div>
                    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-[120px]"></div>
                    <div className="absolute top-[20%] right-[10%] w-[20%] h-[20%] bg-purple-500/5 rounded-full blur-[100px]"></div>
                    <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03]"></div>
                </div>

                <div className="relative z-10">
                    {/* Hero Section */}
                    <section className="pt-24 pb-16 md:pt-32 md:pb-20">
                        <div className="container mx-auto px-4 text-center">
                            <div className="inline-flex items-center justify-center px-3 py-1 mb-6 rounded-full border border-emerald-500/30 bg-emerald-500/10 backdrop-blur-sm">
                                <Sparkles className="w-3 h-3 text-emerald-400 mr-2" />
                                <span className="text-xs font-bold text-emerald-300 tracking-wide uppercase">Premium Features</span>
                            </div>

                            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 leading-tight">
                                <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400">AIが変える、</span>
                                <br className="hidden md:block" />
                                <span className="text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.3)]">株式投資の未来</span>
                            </h1>

                            <p className="text-lg md:text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
                                膨大なデータから瞬時に答えを導き出す<span className="text-slate-200 font-medium">AI分析</span>と、
                                <span className="text-slate-200 font-medium">高精度な株価予測</span>で、
                                あなたの投資判断を強力にサポートします。
                            </p>

                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                <Link href="/settings/billing">
                                    <Button
                                        size="lg"
                                        className="h-12 px-8 text-base bg-emerald-500 hover:bg-emerald-600 text-white rounded-full shadow-[0_0_20px_rgba(16,185,129,0.2)] transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(16,185,129,0.4)]"
                                    >
                                        プレミアムプランを見る
                                    </Button>
                                </Link>
                                <Button variant="ghost" size="lg" className="h-12 px-8 text-base text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-full">
                                    機能の詳細 <ArrowRight className="ml-2 w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </section>

                    {/* Bento Grid Features */}
                    <section className="py-12 md:py-16">
                        <div className="container mx-auto px-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-6xl mx-auto">
                                {/* Feature 1: AI Q&A (Large) */}
                                <div className="md:col-span-2 p-1 rounded-3xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-800 backdrop-blur-sm">
                                    <div className="h-full bg-slate-950/80 rounded-[22px] p-6 md:p-8 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                                            <MessageSquare className="w-32 h-32" />
                                        </div>

                                        <div className="relative z-10">
                                            <div className="flex items-center mb-4">
                                                <div className="p-2 bg-blue-500/20 rounded-lg mr-3">
                                                    <MessageSquare className="w-6 h-6 text-blue-400" />
                                                </div>
                                                <h3 className="text-xl font-bold text-white">AIに質問する</h3>
                                            </div>

                                            <p className="text-slate-400 mb-6 max-w-md">
                                                「この銘柄の競合は？」「過去のトレンドは？」
                                                自然な言葉で質問するだけで、AIが膨大なデータを分析し回答します。
                                            </p>

                                            {/* Mock Chat UI */}
                                            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg max-w-lg">
                                                <div className="space-y-3">
                                                    <div className="flex justify-end">
                                                        <div className="bg-blue-600/80 text-white text-sm rounded-2xl rounded-tr-sm py-2 px-3 shadow-md">
                                                            トヨタの決算、どうだった？
                                                        </div>
                                                    </div>
                                                    <div className="flex justify-start">
                                                        <div className="bg-slate-800 text-slate-300 text-sm rounded-2xl rounded-tl-sm py-2 px-3 border border-slate-700">
                                                            <span className="text-emerald-400 font-bold">好調です。</span> 営業利益は前年比+15%増。特にハイブリッド車が...
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Feature 2: Prediction (Tall) */}
                                <div className="md:row-span-2 p-1 rounded-3xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-800 backdrop-blur-sm">
                                    <div className="h-full bg-slate-950/80 rounded-[22px] p-6 md:p-8 relative overflow-hidden group">
                                        <div className="absolute bottom-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                                            <TrendingUp className="w-40 h-40" />
                                        </div>

                                        <div className="relative z-10">
                                            <div className="flex items-center mb-4">
                                                <div className="p-2 bg-emerald-500/20 rounded-lg mr-3">
                                                    <TrendingUp className="w-6 h-6 text-emerald-400" />
                                                </div>
                                                <h3 className="text-xl font-bold text-white">AI株価予測</h3>
                                            </div>

                                            <p className="text-slate-400 mb-6">
                                                過去のパターンを学習したAIが、未来のトレンドを高精度に予測。
                                            </p>

                                            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg">
                                                <div className="flex justify-between items-end mb-2">
                                                    <div>
                                                        <div className="text-xs text-slate-500">AAPL Forecast</div>
                                                        <div className="text-lg font-bold text-white">$182.45</div>
                                                    </div>
                                                    <div className="text-emerald-400 text-sm font-bold">+2.4%</div>
                                                </div>
                                                <div className="h-32 flex items-end justify-between gap-1">
                                                    {[40, 35, 50, 45, 60, 55, 70].map((h, i) => (
                                                        <div key={i} className="w-full bg-slate-800 rounded-sm relative overflow-hidden">
                                                            <div className={`absolute bottom-0 w-full ${i >= 5 ? 'bg-emerald-500' : 'bg-slate-700'}`} style={{ height: `${h}%` }}></div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="mt-6 space-y-3">
                                                <div className="flex items-center text-sm text-slate-300">
                                                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mr-2" />
                                                    <span>トレンド転換点を検知</span>
                                                </div>
                                                <div className="flex items-center text-sm text-slate-300">
                                                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mr-2" />
                                                    <span>売買シグナル通知</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Feature 3: Small 1 */}
                                <div className="p-1 rounded-3xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-800 backdrop-blur-sm">
                                    <div className="h-full bg-slate-950/80 rounded-[22px] p-6 relative overflow-hidden group hover:bg-slate-900 transition-colors">
                                        <div className="flex items-center mb-3">
                                            <Brain className="w-5 h-5 text-purple-400 mr-2" />
                                            <h3 className="font-bold text-white">深層学習</h3>
                                        </div>
                                        <p className="text-sm text-slate-400">
                                            数百万のデータポイントを分析し、人間では気づけないパターンを発見。
                                        </p>
                                    </div>
                                </div>

                                {/* Feature 4: Small 2 */}
                                <div className="p-1 rounded-3xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-800 backdrop-blur-sm">
                                    <div className="h-full bg-slate-950/80 rounded-[22px] p-6 relative overflow-hidden group hover:bg-slate-900 transition-colors">
                                        <div className="flex items-center mb-3">
                                            <Zap className="w-5 h-5 text-yellow-400 mr-2" />
                                            <h3 className="font-bold text-white">リアルタイム</h3>
                                        </div>
                                        <p className="text-sm text-slate-400">
                                            市場の変化を24時間365日監視。チャンスを逃しません。
                                        </p>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </section>

                    {/* Detailed Section: AI Q&A */}
                    <section className="py-16 md:py-24 border-t border-slate-800/50 bg-slate-900/20">
                        <div className="container mx-auto px-4">
                            <div className="flex flex-col md:flex-row items-center gap-12 max-w-6xl mx-auto">
                                <div className="flex-1">
                                    <div className="inline-block px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold mb-4">
                                        INTERACTIVE ANALYSIS
                                    </div>
                                    <h2 className="text-3xl md:text-4xl font-bold mb-6">
                                        知りたいことは、<br />
                                        <span className="text-blue-400">AIに聞くだけ。</span>
                                    </h2>
                                    <p className="text-slate-400 mb-8 leading-relaxed">
                                        決算書を読み込む必要はありません。「この会社の強みは？」「リスク要因は？」と質問すれば、AIが瞬時に要約・分析して答えます。
                                    </p>
                                    <ul className="space-y-4">
                                        {[
                                            "決算説明会の要約",
                                            "競合他社との比較分析",
                                            "ニュースのポジネガ判定"
                                        ].map((item, i) => (
                                            <li key={i} className="flex items-center text-slate-300 bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                                                <CheckCircle2 className="w-5 h-5 text-blue-500 mr-3 flex-shrink-0" />
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="flex-1 w-full">
                                    <div className="relative rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden">
                                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>
                                        <div className="p-6 space-y-6">
                                            {/* User Question 1 */}
                                            <div className="flex gap-4">
                                                <div className="w-8 h-8 rounded-full bg-slate-700 flex-shrink-0 flex items-center justify-center text-xs font-bold text-slate-300">U</div>
                                                <div className="flex-1 bg-slate-800 rounded-2xl rounded-tl-none p-4 text-sm text-slate-300">
                                                    トヨタ自動車の今期の見通しを教えて。
                                                </div>
                                            </div>

                                            {/* AI Answer 1 */}
                                            <div className="flex gap-4 flex-row-reverse">
                                                <div className="w-8 h-8 rounded-full bg-blue-600 flex-shrink-0 flex items-center justify-center">
                                                    <Sparkles className="w-4 h-4 text-white" />
                                                </div>
                                                <div className="flex-1 bg-blue-900/20 border border-blue-500/20 rounded-2xl rounded-tr-none p-4 text-sm text-slate-200">
                                                    <p className="mb-2 font-bold text-blue-400">AI Analysis:</p>
                                                    <p>今期は<span className="text-white font-bold">増収増益</span>の見込みです。特に北米市場でのハイブリッド車販売が好調で、円安効果も寄与しています。営業利益は過去最高を更新する可能性があります。</p>
                                                </div>
                                            </div>

                                            {/* User Question 2 */}
                                            <div className="flex gap-4">
                                                <div className="w-8 h-8 rounded-full bg-slate-700 flex-shrink-0 flex items-center justify-center text-xs font-bold text-slate-300">U</div>
                                                <div className="flex-1 bg-slate-800 rounded-2xl rounded-tl-none p-4 text-sm text-slate-300">
                                                    リスク要因はある？
                                                </div>
                                            </div>

                                            {/* AI Answer 2 */}
                                            <div className="flex gap-4 flex-row-reverse">
                                                <div className="w-8 h-8 rounded-full bg-blue-600 flex-shrink-0 flex items-center justify-center">
                                                    <Sparkles className="w-4 h-4 text-white" />
                                                </div>
                                                <div className="flex-1 bg-blue-900/20 border border-blue-500/20 rounded-2xl rounded-tr-none p-4 text-sm text-slate-200">
                                                    <p>主なリスクは以下の通りです：</p>
                                                    <ul className="list-disc list-inside mt-2 space-y-1 text-slate-300">
                                                        <li>為替変動（円高への反転）</li>
                                                        <li>原材料価格の高騰</li>
                                                        <li>中国市場でのEV競争激化</li>
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* CTA */}
                    <section className="py-20">
                        <div className="container mx-auto px-4">
                            <div className="max-w-4xl mx-auto relative">
                                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-blue-500/20 blur-3xl -z-10 rounded-full"></div>
                                <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-3xl p-8 md:p-12 text-center shadow-2xl">
                                    <h2 className="text-3xl md:text-4xl font-bold mb-6 text-white">
                                        投資のプロフェッショナルな洞察を、<br className="hidden md:block" />
                                        あなたの手元に。
                                    </h2>
                                    <p className="text-lg text-slate-400 mb-8 max-w-2xl mx-auto">
                                        まずは無料トライアルで、AIの威力を体験してください。
                                    </p>
                                    <Link href="/settings/billing">
                                        <Button
                                            size="lg"
                                            className="h-14 px-10 text-lg bg-white text-slate-950 hover:bg-slate-200 font-bold rounded-full transition-all hover:scale-105 shadow-lg"
                                        >
                                            今すぐ始める
                                        </Button>
                                    </Link>
                                    <p className="mt-4 text-sm text-slate-500">
                                        クレジットカード不要 • いつでもキャンセル可能
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>

                </div>
            </div>
        </DefaultTemplate>
    );
}
