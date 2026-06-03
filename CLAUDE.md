# kabu_ai

株式投資情報サイト。AI分析・株価予測・プレミアムサブスクリプション。

## 技術スタック

| カテゴリ | 技術 |
|---------|------|
| フレームワーク | Next.js 16 + React 19 + TypeScript |
| 認証 | better-auth |
| 決済 | fincode by GMO |
| DB | MySQL 8.0+（`lib/database/Mysql.ts` Singleton） |
| UI | Tailwind CSS + shadcn/ui |
| AI チャット | GLM-4（glm-4-plus / glm-4v-flash） |
| AI エージェント | @anthropic-ai/claude-agent-sdk（Claude Code CLI OAuth） |
| LINE | LINE Login OAuth + Messaging API |

## コアファイル

| ファイル | 役割 |
|---------|------|
| `lib/auth/auth.ts` | better-auth 設定 |
| `lib/database/Mysql.ts` | MySQL Singleton |
| `lib/fincode.ts` | fincode インスタンス |
| `lib/plans.ts` | プランID定数（FINCODE_PLAN_ID_STANDARD/AGENT） |
| `lib/agent/orchestrator.ts` | Agent Chat（Claude SDK 3エージェント構成） |
| `lib/line/favorites-handler.ts` | LINEボット（Local LLM Qwen3-14B でインテント解析） |
| `hooks/useSubscription.ts` | `isPremium` チェック |
| `components/auth/AuthProvider.tsx` | `isLogin` チェック |

## 認証・プレミアムチェック

- クライアント: `useAuth()` → `{ isLogin, isLoading, user }`
- クライアント: `useSubscription()` → `{ isPremium, isLoading }`
- サーバー: `auth.api.getSession({ headers: await headers() })` → `session?.user?.id`
- サーバー isPremium: `subscription_status === 'active'`（userテーブル）
- 詳細パターン・DBスキーマ → `/kabu-ai-schema`

## 開発コマンド

```bash
npm run dev           # 開発サーバー（localhost:3001）
npm run build         # 本番ビルド
npm run lint -- --max-warnings=0  # push前必須
npx tsc --noEmit --skipLibCheck   # 型チェック
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:all
./scripts/ci-repair-loop.sh       # push→CI監視→修復ループ
```

## テスト構成

- `__tests__/unit/` — Vitest ユニットテスト
- `__tests__/integration/` — Vitest 結合テスト
- `__tests__/e2e/` — Playwright E2Eテスト
- `vitest.config.ts` / `playwright.config.ts`（chromium、localhost:3000、180秒タイムアウト）

## API エンドポイント・ページ一覧 → `/kabu-ai-schema`

**設定ファイル:**
- `vitest.config.ts` — Vitest設定（jsdom環境、`@`エイリアス）
- `playwright.config.ts` — Playwright設定（chromium、localhost:3000、180秒タイムアウト）
- `tsconfig.test.json` — テスト用TypeScript設定（vitest/globals型）

**CI/CD:** `.github/workflows/main.yml`
- `lint-and-typecheck` → `test`（Vitest + Playwright） → `deploy`
- テスト失敗時はローカルの `ci-repair-loop.sh` で `gh` CLI経由で修復

---

## 主要ページ

### 一般ユーザー向け

| パス | 説明 |
|------|------|
| `/` | トップページ |
| `/login` | ログイン |
| `/signup` | サインアップ |
| `/news/latest` | 最新ニュース一覧 |
| `/stocks/[code]/news` | 銘柄ニュース |
| `/stocks/[code]/news/[id]` | ニュース記事詳細 |
| `/stocks/[code]/news/list` | ニュースリスト表示 |
| `/stocks/[code]/predict` | 株価予測 |
| `/stocks/[code]/valuation` | バリュエーションレポート |
| `/chat` | AIチャット |
| `/premium` | プレミアム紹介 |
| `/premium/success` | 購入完了 |
| `/settings/billing` | 請求・プラン管理 |
| `/favorites` | お気に入り銘柄・LINE連携設定 |

### 法定ページ

| パス | 説明 |
|------|------|
| `/terms` | 利用規約 |
| `/privacy-policy` | プライバシーポリシー |
| `/disclaimer` | 免責事項 |
| `/contact` | お問い合わせ |
| `/commercial-transactions` | 特定商取引法に基づく表記 |

### 管理画面（認証保護）

| パス | 説明 |
|------|------|
| `/admin/accept_ai` | AI記事承認 |
| `/admin/accept_ai_us` | US市場AI記事承認 |
| `/admin/all-article` | 全記事管理 |
| `/admin/post/[post_id]` | 投稿編集 |
| `/admin/prompt` | プロンプト管理 |
| `/admin/prompt/article-prompt` | 記事生成プロンプト |
| `/admin/news-summary` | ニュース要約生成 |
| `/admin/comment` | コメント管理 |
| `/agent-chat` | Agent Chat（管理者専用） |

---

## クイックリファレンス

### isLogin と isPremium を両方チェック

```typescript
import { useAuth } from "@/components/auth";
import { useSubscription } from "@/hooks/useSubscription";

function PremiumFeature() {
  const { isLogin, isLoading: authLoading } = useAuth();
  const { isPremium, isLoading: subLoading } = useSubscription();

  if (authLoading || subLoading) return <Loading />;
  if (!isLogin) return <LoginPrompt />;
  if (!isPremium) return <PremiumUpsell />;

  return <PremiumContent />;
}
```

### ProtectedRoute でページ保護

```tsx
import { ProtectedRoute } from "@/components/auth";

// 認証必須ページ
<ProtectedRoute>
  <YourComponent />
</ProtectedRoute>

// カスタムリダイレクト先
<ProtectedRoute redirectTo="/custom-login">
  <YourComponent />
</ProtectedRoute>
```

---

## Design Context

### Users
- **ターゲット**: 個人投資家（初心者〜中級者）。日本の株式市場に関心があり、AI分析・予測・ニュースを活用したい人
- **利用シーン**: 平日の市場時間中心。PC/スマホで株価チェック、ニュース確認、AI予測・チャットを利用
- **求める価値**: 投資判断に役立つ信頼できる情報を、分かりやすく、手軽に得たい

### Brand Personality
- **3つのキーワード**: 信頼・先進・洗練
- **トーン**: プロフェッショナルだが親しみやすい。金融の堅さとAIの先進性を両立
- **感情目標**: 「このサイトなら安心して情報を得られる」「AIが分析してくれている」という信頼感と先進性

### Aesthetic Direction
- **方向性**: モダン・クリーン（Linear / Vercel的な余白とシャープさ + 四季報オンラインの完成度・プロ感）
- **テーマ**: ライトモード主体
- **カラー方針**: モノクロ基調 + アクセントカラー（現行のshikihoパレットをベースに洗練化）
- **参考**: 四季報オンライン（shikiho.toyokeizai.net）— 全体的な完成度・「サービス」感
- **アンチパターン**: 個人サイト感、情報の詰め込みすぎ、古臭いUI、安っぽいグラデーション
- **キーワード**: 余白を活かす、シャープなタイポグラフィ、カード型レイアウト、微細なアニメーション

### Design Principles
1. **信頼性ファースト**: 金融情報を扱うサイトとして、視覚的な信頼感と安定感を最優先。整ったグリッド、一貫したスペーシング、読みやすいタイポグラフィ
2. **余白で語る**: 情報を詰め込まず、余白を戦略的に使って視覚的な階層を作る。コンテンツに呼吸させる
3. **AI × プロフェッショナル**: AI分析サービスらしい先進性を感じさせつつ、金融サイトとしての品格を保つ。派手すぎず、地味すぎないバランス
4. **一貫性**: 色、スペーシング、フォントサイズ、コンポーネントの使い方をサイト全体で統一。個人サイト感を払拭する最重要ポイント
5. **親しみやすさ**: 投資初心者も圧倒されない、適度な情報密度と直感的なナビゲーション

<!-- MEMORY:START -->
# kabu_ai

_Last updated: 2026-03-15 | 0 active memories, 0 total_

_For deeper context, use memory_search, memory_related, or memory_ask tools._
<!-- MEMORY:END -->
