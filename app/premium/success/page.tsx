import DefaultTemplate from "@/components/template/DefaultTemplate";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";

export const metadata = {
    robots: { index: false },
};

export default function SuccessPage() {
    return (
        <DefaultTemplate>
            <div className="min-h-screen bg-[#020617] text-slate-50 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center shadow-2xl">
                    <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                    </div>

                    <h1 className="text-3xl font-bold mb-4 text-white">ありがとうございます！</h1>
                    <p className="text-slate-400 mb-8">
                        プレミアムプランへの登録が完了しました。<br />
                        AIによる高度な分析機能を今すぐご利用いただけます。
                    </p>

                    <div className="space-y-4">
                        <Link href="/" className="block">
                            <Button size="lg" className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-full">
                                ダッシュボードへ移動
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        </DefaultTemplate>
    );
}
