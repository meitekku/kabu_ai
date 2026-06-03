import { Metadata } from "next"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { ContentDetailView } from "@/components/product/content-detail-view"
import { getMockItemById } from "@/lib/mock-data/content"
import { GENRE_LABELS, type Genre } from "@/lib/types/content"

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const item = getMockItemById(id)
  const titleJa = item?.title_ja ?? "コンテンツ詳細"

  return {
    title: `${titleJa} | 株AI`,
    description: item?.description?.slice(0, 160) ?? "",
  }
}

export default async function ContentDetailPage({ params }: PageProps) {
  const { id } = await params
  const item = getMockItemById(id)

  if (!item) {
    return (
      <div className="max-w-5xl mx-auto py-20 text-center">
        <h1 className="text-xl font-bold">コンテンツが見つかりません</h1>
        <p className="mt-2 text-muted-foreground">
          ID: {id} に該当するコンテンツは存在しません。
        </p>
        <Link href="/" className="mt-4 inline-block text-primary hover:underline">
          ホームに戻る
        </Link>
      </div>
    )
  }

  const genre = item.genre as Genre

  return (
    <main className="max-w-5xl mx-auto">
      {/* パンくずリスト */}
      <nav className="flex items-center gap-1 text-xs text-muted-foreground mb-6">
        <Link href="/" className="hover:text-foreground transition-colors">
          ホーム
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span>{GENRE_LABELS[genre] ?? genre}</span>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">{item.title_ja}</span>
      </nav>

      {/* メインコンテンツ */}
      <ContentDetailView
        item={item}
        contentId={id}
        genre={genre}
      />
    </main>
  )
}
