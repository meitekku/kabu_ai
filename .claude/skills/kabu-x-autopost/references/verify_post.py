#!/usr/bin/env python3
"""投稿検証: 自プロフィール最新ツイートに指定マーカーが出るか確認する。
使い方: python3 verify_post.py <marker> [handle]
  marker : 投稿本文に含まれる目印文字列
  handle : 対象アカウント（既定 meiteko_stock）
"""
import os, sys, time
from playwright.sync_api import sync_playwright

DST = os.path.expanduser(os.environ.get("TWITTER_PROFILE_DIR", "~/.cache/x_login_profile"))
marker = sys.argv[1] if len(sys.argv) > 1 else ""
handle = sys.argv[2] if len(sys.argv) > 2 else "meiteko_stock"

with sync_playwright() as p:
    ctx = p.chromium.launch_persistent_context(
        user_data_dir=DST, headless=True, channel="chrome",
        ignore_default_args=["--use-mock-keychain"],
        args=["--disable-blink-features=AutomationControlled", "--no-first-run"],
    )
    page = ctx.pages[0] if ctx.pages else ctx.new_page()
    page.goto(f"https://x.com/{handle}", wait_until="domcontentloaded", timeout=45000)
    time.sleep(5)
    txts = page.locator('[data-testid="tweetText"]').all_inner_texts()[:8]
    for i, t in enumerate(txts):
        print(f"[{i}] {t[:70]}".replace("\n", " "))
    if marker:
        print("VERIFY_HIT=", any(marker in t for t in txts))
    ctx.close()
