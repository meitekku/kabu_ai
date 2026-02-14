# 共通コンポーネント・スキルガイド

## 利用制限コンポーネント

プレミアム機能やログイン必須機能で共通して使用する制限系コンポーネント。
AIチャット・株価予測など、利用回数制限のある機能で統一的に使用する。

---

### LoginModal

**ファイル:** `components/common/LoginModal.tsx`

未ログインユーザーに対して、ログインを促すモーダルダイアログ。

#### Props

| Prop | 型 | デフォルト | 説明 |
|------|---|---------|------|
| `open` | `boolean` | (必須) | モーダルの開閉状態 |
| `onOpenChange` | `(open: boolean) => void` | (必須) | 開閉状態の変更ハンドラ |
| `title` | `string` | `'ログインが必要です'` | モーダルタイトル |
| `description` | `string` | `'この機能をさらに利用するには...'` | 説明文 |

#### 使用例

```tsx
import { LoginModal } from '@/components/common/LoginModal';

<LoginModal
  open={showLogin}
  onOpenChange={setShowLogin}
  description="株価予測をさらに利用するには、ログインしてください。ログインすると3回まで無料でご利用いただけます。"
/>
```

#### 動作
- 「ログインする」ボタン → `/login` に遷移
- 「閉じる」ボタン → モーダルを閉じる

---

### PremiumModal

**ファイル:** `components/common/PremiumModal.tsx`

無料回数を使い切ったユーザーに対して、プレミアム会員への誘導を行うモーダル。

#### Props

| Prop | 型 | デフォルト | 説明 |
|------|---|---------|------|
| `open` | `boolean` | (必須) | モーダルの開閉状態 |
| `onOpenChange` | `(open: boolean) => void` | (必須) | 開閉状態の変更ハンドラ |
| `title` | `string` | `'プレミアム会員限定'` | モーダルタイトル |
| `description` | `string` | `'無料の利用回数を使い切りました...'` | 説明文 |
| `features` | `PremiumFeature[]` | AIチャット/株価予測/市場分析 | 特典リスト |

#### PremiumFeature 型

```tsx
interface PremiumFeature {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
}
```

#### 使用例

```tsx
import { PremiumModal } from '@/components/common/PremiumModal';

// デフォルト特典リストで使用
<PremiumModal
  open={showPremium}
  onOpenChange={setShowPremium}
  title="本日の無料利用回数を超えました"
  description="無料プランでは1日3回までチャットをご利用いただけます。"
/>

// カスタム特典リストで使用
import { Brain, Zap } from 'lucide-react';

<PremiumModal
  open={showPremium}
  onOpenChange={setShowPremium}
  features={[
    { icon: Brain, text: '深層学習による分析' },
    { icon: Zap, text: 'リアルタイム通知' },
  ]}
/>
```

#### 動作
- 「プレミアム会員になる」ボタン → `/premium` に遷移
- 「閉じる」ボタン → モーダルを閉じる

---

### useFingerprint

**ファイル:** `hooks/useFingerprint.ts`

ブラウザフィンガープリントを取得するカスタムフック。`@fingerprintjs/fingerprintjs` を使用。
未ログインユーザーの利用回数をデバイス単位で追跡するために使用する。

#### 使用例

```tsx
import { useFingerprint } from '@/hooks/useFingerprint';

function MyComponent() {
  const fingerprint = useFingerprint();
  // fingerprint === '' の間はローディング中
  // 取得完了後は visitorId 文字列が入る
}
```

---

## 利用中のファイル一覧

| コンポーネント | 使用箇所 |
|---------------|---------|
| `LoginModal` | `components/prediction/PredictionButton.tsx` |
| `PremiumModal` | `components/prediction/PredictionButton.tsx`, `components/chat/ChatInterface.tsx` |
| `useFingerprint` | `components/prediction/PredictionButton.tsx`, `app/[code]/news/predict/PredictPageClient.tsx` |

---

## 新しい機能に制限を追加するパターン

### 1. バックエンドAPI

```typescript
// 利用回数チェック API
// 参考: app/api/[code]/predict/check-usage/route.ts

import { auth } from '@/lib/auth/auth';
import { headers } from 'next/headers';
import { Database } from '@/lib/database/Mysql';

export async function POST(request) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  const userId = session?.user?.id || null;

  const db = Database.getInstance();

  // 1. プレミアムチェック
  let isPremium = false;
  if (userId) {
    const users = await db.select('SELECT subscription_status FROM user WHERE id = ?', [userId]);
    isPremium = users[0]?.subscription_status === 'active';
  }
  if (isPremium) return { canUse: true };

  // 2. ログインユーザー: 累計N回まで
  if (userId) {
    const usage = await db.select('SELECT COUNT(*) as count FROM usage_log WHERE user_id = ?', [userId]);
    if (usage[0]?.count >= FREE_LIMIT) return { canUse: false, requirePremium: true };
  }

  // 3. 未ログイン: fingerprint + IP で累計1回まで
  else {
    const usage = await db.select(
      'SELECT COUNT(*) as count FROM usage_log WHERE fingerprint = ? OR ip_address = ?',
      [fingerprint, clientIp]
    );
    if (usage[0]?.count >= 1) return { canUse: false, requireLogin: true };
  }
}
```

### 2. フロントエンド

```tsx
import { useState } from 'react';
import { useFingerprint } from '@/hooks/useFingerprint';
import { LoginModal } from '@/components/common/LoginModal';
import { PremiumModal } from '@/components/common/PremiumModal';

function FeatureButton() {
  const fingerprint = useFingerprint();
  const [showLogin, setShowLogin] = useState(false);
  const [showPremium, setShowPremium] = useState(false);

  const handleClick = async () => {
    const res = await fetch('/api/check-usage', {
      method: 'POST',
      body: JSON.stringify({ fingerprint }),
    });
    const data = await res.json();

    if (data.canUse) {
      // 機能を実行
    } else if (data.requireLogin) {
      setShowLogin(true);
    } else if (data.requirePremium) {
      setShowPremium(true);
    }
  };

  return (
    <>
      <button onClick={handleClick}>機能を使う</button>
      <LoginModal open={showLogin} onOpenChange={setShowLogin} />
      <PremiumModal open={showPremium} onOpenChange={setShowPremium} />
    </>
  );
}
```

---

## DB テーブル (利用ログ)

利用回数を追跡するためのテーブルは機能ごとに作成する。

| テーブル | 用途 |
|---------|------|
| `chat_usage_log` | AIチャット利用ログ (IP + 日付リセット) |
| `prediction_usage_log` | 株価予測利用ログ (fingerprint + IP, 累計) |

### prediction_usage_log 構造

```sql
CREATE TABLE prediction_usage_log (
  id VARCHAR(36) PRIMARY KEY,
  fingerprint VARCHAR(64) NOT NULL,
  ip_address VARCHAR(45) NOT NULL,
  user_id VARCHAR(36) NULL,
  code VARCHAR(10) NOT NULL,
  is_premium BOOLEAN DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_fingerprint (fingerprint),
  INDEX idx_ip_address (ip_address),
  INDEX idx_user_id (user_id)
);
```
