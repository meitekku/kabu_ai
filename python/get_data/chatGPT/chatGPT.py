# chatGPT.py - ChatGPTクラスの定義
import requests
import json
import re
from requests.exceptions import Timeout

class ChatGPT:
    def __init__(self):
        """
        ChatGPT APIへの接続を行うための初期設定を行うクラス。
        """
        #auto charge
        #https://platform.openai.com/settings/organization/billing/overview
        self.api_key = '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'
        self.headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {self.api_key}'
        }

    def chat(self, text: str, role: str = "system", response_type: str = "text", timeout: int = 30) -> str:
        """
        ユーザーメッセージを受け取り、ChatGPTからの応答を返す。

        :param text: ユーザーが入力した文字列
        :param role: システムロールの設定（デフォルト: "system"）
        :param response_type: レスポンスの形式（"text" または "json"）
        :param timeout: リクエストのタイムアウト（秒）
        :return: モデルからのレスポンス
        """
        # テキストの前処理
        text = re.sub(r"\s+", "", text)
        
        data = {
            'model': 'gpt-4.1-mini',
            'messages': [
                {'role': role, 'content': text}
            ],
            'temperature': 0.7
        }
        
        try_count = 0
        max_retries = 3
        
        while try_count < max_retries:
            try:
                response = requests.post(
                    'https://api.openai.com/v1/chat/completions',
                    headers=self.headers,
                    json=data,
                    timeout=timeout
                )
                response.raise_for_status()
                
                content = response.json()['choices'][0]['message']['content']
                
                if response_type == "json":
                    try:
                        return json.loads(content)
                    except json.JSONDecodeError:
                        print("JSON形式での解析に失敗しました。テキスト形式で返します。")
                        return content
                return content
                
            except Timeout:
                print(f"リクエストがタイムアウトしました（{timeout}秒）")
                try_count += 1
            except requests.exceptions.RequestException as e:
                print(f"エラーが発生しました: {e}")
                try_count += 1
            
            if try_count >= max_retries:
                print("リトライ回数が上限に達したので、処理を中断します。")
                raise Exception("Maximum retries exceeded")