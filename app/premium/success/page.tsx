import DefaultTemplate from "@/components/template/DefaultTemplate";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowRight, BarChart3, MessageSquare, Newspaper } from "lucide-react";
import Link from "next/link";

export const metadata = {
    robots: { index: false },
};

export default function SuccessPage() {
    return (
        <DefaultTemplate>
            <div className="bg-white text-slate-800">
                <div className="max-w-2xl mx-auto px-4 py-20 md:py-32 text-center">
                    {/* Icon */}
                    <div className="w-16 h-16 bg-blue-50 border border-blue-200/60 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-8 h-8 text-blue-600" />
                    </div>

                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 rounded-full bg-blue-50 border border-blue-200/60">
                        <span className="text-[11px] font-bold text-blue-600 tracking-[0.15em] uppercase">
                            Premium Plan
                        </span>
                    </div>

                    <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
                        ありがとうございます！
                    </h1>
                    <p className="text-base text-slate-500 mb-10 leading-relaxed">
                        プレミアムプランへの登録が完了しました。<br />
                        AIによる高度な分析機能を今すぐご利用いただけます。
                    </p>

                    {/* Features */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10 text-left">
                        {[
                            {
                                icon: MessageSquare,
                                color: "text-blue-600",
                                bg: "bg-blue-50",
                                title: "AIチャット無制限",
                                desc: "銘柄分析・投資相談を制限なく",
                            },
                            {
                                icon: BarChart3,
                                color: "text-emerald-600",
                                bg: "bg-emerald-50",
                                title: "株価予測",
                                desc: "全上場銘柄のAIトレンド予測",
                            },
                            {
                                icon: Newspaper,
                                color: "text-orange-500",
                                bg: "bg-orange-50",
                                title: "お気に入りニュース",
                                desc: "毎日AIが自動でレポート配信",
                            },
                        ].map((item, i) => (
                            <div
                                key={i}
                                className="p-4 rounded-xl border border-slate-200 bg-white"
                            >
                                <div className={`inline-flex p-2 rounded-lg ${item.bg} mb-3`}>
                                    <item.icon className={`w-4 h-4 ${item.color}`} />
                                </div>
                                <h3 className="text-sm font-bold text-slate-800 mb-1">
                                    {item.title}
                                </h3>
                                <p className="text-xs text-slate-500 leading-relaxed">
                                    {item.desc}
                                </p>
                            </div>
                        ))}
                    </div>

                    {/* CTA */}
                    <Link href="/">
                        <Button
                            size="lg"
                            className="h-12 px-10 text-base font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm"
                        >
                            ダッシュボードへ
                            <ArrowRight className="ml-2 w-4 h-4" />
                        </Button>
                    </Link>
                </div>
            </div>
        </DefaultTemplate>
    );
}
