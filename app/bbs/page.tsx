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
        <h1 className="text-xl font-bold text-foreground mb-1">
          掲示板 盛り上がりヒートマップ
        </h1>
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">セルが大きい</span> = 24時間の書き込みが多い銘柄 ／{" "}
          <span className="font-medium text-foreground">色が赤い</span> = 直近1時間に急増中（普通の何倍）。
          クリックでコメントを表示。60秒ごと自動更新。
        </p>
      </div>
      <BbsHeatmap initialData={initialData} />
    </DefaultTemplate>
  );
}
