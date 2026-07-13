#!/usr/bin/env python3
"""後片付け: 指定文字列を含む自分のツイートを削除する（テスト投稿の掃除用）。
使い方: python3 delete_tests.py [needle] [handle]
  needle : 削除対象に含まれる文字列（既定 "自動投稿テスト"）
  handle : 対象アカウント（既定 meiteko_stock）
"""
import os, sys, time
from playwright.sync_api import sync_playwright

DST = os.path.expanduser(os.environ.get("TWITTER_PROFILE_DIR", "~/.cache/x_login_profile"))
NEEDLE = sys.argv[1] if len(sys.argv) > 1 else "自動投稿テスト"
handle = sys.argv[2] if len(sys.argv) > 2 else "meiteko_stock"
deleted = 0

with sync_playwright() as p:
    ctx = p.chromium.launch_persistent_context(
        user_data_dir=DST, headless=True, channel="chrome",
        ignore_default_args=["--use-mock-keychain"],
        args=["--disable-blink-features=AutomationControlled", "--no-first-run"],
        viewport={"width": 1280, "height": 900},
    )
    page = ctx.pages[0] if ctx.pages else ctx.new_page()
    for _round in range(10):
        page.goto(f"https://x.com/{handle}", wait_until="domcontentloaded", timeout=45000)
        time.sleep(4)
        arts = page.locator('article')
        target = None
        for i in range(min(arts.count(), 10)):
            a = arts.nth(i)
            try:
                t = a.locator('[data-testid="tweetText"]').first.inner_text(timeout=1200)
            except Exception:
                continue
            if NEEDLE in t:
                target = a
                break
        if target is None:
            print("対象なし")
            break
        try:
            target.locator('[data-testid="caret"]').first.click(timeout=5000)
            time.sleep(1)
            page.locator('[role="menuitem"]:has-text("削除"), [role="menuitem"]:has-text("Delete")').first.click(timeout=5000)
            time.sleep(1)
            page.locator('[data-testid="confirmationSheetConfirm"]').first.click(timeout=5000)
            deleted += 1
            print(f"削除 {deleted} 件目")
            time.sleep(3)
        except Exception as e:
            print("削除操作でエラー:", e)
            break
    print("TOTAL_DELETED=", deleted)
    ctx.close()
