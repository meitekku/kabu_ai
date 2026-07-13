// app/api/twitter/login/route.ts
// X(Twitter) 連続投稿用に「ログイン済みChromeプロファイル」を投稿用へ準備するエンドポイント。
//   GET  … 投稿用プロファイルが準備済みか（=投稿可能か）を返す（{ loggedIn }）
//   POST … ログイン中のChromeプロファイル(Cookie等)を投稿用ディレクトリへコピーする（seed_profile.py）
//
// Chrome 136+ はデフォルトプロファイルでのリモートデバッグ(CDP)を禁止したため、
// 普段のプロファイルに直接接続できない。代わりにログイン済みプロファイルをコピーし、
// post_via_session.py がそのコピーをヘッドレスで開いて投稿する（ログインは引き継がれる）。
// あなたが普段使っているChrome自体には一切触れない。
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

// post_via_session.py / seed_profile.py と一致させる投稿用プロファイル
const DEST_PROFILE =
  process.env.TWITTER_PROFILE_DIR || path.join(os.homedir(), '.cache', 'x_login_profile');

function resolvePythonBin(): string {
  const venvPython = path.join(process.cwd(), 'venv', 'bin', 'python');
  return process.env.TWITTER_PY || (fs.existsSync(venvPython) ? venvPython : 'python3');
}

// 投稿用プロファイルにログインCookie(コピー済み)が存在するか。
// 有効性の最終判定は投稿時（post_via_session.py）に行い、失効時は needsLogin を返す。
function profileSeeded(): boolean {
  return (
    fs.existsSync(path.join(DEST_PROFILE, 'Default', 'Network', 'Cookies')) ||
    fs.existsSync(path.join(DEST_PROFILE, 'Default', 'Cookies'))
  );
}

export function GET() {
  return NextResponse.json({
    // UI 側は loggedIn=投稿可能 として扱う（最終的なXログイン判定は投稿時）
    loggedIn: profileSeeded(),
  });
}

export async function POST() {
  const pythonDir = path.join(process.cwd(), 'python', 'twitter_auto_post');
  const pythonBin = resolvePythonBin();

  const result = await new Promise<{ success: boolean; message: string; profile?: string }>((resolve) => {
    const child = spawn(pythonBin, ['seed_profile.py'], {
      cwd: pythonDir,
      env: { ...process.env },
    });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => child.kill('SIGKILL'), 60000);
    child.stdout.on('data', (d) => (stdout += d.toString()));
    child.stderr.on('data', (d) => (stderr += d.toString()));
    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({ success: false, message: `プロファイル準備の起動に失敗しました: ${err.message}` });
    });
    child.on('close', () => {
      clearTimeout(timer);
      const lastLine = stdout.trim().split('\n').filter(Boolean).pop() || '';
      try {
        const r = JSON.parse(lastLine);
        resolve({ success: Boolean(r.success), message: r.message || '', profile: r.profile });
      } catch {
        resolve({
          success: false,
          message: `プロファイル準備の応答を解析できませんでした: ${stderr.slice(-300)}`,
        });
      }
    });
  });

  if (!result.success) {
    return NextResponse.json(
      { success: false, message: result.message || 'ログイン済みプロファイルの準備に失敗しました' },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    message: `${result.message} このままもう一度投稿してください。`,
  });
}
