"""
プロキシ管理モジュール
IP変更のためのプロキシローテーション機能を提供
Tor経由でのIP変更をサポート
"""

import os
import time
import random
import requests
import logging
import socket
import subprocess
from typing import Optional, List, Dict, Tuple
from dataclasses import dataclass

logger = logging.getLogger(__name__)

@dataclass
class ProxyConfig:
    """プロキシ設定"""
    host: str
    port: int
    username: str = ""
    password: str = ""
    protocol: str = "http"  # http, https, socks5
    
    def to_selenium_format(self) -> str:
        """Selenium用のプロキシ文字列を生成"""
        if self.username and self.password:
            return f"{self.protocol}://{self.username}:{self.password}@{self.host}:{self.port}"
        return f"{self.protocol}://{self.host}:{self.port}"
    
    def to_requests_format(self) -> Dict[str, str]:
        """requests用のプロキシ辞書を生成"""
        proxy_url = self.to_selenium_format()
        return {
            'http': proxy_url,
            'https': proxy_url
        }

class ProxyManager:
    """プロキシ管理クラス"""
    
    def __init__(self):
        self.proxy_list: List[ProxyConfig] = []
        self.current_proxy_index = 0
        self.failed_proxies = set()
        self.last_ip_check = ""
        
        # 環境変数またはファイルからプロキシリストを読み込み
        self._load_proxy_list()
    
    def _load_proxy_list(self):
        """プロキシリストを読み込み"""
        # 環境変数からプロキシ設定を読み込み
        proxy_env = os.environ.get('PROXY_LIST', '')
        if proxy_env:
            self._parse_proxy_env(proxy_env)
            return
        
        # ファイルからプロキシリストを読み込み
        proxy_file = os.path.join(os.path.dirname(__file__), 'proxy_list.txt')
        if os.path.exists(proxy_file):
            self._load_proxy_file(proxy_file)
            return
        
        # デフォルトの無料プロキシ（テスト用）
        # 注意: 本番環境では有料の信頼できるプロキシを使用してください
        self._load_default_proxies()
    
    def _parse_proxy_env(self, proxy_env: str):
        """環境変数からプロキシ設定を解析"""
        # 形式: "host1:port1:user1:pass1,host2:port2:user2:pass2"
        for proxy_str in proxy_env.split(','):
            parts = proxy_str.strip().split(':')
            if len(parts) >= 2:
                host = parts[0]
                port = int(parts[1])
                username = parts[2] if len(parts) > 2 else ""
                password = parts[3] if len(parts) > 3 else ""
                protocol = parts[4] if len(parts) > 4 else "http"
                
                self.proxy_list.append(ProxyConfig(
                    host=host,
                    port=port,
                    username=username,
                    password=password,
                    protocol=protocol
                ))
    
    def _load_proxy_file(self, file_path: str):
        """ファイルからプロキシリストを読み込み"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#'):
                        parts = line.split(':')
                        if len(parts) >= 2:
                            host = parts[0]
                            port = int(parts[1])
                            username = parts[2] if len(parts) > 2 else ""
                            password = parts[3] if len(parts) > 3 else ""
                            protocol = parts[4] if len(parts) > 4 else "http"
                            
                            self.proxy_list.append(ProxyConfig(
                                host=host,
                                port=port,
                                username=username,
                                password=password,
                                protocol=protocol
                            ))
        except Exception as e:
            logger.warning(f"プロキシファイル読み込みエラー: {e}")
    
    def _load_default_proxies(self):
        """デフォルトの無料プロキシリスト（テスト用）"""
        # 注意: これらは無料プロキシのため不安定です
        # 本番環境では有料の信頼できるプロキシサービスを使用してください
        default_proxies = [
            # 無料プロキシの例（実際のIPは定期的に変更されるため、最新のものを使用してください）
            ProxyConfig("proxy-server.com", 8080),
            ProxyConfig("free-proxy.cz", 8080),
            ProxyConfig("proxylist.geonode.com", 8080),
            # Tor経由（torが利用可能な場合）
            ProxyConfig("127.0.0.1", 9050, protocol="socks5"),
        ]
        
        # 実際にはここで信頼できるプロキシサービスのAPIから取得
        # または環境変数/設定ファイルから読み込むことを推奨
        logger.info(f"デフォルトプロキシリスト読み込み: {len(default_proxies)}個")
        self.proxy_list.extend(default_proxies)
    
    def get_current_proxy(self) -> Optional[ProxyConfig]:
        """現在のプロキシ設定を取得"""
        if not self.proxy_list:
            return None
        
        # 失敗したプロキシをスキップ
        attempts = 0
        while attempts < len(self.proxy_list):
            proxy = self.proxy_list[self.current_proxy_index]
            proxy_key = f"{proxy.host}:{proxy.port}"
            
            if proxy_key not in self.failed_proxies:
                return proxy
            
            self._rotate_proxy()
            attempts += 1
        
        # すべて失敗している場合は失敗リストをリセット
        if attempts >= len(self.proxy_list):
            logger.warning("すべてのプロキシが失敗状態です。失敗リストをリセットします。")
            self.failed_proxies.clear()
            return self.proxy_list[self.current_proxy_index] if self.proxy_list else None
        
        return None
    
    def _rotate_proxy(self):
        """次のプロキシに切り替え"""
        if self.proxy_list:
            self.current_proxy_index = (self.current_proxy_index + 1) % len(self.proxy_list)
    
    def rotate_proxy(self) -> Optional[ProxyConfig]:
        """プロキシをローテーションして新しいプロキシを取得"""
        self._rotate_proxy()
        return self.get_current_proxy()
    
    def mark_proxy_failed(self, proxy: ProxyConfig):
        """プロキシを失敗としてマーク"""
        proxy_key = f"{proxy.host}:{proxy.port}"
        self.failed_proxies.add(proxy_key)
        logger.warning(f"プロキシを失敗としてマーク: {proxy_key}")
    
    def test_proxy(self, proxy: ProxyConfig, timeout: int = 10) -> bool:
        """プロキシの接続テスト"""
        try:
            logger.info(f"プロキシテスト開始: {proxy.host}:{proxy.port}")
            
            # IP確認サービスを使用してテスト
            test_urls = [
                'http://httpbin.org/ip',
                'https://api.ipify.org?format=json',
                'http://icanhazip.com',
            ]
            
            session = requests.Session()
            session.proxies = proxy.to_requests_format()
            
            for url in test_urls:
                try:
                    response = session.get(url, timeout=timeout)
                    if response.status_code == 200:
                        logger.info(f"✅ プロキシテスト成功: {proxy.host}:{proxy.port}")
                        logger.info(f"新しいIP: {response.text[:100]}")
                        return True
                except requests.exceptions.RequestException as e:
                    logger.debug(f"プロキシテスト失敗（URL: {url}）: {e}")
                    continue
            
            logger.warning(f"❌ プロキシテスト失敗: {proxy.host}:{proxy.port}")
            return False
            
        except Exception as e:
            logger.error(f"プロキシテストエラー: {e}")
            return False
    
    def get_current_ip(self, proxy: Optional[ProxyConfig] = None) -> str:
        """現在のIPアドレスを取得"""
        try:
            session = requests.Session()
            if proxy:
                session.proxies = proxy.to_requests_format()
            
            response = session.get('http://httpbin.org/ip', timeout=10)
            if response.status_code == 200:
                ip_data = response.json()
                return ip_data.get('origin', 'Unknown')
            
        except Exception as e:
            logger.error(f"IP取得エラー: {e}")
        
        return "Unknown"
    
    def change_ip(self) -> Tuple[bool, Optional[ProxyConfig]]:
        """IPを変更（プロキシローテーション）"""
        logger.info("🔄 IP変更開始...")
        
        # 現在のIPを記録
        current_ip = self.get_current_ip()
        logger.info(f"現在のIP: {current_ip}")
        
        # 最大5回までプロキシを試行
        max_attempts = min(5, len(self.proxy_list)) if self.proxy_list else 0
        
        for attempt in range(max_attempts):
            # 新しいプロキシを取得
            new_proxy = self.rotate_proxy()
            if not new_proxy:
                logger.error("利用可能なプロキシがありません")
                return False, None
            
            logger.info(f"プロキシ試行 {attempt + 1}/{max_attempts}: {new_proxy.host}:{new_proxy.port}")
            
            # プロキシをテスト
            if self.test_proxy(new_proxy):
                # 新しいIPを確認
                new_ip = self.get_current_ip(new_proxy)
                
                if new_ip != current_ip and new_ip != "Unknown":
                    logger.info(f"✅ IP変更成功: {current_ip} → {new_ip}")
                    self.last_ip_check = new_ip
                    return True, new_proxy
                else:
                    logger.warning(f"IPが変更されていません: {new_ip}")
            
            # プロキシが失敗した場合はマーク
            self.mark_proxy_failed(new_proxy)
        
        logger.error("❌ IP変更に失敗しました")
        return False, None
    
    def reset_failed_proxies(self):
        """失敗したプロキシリストをリセット"""
        self.failed_proxies.clear()
        logger.info("失敗プロキシリストをリセットしました")

class TorManager:
    """Tor専用のIP変更マネージャー"""
    
    def __init__(self):
        self.tor_proxy = ProxyConfig("127.0.0.1", 9050, protocol="socks5")
        self.tor_control_port = 9051
        self.tor_control_password = ""  # 必要に応じて設定
        
    def check_tor_availability(self) -> bool:
        """Torサービスが利用可能かチェック"""
        try:
            # SOCKS5プロキシポートの確認
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(3)
            result = sock.connect_ex(('127.0.0.1', 9050))
            sock.close()
            
            if result == 0:
                logger.info("✅ Tor SOCKS5プロキシが利用可能です")
                return True
            else:
                logger.warning("❌ Tor SOCKS5プロキシに接続できません")
                return False
                
        except Exception as e:
            logger.error(f"Tor可用性チェックエラー: {e}")
            return False
    
    def start_tor_service(self) -> bool:
        """Torサービスを確実に開始（Linux/macOS用）"""
        try:
            print("🔄 === Tor サービス確実起動 ===")
            
            # 既存のTorプロセスを終了
            self.stop_tor_service()
            time.sleep(2)
            
            # Torのパスを検索
            tor_paths = [
                "/opt/homebrew/bin/tor",
                "/usr/local/bin/tor", 
                "/usr/bin/tor",
                "/bin/tor"
            ]
            
            tor_cmd = None
            for path in tor_paths:
                if os.path.exists(path):
                    tor_cmd = path
                    break
            
            if not tor_cmd:
                print("❌ Torが見つかりません。以下のコマンドでインストールしてください:")
                print("macOS: brew install tor")
                print("Ubuntu: sudo apt-get install tor")
                return False
            
            print(f"🔍 Tor実行パス: {tor_cmd}")
            
            # カスタム設定でTorを起動
            tor_config = [
                tor_cmd,
                "--SocksPort", "9050",
                "--ControlPort", "9051",
                "--CookieAuthentication", "0",
                "--HashedControlPassword", "",
                "--PidFile", "/tmp/tor.pid",
                "--DataDirectory", "/tmp/tor_data",
                "--Log", "notice stdout"
            ]
            
            # Torデータディレクトリを作成
            os.makedirs("/tmp/tor_data", exist_ok=True)
            
            print("🚀 Torサービス起動中...")
            self.tor_process = subprocess.Popen(
                tor_config, 
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                preexec_fn=os.setsid if hasattr(os, 'setsid') else None
            )
            
            # 起動確認（最大60秒待機）
            print("⏳ Tor起動確認中...")
            for i in range(60):
                time.sleep(1)
                if self.check_tor_availability():
                    print(f"✅ Torサービス起動完了 ({i+1}秒)")
                    
                    # IP確認
                    tor_ip = self._get_ip_via_tor()
                    print(f"🌐 Tor経由IP: {tor_ip}")
                    
                    return True
                
                if i % 10 == 9:
                    print(f"⏳ 起動待機中... ({i+1}/60秒)")
            
            print("❌ Torサービス起動がタイムアウトしました")
            self.stop_tor_service()
            return False
            
        except Exception as e:
            print(f"❌ Torサービス起動エラー: {e}")
            self.stop_tor_service()
            return False
    
    def stop_tor_service(self):
        """Torサービスを停止"""
        try:
            # 既存のTorプロセスを終了
            if hasattr(self, 'tor_process') and self.tor_process:
                try:
                    self.tor_process.terminate()
                    self.tor_process.wait(timeout=5)
                except:
                    try:
                        self.tor_process.kill()
                    except:
                        pass
            
            # システムのTorプロセスも終了
            subprocess.run(['pkill', '-f', 'tor'], capture_output=True)
            
            # PIDファイルを削除
            pid_files = ["/tmp/tor.pid", "/var/run/tor/tor.pid"]
            for pid_file in pid_files:
                try:
                    if os.path.exists(pid_file):
                        os.remove(pid_file)
                except:
                    pass
            
            print("🔄 既存Torプロセス終了完了")
            
        except Exception as e:
            print(f"Tor停止エラー: {e}")
    
    def change_tor_ip(self) -> bool:
        """Tor経由でIPアドレスを確実に変更"""
        try:
            print("🔄 === Tor IP変更開始 ===")
            
            # Torが利用可能かチェック
            if not self.check_tor_availability():
                print("🚀 Torサービスを起動中...")
                if not self.start_tor_service():
                    print("❌ Torサービス起動に失敗")
                    return False
            
            # 現在のIPを取得
            current_ip = self._get_ip_via_tor()
            print(f"🌐 現在のTor IP: {current_ip}")
            
            # IP変更を3回試行
            for attempt in range(3):
                print(f"🔄 IP変更試行 {attempt + 1}/3")
                
                # Torコントロール経由で新しい回路を要求
                success = self._request_new_tor_circuit()
                
                if success:
                    # 回路変更後の待機時間を長めに
                    print("⏳ 新しい回路確立を待機中...")
                    time.sleep(5)
                    
                    # 新しいIPを確認（複数回試行）
                    for ip_check in range(3):
                        new_ip = self._get_ip_via_tor()
                        
                        if new_ip != current_ip and new_ip != "Unknown":
                            print(f"✅ Tor IP変更成功: {current_ip} → {new_ip}")
                            return True
                        
                        if ip_check < 2:
                            time.sleep(2)
                            print(f"🔍 IP確認再試行 {ip_check + 2}/3")
                    
                    print(f"⚠️ IPが変更されていません: {new_ip}")
                else:
                    print("⚠️ Tor回路変更に失敗")
                
                if attempt < 2:
                    time.sleep(3)
            
            print("❌ Tor IP変更に失敗しました")
            return False
            
        except Exception as e:
            print(f"❌ Tor IP変更エラー: {e}")
            return False
    
    def _get_ip_via_tor(self) -> str:
        """Tor経由で現在のIPアドレスを確実に取得"""
        try:
            proxies = {
                'http': 'socks5://127.0.0.1:9050',
                'https': 'socks5://127.0.0.1:9050'
            }
            
            # 複数のIPチェックサービスを試行
            ip_check_services = [
                'https://httpbin.org/ip',
                'https://api.ipify.org?format=json',
                'http://checkip.amazonaws.com',
                'https://ipinfo.io/ip'
            ]
            
            for service in ip_check_services:
                try:
                    response = requests.get(
                        service,
                        proxies=proxies,
                        timeout=15,
                        headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
                    )
                    
                    if response.status_code == 200:
                        # サービスによってレスポンス形式が異なる
                        if 'httpbin.org' in service or 'ipify.org' in service:
                            try:
                                ip_data = response.json()
                                ip = ip_data.get('ip') or ip_data.get('origin', 'Unknown')
                            except:
                                ip = response.text.strip()
                        else:
                            ip = response.text.strip()
                        
                        # IPアドレスの妥当性を簡単チェック
                        if ip and ip != 'Unknown' and '.' in ip and len(ip.split('.')) == 4:
                            print(f"🌐 Tor経由IP確認成功: {ip} (サービス: {service})")
                            return ip
                            
                except Exception as e:
                    print(f"⚠️ IP確認サービス失敗: {service} - {str(e)[:50]}")
                    continue
            
            print("❌ すべてのIP確認サービスが失敗")
            return "Unknown"
                
        except Exception as e:
            print(f"❌ Tor経由IP取得全体エラー: {e}")
            return "Unknown"
    
    def _request_new_tor_circuit(self) -> bool:
        """Torに新しい回路を要求（複数方法試行）"""
        try:
            print("🔄 Tor新規回路要求中...")
            
            # 方法1: Torコントロールポート経由
            try:
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(10)
                sock.connect(('127.0.0.1', self.tor_control_port))
                
                # 認証（パスワードなしの場合）
                sock.send(b'AUTHENTICATE\r\n')
                response = sock.recv(1024)
                print(f"🔐 認証応答: {response}")
                
                if b'250 OK' in response:
                    # 新しい回路を要求
                    sock.send(b'SIGNAL NEWNYM\r\n')
                    response = sock.recv(1024)
                    print(f"🔄 回路変更応答: {response}")
                    
                    if b'250 OK' in response:
                        print("✅ コントロールポート経由で回路変更成功")
                        sock.close()
                        return True
                
                sock.close()
                print("⚠️ コントロールポート認証失敗")
                
            except Exception as e:
                print(f"⚠️ コントロールポート接続失敗: {e}")
            
            # 方法2: Tor プロセス再起動
            try:
                print("🔄 Torプロセス再起動による回路変更...")
                self.stop_tor_service()
                time.sleep(2)
                
                if self.start_tor_service():
                    print("✅ Torプロセス再起動による回路変更成功")
                    return True
                else:
                    print("❌ Torプロセス再起動失敗")
                    
            except Exception as e:
                print(f"❌ Torプロセス再起動エラー: {e}")
            
            # 方法3: SIGHUP シグナル送信（軽量な回路変更）
            try:
                print("🔄 SIGHUPシグナルによる回路変更...")
                result = subprocess.run(['pkill', '-SIGHUP', 'tor'], 
                                      capture_output=True, text=True, timeout=5)
                if result.returncode == 0:
                    time.sleep(3)  # シグナル処理待機
                    print("✅ SIGHUPによる回路変更完了")
                    return True
                else:
                    print("⚠️ SIGHUPシグナル送信失敗")
                    
            except Exception as e:
                print(f"⚠️ SIGHUPシグナルエラー: {e}")
            
            print("❌ すべての回路変更方法が失敗")
            return False
            
        except Exception as e:
            print(f"❌ Tor回路変更全体エラー: {e}")
            return False
    
    def get_tor_proxy(self) -> ProxyConfig:
        """TorのSOCKS5プロキシ設定を取得"""
        return self.tor_proxy

# グローバルインスタンス
proxy_manager = ProxyManager()
tor_manager = TorManager()

def get_proxy_manager() -> ProxyManager:
    """プロキシマネージャーのインスタンスを取得"""
    return proxy_manager

def get_tor_manager() -> TorManager:
    """Torマネージャーのインスタンスを取得"""
    return tor_manager