#!/usr/bin/env python3
"""
X(Twitter) セッションログインツール（一度きりの手動ログイン用）

ヘッドレスサーバー上で `ssh -X` 経由で実行し、表示されたブラウザで手動ログインする。
ログイン済みセッション(Cookie)は永続プロファイルディレクトリに保存され、
以降の自動投稿（post_via_session.py）がこのセッションを再利用する。

使い方（サーバーに ssh -X で入った状態で）:
    cd /var/www/kabu_ai/python/twitter_auto_post
    /var/www/kabu_ai/venv/bin/python session_login.py

プロファイル保存先は環境変数 TWITTER_PROFILE_DIR で指定（デフォルトはデプロイで消えない場所）。
"""

import os
import sys
import time

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    print("❌ playwright 未インストール: /var/www/kabu_ai/venv/bin/pip install playwright")
    sys.exit(1)

# デプロイ（rsync総入れ替え）で消えないよう /var/www/kabu_ai の外に保存する
DEFAULT_PROFILE_DIR = "/var/lib/kabu_twitter/twitter_mobile_profile"
PROFILE_DIR = os.environ.get("TWITTER_PROFILE_DIR", DEFAULT_PROFILE_DIR)

LOGIN_WAIT_TIMEOUT = int(os.environ.get("TWITTER_LOGIN_TIMEOUT", "600"))  # 秒


def is_logged_in(page) -> bool:
    """ホームの主要要素が見えていればログイン済みとみなす"""
    try:
        page.goto("https://x.com/home", wait_until="domcontentloaded", timeout=30000)
    except Exception:
        pass
    time.sleep(2)
    url = page.url
    if "/login" in url or "/i/flow/login" in url or "/i/flow/signup" in url:
        return False
    for sel in (
        '[data-testid="SideNav_AccountSwitcher_Button"]',
        '[data-testid="AppTabBar_Home_Link"]',
        '[data-testid="tweetTextarea_0"]',
    ):
        try:
            if page.locator(sel).first.is_visible(timeout=3000):
                return True
        except Exception:
            continue
    return False


def main() -> int:
    if not os.environ.get("DISPLAY"):
        print("⚠️  DISPLAY が未設定です。`ssh -X` で接続してから実行してください。")
        print("    （GUIなしのこの状態ではログイン画面を表示できません）")
        # 続行はするが、headed起動は失敗する可能性が高い

    os.makedirs(PROFILE_DIR, exist_ok=True)
    print(f"📂 プロファイル保存先: {PROFILE_DIR}")
    print("🌐 Chrome を起動します（数秒かかります）...")

    with sync_playwright() as p:
        context = p.chromium.launch_persistent_context(
            user_data_dir=PROFILE_DIR,
            channel="chrome",           # サーバー導入済みの google-chrome を使用
            headless=False,
            viewport={"width": 1280, "height": 900},
            args=[
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",                 # rootで起動するため必須
                "--disable-dev-shm-usage",
            ],
        )
        page = context.pages[0] if context.pages else context.new_page()

        if is_logged_in(page):
            print("✅ 既にログイン済みです。セッションは有効です。")
            context.close()
            return 0

        print("=" * 60)
        print("🔐 手動ログインしてください")
        print("   表示された Chrome で X(Twitter) にログイン（2FA含む）。")
        print(f"   完了を自動検知します（最大 {LOGIN_WAIT_TIMEOUT} 秒待機）。")
        print("=" * 60)

        try:
            page.goto("https://x.com/login", wait_until="domcontentloaded", timeout=30000)
        except Exception:
            pass

        deadline = time.time() + LOGIN_WAIT_TIMEOUT
        while time.time() < deadline:
            time.sleep(5)
            try:
                url = page.url
            except Exception:
                url = ""
            if url and "/login" not in url and "/i/flow/login" not in url:
                if is_logged_in(page):
                    print("✅ ログイン完了を検知しました。セッションを保存します。")
                    time.sleep(2)  # Cookie/IndexedDB の書き込み待ち
                    context.close()
                    return 0
            remaining = int(deadline - time.time())
            print(f"⏳ ログイン待機中... 残り約 {remaining} 秒", flush=True)

        print("❌ タイムアウト：ログインを検知できませんでした。")
        context.close()
        return 2


if __name__ == "__main__":
    sys.exit(main())
