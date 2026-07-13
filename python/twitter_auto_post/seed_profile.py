#!/usr/bin/env python3
"""
X(Twitter) ログイン済みの「普段使いChromeプロファイル」を、投稿用の専用プロファイルへコピーする。

Chrome 136+ は「デフォルトのユーザーデータディレクトリでのリモートデバッグ」を禁止したため、
普段のプロファイルに直接 --remote-debugging-port を付けて CDP 接続することはできない。
代わりに、ログイン中のプロファイル(Cookie 等)を専用ディレクトリへコピーし、
post_via_session.py がそのコピーをヘッドレスで開いて投稿する（ログイン状態はそのまま引き継がれる）。

macOS の Cookie は Keychain "Chrome Safe Storage" の鍵で暗号化されているため、
復号にはコピー先を「同じ Chrome アプリ」で開き、かつ --use-mock-keychain を無効化する必要がある
（post_via_session.py 側で対応）。

検出: 環境変数 X_CHROME_SRC_PROFILE でプロファイル名(例 "Profile 1")を指定可能。
      未指定なら x.com の auth_token を持つプロファイルを自動検出する。
出力: 標準出力に JSON  {"success": bool, "message": str, "profile": str|None}
"""
import os
import sys
import json
import glob
import sqlite3
import shutil
import tempfile

CHROME_ROOT = os.environ.get(
    "CHROME_USER_DATA_DIR",
    os.path.expanduser("~/Library/Application Support/Google/Chrome"),
)
DEST_PROFILE = os.environ.get("TWITTER_PROFILE_DIR", os.path.expanduser("~/.cache/x_login_profile"))


def out(success, message, profile=None, code=0):
    print(json.dumps({"success": success, "message": message, "profile": profile}, ensure_ascii=False))
    sys.exit(code)


def _cookies_path(profile_dir):
    for rel in (("Network", "Cookies"), ("Cookies",)):
        p = os.path.join(profile_dir, *rel)
        if os.path.isfile(p):
            return p
    return None


def _has_x_auth(cookies_file):
    """Cookies SQLite に x.com/twitter の auth_token があるか（値は暗号化されているので名前で判定）。"""
    tmp = None
    try:
        # ロック回避のため一時コピーして読む
        fd, tmp = tempfile.mkstemp(suffix=".sqlite")
        os.close(fd)
        shutil.copy(cookies_file, tmp)
        con = sqlite3.connect(f"file:{tmp}?mode=ro", uri=True)
        cur = con.execute(
            "SELECT COUNT(*) FROM cookies WHERE name='auth_token' "
            "AND (host_key LIKE '%x.com%' OR host_key LIKE '%twitter%')"
        )
        n = cur.fetchone()[0]
        con.close()
        return n > 0
    except Exception:
        return False
    finally:
        if tmp and os.path.isfile(tmp):
            try:
                os.remove(tmp)
            except OSError:
                pass


def detect_source_profile():
    forced = os.environ.get("X_CHROME_SRC_PROFILE")
    if forced:
        p = os.path.join(CHROME_ROOT, forced)
        return p if os.path.isdir(p) else None

    candidates = []
    for prof_dir in glob.glob(os.path.join(CHROME_ROOT, "Profile *")) + [os.path.join(CHROME_ROOT, "Default")]:
        if not os.path.isdir(prof_dir):
            continue
        ck = _cookies_path(prof_dir)
        if ck and _has_x_auth(ck):
            candidates.append(prof_dir)
    # 最初に見つかったログイン済みプロファイルを採用
    return candidates[0] if candidates else None


def seed(src_profile):
    # コピー先を初期化
    dest_default = os.path.join(DEST_PROFILE, "Default")
    shutil.rmtree(DEST_PROFILE, ignore_errors=True)
    os.makedirs(dest_default, exist_ok=True)

    # Local State（Cookie 復号鍵の格納先。Keychain と組で使う）
    ls = os.path.join(CHROME_ROOT, "Local State")
    if os.path.isfile(ls):
        shutil.copy(ls, os.path.join(DEST_PROFILE, "Local State"))

    # ログインに必要なファイル/フォルダをコピー（キャッシュ類は不要）
    for rel in ("Cookies", "Cookies-journal", "Cookies-wal", "Cookies-shm",
                "Preferences", "Web Data", "Login Data"):
        s = os.path.join(src_profile, rel)
        if os.path.isfile(s):
            shutil.copy(s, os.path.join(dest_default, rel))
    for reld in ("Network", "Local Storage", "Session Storage"):
        s = os.path.join(src_profile, reld)
        if os.path.isdir(s):
            shutil.copytree(s, os.path.join(dest_default, reld), dirs_exist_ok=True)


def main():
    if not os.path.isdir(CHROME_ROOT):
        out(False, f"Chromeのユーザーデータが見つかりません: {CHROME_ROOT}", code=2)

    src = detect_source_profile()
    if not src:
        out(
            False,
            "X(Twitter)にログイン済みのChromeプロファイルが見つかりませんでした。"
            "Chromeでログインしてから再度お試しください。",
            code=3,
        )

    try:
        seed(src)
    except Exception as e:
        out(False, f"プロファイルのコピーに失敗しました: {e}", code=4)

    out(True, f"ログイン済みプロファイルを投稿用にコピーしました（{os.path.basename(src)}）。",
        profile=os.path.basename(src))


if __name__ == "__main__":
    main()
