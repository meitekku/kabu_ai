# Claude Code 設定ファイル - 株AI

## プロジェクト概要

**プロジェクト名:** 株AI (Kabu AI)
**説明:** 株式投資情報サイト。AI分析、株価予測、プレミアムサブスクリプション機能を提供

### 技術スタック

| カテゴリ | 技術 |
|---------|------|
| フレームワーク | Next.js 16.0.3 + React 19.0.0 |
| 言語 | TypeScript 5.7.2 |
| 認証 | better-auth 1.4.5 |
| 決済 | Stripe |
| データベース | MySQL 8.0+ |
| UI | Tailwind CSS + shadcn/ui + Radix UI |
| メール | Resend |
| AI (チャット) | GLM-4 (智譜AI / Zhipu AI) |
| AI (エージェント) | Claude SDK (@anthropic-ai/sdk) |

---

## AI API ルール

**一般チャットのAPIは必ずGLM-4を使用すること。**
**Agent Chat（/agent-chat）はClaude SDKを使用する。**

- テキスト生成: `glm-4-plus`（予測API等で使用。旧glm-4.7-flashxは推論トークン消費で低速のため変更）
- 画像入力対応（Vision）: `glm-4v-flash`
- APIエンドポイント: `https://open.bigmodel.cn/api/paas/v4/chat/completions`
- 認証: `Authorization: Bearer ${GLM_API_KEY}`
- OpenAI互換フォーマット（messages形式）

Google Gemini, OpenAI GPT等の他のAI APIは使用しないこと。

---

## ディレクトリ構造

```
/
├── app/                          # Next.js App Router
│   ├── api/                      # API エンドポイント
│   │   ├── auth/                 # 認証API (better-auth)
│   │   ├── checkout/             # Stripe チェックアウト
│   │   ├── subscription/         # サブスクリプション管理
│   │   ├── webhook/              # Stripe ウェブフック
│   │   ├── post/                 # 投稿管理API
│   │   ├── admin/                # 管理者専用API
│   │   └── agent-chat/           # Agent Chat API (Claude SDK)
│   ├── admin/                    # 管理画面（認証保護）
│   ├── agent-chat/               # Agent Chat ページ（管理者専用）
│   ├── premium/                  # プレミアム情報ページ
│   ├── settings/billing/         # 請求管理ページ
│   ├── login/                    # ログインページ
│   ├── signup/                   # サインアップページ
│   └── [code]/news/              # 株式ニュース詳細
├── components/                   # React コンポーネント
│   ├── auth/                     # 認証関連
│   │   ├── AuthProvider.tsx      # 認証コンテキスト（isLogin提供）
│   │   ├── ProtectedRoute.tsx    # 保護ルート
│   │   ├── UserButton.tsx        # ユーザーメニュー
│   │   ├── LoginButton.tsx       # ログインボタン
│   │   └── index.ts              # エクスポート
│   ├── layout/                   # レイアウト (Header, Sidebar)
│   ├── ui/                       # shadcn/ui コンポーネント
│   └── navigation/               # ナビゲーション
├── lib/                          # ユーティリティ
│   ├── auth/                     # better-auth 設定
│   │   ├── auth.ts               # サーバー側設定
│   │   └── auth-client.ts        # クライアント側設定
│   ├── database/                 # DB接続
│   │   └── Mysql.ts              # MySQL接続（Singleton）
│   └── stripe.ts                 # Stripe インスタンス
├── hooks/                        # カスタムフック
│   └── useSubscription.ts        # サブスクリプション状態（isPremium提供）
├── sql/                          # SQL マイグレーション
└── utils/                        # ユーティリティ関数
```

---

## 認証システム (isLogin)

### 概要

`isLogin` はユーザーがログインしているかどうかを判定するブール値です。

### 実装場所

**`components/auth/AuthProvider.tsx`**

```typescript
interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isLogin: boolean;  // ログイン状態
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, isPending } = useBetterAuthSession();

  const value: AuthContextType = {
    user: session?.user || null,
    session: session || null,
    isLoading: isPending,
    isLogin: !!session?.user,  // session.user が存在すれば true
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
```

### 使用方法

```typescript
import { useAuth } from "@/components/auth";

function MyComponent() {
  const { isLogin, isLoading, user } = useAuth();

  if (isLoading) return <Loading />;
  if (!isLogin) return <LoginPrompt />;

  return <AuthenticatedContent user={user} />;
}
```

### isLogin を使用しているファイル

| ファイル | 用途 |
|---------|------|
| `components/auth/ProtectedRoute.tsx` | 未ログイン時にリダイレクト |
| `components/auth/UserButton.tsx` | ログイン状態でメニュー表示切替 |
| `components/auth/LoginButton.tsx` | ログイン/ログアウトボタン切替 |
| `components/navigation/GlobalNavigation.tsx` | 管理者ナビ表示判定 |
| `app/admin/layout.tsx` | 管理画面の認証保護 |

### 認証フロー

```
ユーザーがログイン
    ↓
better-auth がセッション作成
    ↓
useSession() でセッション取得
    ↓
AuthProvider で isLogin = !!session?.user に変換
    ↓
useAuth() hook で各コンポーネントに提供
```

### 認証方法

- メール + パスワード（8文字以上）
- Google OAuth
- Twitter (X) OAuth
- Facebook OAuth

### セッション設定

- 有効期間: 30日
- 更新周期: 1日
- クッキーキャッシュ: 5分

---

## 課金システム (isPremium)

### 概要

`isPremium` はユーザーがプレミアム会員かどうかを判定するブール値です。

### 実装場所

**`hooks/useSubscription.ts`**

```typescript
interface SubscriptionInfo {
  isPremium: boolean;
  status: 'none' | 'active' | 'canceled' | 'past_due';
  currentPeriodEnd: string | null;
  hasStripeCustomer: boolean;
}

export function useSubscription() {
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSubscription = useCallback(async () => {
    const response = await fetch('/api/subscription');
    const data = await response.json();
    setSubscription(data);
  }, []);

  return {
    subscription,
    isPremium: subscription?.isPremium ?? false,  // プレミアム状態
    isLoading,
    refetch: fetchSubscription,
  };
}
```

**`app/api/subscription/route.ts`**

```typescript
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });
  }

  const users = await db.select<SubscriptionRow>(
    `SELECT subscription_status FROM user WHERE id = ?`,
    [session.user.id]
  );

  const user = users[0];
  const isPremium = user.subscription_status === 'active';  // active なら true

  return NextResponse.json({
    isPremium,
    status: user.subscription_status || 'none',
    currentPeriodEnd: user.subscription_current_period_end,
    hasStripeCustomer: !!user.stripe_customer_id,
  });
}
```

### 使用方法

```typescript
import { useSubscription } from '@/hooks/useSubscription';

function MyComponent() {
  const { isPremium, isLoading, subscription } = useSubscription();

  if (isLoading) return <Loading />;
  if (!isPremium) return <PremiumUpsell />;

  return <PremiumContent />;
}
```

### isPremium を使用しているファイル

| ファイル | 用途 |
|---------|------|
| `app/settings/billing/page.tsx` | プラン表示・購入ボタン切替 |

### サブスクリプションステータス

| ステータス | 意味 | isPremium |
|-----------|------|-----------|
| `none` | 未購入 | `false` |
| `active` | 有効（課金中） | `true` |
| `canceled` | キャンセル済み | `false` |
| `past_due` | 支払い遅延 | `false` |

### 課金フロー

```
1. ユーザーが購入ボタンをクリック
    ↓
2. POST /api/checkout → Stripe セッション作成
    ↓
3. Stripe 決済ページにリダイレクト
    ↓
4. 決済完了 → Stripe Webhook 発火
    ↓
5. POST /api/webhook で subscription_status = 'active' に更新
    ↓
6. useSubscription() で isPremium = true を取得
```

### Stripe Webhook イベント

| イベント | 処理内容 |
|---------|---------|
| `checkout.session.completed` | 購入完了 → status を 'active' に |
| `customer.subscription.updated` | サブスク更新 |
| `customer.subscription.deleted` | キャンセル → status を 'canceled' に |
| `invoice.payment_failed` | 支払い失敗 → status を 'past_due' に |
| `invoice.paid` | 支払い成功 → status を 'active' に |

### プレミアムプラン

**価格:** ¥3,000/月

**機能:**
- AIに無制限で質問可能
- 高精度な株価予測機能
- リアルタイム市場分析
- 決算説明会の要約
- 競合他社との比較分析
- ニュースのポジネガ判定

---

## API エンドポイント

### 認証系

| エンドポイント | メソッド | 説明 |
|---------------|---------|------|
| `/api/auth/[...all]` | ALL | better-auth ハンドラ |
| `/api/auth` | GET | ログイン状態確認（legacy） |
| `/api/auth` | POST | ログイン（legacy・管理画面） |

### 課金系

| エンドポイント | メソッド | 説明 |
|---------------|---------|------|
| `/api/subscription` | GET | サブスクリプション情報取得 |
| `/api/subscription/portal` | POST | Stripe 顧客ポータル |
| `/api/checkout` | POST | チェックアウトセッション作成 |
| `/api/webhook` | POST | Stripe ウェブフック処理 |

### その他

| エンドポイント | メソッド | 説明 |
|---------------|---------|------|
| `/api/post` | POST | 投稿作成 |
| `/api/post/get_list` | GET | 投稿リスト取得 |
| `/api/admin/summarize_news` | POST | ニュース要約生成 |

---

## データベース

### 接続設定

**`lib/database/Mysql.ts`** - Singleton パターン

```typescript
import { Database } from '@/lib/database/Mysql';

const db = Database.getInstance();
const users = await db.select<User>('SELECT * FROM user WHERE id = ?', [userId]);
```

### テーブル一覧

#### 認証系
| テーブル名 | 説明 |
|-----------|------|
| `user` | ユーザー情報（better-auth + Stripe） |
| `session` | セッション情報（better-auth） |
| `account` | OAuth アカウント連携（better-auth） |
| `verification` | メール認証トークン（better-auth） |

#### 会社・株価系
| テーブル名 | 説明 |
|-----------|------|
| `company` | 会社マスタ（銘柄コード・名称） |
| `company_info` | 会社詳細情報（決算日等） |
| `price` | 株価データ |
| `relative_stock` | 関連銘柄 |
| `material` | 資料・マテリアル |
| `ir` | IR情報 |
| `gemini_flg` | Gemini処理フラグ |

#### 決算・業績系
| テーブル名 | 説明 |
|-----------|------|
| `kabutan_annual_results` | 株探 年次決算 |
| `kabutan_quarterly_results` | 株探 四半期決算 |
| `kabutan_peak_performance` | 株探 過去最高業績 |
| `performance_annual` | 年次業績 |
| `performance_quarterly` | 四半期業績 |

#### 投稿・記事系
| テーブル名 | 説明 |
|-----------|------|
| `post` | 投稿・ニュース記事 |
| `post_code` | 投稿と銘柄コードの紐付け |
| `post_status` | 投稿ステータス |
| `post_prompt` | AI記事生成プロンプト |
| `prompt` | プロンプトテンプレート |
| `bbs_data` | 掲示板データ |
| `category` | カテゴリマスタ |
| `category_score` | カテゴリスコア |

#### ランキング系
| テーブル名 | 説明 |
|-----------|------|
| `ranking_yahoo_post` | Yahoo ランキング |
| `ranking_access` | アクセスランキング |
| `ranking_up` | 値上がりランキング |
| `ranking_low` | 値下がりランキング |
| `ranking_stop_high` | ストップ高ランキング |
| `ranking_stop_low` | ストップ安ランキング |
| `ranking_trading_value` | 売買代金ランキング |

#### チャット系
| テーブル名 | 説明 |
|-----------|------|
| `chatbot_chat` | チャットセッション |
| `chatbot_message` | チャットメッセージ |
| `chat_usage_log` | チャット利用ログ（IP制限管理用） |

#### システム系
| テーブル名 | 説明 |
|-----------|------|
| `__drizzle_migrations` | Drizzleマイグレーション追跡 |

---

### user テーブル（better-auth）

```sql
CREATE TABLE user (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  emailVerified BOOLEAN DEFAULT FALSE,
  image TEXT,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,

  -- Stripe 関連（追加カラム）
  stripe_customer_id VARCHAR(255) NULL,
  subscription_status ENUM('none', 'active', 'canceled', 'past_due') DEFAULT 'none',
  subscription_id VARCHAR(255) NULL,
  subscription_current_period_end DATETIME NULL,

  INDEX idx_stripe_customer_id (stripe_customer_id),
  INDEX idx_subscription_status (subscription_status)
);
```

### session テーブル（better-auth）

```sql
CREATE TABLE session (
  id VARCHAR(36) PRIMARY KEY,
  userId VARCHAR(36) NOT NULL,
  token VARCHAR(255) UNIQUE NOT NULL,
  expiresAt DATETIME NOT NULL,
  ipAddress VARCHAR(255),
  userAgent TEXT,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,

  FOREIGN KEY (userId) REFERENCES user(id) ON DELETE CASCADE
);
```

### account テーブル（better-auth）

```sql
CREATE TABLE account (
  id VARCHAR(36) PRIMARY KEY,
  userId VARCHAR(36) NOT NULL,
  accountId VARCHAR(255) NOT NULL,
  providerId VARCHAR(255) NOT NULL,  -- 'google', 'twitter', 'facebook', 'credential'
  accessToken TEXT,
  refreshToken TEXT,
  accessTokenExpiresAt DATETIME,
  refreshTokenExpiresAt DATETIME,
  scope TEXT,
  password TEXT,  -- credential 認証の場合のハッシュ化パスワード
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,

  FOREIGN KEY (userId) REFERENCES user(id) ON DELETE CASCADE
);
```

### verification テーブル（better-auth）

```sql
CREATE TABLE verification (
  id VARCHAR(36) PRIMARY KEY,
  identifier VARCHAR(255) NOT NULL,  -- メールアドレス
  value VARCHAR(255) NOT NULL,        -- 認証トークン
  expiresAt DATETIME NOT NULL,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL
);
```

---

### company テーブル

```sql
CREATE TABLE company (
  code VARCHAR(10) PRIMARY KEY,  -- 銘柄コード（例: '7203'）
  name VARCHAR(255) NOT NULL     -- 会社名（例: 'トヨタ自動車'）
);
```

### company_info テーブル

```sql
CREATE TABLE company_info (
  code VARCHAR(10) PRIMARY KEY,
  settlement_date DATE,  -- 決算日
  -- その他の会社詳細情報

  FOREIGN KEY (code) REFERENCES company(code)
);
```

### price テーブル

```sql
CREATE TABLE price (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(10) NOT NULL,
  date DATE NOT NULL,
  open DECIMAL(10,2),
  high DECIMAL(10,2),
  low DECIMAL(10,2),
  close DECIMAL(10,2),
  volume BIGINT,

  INDEX idx_code (code),
  INDEX idx_date (date),
  UNIQUE KEY uk_code_date (code, date)
);
```

---

### post テーブル（投稿・ニュース）

```sql
CREATE TABLE post (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  site INT DEFAULT 0,       -- サイト区分
  accept INT DEFAULT 0,     -- 承認状態
  pickup INT DEFAULT 0,     -- ピックアップフラグ
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_site (site),
  INDEX idx_accept (accept),
  INDEX idx_created_at (created_at)
);
```

### post_code テーブル

```sql
CREATE TABLE post_code (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id INT NOT NULL,
  code VARCHAR(10) NOT NULL,

  INDEX idx_post_id (post_id),
  INDEX idx_code (code),
  FOREIGN KEY (post_id) REFERENCES post(id) ON DELETE CASCADE
);
```

### post_status テーブル

```sql
CREATE TABLE post_status (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id INT NOT NULL,
  status VARCHAR(50) NOT NULL,

  FOREIGN KEY (post_id) REFERENCES post(id) ON DELETE CASCADE
);
```

### post_prompt テーブル

```sql
CREATE TABLE post_prompt (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(10) NOT NULL,
  prompt TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_code (code),
  INDEX idx_created_at (created_at)
);
```

---

### chatbot_chat テーブル

```sql
CREATE TABLE chatbot_chat (
  id VARCHAR(36) PRIMARY KEY,
  userId VARCHAR(36) NOT NULL,
  title TEXT NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_userId (userId),
  INDEX idx_createdAt (createdAt)
);
```

### chatbot_message テーブル

```sql
CREATE TABLE chatbot_message (
  id VARCHAR(36) PRIMARY KEY,
  chatId VARCHAR(36) NOT NULL,
  role VARCHAR(20) NOT NULL,  -- 'user' or 'assistant'
  content TEXT NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_chatId (chatId),
  INDEX idx_createdAt (createdAt),
  FOREIGN KEY (chatId) REFERENCES chatbot_chat(id) ON DELETE CASCADE
);
```

### chat_usage_log テーブル

非プレミアムユーザーの利用制限管理と質問内容の記録用。

```sql
CREATE TABLE chat_usage_log (
  id VARCHAR(36) PRIMARY KEY,
  ip_address VARCHAR(45) NOT NULL,           -- IPv4/IPv6対応
  user_id VARCHAR(36) NULL,                   -- ログインユーザーの場合はuser.id
  chat_id VARCHAR(36) NULL,                   -- chatbot_chat.id への参照
  question TEXT NOT NULL,                     -- 質問内容
  is_premium BOOLEAN DEFAULT FALSE,           -- プレミアム会員かどうか
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_ip_address (ip_address),
  INDEX idx_user_id (user_id),
  INDEX idx_chat_id (chat_id),
  INDEX idx_created_at (created_at),
  INDEX idx_ip_created (ip_address, created_at)  -- IP別の利用回数カウント用
);
```

**利用制限ルール:**
- 非プレミアムユーザー: 1日3回まで（IPアドレス単位）
- プレミアムユーザー: 無制限

---

### relative_stock テーブル

```sql
CREATE TABLE relative_stock (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(10) NOT NULL,
  related_code VARCHAR(10) NOT NULL,  -- 関連銘柄コード
  -- その他フィールド

  INDEX idx_code (code)
);
```

### material テーブル

```sql
CREATE TABLE material (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(10) NOT NULL,
  article_time DATETIME,
  -- その他フィールド

  INDEX idx_code (code),
  INDEX idx_article_time (article_time)
);
```

---

### agent_chat テーブル

```sql
CREATE TABLE agent_chat (
  id VARCHAR(36) PRIMARY KEY,
  userId VARCHAR(36) NOT NULL,
  title TEXT NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_userId (userId),
  INDEX idx_createdAt (createdAt)
);
```

### agent_chat_message テーブル

```sql
CREATE TABLE agent_chat_message (
  id VARCHAR(36) PRIMARY KEY,
  chatId VARCHAR(36) NOT NULL,
  role VARCHAR(20) NOT NULL,     -- 'user' or 'assistant'
  content MEDIUMTEXT NOT NULL,
  metadata JSON NULL,            -- エージェント処理メタデータ
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_chatId (chatId),
  INDEX idx_createdAt (createdAt),
  FOREIGN KEY (chatId) REFERENCES agent_chat(id) ON DELETE CASCADE
);
```

---

## Agent Chat アーキテクチャ

Claude SDKのTool Useを利用した3エージェント構成。管理者専用（将来公開予定）。

```
ユーザーの質問
    │
    ▼
Orchestrator Agent (claude-sonnet)
    ├── call_db_agent → DB Agent (claude-haiku)
    │                    └── execute_sql → MariaDB
    └── call_web_agent → Web Agent (claude-haiku)
                          └── web_search → Brave/DuckDuckGo
```

### 主要ファイル

| ファイル | 役割 |
|---------|------|
| `lib/agent/orchestrator.ts` | オーケストレーター（質問分析・エージェント呼び出し・回答統合） |
| `lib/agent/db-agent.ts` | DBエージェント（SQL構築・実行、SELECT限定） |
| `lib/agent/web-agent.ts` | Webエージェント（ウェブ検索・情報取得） |
| `lib/agent/system-prompts.ts` | 各エージェントのシステムプロンプト（DBスキーマ含む） |
| `lib/agent/types.ts` | 共通型定義・設定 |
| `app/api/agent-chat/route.ts` | API エンドポイント（POST: メッセージ送信） |
| `app/api/agent-chat/history/route.ts` | API エンドポイント（GET: 履歴取得, DELETE: 削除） |
| `components/agent-chat/AgentChatInterface.tsx` | チャットUI |
| `components/agent-chat/AgentChatSidebar.tsx` | サイドバー（履歴一覧） |
| `app/agent-chat/page.tsx` | ページ（AdminProtectedRoute） |

---

### ER図（主要テーブル関係）

```
user ─────────────┬──────────────── session
  │               │
  │               └──────────────── account
  │
  ├── chatbot_chat ────────────── chatbot_message
  │
  ├── agent_chat ────────────── agent_chat_message
  │
  └── (stripe_customer_id で Stripe と連携)

company ──────────┬──────────────── company_info
  │               │
  │               ├──────────────── price
  │               │
  │               ├──────────────── relative_stock
  │               │
  │               └──────────────── material

post ─────────────┬──────────────── post_code ──── company
                  │
                  ├──────────────── post_status
                  │
                  └──────────────── post_prompt
```

---

## サーバーサイドでのチェック

### isLogin チェック

```typescript
import { auth } from '@/lib/auth/auth';
import { headers } from 'next/headers';

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user?.id) {
    return Response.json({ error: 'ログインが必要です' }, { status: 401 });
  }

  // ログイン済みの処理
}
```

### isPremium チェック

```typescript
import { auth } from '@/lib/auth/auth';
import { headers } from 'next/headers';
import { Database } from '@/lib/database/Mysql';

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user?.id) {
    return Response.json({ error: 'ログインが必要です' }, { status: 401 });
  }

  const db = Database.getInstance();
  const [user] = await db.select<{ subscription_status: string }>(
    'SELECT subscription_status FROM user WHERE id = ?',
    [session.user.id]
  );

  const isPremium = user?.subscription_status === 'active';

  if (!isPremium) {
    return Response.json({ error: 'プレミアム会員限定です' }, { status: 403 });
  }

  // プレミアム会員の処理
}
```

---

## 環境変数

### 必須

```bash
# データベース
DB_HOST=
DB_USER=
DB_PASSWORD=
DB_NAME=
DB_PORT=3306

# 認証
BETTER_AUTH_SECRET=
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# メール送信 (Resend)
RESEND_API_KEY=
FROM_EMAIL=noreply@kabu-ai.jp
```

### Agent Chat

```bash
ANTHROPIC_API_KEY=           # Claude SDK APIキー
AGENT_ORCHESTRATOR_MODEL=claude-sonnet-4-20250514  # オーケストレーターモデル（省略可）
AGENT_SUB_MODEL=claude-haiku-4-5-20251001          # サブエージェントモデル（省略可）
BRAVE_SEARCH_API_KEY=        # Brave Search APIキー（省略可、DuckDuckGoにフォールバック）
```

### OAuth（オプション）

```bash
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
TWITTER_CLIENT_ID=
TWITTER_CLIENT_SECRET=
FACEBOOK_CLIENT_ID=
FACEBOOK_CLIENT_SECRET=
```

---

## 開発コマンド

```bash
npm run dev          # 開発サーバー起動 (Turbopack)
npm run build        # 本番ビルド
npm run lint         # ESLint 実行
npm run lint:fix     # ESLint 自動修正
```

### TypeScript エラーチェック

```bash
npx tsc --noEmit --skipLibCheck
```

### テスト

```bash
npx vitest run                    # ユニットテスト（Vitest）
npx playwright test               # E2Eテスト（Playwright）
npm run test:all                  # 全テスト実行
```

### CI監視・自動修復

```bash
./scripts/ci-watch.sh             # pushした後のCI結果を監視
./scripts/ci-repair-loop.sh       # push→CI監視→失敗ならログ保存してexit 2
./scripts/ci-repair-loop.sh --no-push  # pushせずCI監視のみ
```

**Exit codes:** `0`=成功, `1`=致命的エラー, `2`=修復必要（ログ: `/tmp/ci-failure-kabu_ai.log`）

**Claude Code自動修復フロー:**
1. `./scripts/ci-repair-loop.sh` を実行
2. exit 2 なら `/tmp/ci-failure-kabu_ai.log` を読んで修正→commit
3. 再度 `./scripts/ci-repair-loop.sh` を実行
4. exit 0 になるまで繰り返す（最大3回程度）

---

## テスト構成

```
__tests__/
├── setup.ts                            # グローバルセットアップ（Next.jsモック）
├── unit/
│   └── components/
│       ├── auth/LoginForm.test.tsx      # ログインフォーム（14テスト）
│       └── news/
│           ├── NewsSection.test.tsx     # トップページニュース（9テスト）
│           └── NewsListS.test.tsx       # ニュースリスト（11テスト）
└── e2e/
    ├── login.spec.ts                   # ログインE2E
    └── top-page.spec.ts               # TOPページ画像表示E2E
```

**設定ファイル:**
- `vitest.config.ts` — Vitest設定（jsdom環境、`@`エイリアス）
- `playwright.config.ts` — Playwright設定（chromium、localhost:3000）
- `tsconfig.test.json` — テスト用TypeScript設定（vitest/globals型）

**CI/CD:** `.github/workflows/main.yml`
- `lint-and-typecheck` → `test`（Vitest + Playwright） → `deploy`
- テスト失敗時はローカルの `ci-repair-loop.sh` で `gh` CLI経由で修復

---

## 主要ページ

| パス | 説明 |
|------|------|
| `/` | トップページ |
| `/login` | ログイン |
| `/signup` | サインアップ |
| `/premium` | プレミアム紹介 |
| `/premium/success` | 購入完了 |
| `/settings/billing` | 請求・プラン管理 |
| `/[code]/news` | 株式ニュース |
| `/admin/*` | 管理画面 |
| `/agent-chat` | Agent Chat（管理者専用） |

---

## 通知設定

フック設定により以下の通知が有効:
- 作業完了時に macOS 通知
- 質問受信時に通知

### 手動通知コマンド

```bash
# 作業開始
osascript -e 'display notification "新しい質問を開始します" with title "Claude Code" subtitle "作業開始" sound name "Submarine"'

# 作業完了
osascript -e 'display notification "作業が完了しました" with title "Claude Code" subtitle "作業完了" sound name "Glass"'
```

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
