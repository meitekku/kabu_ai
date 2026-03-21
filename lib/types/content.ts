export type Genre = 'movie' | 'music' | 'book' | 'anime' | 'game'
export type Source = 'tmdb' | 'spotify' | 'rakuten' | 'jikan' | 'rawg'

export type FloatButton = {
  id: string
  label: string
  query: string
  position: {
    x: 'left' | 'center' | 'right'
    y: 'top' | 'center' | 'bottom'
  }
  icon?: string
}

export type ContentItem = {
  id: string
  external_id: string
  source: Source
  genre: Genre
  title: string
  title_ja?: string | null
  description?: string | null
  image_url: string
  series_name?: string | null
  release_year?: number | null
  metadata?: Record<string, unknown> | null
  created_at: Date
  updated_at: Date
}

export type ContentItemFull = {
  id: string
  title: string
  title_ja: string
  genre: Genre
  image_url: string
  release_year: number
  rating: number
  rating_count: number
  description: string
  tags: string[]
  creator?: string
  studio?: string
}

/** ジャンル別表示名 */
export const GENRE_LABELS: Record<Genre, string> = {
  movie: '映画',
  music: '音楽',
  book: '本',
  anime: 'アニメ',
  game: 'ゲーム',
}

/** ジャンル別フロートボタンラベル候補 */
export const GENRE_FLOAT_LABELS: Record<string, string[]> = {
  movie: ['同じ監督', '同じ時代の映画', 'もっとダークな作品', '続編・前日譚', '同じジャンル', '泣ける映画', 'アクション映画', 'SF映画'],
  anime: ['同じスタジオ', '同じ時代のアニメ', 'もっとダークな作品', '続編・前日譚', '同じジャンル', 'バトルアニメ', '日常系', '哲学的な作品'],
  game: ['同じ開発会社', '同じ時代のゲーム', '難易度が高い', '続編・前日譚', 'オープンワールド', 'インディーゲーム', 'RPG', '協力プレイ'],
  book: ['同じ作者', '同じ時代の本', 'もっとダークな作品', 'シリーズ作品', '同じジャンル', 'ベストセラー', 'SF小説', 'ミステリー'],
  music: ['同じアーティスト', '同じ時代の音楽', '似た雰囲気', 'コラボ作品', '同じジャンル', 'ライブ映像あり', 'インディーズ', 'クラシック'],
}
