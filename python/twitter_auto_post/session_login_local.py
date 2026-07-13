#!/usr/bin/env python3
"""
X(Twitter) ローカルログイン（住宅IP）→ セッション書き出し

このローカルPC（実画面・住宅IP）で本物の Chrome を開いて手動ログインし、
ログインセッション(Cookie)を storage_state JSON として書き出す。
書き出した JSON をサーバーへ転送して、サーバー側のヘッドレス投稿で再利用する。

出力: STATE_OUT(=/home/meiteko/.cache/x_state.json)
"""
import os, sys, time

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    print("playwright 未インストール"); sys.exit(1)

# 保存先はローカルPCの ~/.cache 配下（post_via_session.py の候補パスと一致させる）
PROFILE_DIR = os.environ.get("X_LOCAL_PROFILE", os.path.expanduser("~/.cache/x_login_profile"))
STATE_OUT = os.environ.get("X_STATE_OUT", os.path.expanduser("~/.cache/x_state.json"))
# ログイン画面の多重起動を防ぐためのロックファイル
LOCK_FILE = os.environ.get("X_LOGIN_LOCK", os.path.expanduser("~/.cache/x_login.lock"))
TIMEOUT = int(os.environ.get("TWITTER_LOGIN_TIMEOUT", "1800"))

STEALTH = r"""
Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
Object.defineProperty(navigator, 'languages', { get: () => ['ja-JP','ja','en-US','en'] });
window.chrome = window.chrome || { runtime: {} };
"""


def logged_in(page):
    if "/login" in page.url or "/i/flow/login" in page.url or "/onboarding" in page.url:
        return False
    for sel in ('[data-testid="SideNav_AccountSwitcher_Button"]', '[data-testid="AppTabBar_Home_Link"]'):
        try:
            if page.locator(sel).first.is_visible(timeout=2000):
                return True
        except Exception:
            pass
    return False


def _release_lock():
    try:
        os.remove(LOCK_FILE)
    except OSError:
        pass


def main():
    os.makedirs(PROFILE_DIR, exist_ok=True)
    os.makedirs(os.path.dirname(STATE_OUT) or ".", exist_ok=True)
    # ロック取得（既にログイン画面が開いていれば何もしない）
    os.makedirs(os.path.dirname(LOCK_FILE) or ".", exist_ok=True)
    with open(LOCK_FILE, "w") as f:
        f.write(str(os.getpid()))
    print(f"📂 プロファイル: {PROFILE_DIR}")
    print(f"💾 セッション書き出し先: {STATE_OUT}")
    with sync_playwright() as p:
        # 同梱 Chromium を使用（あなたの通常Chromeと競合しない）
        ctx = p.chromium.launch_persistent_context(
            user_data_dir=PROFILE_DIR,
            headless=False,
            locale="ja-JP",
            timezone_id="Asia/Tokyo",
            no_viewport=True,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--start-maximized",
                "--lang=ja-JP",
            ],
        )
        ctx.add_init_script(STEALTH)
        page = ctx.pages[0] if ctx.pages else ctx.new_page()
        try:
            page.goto("https://x.com/login", wait_until="domcontentloaded", timeout=45000)
        except Exception as e:
            print(f"[goto err] {e}")

        if logged_in(page):
            print("✅ 既にログイン済み。セッションを書き出します。")
            ctx.storage_state(path=STATE_OUT)
            ctx.close()
            return 0

        print("🔐 表示された Chrome で手動ログインしてください（captchaも手で解けます）。")
        deadline = time.time() + TIMEOUT
        i = 0
        while time.time() < deadline:
            time.sleep(5)
            i += 1
            if i % 6 == 0:
                print(f"⏳ 待機中... URL={page.url}", flush=True)
            if logged_in(page):
                print("✅ ログイン完了を検知。セッションを書き出します。")
                time.sleep(2)
                ctx.storage_state(path=STATE_OUT)
                print(f"✅ 書き出し完了: {STATE_OUT}")
                ctx.close()
                return 0
        print("❌ タイムアウト")
        ctx.close()
        return 2


if __name__ == "__main__":
    try:
        code = main()
    finally:
        _release_lock()
    sys.exit(code)
