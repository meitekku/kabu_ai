import type { Metadata } from "next";
import DefaultTemplate from "@/components/template/DefaultTemplate";
import BbsHeatmap from "@/components/bbs/BbsHeatmap";
import { getBbsHeatmap } from "@/lib/bbs/heatmap";

export const metadata: Metadata = {
  title: "掲示板 盛り上がりランキング | 株AI",
  description:
    "Yahoo掲示板のコメント数をリアルタイムで計測。今もっとも盛り上がっている銘柄をヒートマップで確認できます。",
};

export default async function BbsPage() {
  const initialData = await getBbsHeatmap().catch(() => undefined);

  return (
    <DefaultTemplate>
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-900 mb-1">
          掲示板 盛り上がりランキング
        </h1>
        <p className="text-sm text-gray-500">
          Yahoo掲示板のコメント速度を計測。クリックするとコメントを表示します。60秒ごとに自動更新。
        </p>
      </div>
      <BbsHeatmap initialData={initialData} />
    </DefaultTemplate>
  );
}
