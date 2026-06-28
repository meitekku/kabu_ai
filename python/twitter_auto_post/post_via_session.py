#!/usr/bin/env python3
"""
X(Twitter) セッション投稿スクリプト（ヘッドレス）

session_login.py で保存したログインセッションを再利用し、APIを使わずブラウザ経由で投稿する。
無料APIクレジット枯渇（HTTP 402）後の自動投稿フォールバックとして使用。

入力: 標準入力に JSON  {"message": "本文", "imagePath": "/abs/path.jpg"(任意)}
出力: 標準出力に JSON  {"success": bool, "message": str, "tweetUrl": str|None}

プロファイル保存先は環境変数 TWITTER_PROFILE_DIR で指定（session_login.py と一致させること）。
"""

import os
import sys
import json
import time

DEFAULT_PROFILE_DIR = "/var/lib/kabu_twitter/twitter_mobile_profile"
PROFILE_DIR = os.environ.get("TWITTER_PROFILE_DIR", DEFAULT_PROFILE_DIR)


def out(success: bool, message: str, tweet_url=None, code: int = 0):
    print(json.dumps({"success": success, "message": message, "tweetUrl": tweet_url}, ensure_ascii=False))
    sys.exit(code)


def main():
    raw = sys.stdin.read()
    try:
        data = json.loads(raw) if raw.strip() else {}
    except json.JSONDecodeError:
        out(False, "入力JSONの解析に失敗しました", code=1)

    message = (data.get("message") or "").strip()
    image_path = data.get("imagePath") or None
    if not message:
        out(False, "本文(message)が空です", code=1)
    if image_path and not os.path.isfile(image_path):
        # 画像が見つからなければテキストのみで続行
        image_path = None

    if not os.path.isdir(PROFILE_DIR):
        out(False, f"ログインセッションがありません({PROFILE_DIR})。session_login.py で一度ログインしてください。", code=2)

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        out(False, "playwright 未インストール", code=3)

    with sync_playwright() as p:
        context = p.chromium.launch_persistent_context(
            user_data_dir=PROFILE_DIR,
            channel="chrome",
            headless=True,
            viewport={"width": 1280, "height": 900},
            args=[
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
                "--disable-dev-shm-usage",
            ],
        )
        page = context.pages[0] if context.pages else context.new_page()
        try:
            page.goto("https://x.com/home", wait_until="domcontentloaded", timeout=45000)
            time.sleep(2)

            if "/login" in page.url or "/i/flow/login" in page.url:
                out(False, "セッション失効：再ログインが必要です（session_login.py を再実行）", code=4)

            # 本文入力欄
            textarea = page.locator('[data-testid="tweetTextarea_0"]').first
            try:
                textarea.wait_for(state="visible", timeout=15000)
            except Exception:
                # ホームのインライン作成欄が見えない場合は /compose/post へ
                page.goto("https://x.com/compose/post", wait_until="domcontentloaded", timeout=30000)
                textarea = page.locator('[data-testid="tweetTextarea_0"]').first
                textarea.wait_for(state="visible", timeout=15000)

            textarea.click()
            textarea.fill(message)
            time.sleep(1)

            # 画像添付
            if image_path:
                try:
                    file_input = page.locator('input[data-testid="fileInput"]').first
                    file_input.set_input_files(image_path)
                    # アップロード完了（プレビュー表示）を待つ
                    page.locator('[data-testid="attachments"]').first.wait_for(state="visible", timeout=30000)
                    time.sleep(2)
                except Exception as e:
                    # 画像失敗時はテキストのみで続行
                    print(f"[warn] 画像添付に失敗: {e}", file=sys.stderr)

            # 投稿ボタン（インライン優先、なければ通常）
            posted = False
            for sel in ('[data-testid="tweetButtonInline"]', '[data-testid="tweetButton"]'):
                btn = page.locator(sel).first
                try:
                    if btn.is_visible(timeout=3000):
                        btn.wait_for(state="visible", timeout=5000)
                        btn.click()
                        posted = True
                        break
                except Exception:
                    continue

            if not posted:
                # キーボードショートカット（Ctrl+Enter）でフォールバック
                try:
                    textarea.press("Control+Enter")
                    posted = True
                except Exception:
                    pass

            if not posted:
                out(False, "投稿ボタンが見つかりませんでした（UI変更の可能性）", code=5)

            # 投稿完了の確認：本文欄が空に戻る or トースト表示
            success = False
            deadline = time.time() + 20
            while time.time() < deadline:
                time.sleep(1.5)
                try:
                    toast = page.locator('[data-testid="toast"]')
                    if toast.count() > 0 and toast.first.is_visible():
                        success = True
                        break
                except Exception:
                    pass
                try:
                    val = textarea.inner_text(timeout=2000)
                    if val.strip() == "":
                        success = True
                        break
                except Exception:
                    success = True  # 要素が消えた＝送信された可能性
                    break

            if success:
                out(True, "ブラウザセッション経由で投稿しました")
            else:
                out(False, "投稿の完了を確認できませんでした", code=6)

        finally:
            try:
                context.close()
            except Exception:
                pass


if __name__ == "__main__":
    main()
