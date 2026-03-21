import { GENRE_FLOAT_LABELS, type ContentItemFull, type Genre, type FloatButton } from '@/lib/types/content'

export const MOCK_ITEMS: ContentItemFull[] = [
  // 映画
  {
    id: 'movie-1',
    title: 'Your Name.',
    title_ja: '君の名は。',
    genre: 'movie',
    image_url: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx21519-SUo3ZQuCbYhJ.png',
    release_year: 2016,
    rating: 4.9,
    rating_count: 85230,
    description: '山奥の田舎町に暮らす女子高校生・三葉と、東京に暮らす男子高校生・瀧。まったく面識のない2人の主人公は、ある日突然、互いの体が入れ替わっていることに気づく。',
    tags: ['恋愛', 'SF', '青春', '新海誠'],
    creator: '新海誠',
    studio: 'コミックス・ウェーブ・フィルム',
  },
  {
    id: 'movie-2',
    title: 'Spirited Away',
    title_ja: '千と千尋の神隠し',
    genre: 'movie',
    image_url: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx199-sWefXJvXkDOb.jpg',
    release_year: 2001,
    rating: 4.9,
    rating_count: 120450,
    description: '10歳の少女・千尋が両親とともに引っ越し先へ向かう途中、不思議な世界へ迷い込む。宮崎駿監督の代表作。',
    tags: ['ファンタジー', '冒険', '成長', 'ジブリ'],
    creator: '宮崎駿',
    studio: 'スタジオジブリ',
  },
  {
    id: 'movie-3',
    title: 'Attack on Titan: The Final Chapters',
    title_ja: '進撃の巨人 劇場版',
    genre: 'movie',
    image_url: 'https://myanimelist.net/images/anime/1379/145452l.jpg',
    release_year: 2023,
    rating: 4.8,
    rating_count: 67800,
    description: '壁に囲まれた世界で巨人と戦う人類の物語。エレン・イェーガーが巨人の力を持ちながら、人類の存亡をかけた戦いに挑む。',
    tags: ['アクション', 'ダーク', '戦争', 'SF'],
    creator: '荒木哲郎',
    studio: 'WIT STUDIO / MAPPA',
  },
  // アニメ
  {
    id: 'anime-1',
    title: 'Steins;Gate',
    title_ja: 'シュタインズ・ゲート',
    genre: 'anime',
    image_url: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx9253-7q8sDpSGNz4F.jpg',
    release_year: 2011,
    rating: 4.9,
    rating_count: 95000,
    description: '秋葉原を舞台に、未来ガジェット研究所のメンバーたちがタイムマシンを偶然発明してしまう。タイムリープの果てに待つ運命とは。',
    tags: ['SF', 'タイムリープ', 'サスペンス', '秋葉原'],
    creator: '志倉千代丸',
    studio: 'WHITE FOX',
  },
  {
    id: 'anime-2',
    title: 'Demon Slayer',
    title_ja: '鬼滅の刃',
    genre: 'anime',
    image_url: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx101922-PEn1CTc93blC.jpg',
    release_year: 2019,
    rating: 4.8,
    rating_count: 150000,
    description: '大正時代。炭売りの少年・竈門炭治郎は、家族を鬼に殺され、唯一生き残った妹・禰豆子も鬼に変貌してしまう。妹を人間に戻すため、鬼殺隊へ入隊する。',
    tags: ['バトル', '大正', '家族', 'ufotable'],
    creator: '吾峠呼世晴',
    studio: 'ufotable',
  },
  {
    id: 'anime-3',
    title: 'Neon Genesis Evangelion',
    title_ja: '新世紀エヴァンゲリオン',
    genre: 'anime',
    image_url: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx30-wmNoISaIATMT.png',
    release_year: 1995,
    rating: 4.7,
    rating_count: 88000,
    description: '西暦2015年、巨大な汎用人型決戦兵器エヴァンゲリオンのパイロットとなった14歳の少年・碇シンジの物語。',
    tags: ['ロボット', 'SF', '心理', '庵野秀明'],
    creator: '庵野秀明',
    studio: 'GAINAX',
  },
  // ゲーム
  {
    id: 'game-1',
    title: 'The Legend of Zelda: Tears of the Kingdom',
    title_ja: 'ゼルダの伝説 ティアーズ オブ ザ キングダム',
    genre: 'game',
    image_url: 'https://media.rawg.io/media/games/0ba/0ba24df22f9660b25e8450e16e78a834.jpg',
    release_year: 2023,
    rating: 4.9,
    rating_count: 45000,
    description: '大空に浮かぶ空島と広大な地底世界を冒険し、ハイラル王国の謎に挑む。',
    tags: ['オープンワールド', 'アクション', 'アドベンチャー', '任天堂'],
    creator: '青沼英二',
    studio: '任天堂',
  },
  {
    id: 'game-2',
    title: 'Elden Ring',
    title_ja: 'エルデンリング',
    genre: 'game',
    image_url: 'https://media.rawg.io/media/games/b29/b294fdd866dcdb643e7bab370a552855.jpg',
    release_year: 2022,
    rating: 4.8,
    rating_count: 62000,
    description: '宮崎英高とジョージ・R・R・マーティンが手がけるオープンワールドアクションRPG。',
    tags: ['アクションRPG', 'オープンワールド', 'ダークファンタジー', 'フロムソフトウェア'],
    creator: '宮崎英高',
    studio: 'フロムソフトウェア',
  },
  // 本
  {
    id: 'book-1',
    title: 'No Longer Human',
    title_ja: '人間失格',
    genre: 'book',
    image_url: 'https://thumbnail.image.rakuten.co.jp/@0_mall/book/cabinet/5702/9784101006055_1_2.jpg',
    release_year: 1948,
    rating: 4.5,
    rating_count: 180000,
    description: '太宰治の自伝的小説。「恥の多い生涯を送ってきました」で始まる手記を通じて、人間の弱さと社会への適応の困難さを描く。',
    tags: ['文学', '私小説', '太宰治', '昭和'],
    creator: '太宰治',
  },
  {
    id: 'book-2',
    title: 'Norwegian Wood',
    title_ja: 'ノルウェイの森',
    genre: 'book',
    image_url: 'https://thumbnail.image.rakuten.co.jp/@0_mall/book/cabinet/6001/9784101001548_1_5.jpg',
    release_year: 1987,
    rating: 4.3,
    rating_count: 95000,
    description: '1960年代の東京を舞台に、ワタナベトオルの青春と喪失を描く村上春樹の代表作。',
    tags: ['恋愛', '青春', '喪失', '村上春樹'],
    creator: '村上春樹',
  },
]

/** ID でモックアイテムを取得 */
export function getMockItemById(id: string): ContentItemFull | undefined {
  return MOCK_ITEMS.find((item) => item.id === id)
}

/** ジャンルでモックアイテムをフィルタ */
export function getMockItemsByGenre(genre: Genre): ContentItemFull[] {
  return MOCK_ITEMS.filter((item) => item.genre === genre)
}

/** フロートボタン生成（ジャンル別ラベルから） */
export function generateFloatButtons(contentId: string, genre: Genre): FloatButton[] {
  const labels: string[] = GENRE_FLOAT_LABELS[genre] ?? GENRE_FLOAT_LABELS['movie']

  const POSITIONS: FloatButton['position'][] = [
    { x: 'left', y: 'top' },
    { x: 'center', y: 'top' },
    { x: 'right', y: 'top' },
    { x: 'left', y: 'center' },
    { x: 'right', y: 'center' },
    { x: 'left', y: 'bottom' },
    { x: 'center', y: 'bottom' },
    { x: 'right', y: 'bottom' },
  ]

  return labels.slice(0, 8).map((label, i) => ({
    id: `${contentId}-btn-${i}`,
    label,
    query: label,
    position: POSITIONS[i],
  }))
}
