#!/usr/bin/env python3
import os
import json
import base64
import hashlib
import secrets
import webbrowser
import argparse
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlencode, parse_qs
import requests
from dotenv import load_dotenv

def setup_argparse():
    parser = argparse.ArgumentParser(description='Twitter OAuth 2.0 セットアップ')
    parser.add_argument('--env', 
                       choices=['local', 'production'],
                       default='local',
                       help='使用する環境設定ファイル (.env.local または .env.production)')
    return parser.parse_args()

def load_env_file(env_type):
    env_file = f'.env.{env_type}'
    load_dotenv(env_file)
    return env_file

class OAuthSetup:
    def __init__(self, env_file):
        self.env_file = env_file
        self.client_id = os.getenv('TWITTER_CLIENT_ID')
        self.client_secret = os.getenv('TWITTER_CLIENT_SECRET')
        self.redirect_uri = 'http://localhost:8003/callback'
        self.auth_url = 'https://twitter.com/i/oauth2/authorize'
        self.token_url = 'https://api.twitter.com/2/oauth2/token'

    def print_debug_info(self):
        print("\n=== デバッグ情報 ===")
        print(f"環境設定ファイル: {self.env_file}")
        print(f"Current working directory: {os.getcwd()}")
        print(f"CLIENT_ID: {'設定されています' if self.client_id else '設定されていません'}")
        if self.client_id:
            print(f"CLIENT_ID の長さ: {len(self.client_id)}")
        print(f"CLIENT_SECRET: {'設定されています' if self.client_secret else '設定されていません'}")
        if self.client_secret:
            print(f"CLIENT_SECRET の長さ: {len(self.client_secret)}")
        print(f"REFRESH_TOKEN: {'設定されています' if os.getenv('TWITTER_REFRESH_TOKEN') else '設定されていません'}")
        print("==================\n")

    def create_callback_handler(self, code_verifier):
        env_file = self.env_file
        client_id = self.client_id
        client_secret = self.client_secret
        token_url = self.token_url
        redirect_uri = self.redirect_uri

        class CallbackHandler(BaseHTTPRequestHandler):
            def do_GET(self):
                print(f"\n受信したリクエスト: {self.path}")
                
                if '/callback' in self.path:
                    try:
                        if '?' not in self.path:
                            raise ValueError("クエリパラメータがありません")

                        query_components = parse_qs(self.path.split('?')[1])
                        print("受信したクエリパラメータ:", json.dumps(query_components, indent=2, ensure_ascii=False))

                        if 'error' in query_components:
                            error_message = query_components.get('error_description', ['不明なエラー'])[0]
                            print(f"認証エラー: {error_message}")
                            self.send_error_response(f'認証エラーが発生しました: {error_message}')
                            return

                        if 'code' not in query_components:
                            raise ValueError("認証コードがありません")

                        code = query_components['code'][0]
                        
                        # Basic認証用のヘッダーを作成
                        auth_string = f"{client_id}:{client_secret}"
                        auth_bytes = auth_string.encode('ascii')
                        auth_b64 = base64.b64encode(auth_bytes).decode('ascii')
                        
                        headers = {
                            'Authorization': f'Basic {auth_b64}',
                            'Content-Type': 'application/x-www-form-urlencoded'
                        }
                        
                        data = {
                            'code': code,
                            'grant_type': 'authorization_code',
                            'redirect_uri': redirect_uri,
                            'code_verifier': code_verifier
                        }
                        
                        print("\nトークンリクエストを送信中...")
                        print("リクエストヘッダー:", json.dumps(headers, indent=2, ensure_ascii=False))
                        print("リクエストデータ:", json.dumps(data, indent=2, ensure_ascii=False))
                        
                        response = requests.post(token_url, headers=headers, data=data)
                        print(f"レスポンスステータス: {response.status_code}")
                        print("レスポンスヘッダー:", dict(response.headers))
                        
                        tokens = response.json()
                        print("レスポンスボディ:", json.dumps(tokens, indent=2, ensure_ascii=False))
                        
                        if 'error' in tokens:
                            print("\nエラーが発生しました：")
                            print(json.dumps(tokens, indent=2, ensure_ascii=False))
                            self.send_error_response(f'エラーが発生しました: {tokens.get("error_description", "不明なエラー")}')
                        else:
                            print("\nトークン取得成功！")
                            # トークンを保存
                            with open(env_file, 'a') as f:
                                f.write(f"\nTWITTER_REFRESH_TOKEN='{tokens['refresh_token']}'")
                            self.send_success_response('認証が完了しました。このウィンドウを閉じて構いません。')
                    except Exception as e:
                        print(f"\nエラーが発生しました: {str(e)}")
                        self.send_error_response(f'エラーが発生しました: {str(e)}')
                    finally:
                        self.server.running = False

            def send_success_response(self, message):
                self.send_response(200)
                self.send_header('Content-type', 'text/html; charset=utf-8')
                self.end_headers()
                html = f"""
                <html>
                <head><title>認証完了</title></head>
                <body>
                    <h2 style="color: green;">✅ {message}</h2>
                    <p>環境設定ファイル: {env_file}</p>
                </body>
                </html>
                """
                self.wfile.write(html.encode('utf-8'))

            def send_error_response(self, message):
                self.send_response(400)
                self.send_header('Content-type', 'text/html; charset=utf-8')
                self.end_headers()
                html = f"""
                <html>
                <head><title>エラー</title></head>
                <body>
                    <h2 style="color: red;">❌ {message}</h2>
                    <p>環境設定ファイル: {env_file}</p>
                    <p>Twitter Developer Portalで以下の設定を確認してください：</p>
                    <ul>
                        <li>OAuth 2.0が有効になっているか</li>
                        <li>コールバックURLが正しく設定されているか（{redirect_uri}）</li>
                        <li>必要なパーミッション（Read and Write）が設定されているか</li>
                        <li>Type of Appが正しく設定されているか</li>
                    </ul>
                </body>
                </html>
                """
                self.wfile.write(html.encode('utf-8'))

        return CallbackHandler

    def generate_pkce_pair(self):
        code_verifier = secrets.token_urlsafe(32)
        code_challenge = base64.urlsafe_b64encode(
            hashlib.sha256(code_verifier.encode()).digest()
        ).decode().rstrip('=')
        return code_verifier, code_challenge

    def start_auth_flow(self):
        self.print_debug_info()

        if not self.client_id or not self.client_secret:
            print(f'環境変数 TWITTER_CLIENT_ID と TWITTER_CLIENT_SECRET を {self.env_file} に設定してください。')
            return

        code_verifier, code_challenge = self.generate_pkce_pair()
        
        auth_params = {
            'response_type': 'code',
            'client_id': self.client_id,
            'redirect_uri': self.redirect_uri,
            'scope': 'tweet.read tweet.write users.read offline.access',
            'state': secrets.token_urlsafe(16),
            'code_challenge': code_challenge,
            'code_challenge_method': 'S256'
        }
        
        auth_url = f"{self.auth_url}?{urlencode(auth_params)}"
        
        print('ブラウザで認証ページを開きます...')
        print(f'認証URL: {auth_url}')
        webbrowser.open(auth_url)
        
        try:
            handler = self.create_callback_handler(code_verifier)
            server = HTTPServer(('localhost', 8003), handler)
            server.running = True
            
            print('コールバックを待機中...')
            while server.running:
                server.handle_request()
            
            print('セットアップが完了しました。')
            print(f'{self.env_file} ファイルにリフレッシュトークンが保存されました。')
            self.print_debug_info()
        except Exception as e:
            print(f"サーバーエラーが発生しました: {str(e)}")

def main():
    args = setup_argparse()
    env_file = load_env_file(args.env)
    oauth_setup = OAuthSetup(env_file)
    oauth_setup.start_auth_flow()

if __name__ == '__main__':
    main() 