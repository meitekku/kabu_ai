#!/usr/bin/env python3
"""
X(Twitter) セッション投稿スクリプト

投稿に使うログインセッションを、以下の優先順で解決してブラウザ経由で投稿する
（APIを一切使わない。無料APIクレジット枯渇のフォールバック兼、ローカル連続投稿用）。

  1. CDP 接続（最優先） … 既にXにログイン済みの「普段使いのChrome」に
     --remote-debugging-port で接続し、そのプロファイルのまま投稿する。
     追加ログイン不要。ローカル自動投稿の本命パス。
     エンドポイント: 環境変数 X_CDP_ENDPOINT（既定 http://127.0.0.1:9222）
  2. storage_state(JSON)  … session_login_local.py 等で書き出した Cookie
  3. 永続プロファイル       … 直接ログインした専用プロファイル

入力: 標準入力に JSON  {"message": "本文", "imagePath": "/abs/path.jpg"(任意)}
出力: 標準出力に JSON  {"success": bool, "message": str, "tweetUrl": str|None, "needsLogin": bool}
"""

import os
import sys
import json
import time
import urllib.request

# CDP（普段使いChrome への接続先）
CDP_ENDPOINT = os.environ.get("X_CDP_ENDPOINT", "http://127.0.0.1:9222")

# セッション候補（先頭から順に探す）: サーバー配置 → ローカルPC(session_login_local.py の出力)
STATE_FILE_CANDIDATES = [
    "/var/lib/kabu_twitter/x_state.json",
    os.path.expanduser("~/.cache/x_state.json"),
]
PROFILE_DIR_CANDIDATES = [
    "/var/lib/kabu_twitter/twitter_mobile_profile",
    os.path.expanduser("~/.cache/x_login_profile"),
]


def cdp_reachable(endpoint: str = CDP_ENDPOINT, timeout: float = 1.5) -> bool:
    # デバッグポートが応答するか（/json/version）を軽量チェック
    try:
        with urllib.request.urlopen(endpoint.rstrip("/") + "/json/version", timeout=timeout):
            return True
    except Exception:
        return False


def resolve_state_file():
    env = os.environ.get("X_STATE_FILE")
    for c in ([env] if env else []) + STATE_FILE_CANDIDATES:
        if c and os.path.isfile(c):
            return c
    return None


def _profile_has_session(profile_dir):
    # ログイン済みプロファイルには Cookies ファイルが存在する（空プロファイルを除外）
    return any(
        os.path.isfile(os.path.join(profile_dir, *rel))
        for rel in (("Default", "Cookies"), ("Cookies",))
    )


def resolve_profile_dir():
    env = os.environ.get("TWITTER_PROFILE_DIR")
    for c in ([env] if env else []) + PROFILE_DIR_CANDIDATES:
        if c and os.path.isdir(c) and _profile_has_session(c):
            return c
    return None


def out(success: bool, message: str, tweet_url=None, code: int = 0, needs_login: bool = False):
    print(json.dumps(
        {"success": success, "message": message, "tweetUrl": tweet_url, "needsLogin": needs_login},
        ensure_ascii=False,
    ))
    sys.exit(code)


def is_logged_out(page) -> bool:
    """X にログインしていない状態か判定する（URL＋ログアウト時のみ出る要素）。"""
    url = page.url or ""
    if "/login" in url or "/i/flow/login" in url or "/i/flow/signup" in url:
        return True
    for sel in (
        '[data-testid="loginButton"]',
        '[data-testid="signupButton"]',
        'a[href="/login"]',
        'a[href="/i/flow/login"]',
    ):
        try:
            if page.locator(sel).first.is_visible(timeout=1200):
                return True
        except Exception:
            pass
    return False


def click_enabled_tweet_button(page) -> bool:
    """有効な（aria-disabled でない）投稿ボタンを探してクリックする。"""
    for sel in ('[data-testid="tweetButton"]', '[data-testid="tweetButtonInline"]'):
        btn = page.locator(sel).first
        try:
            if not btn.is_visible(timeout=2000):
                continue
            # ボタンが有効になるまで最大5秒待つ（本文入力直後は一瞬 disabled のことがある）
            for _ in range(10):
                if btn.get_attribute("aria-disabled") != "true":
                    break
                time.sleep(0.5)
            if btn.get_attribute("aria-disabled") == "true":
                continue
            btn.click(timeout=5000)
            return True
        except Exception:
            continue
    return False


def do_post(page, message: str, image_path):
    """開いた page に対してツイートを投稿する。成功可否を out() で確定させる。"""
    # 投稿は /compose/post のモーダルで行う（ホームのインライン欄より安定）
    page.goto("https://x.com/compose/post", wait_until="domcontentloaded", timeout=45000)
    time.sleep(2)

    if is_logged_out(page):
        out(False, "X(Twitter)にログインしていません。Chromeでログインしてから再度投稿してください。",
            code=4, needs_login=True)

    textarea = page.locator('[data-testid="tweetTextarea_0"]').first
    try:
        textarea.wait_for(state="visible", timeout=15000)
    except Exception:
        if is_logged_out(page):
            out(False, "X(Twitter)にログインしていません。Chromeでログインしてから再度投稿してください。",
                code=4, needs_login=True)
        out(False, "投稿画面の入力欄が見つかりませんでした（未ログインまたはUI変更の可能性）",
            code=5, needs_login=True)

    # 本文入力: fill() は Draft.js エディタの内部状態を更新せず投稿ボタンが有効化されない。
    # キーボード入力で確実に入力し、投稿ボタンを有効化させる。
    textarea.click()
    page.keyboard.type(message, delay=10)
    time.sleep(1)
    # 入力が反映されなかった場合のフォールバック
    try:
        if (textarea.inner_text(timeout=2000) or "").strip() == "":
            textarea.fill(message)
            time.sleep(1)
    except Exception:
        pass

    # 本文にハッシュタグ(#...)を含むと、候補サジェストのドロップダウンが
    # 画面全体を覆う透明なポータル要素を残し、投稿ボタンのクリックを
    # ブロックし続けることがある。ただし無条件に Escape を送ると、
    # ドロップダウンが無い場合に X 側の「ポストを保存しますか？」ダイアログを
    # 誤って開いてしまい、そのマスクが投稿ボタンのクリックを逆にブロックする
    # （現行のXでは Escape は「無害」ではない）。
    # そのため、候補ドロップダウン（listbox）が実際に表示されている場合のみ Escape で閉じる。
    try:
        suggestion = page.locator('[role="listbox"]').first
        if suggestion.is_visible(timeout=500):
            page.keyboard.press("Escape")
            time.sleep(0.5)
    except Exception:
        pass

    # 画像添付
    if image_path:
        try:
            file_input = page.locator('input[data-testid="fileInput"]').first
            file_input.set_input_files(image_path)
            page.locator('[data-testid="attachments"]').first.wait_for(state="visible", timeout=30000)
            time.sleep(2)
        except Exception as e:
            print(f"[warn] 画像添付に失敗: {e}", file=sys.stderr)

    posted = click_enabled_tweet_button(page)
    if not posted:
        # キーボードショートカット（Ctrl+Enter / Meta+Enter）でフォールバック
        for combo in ("Control+Enter", "Meta+Enter"):
            try:
                textarea.press(combo)
                posted = True
                break
            except Exception:
                continue

    if not posted:
        out(False, "投稿ボタンが有効になりませんでした（本文が空、または未ログイン／UI変更の可能性）",
            code=5, needs_login=True)

    # 投稿完了の確認：トースト「送信しました」を最優先で確認する。
    # /compose/post モーダルは投稿後も閉じず、本文欄だけが空になって留まる場合がある
    # （ホームのインライン欄のようにホームへ遷移するとは限らない）。
    # そのため「モーダルが閉じてホームへ遷移」だけでなく「本文欄が入力済みの状態から
    # 空になった」ことも完了のサインとして扱う（.type() ベースの現行実装では
    # fill() 誤検知の問題は当てはまらない）。
    success = False
    deadline = time.time() + 25
    while time.time() < deadline:
        time.sleep(1.0)
        try:
            toast = page.locator('[data-testid="toast"]')
            if toast.count() > 0 and toast.first.is_visible():
                txt = ""
                try:
                    txt = toast.first.inner_text(timeout=1500)
                except Exception:
                    pass
                # 送信成功トースト（"ポストを送信しました" / "your post was sent"）
                if ("送信" in txt) or ("sent" in txt.lower()) or ("post" in txt.lower()):
                    success = True
                    break
                # エラートースト
                if ("問題" in txt) or ("error" in txt.lower()) or ("失敗" in txt):
                    out(False, f"投稿エラー: {txt.strip()[:120]}", code=6)
        except Exception:
            pass
        try:
            ta = page.locator('[data-testid="tweetTextarea_0"]')
            ta_count = ta.count()
            # compose モーダルが閉じてホームへ遷移＝送信完了のサイン
            if "/compose/post" not in page.url and ta_count == 0:
                success = True
                break
            # モーダルは開いたままでも、本文欄が空になっていれば送信完了とみなす
            if ta_count > 0:
                remaining = (ta.first.inner_text(timeout=1500) or "").strip()
                if remaining == "":
                    success = True
                    break
        except Exception:
            pass

    if success:
        out(True, "ブラウザセッション経由で投稿しました")
    else:
        out(False, "投稿の完了を確認できませんでした", code=6)


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

    use_cdp = cdp_reachable()
    state_file = None if use_cdp else resolve_state_file()
    profile_dir = None if (use_cdp or state_file) else resolve_profile_dir()

    if not use_cdp and not state_file and not profile_dir:
        out(
            False,
            "X(Twitter)にログイン済みのChromeが見つかりません。ログイン画面からChromeを起動してください。",
            code=2,
            needs_login=True,
        )

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        out(False, "playwright 未インストール", code=3)

    launch_args = [
        "--disable-blink-features=AutomationControlled",
        "--no-sandbox",
        "--disable-dev-shm-usage",
    ]

    def launch(p):
        # system Chrome を優先し、無ければ Playwright 同梱 Chromium にフォールバック
        try:
            return p.chromium.launch(headless=True, channel="chrome", args=launch_args)
        except Exception:
            return p.chromium.launch(headless=True, args=launch_args)

    def launch_persistent(p):
        kwargs = dict(
            user_data_dir=profile_dir,
            headless=True,
            viewport={"width": 1280, "height": 900},
            args=launch_args,
        )
        # macOS の Cookie は Keychain "Chrome Safe Storage" で暗号化されている。
        # Playwright 既定の --use-mock-keychain を無効化し、システムChromeで開くことで
        # コピー元プロファイルのログインCookieを復号できる（=ログイン状態を引き継ぐ）。
        try:
            return p.chromium.launch_persistent_context(
                channel="chrome",
                ignore_default_args=["--use-mock-keychain"],
                **kwargs,
            )
        except Exception:
            # システムChromeが無い環境では同梱Chromiumにフォールバック（Cookie復号は不可）
            return p.chromium.launch_persistent_context(**kwargs)

    with sync_playwright() as p:
        browser = None          # launch した(=閉じてよい)ブラウザ
        cdp_page = None         # CDP接続で新規に開いたタブ(終了時に閉じる)
        try:
            if use_cdp:
                # 普段使いのChromeに接続。ブラウザ自体は絶対に閉じない（ユーザーのChromeのため）
                try:
                    cdp_browser = p.chromium.connect_over_cdp(CDP_ENDPOINT)
                except Exception as e:
                    out(False, f"デバッグ用Chromeへの接続に失敗しました: {e}", code=7, needs_login=True)
                context = cdp_browser.contexts[0] if cdp_browser.contexts else cdp_browser.new_context()
                cdp_page = context.new_page()
                page = cdp_page
            elif state_file:
                # storage_state(Cookie) を使う（ローカル住宅IPで取得したセッション）
                browser = launch(p)
                context = browser.new_context(
                    storage_state=state_file,
                    locale="ja-JP",
                    timezone_id="Asia/Tokyo",
                    viewport={"width": 1280, "height": 900},
                )
                page = context.pages[0] if context.pages else context.new_page()
            else:
                # 直接ログインした永続プロファイルを使う
                context = launch_persistent(p)
                page = context.pages[0] if context.pages else context.new_page()

            try:
                do_post(page, message, image_path)
            except SystemExit:
                raise
            except Exception as e:
                out(False, f"投稿処理でエラーが発生しました: {e}", code=8)

        finally:
            # CDP接続時はユーザーのChromeを閉じない。開いたタブだけ後始末する。
            if cdp_page is not None:
                try:
                    cdp_page.close()
                except Exception:
                    pass
            if browser is not None:
                try:
                    browser.close()
                except Exception:
                    pass
            elif not use_cdp:
                # 永続プロファイルの context を閉じる（browser を launch していないケース）
                try:
                    context.close()
                except Exception:
                    pass


if __name__ == "__main__":
    main()
